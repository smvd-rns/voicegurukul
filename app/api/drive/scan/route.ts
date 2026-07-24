import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// --- Helpers (ported from indexer-service) ---

function extractFolderId(driveLink: string): string | null {
    if (!driveLink) return null;
    if (!driveLink.includes('http') && !driveLink.includes('/')) return driveLink;
    const patterns = [/\/folders\/([a-zA-Z0-9-_]+)/, /[?&]id=([a-zA-Z0-9-_]+)/];
    for (const pattern of patterns) {
        const match = driveLink.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
}

async function getAccessToken(): Promise<string> {
    const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REFRESH_TOKEN: refreshToken } = process.env;
    if (!clientId || !clientSecret || !refreshToken) throw new Error('Missing Google Drive credentials in environment');
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
    return data.access_token;
}

async function scanFolderRecursively(folderId: string, accessToken: string): Promise<{ files: any[]; foldersFound: number; pathDriveIdMap: Map<string, string> }> {
    const allFiles: any[] = [];
    const folderIdMap = new Map<string, string>();
    const processedFolders = new Set<string>();
    let totalFoldersFound = 0;

    async function scanFolder(currentFolderId: string, currentPath = '') {
        if (processedFolders.has(currentFolderId)) return;
        processedFolders.add(currentFolderId);
        if (currentPath) folderIdMap.set(currentPath, currentFolderId);
        totalFoldersFound++;

        let pageToken: string | null = null;
        const subfolders: { id: string; name: string; path: string }[] = [];

        do {
            const query = `'${currentFolderId}' in parents and trashed = false`;
            const apiUrl: string = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,size,webViewLink,iconLink,thumbnailLink)&pageSize=100&includeItemsFromAllDrives=true&supportsAllDrives=true${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
            const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) { const e = await res.json(); throw new Error(`Drive API error: ${e.error?.message}`); }
            const data = await res.json();
            for (const item of (data.files || [])) {
                if (item.mimeType === 'application/vnd.google-apps.folder') {
                    subfolders.push({ id: item.id, name: item.name, path: currentPath ? `${currentPath}/${item.name}` : item.name });
                } else {
                    allFiles.push({ ...item, folderPath: currentPath });
                }
            }
            pageToken = data.nextPageToken || null;
        } while (pageToken);

        // Process subfolders with concurrency limit
        const CONCURRENCY = 5;
        const queue = [...subfolders];
        const workers = new Set<Promise<void>>();
        while (queue.length > 0 || workers.size > 0) {
            while (queue.length > 0 && workers.size < CONCURRENCY) {
                const sf = queue.shift()!;
                const p: Promise<void> = scanFolder(sf.id, sf.path).catch(e => console.error(`Subfolder error ${sf.name}:`, e.message)).finally(() => { workers.delete(p); });
                workers.add(p);
            }
            if (workers.size > 0) await Promise.race(workers);
        }
    }

    await scanFolder(folderId);
    return { files: allFiles, foldersFound: totalFoldersFound, pathDriveIdMap: folderIdMap };
}

function getCategory(fileName: string, mimeType: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (mimeType.includes('pdf') || ext === 'pdf') return 'pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (mimeType.includes('video') || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return 'video';
    if (mimeType.includes('audio') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (mimeType.includes('document') || mimeType.includes('word') || ['doc', 'docx', 'txt'].includes(ext)) return 'doc';
    if (mimeType.includes('zip') || mimeType.includes('archive') || ['zip', 'rar', '7z'].includes(ext)) return 'zip';
    if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'images';
    return 'other';
}

async function resolveFolderIdInDb(
    folderName: string,
    parentId: string | null,
    userId: string,
    cache: Map<string, string>
): Promise<string> {
    const cacheKey = `${folderName}:${parentId || 'root'}:${userId}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    // Check existing
    const existing = await pool.query(
        `SELECT id FROM folders WHERE name = $1 AND user_id = $2 AND parent_id IS NOT DISTINCT FROM $3 LIMIT 1`,
        [folderName, userId, parentId]
    );
    if (existing.rows.length > 0) {
        cache.set(cacheKey, existing.rows[0].id);
        return existing.rows[0].id;
    }

    // Create new
    const newId = uuidv4();
    await pool.query(
        `INSERT INTO folders (id, name, user_id, parent_id, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT DO NOTHING`,
        [newId, folderName, userId, parentId]
    );
    // Re-fetch in case of conflict
    const fetched = await pool.query(
        `SELECT id FROM folders WHERE name = $1 AND user_id = $2 AND parent_id IS NOT DISTINCT FROM $3 LIMIT 1`,
        [folderName, userId, parentId]
    );
    const finalId = fetched.rows[0]?.id || newId;
    cache.set(cacheKey, finalId);
    return finalId;
}

async function resolvePathToFolderId(
    pathStr: string,
    rootFolderId: string | null,
    userId: string,
    folderMap: Map<string, string>,
    cache: Map<string, string>
): Promise<string | null> {
    if (!pathStr) return rootFolderId;
    if (folderMap.has(pathStr)) return folderMap.get(pathStr)!;

    const segments = pathStr.split('/');
    let currentParentId = rootFolderId;

    let builtPath = '';
    for (const segment of segments) {
        builtPath = builtPath ? `${builtPath}/${segment}` : segment;
        if (folderMap.has(builtPath)) {
            currentParentId = folderMap.get(builtPath)!;
            continue;
        }
        currentParentId = await resolveFolderIdInDb(segment, currentParentId, userId, cache);
        folderMap.set(builtPath, currentParentId);
    }

    return currentParentId;
}

// --- Main Background Worker ---
async function runScanWorker(params: {
    scanId: string; folderId: string; displayName: string; userId: string; description: string;
}) {
    const { scanId, folderId, displayName, userId, description } = params;

    try {
        const accessToken = await getAccessToken();
        const { files, foldersFound, pathDriveIdMap } = await scanFolderRecursively(folderId, accessToken);

        // Update progress after scanning
        await pool.query(
            `UPDATE drive_scans SET files_found = $1, metadata = $2 WHERE id = $3`,
            [files.length, JSON.stringify({ folders_found: foldersFound }), scanId]
        );

        const folderMap = new Map<string, string>();
        const folderCache = new Map<string, string>();
        const currentTime = new Date().toISOString();

        // Resolve root display name folder
        let rootFolderId: string | null = null;
        if (displayName) {
            rootFolderId = await resolveFolderIdInDb(displayName, null, userId, folderCache);
            folderMap.set(displayName, rootFolderId);
        }

        // Pre-seed folder cache
        const existingFolders = await pool.query(`SELECT id, name, parent_id FROM folders WHERE user_id = $1`, [userId]);
        for (const f of existingFolders.rows) {
            const key = `${f.name}:${f.parent_id || 'root'}:${userId}`;
            folderCache.set(key, f.id);
        }

        let filesProcessed = 0;
        let filesSkipped = 0;
        const BATCH_SIZE = 100;

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            const driveIds = batch.map(f => f.id);

            // Check for duplicates
            const existing = await pool.query(
                `SELECT google_drive_id FROM files WHERE google_drive_id = ANY($1) AND user_id = $2`,
                [driveIds, userId]
            );
            const existingSet = new Set(existing.rows.map(r => r.google_drive_id));

            for (const file of batch) {
                if (existingSet.has(file.id)) { filesSkipped++; continue; }

                const targetFolderId = await resolvePathToFolderId(file.folderPath || '', rootFolderId, userId, folderMap, folderCache);
                const category = getCategory(file.name, file.mimeType || '');
                const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

                try {
                    await pool.query(
                        `INSERT INTO files (
                            id, google_drive_id, file_name, file_type, file_size, google_drive_url,
                            thumbnail_link, category, description, upload_method, user_id, folder_id,
                            points_awarded, created_at, updated_at, views, metadata
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
                        [
                            uuidv4(), file.id, file.name, file.mimeType || 'application/octet-stream',
                            file.size ? parseInt(file.size) : 0, driveUrl, file.thumbnailLink || null,
                            category, description || null, 'drive_scan', userId, targetFolderId || null,
                            0, currentTime, currentTime, 0,
                            JSON.stringify({ iconLink: file.iconLink, folderPath: file.folderPath || '', scan_id: scanId })
                        ]
                    );
                    filesProcessed++;
                } catch (err: any) {
                    // code 23505 = unique_violation (duplicate)
                    if (err.code === '23505') {
                        filesSkipped++;
                    } else {
                        console.error(`[Scan ${scanId}] File insert error "${file.name}": [${err.code}] ${err.message}`);
                    }
                }
            }

            // Update progress every batch
            await pool.query(
                `UPDATE drive_scans SET files_processed = $1, files_skipped = $2 WHERE id = $3`,
                [filesProcessed, filesSkipped, scanId]
            );
        }

        // Mark complete
        await pool.query(
            `UPDATE drive_scans SET scan_status = 'completed', files_found = $1, files_processed = $2, files_skipped = $3, completed_at = NOW() WHERE id = $4`,
            [files.length, filesProcessed, filesSkipped, scanId]
        );
        console.log(`[Scan ${scanId}] Complete! Processed: ${filesProcessed}, Skipped: ${filesSkipped}`);

    } catch (error: any) {
        console.error(`[Scan ${scanId}] Fatal error:`, error.message);
        await pool.query(
            `UPDATE drive_scans SET scan_status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
            [error.message || 'Unknown error', scanId]
        );
    }
}

// --- API Route Handlers ---

export async function GET() {
    return NextResponse.json({ status: 'awake', timestamp: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
    try {
        const { driveLink, displayName, description, userId, userName } = await request.json();

        const folderId = extractFolderId(driveLink.trim());
        if (!folderId) {
            return NextResponse.json({ error: 'Invalid Google Drive folder link' }, { status: 400 });
        }

        // Create the scan record
        const scanId = uuidv4();
        await pool.query(
            `INSERT INTO drive_scans (id, user_id, user_name, drive_link, description, scan_status, started_at, metadata)
             VALUES ($1, $2, $3, $4, $5, 'processing', NOW(), $6)`,
            [scanId, userId, userName || null, driveLink, description || null, JSON.stringify({ display_name: displayName || null })]
        );

        // Start background scan (fire and forget)
        runScanWorker({ scanId, folderId, displayName: displayName || '', userId, description: description || '' })
            .catch(err => console.error('[Scan Worker Fatal]', err));

        return NextResponse.json({ success: true, scanId, message: 'Scan started in background' });

    } catch (error: any) {
        console.error('[Scan API Error]', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from './utils/db.js';
import { extractFolderId, processAndSaveFiles, getAccessToken, findOrCreateFolder, getFileCategory } from './utils/drive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root folder's env files
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // fallback to current folder's .env

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: '*' })); // Allow requests from Vercel frontend
app.use(express.json());

// Initialize Supabase Admin for minimal auth/validation if needed
const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL;
const sadhanaDbKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY;
const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbKey);

/**
 * Wake-Up / Health Check Endpoint
 * The Vercel frontend pings this when the Upload page mounts
 * to ensure Render is awake and ready before the user clicks "Start Indexing"
 */
app.get('/health', (req, res) => {
    console.log('[Health Check] Ping received, server is awake!');
    res.status(200).json({ status: 'awake', timestamp: new Date().toISOString() });
});

/**
 * Trigger Scan Endpoint
 * Initiates the background Google Drive scan and responds immediately to Vercel
 */
app.post('/scan', async (req, res) => {
    try {
        const { driveLink, displayName, description, parentId, userId, userName } = req.body;

        if (!driveLink || !userId) {
            return res.status(400).json({ error: 'Drive link and User ID are required' });
        }

        const folderId = extractFolderId(driveLink.trim());
        if (!folderId) {
            return res.status(400).json({ error: 'Invalid Drive folder link' });
        }

        console.log(`[Scan Initializing] User: ${userName}, Folder: ${folderId}`);

        // 1. Create the scan record in the database FIRST to give the frontend an ID to track
        const { data: scanRecord, error: scanError } = await sadhanaDbAdmin
            .from('drive_scans')
            .insert({
                user_id: userId,
                user_name: userName,
                drive_link: driveLink,
                description: description || null,
                scan_status: 'processing',
                started_at: new Date().toISOString(),
                metadata: {
                    display_name: displayName || null,
                    render_worker: true
                }
            })
            .select()
            .single();

        if (scanError || !scanRecord) {
            console.error('[Scan Init Error] DB Insert Failed:', scanError);
            return res.status(500).json({ error: 'Failed to create scan record in database' });
        }

        console.log(`[Scan Started] ID: ${scanRecord.id}`);

        // 2. Respond immediately to prevent Vercel 504 Timeouts
        res.status(200).json({
            success: true,
            scanId: scanRecord.id,
            message: 'Scan started in the background on Render'
        });

        // 3. Fire-and-forget: Start the heavy Drive processing in the background Native Node process
        processAndSaveFiles({
            folderId,
            scanId: scanRecord.id,
            userId,
            displayName, // The custom root folder name provided by the user
            sadhanaDbUrl,
            sadhanaDbKey
        }).catch(async (err) => {
            console.error(`[Scan ${scanRecord.id} Background Error]`, err);
            await sadhanaDbAdmin
                .from('drive_scans')
                .update({
                    scan_status: 'failed',
                    error_message: err.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', scanRecord.id);
        });

    } catch (error) {
        console.error('[Express Scan Route Error]', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

/**
 * Get Upload Token Endpoint
 * Returns a fresh access token and resolves the target folder ID for direct uploads
 */
app.post('/upload-token', async (req, res) => {
    try {
        const { fileName, fileType, targetFolderId, userId, userName } = req.body;

        if (!fileName || !fileType || !userId) {
            return res.status(400).json({ error: 'FileName, FileType, and UserId are required' });
        }

        console.log(`[Upload Token] Request for ${fileName} (User: ${userName || userId})`);

        const accessToken = await getAccessToken();
        const mainFolderId = '1KhZ2l4wk3HXwBhX18JFb10zNvWJNMjHi'; // Priority Root Folder
        let finalFolderId = '';

        // 1. Resolve Target Folder from DB if provided
        if (targetFolderId && targetFolderId !== 'root') {
            const { data: folderData, error } = await sadhanaDbAdmin
                .from('folders')
                .select('google_drive_folder_id')
                .eq('id', targetFolderId)
                .single();

            if (!error && folderData?.google_drive_folder_id) {
                finalFolderId = folderData.google_drive_folder_id;
            }
        }

        // 2. Fallback to Category-based Organization
        if (!finalFolderId) {
            const safeUserName = userName || userId.substring(0, 8);
            const userFolderId = await findOrCreateFolder(accessToken, safeUserName, mainFolderId);
            const fileCategory = getFileCategory(fileName, fileType);
            finalFolderId = await findOrCreateFolder(accessToken, fileCategory, userFolderId);
        }

        console.log(`[Upload Token] Success! Folder: ${finalFolderId}`);

        res.status(200).json({
            accessToken,
            folderId: finalFolderId,
            userId: userId
        });

    } catch (error) {
        console.error('[Upload Token Error]', error);
        res.status(500).json({ error: error.message || 'Failed to generate upload token' });
    }
});

/**
 * Create Folder Endpoint
 * Creates a folder in Google Drive and returns the ID
 */
app.post('/folders/create', async (req, res) => {
    try {
        const { name, parentId, userId, userName } = req.body;

        if (!name || !userId) {
            return res.status(400).json({ error: 'Folder name and UserId are required' });
        }

        console.log(`[Folder Create] Request for "${name}" (User: ${userName || userId})`);

        const accessToken = await getAccessToken();
        const mainFolderId = '1KhZ2l4wk3HXwBhX18JFb10zNvWJNMjHi'; // Priority Root Folder
        let driveParentId = '';

        // 1. Resolve Parent Folder ID
        if (!parentId || parentId === 'root') {
            const safeUserName = userName || userId.substring(0, 8);
            driveParentId = await findOrCreateFolder(accessToken, safeUserName, mainFolderId);
        } else {
            const { data: folderData, error } = await sadhanaDbAdmin
                .from('folders')
                .select('google_drive_folder_id')
                .eq('id', parentId)
                .single();

            if (!error && folderData?.google_drive_folder_id) {
                driveParentId = folderData.google_drive_folder_id;
            } else {
                const safeUserName = userName || userId.substring(0, 8);
                driveParentId = await findOrCreateFolder(accessToken, safeUserName, mainFolderId);
            }
        }

        // 2. Create the actual folder
        const googleDriveId = await findOrCreateFolder(accessToken, name, driveParentId);

        console.log(`[Folder Create] Success! Drive ID: ${googleDriveId}`);

        res.status(200).json({
            googleDriveId,
            parentId: driveParentId
        });

    } catch (error) {
        console.error('[Folder Create Error]', error);
        res.status(500).json({ error: error.message || 'Failed to create folder in Google Drive' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`🚀 Render Indexer Service running on port ${PORT}`);
    console.log(`⏰ Native Node.js timeouts bypassed`);
    console.log(`==========================================\n`);
});

import { query } from '@/lib/db';
import { google } from 'googleapis';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

// Order in which key tables should appear in the spreadsheet
const PRIORITY_TABLES = [
  'camp_registrations',
  'camps',
  'users',
  'camp_payment_orders',
  'camp_refund_requests',
  'donations',
  'temples',
  'centers',
  'counselors',
  'sadhana_reports',
  'event_responses',
  'events',
  'user_profile_details',
  'membership_ids',
  'spiritual_masters',
  'cities'
];

// Tables to exclude from spreadsheet export (e.g. rate limits, keep alive, tokens)
const EXCLUDED_TABLES = [
  'rate_limits',
  'keep_alive',
  'database_backup_logs'
];

export interface BackupExecutionResult {
  success: boolean;
  logId: string;
  folderId?: string;
  folderUrl?: string;
  sheetUrl?: string;
  sqlUrl?: string;
  tablesCount: number;
  recordsCount: number;
  fileSizeBytes: number;
  durationMs: number;
  error?: string;
}

/**
 * Initializes authenticated Google Drive v3 client using stored OAuth credentials
 */
export async function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) not configured in environment.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Finds or creates a subfolder in Google Drive
 */
async function findOrCreateFolder(drive: any, folderName: string, parentFolderId?: string): Promise<{ id: string; url: string }> {
  try {
    const escapedName = folderName.replace(/'/g, "\\'");
    let q = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentFolderId) {
      q += ` and '${parentFolderId}' in parents`;
    }

    const res = await drive.files.list({
      q,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      const f = res.data.files[0];
      return { id: f.id!, url: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}` };
    }

    // Create folder
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined,
      },
      fields: 'id, name, webViewLink',
    });

    const newId = createRes.data.id!;
    return {
      id: newId,
      url: createRes.data.webViewLink || `https://drive.google.com/drive/folders/${newId}`,
    };
  } catch (err: any) {
    console.error(`Error in findOrCreateFolder for "${folderName}":`, err.message);
    throw err;
  }
}

/**
 * Executes a full database backup:
 * 1. Exports all public tables to a multi-tab Excel Workbook (opens natively in Google Sheets)
 * 2. Exports a complete SQL dump of all table schemas and data
 * 3. Uploads both to a dedicated dated folder in Google Drive
 * 4. Logs full execution metrics in database_backup_logs
 */
export async function runDatabaseBackup({
  triggerType = 'manual',
  triggeredBy = 'System Admin',
}: {
  triggerType?: 'manual' | 'scheduled';
  triggeredBy?: string;
}): Promise<BackupExecutionResult> {
  const startTime = Date.now();

  // 1. Create in_progress log entry
  const initLogRes = await query(
    `INSERT INTO database_backup_logs (
      trigger_type, triggered_by, status
    ) VALUES ($1, $2, 'in_progress') RETURNING id`,
    [triggerType, triggeredBy]
  );
  const logId = initLogRes.rows[0].id;

  try {
    // 2. Fetch list of all public tables
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);

    let tableNames: string[] = tablesRes.rows
      .map((r: any) => r.table_name)
      .filter((t: string) => !EXCLUDED_TABLES.includes(t));

    // Sort so priority tables are first
    tableNames = [
      ...PRIORITY_TABLES.filter(t => tableNames.includes(t)),
      ...tableNames.filter(t => !PRIORITY_TABLES.includes(t))
    ];

    // 3. Connect to Google Drive
    const drive = await getGoogleDriveClient();
    const parentFolderId = process.env.MAIN_DRIVE_FOLDER_ID || undefined;

    // Resolve root backups folder: "VoiceGurukul Database Backups"
    const rootBackupFolder = await findOrCreateFolder(drive, 'VoiceGurukul Database Backups', parentFolderId);

    // Format IST date and time string: e.g. "2026-11-21 (01-00 AM IST)"
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const yyyy = istDate.getUTCFullYear();
    const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getUTCDate()).padStart(2, '0');
    let hours = istDate.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hhStr = String(hours).padStart(2, '0');
    const minStr = String(istDate.getUTCMinutes()).padStart(2, '0');

    const folderName = `${yyyy}-${mm}-${dd} (${hhStr}-${minStr} ${ampm} IST)`;
    const dayFolder = await findOrCreateFolder(drive, folderName, rootBackupFolder.id);

    // 4. Build Excel Workbook & SQL Dump
    const wb = XLSX.utils.book_new();
    let totalRecords = 0;
    const tableDetails: Record<string, { count: number; columns: number }> = {};
    const sqlChunks: string[] = [
      `-- VoiceGurukul Database Backup\n`,
      `-- Date: ${now.toISOString()} (IST: ${folderName})\n`,
      `-- Trigger: ${triggerType} (${triggeredBy})\n\n`,
      `BEGIN;\n\n`
    ];

    for (const tableName of tableNames) {
      try {
        const rowsRes = await query(`SELECT * FROM "${tableName}"`);
        const rows = rowsRes.rows || [];
        totalRecords += rows.length;
        tableDetails[tableName] = {
          count: rows.length,
          columns: rowsRes.fields?.length || 0,
        };

        // Format rows for Excel (stringify JSON/arrays and protect password hashes)
        const sanitizedRows = rows.map((r) => {
          const formattedRow: Record<string, any> = {};
          for (const [key, val] of Object.entries(r)) {
            if (key === 'password_hash' || key === 'password') {
              formattedRow[key] = '[PROTECTED_HASH]';
            } else if (val !== null && typeof val === 'object') {
              formattedRow[key] = JSON.stringify(val);
            } else {
              formattedRow[key] = val;
            }
          }
          return formattedRow;
        });

        // Add to Excel workbook (sheet name max 31 chars in Excel)
        const sheetName = tableName.slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(sanitizedRows.length > 0 ? sanitizedRows : [{ _empty_table: 'No records' }]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Append to SQL dump
        sqlChunks.push(`-- Table: ${tableName} (${rows.length} rows)\n`);
        if (rows.length > 0 && rowsRes.fields) {
          const cols = rowsRes.fields.map(f => `"${f.name}"`).join(', ');
          for (const row of rows) {
            const vals = rowsRes.fields.map(f => {
              const val = row[f.name];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number' || typeof val === 'boolean') return String(val);
              if (typeof val === 'object') {
                return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              }
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');
            sqlChunks.push(`INSERT INTO "${tableName}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`);
          }
          sqlChunks.push('\n');
        }
      } catch (tableErr: any) {
        console.warn(`Could not export table ${tableName}:`, tableErr.message);
        tableDetails[tableName] = { count: 0, columns: 0 };
      }
    }

    sqlChunks.push(`COMMIT;\n`);
    const sqlDumpString = sqlChunks.join('');
    const sqlBuffer = Buffer.from(sqlDumpString, 'utf-8');

    // Generate Excel Buffer
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const totalFileSizeBytes = xlsxBuffer.length + sqlBuffer.length;

    // 5. Upload Excel / Google Sheet to Google Drive
    const sheetUploadRes = await drive.files.create({
      requestBody: {
        name: `VoiceGurukul_All_Tables_${yyyy}-${mm}-${dd}.xlsx`,
        parents: [dayFolder.id],
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: Readable.from(xlsxBuffer),
      },
      fields: 'id, name, webViewLink',
    });

    const sheetFileId = sheetUploadRes.data.id!;
    const sheetFileUrl = sheetUploadRes.data.webViewLink || `https://drive.google.com/file/d/${sheetFileId}/view`;

    // 6. Upload SQL Dump to Google Drive
    const sqlUploadRes = await drive.files.create({
      requestBody: {
        name: `voicegurukul_backup_${yyyy}-${mm}-${dd}.sql`,
        parents: [dayFolder.id],
      },
      media: {
        mimeType: 'application/sql',
        body: Readable.from(sqlBuffer),
      },
      fields: 'id, name, webViewLink',
    });

    const sqlFileId = sqlUploadRes.data.id!;
    const sqlFileUrl = sqlUploadRes.data.webViewLink || `https://drive.google.com/file/d/${sqlFileId}/view`;

    const durationMs = Date.now() - startTime;

    // 7. Update log entry with completion details
    await query(
      `UPDATE database_backup_logs SET
        status = 'completed',
        drive_folder_id = $1,
        drive_folder_name = $2,
        drive_folder_url = $3,
        sheet_file_id = $4,
        sheet_file_url = $5,
        sql_dump_file_id = $6,
        sql_dump_file_url = $7,
        tables_count = $8,
        records_count = $9,
        file_size_bytes = $10,
        duration_ms = $11,
        details = $12
      WHERE id = $13`,
      [
        dayFolder.id,
        folderName,
        dayFolder.url,
        sheetFileId,
        sheetFileUrl,
        sqlFileId,
        sqlFileUrl,
        tableNames.length,
        totalRecords,
        totalFileSizeBytes,
        durationMs,
        JSON.stringify(tableDetails),
        logId
      ]
    );

    // 8. Auto-cleanup: purge backups older than 30 days from Google Drive and database
    try {
      await purgeOldBackups(drive, 30);
    } catch (cleanupErr: any) {
      console.warn('Post-backup retention cleanup warning:', cleanupErr);
    }

    return {
      success: true,
      logId,
      folderId: dayFolder.id,
      folderUrl: dayFolder.url,
      sheetUrl: sheetFileUrl,
      sqlUrl: sqlFileUrl,
      tablesCount: tableNames.length,
      recordsCount: totalRecords,
      fileSizeBytes: totalFileSizeBytes,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error('Database backup failed:', err);

    await query(
      `UPDATE database_backup_logs SET
        status = 'failed',
        error_message = $1,
        duration_ms = $2
      WHERE id = $3`,
      [err.message || String(err), durationMs, logId]
    );

    return {
      success: false,
      logId,
      tablesCount: 0,
      recordsCount: 0,
      fileSizeBytes: 0,
      durationMs,
      error: err.message || String(err),
    };
  }
}

/**
 * Automatically cleans up backups older than retentionDays (default 30 days):
 * 1. Permanently deletes the folder and its files in Google Drive
 * 2. Deletes the corresponding log record in database_backup_logs
 */
export async function purgeOldBackups(drive: any, retentionDays: number = 30): Promise<number> {
  try {
    const oldLogsRes = await query(
      `SELECT id, drive_folder_id, drive_folder_name, created_at 
       FROM database_backup_logs 
       WHERE created_at < NOW() - ($1 || ' days')::interval`,
      [retentionDays]
    );

    const oldLogs = oldLogsRes.rows || [];
    if (oldLogs.length === 0) return 0;

    for (const oldLog of oldLogs) {
      if (oldLog.drive_folder_id) {
        try {
          await drive.files.delete({ fileId: oldLog.drive_folder_id });
          console.log(`[Backup Retention] Purged Google Drive folder "${oldLog.drive_folder_name}" (${oldLog.drive_folder_id})`);
        } catch (driveErr: any) {
          console.warn(`[Backup Retention] Could not delete Drive folder ${oldLog.drive_folder_id}:`, driveErr.message);
        }
      }

      await query(`DELETE FROM database_backup_logs WHERE id = $1`, [oldLog.id]);
    }
    console.log(`[Backup Retention] Successfully cleaned up ${oldLogs.length} backup(s) older than ${retentionDays} days.`);
    return oldLogs.length;
  } catch (purgeErr: any) {
    console.error('[Backup Retention] Error during backup purge:', purgeErr);
    return 0;
  }
}


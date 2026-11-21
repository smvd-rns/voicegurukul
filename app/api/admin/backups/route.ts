import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { runDatabaseBackup } from '@/lib/backups/backup-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check user admin role
    const userRes = await query('SELECT role, name FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const rawRoles = userRes.rows[0].role;
    const numericRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));
    const stringRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => String(r).toLowerCase().trim());

    const isSuperAdmin = numericRoles.includes(8) || stringRoles.includes('super_admin');
    const isAdmin = isSuperAdmin || numericRoles.some((r: number) => [1, 2, 8, 11].includes(r)) || stringRoles.includes('admin');

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    // Fetch backup logs
    const logsRes = await query(`
      SELECT 
        id,
        trigger_type,
        triggered_by,
        status,
        drive_folder_id,
        drive_folder_name,
        drive_folder_url,
        sheet_file_id,
        sheet_file_url,
        sql_dump_file_id,
        sql_dump_file_url,
        tables_count,
        records_count,
        file_size_bytes,
        duration_ms,
        error_message,
        details,
        created_at
      FROM database_backup_logs
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Fetch summary metrics
    const statsRes = await query(`
      SELECT 
        COUNT(*) AS total_backups,
        COUNT(*) FILTER (WHERE status = 'completed') AS successful_backups,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_backups,
        MAX(created_at) FILTER (WHERE status = 'completed') AS last_backup_at
      FROM database_backup_logs
    `);

    const stats = statsRes.rows[0] || {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      last_backup_at: null,
    };

    return NextResponse.json({
      success: true,
      logs: logsRes.rows || [],
      stats: {
        totalBackups: Number(stats.total_backups || 0),
        successfulBackups: Number(stats.successful_backups || 0),
        failedBackups: Number(stats.failed_backups || 0),
        lastBackupAt: stats.last_backup_at || null,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/backups:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRes = await query('SELECT role, name FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const rawRoles = userRes.rows[0].role;
    const numericRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));
    const stringRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => String(r).toLowerCase().trim());

    const isSuperAdmin = numericRoles.includes(8) || stringRoles.includes('super_admin');
    const isAdmin = isSuperAdmin || numericRoles.some((r: number) => [1, 2, 8, 11].includes(r)) || stringRoles.includes('admin');

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const adminName = userRes.rows[0].name || 'Admin';

    // Run backup
    const result = await runDatabaseBackup({
      triggerType: 'manual',
      triggeredBy: adminName,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Backup operation encountered an error',
        result,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database backup completed and uploaded to Google Drive successfully.',
      result,
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/backups:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}


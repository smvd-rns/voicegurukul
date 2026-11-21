import { NextRequest, NextResponse } from 'next/server';
import { runDatabaseBackup } from '@/lib/backups/backup-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const cronSecretHeader = req.headers.get('x-cron-secret') || '';
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('CRON_SECRET environment variable is not configured');
      return NextResponse.json({ success: false, error: 'Server configuration error: CRON_SECRET not configured' }, { status: 500 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== expectedSecret && cronSecretHeader !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    // Run scheduled backup
    const result = await runDatabaseBackup({
      triggerType: 'scheduled',
      triggeredBy: 'Automated 1:00 AM Cron',
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        result,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Automated nightly database backup executed and uploaded to Google Drive successfully.',
      result,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/backups/trigger:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}


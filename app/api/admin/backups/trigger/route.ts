import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runDatabaseBackup } from '@/lib/backups/backup-service';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Rate Limiting: Max 5 attempts per 10 minutes to prevent brute-force attacks
    const rateLimit = await checkRateLimit(req, null, {
      action: 'backup_cron_trigger',
      limit: 5,
      windowMs: 10 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });

    if (rateLimit.blocked) {
      return NextResponse.json({
        success: false,
        error: rateLimit.message || 'Too many requests. Please try again later.'
      }, { status: 429 });
    }

    // 2. Validate CRON_SECRET with timing-safe comparison
    const authHeader = req.headers.get('authorization') || '';
    const cronSecretHeader = req.headers.get('x-cron-secret') || '';
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || expectedSecret.length < 8) {
      console.error('CRON_SECRET is not configured or too short');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const token = (authHeader.replace(/^Bearer\s+/i, '').trim() || cronSecretHeader).trim();

    const expectedBuffer = Buffer.from(expectedSecret);
    const tokenBuffer = Buffer.from(token);

    if (expectedBuffer.length !== tokenBuffer.length || !crypto.timingSafeEqual(expectedBuffer, tokenBuffer)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Execute scheduled backup
    const result = await runDatabaseBackup({
      triggerType: 'scheduled',
      triggeredBy: 'Automated 1:00 AM Cron',
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Backup failed',
      }, { status: 500 });
    }

    // Never return raw database records or sensitive metadata in trigger response
    return NextResponse.json({
      success: true,
      message: 'Automated nightly database backup executed and uploaded to Google Drive successfully.',
      tablesCount: result.tablesCount,
      recordsCount: result.recordsCount,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/backups/trigger:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * Check if the current user already has a password set (GET)
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await query('SELECT password_hash FROM users WHERE id = $1', [decoded.userId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasPassword = Boolean(res.rows[0]?.password_hash);
    const isGoogleSession = decoded.provider === 'google';
    return NextResponse.json({ success: true, hasPassword, isGoogleSession });
  } catch (error: any) {
    console.error('[Get Password Status API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Set or change password for the current user (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const { password, currentPassword } = await req.json();
    if (!password || String(password).trim().length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
    }

    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a password set
    const userRes = await query('SELECT id, password_hash FROM users WHERE id = $1', [decoded.userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRes.rows[0];
    const isGoogleSession = decoded.provider === 'google';

    // If an existing password exists and NOT verified via Google session, verify currentPassword
    if (user.password_hash && !isGoogleSession) {
      if (!currentPassword) {
        return NextResponse.json({ 
          error: 'Please enter your current password, or verify with Google / use Forgot Password if you do not remember it.' 
        }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(String(currentPassword), user.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password).trim(), salt);

    // Update password_hash in database
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, decoded.userId]);

    return NextResponse.json({
      success: true,
      message: user.password_hash
        ? 'Password changed successfully'
        : 'Password set successfully! You can now log in using your Email/Phone and this Password.',
      hasPassword: true
    });
  } catch (error: any) {
    console.error('[Update Password API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

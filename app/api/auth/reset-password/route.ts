import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'voicegurukul_super_secret_jwt_key_2026_chaitanya_108';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // 1. Verify the token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or expired reset token. Please request a new password reset.' }, { status: 400 });
    }

    // 2. Validate token purpose
    if (decoded.purpose !== 'password-reset') {
      return NextResponse.json({ error: 'Invalid token purpose' }, { status: 400 });
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Update the user's password hash in the database
    const dbRes = await query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [
      passwordHash,
      decoded.userId,
    ]);

    if (dbRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successful.' });
  } catch (error: any) {
    console.error('[Reset Password API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

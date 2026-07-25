import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { sendForgotPasswordEmail } from '@/lib/utils/email';

const JWT_SECRET = process.env.JWT_SECRET || 'voicegurukul_super_secret_jwt_key_2026_chaitanya_108';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Fetch user from DB
    const res = await query('SELECT id, name, email FROM users WHERE email = $1', [trimmedEmail]);
    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'No account found with this email address. Please check your email or register for a new account.' },
        { status: 404 }
      );
    }

    const user = res.rows[0];

    // 2. Generate a secure, short-lived password reset token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        purpose: 'password-reset',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Construct reset link
    const origin = req.nextUrl.origin;
    const resetLink = `${origin}/auth/reset-password?token=${token}`;

    // 4. Send email
    const emailSent = await sendForgotPasswordEmail(user.email, user.name, resetLink);
    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send password reset email. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password reset email sent successfully.' });
  } catch (error: any) {
    console.error('[Forgot Password API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

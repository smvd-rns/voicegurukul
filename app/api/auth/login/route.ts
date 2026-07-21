import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken, setSessionCookie } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Fetch user from DB
    const res = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = res.rows[0];

    // If password_hash is not set (e.g. user was imported or created differently), block password login
    if (!user.password_hash) {
      return NextResponse.json({ error: 'Please log in using Google OAuth' }, { status: 401 });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 3. Create session token
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      session: {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            name: user.name,
          }
        }
      }
    });

    // 4. Set cookie
    setSessionCookie(response, token);

    return response;
  } catch (error: any) {
    console.error('[Login API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

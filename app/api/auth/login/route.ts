import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken, setSessionCookie } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email/Username and password are required' }, { status: 400 });
    }

    const identifier = String(email).trim();
    const cleanPhone = identifier.replace(/[^0-9]/g, '').slice(-10);

    // 1. Fetch user from DB by Email OR by 10-digit phone number
    const res = await query(
      `SELECT * FROM users 
       WHERE LOWER(email) = LOWER($1) 
          OR ($2 <> '' AND phone IS NOT NULL AND RIGHT(phone, 10) = $2)
       LIMIT 1`,
      [identifier, cleanPhone]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email/phone or password' }, { status: 401 });
    }

    const user = res.rows[0];

    // If password_hash is not set (e.g. user registered with Google), guide them to set password or use Google
    if (!user.password_hash) {
      return NextResponse.json({ 
        error: 'No local password has been set for this account yet. Please sign in with Google or set a password in your Profile.' 
      }, { status: 401 });
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
      provider: 'credentials',
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

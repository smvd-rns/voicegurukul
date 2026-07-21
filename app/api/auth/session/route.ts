import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ session: null });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ session: null });
    }

    // Verify user still exists in database
    const res = await query('SELECT id, email, name FROM users WHERE id = $1', [decoded.userId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ session: null });
    }

    const user = res.rows[0];

    return NextResponse.json({
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
  } catch (error) {
    console.error('[Session API Error]', error);
    return NextResponse.json({ session: null });
  }
}

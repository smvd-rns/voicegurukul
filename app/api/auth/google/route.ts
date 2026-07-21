import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken, setSessionCookie } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const nextPath = searchParams.get('state') || '/';

    if (!code) {
      return NextResponse.redirect(new URL('/auth/login?error=no_code', req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Construct the redirect URL dynamically from incoming request origin (guarantees 100% exact match with browser URL)
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google`;

    // 1. Exchange OAuth code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Google OAuth Token Error]', errText);
      const encodedErr = encodeURIComponent(errText.substring(0, 100));
      return NextResponse.redirect(new URL(`/auth/login?error=token_exchange_failed&details=${encodedErr}`, req.url));
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. Fetch User profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/auth/login?error=profile_fetch_failed', req.url));
    }

    const googleUser = await userRes.json();
    const email = googleUser.email?.toLowerCase();
    const name = googleUser.name;
    const profileImage = googleUser.picture;

    if (!email) {
      return NextResponse.redirect(new URL('/auth/login?error=no_email', req.url));
    }

    // 3. Find or Create User in local database
    let dbUserRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (dbUserRes.rows.length === 0) {
      // Create user if not exists
      const newUserId = uuidv4();
      await query(
        `INSERT INTO users (id, email, name, role, profile_image, verification_status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [newUserId, email, name, [1], profileImage, 'verified']
      );
      // Fetch the newly created user
      dbUserRes = await query('SELECT * FROM users WHERE id = $1', [newUserId]);
    }

    user = dbUserRes.rows[0];

    // 4. Create Session JWT
    const sessionToken = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // 5. Set Cookie and Redirect to app
    const response = NextResponse.redirect(new URL(nextPath, req.url));
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    console.error('[Google OAuth Callback Exception]', error);
    return NextResponse.redirect(new URL('/auth/login?error=auth_error', req.url));
  }
}

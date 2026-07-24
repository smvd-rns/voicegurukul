import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * GET Redirect:
 * Redirects legacy email links to the new Client-Side Approval Page
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token) {
    return new NextResponse('Invalid approval link.', { status: 400 });
  }

  // Redirect to the client-side page which handles session/auth better on localhost
  const redirectUrl = new URL('/approve-gateway', request.url);
  redirectUrl.searchParams.set('token', token);
  
  return NextResponse.redirect(redirectUrl);
}

/**
 * POST Process:
 * Called by the /approve-gateway client page to finalize the change
 */
export async function POST(request: Request) {
  try {
    const { token, userId } = await request.json();

    const admin = getAdminClient();

    // 1. Verify User Role 8 (Super Admin)
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData?.role?.includes(8)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Role 8 required.' }, { status: 403 });
    }

    // 2. Verify token exists in database
    const { data: settings, error: fetchError } = await admin
      .from('platform_settings')
      .select('pending_value')
      .eq('approval_token', token)
      .single();

    if (fetchError || !settings) {
      return NextResponse.json({ success: false, error: 'This approval link is invalid or expired.' }, { status: 400 });
    }

    // 3. Update the active gateway
    const { error: updateError } = await admin
      .from('platform_settings')
      .update({ 
        value: settings.pending_value,
        pending_value: null,
        approval_token: null 
      })
      .eq('id', 'active_payment_gateway');

    if (updateError) {
      console.error('Approval update error:', updateError);
      return NextResponse.json({ success: false, error: 'Database update failed.' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      gateway: settings.pending_value 
    });

  } catch (error: any) {
    console.error('Critical approval error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

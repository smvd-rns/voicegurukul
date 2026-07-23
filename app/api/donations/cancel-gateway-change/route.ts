import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { userId: bodyUserId } = await request.json();
    
    // 1. Verify Authentication
    console.log('--- CANCEL REQUEST INITIATED ---');
    const user = await getAuthUserFromRequest(request);

    // Use session user if available, fallback to bodyUserId
    const targetUserId = user?.id || bodyUserId;

    if (!targetUserId) {
      console.warn('Unauthorized cancel attempt: No session and no body userId');
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // 2. Verify Role 8 using Admin Client (Bypasses RLS issues)
    const admin = getAdminClient();
    console.log('Verifying user for cancel:', { targetUserId, source: user ? 'session' : 'body' });

    const { data: userData, error: roleError } = await admin
      .from('users')
      .select('role, email')
      .eq('id', targetUserId)
      .single();

    if (roleError || !userData) {
      console.error('Role check error for cancel:', roleError);
      return NextResponse.json({ error: 'Unauthorized: User record not found' }, { status: 403 });
    }

    // Support both array [8] and single value 8
    const role = userData.role;
    const isAuthorized = Array.isArray(role) ? role.includes(8) : role === 8;

    if (!isAuthorized) {
      console.error('Unauthorized cancel attempt (insufficient role):', { email: userData.email, role: userData.role });
      return NextResponse.json({ error: 'Unauthorized: Role 8 required' }, { status: 403 });
    }

    // 3. Clear Pending Settings
    const { error: clearError } = await admin
      .from('platform_settings')
      .update({ 
        pending_value: null,
        approval_token: null
      })
      .eq('id', 'active_payment_gateway');

    if (clearError) {
      console.error('Error clearing settings:', clearError);
      throw clearError;
    }

    console.log('Gateway change request successfully cancelled for:', userData.email);

    return NextResponse.json({ success: true, message: 'Gateway change request cancelled' });

  } catch (error: any) {
    console.error('Cancel request critical error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

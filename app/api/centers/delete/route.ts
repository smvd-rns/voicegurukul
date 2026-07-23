import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { centerId } = await request.json();

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    // Initialize Supabase with Service Role Key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const user = await getAuthUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: userData, error: roleError } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      return NextResponse.json({ error: 'Failed to verify user permissions' }, { status: 403 });
    }

    const updatedRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    const hasPermission = updatedRoles.some((r: any) => [8, 11, 12, 13].includes(Number(r)) || ['super_admin', 'managing_director', 'director', 'central_voice_manager'].includes(String(r)));

    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied. Only Admins can delete centers.' }, { status: 403 });
    }

    // Proceed with deletion using admin client
    const { error: deleteError } = await adminSupabase
      .from('centers')
      .delete()
      .eq('id', centerId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting center from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete center' }, { status: 500 });
  }
}

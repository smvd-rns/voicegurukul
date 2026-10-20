import { NextResponse } from 'next/server';
import { deleteCityFromSupabase } from '@/lib/supabase/cities';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server-db';

export async function POST(request: Request) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const roles = Array.isArray(profile?.role) ? profile.role : [profile?.role];
    const numRoles = roles.map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
    const isSuperAdmin = numRoles.includes(8) || roles.includes('super_admin');

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required to delete cities' }, { status: 403 });
    }

    const { state, cityName } = await request.json();
    if (!state || !cityName) {
      return NextResponse.json({ error: 'State and cityName are required' }, { status: 400 });
    }
    
    await deleteCityFromSupabase(state, cityName);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting city from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete city' }, { status: 500 });
  }
}

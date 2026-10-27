import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const ashram = searchParams.get('ashram') || '';

    const supabase = createClient();

    // Check if user is authenticated and has administrative/counselor privileges
    const user = await getAuthUserFromRequest(request);
    let canViewContactPII = false;

    if (user?.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const roles = Array.isArray(profile?.role) ? profile.role : [profile?.role];
      const numRoles = roles.map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
      canViewContactPII = numRoles.some((r: number) => [2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21].includes(r)) ||
        roles.includes('super_admin') || roles.includes('counselor') || roles.includes('managing_director');
    }

    // Public / Regular Student: Hide PII (mobile, email)
    // Authorized Leadership / Counselors: Show full contact info
    const selectFields = canViewContactPII
      ? 'id, name, mobile, email, city, ashram, user_id'
      : 'id, name, city, ashram, user_id';

    let query = supabase
      .from('counselors')
      .select(selectFields)
      .eq('is_verified', true) // Only show verified counselors to be safe (RLS also enforces this for anon)
      .order('name', { ascending: true });

    // If ashram filter provided, filter by ashram
    if (ashram.trim()) {
      query = query.eq('ashram', ashram.trim());
    }

    // If search term provided, filter by name or city
    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching counselors:', error);
      throw new Error(error.message || 'Failed to fetch counselors');
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in counselors GET route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch counselors' },
      { status: 500 }
    );
  }
}

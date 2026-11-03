import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server-db';
import { sanitizeInput } from '@/lib/utils/validation';

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
    const isAuthorized = numRoles.some((r: number) => [8, 9, 10, 11, 12, 13, 21].includes(r)) ||
      roles.includes('super_admin') || roles.includes('managing_director');

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to update cities' }, { status: 403 });
    }

    const body = await request.json();
    let { state, oldCityName, newCityName } = body;

    if (!state || !oldCityName || !newCityName) {
      return NextResponse.json({ error: 'state, oldCityName, and newCityName are required' }, { status: 400 });
    }

    state = sanitizeInput(state).trim();
    oldCityName = sanitizeInput(oldCityName).trim();
    newCityName = sanitizeInput(newCityName).trim();

    if (!newCityName) {
      return NextResponse.json({ error: 'New city name cannot be empty' }, { status: 400 });
    }

    // If name is unchanged
    if (oldCityName === newCityName) {
      return NextResponse.json({ success: true });
    }

    // Check if newCityName already exists in this state (when name changes)
    if (oldCityName.toLowerCase() !== newCityName.toLowerCase()) {
      const { data: existing } = await supabase
        .from('cities')
        .select('id')
        .eq('state', state)
        .eq('name', newCityName)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: `City "${newCityName}" already exists in ${state}` }, { status: 400 });
      }
    }

    // Update cities table
    const { error: updateError } = await supabase
      .from('cities')
      .update({ name: newCityName, updated_at: new Date().toISOString() })
      .eq('state', state)
      .eq('name', oldCityName);

    if (updateError) {
      throw updateError;
    }

    // Cascade update references in other tables
    try {
      await supabase
        .from('centers')
        .update({ city: newCityName })
        .eq('state', state)
        .eq('city', oldCityName);

      await supabase
        .from('users')
        .update({ city: newCityName })
        .eq('state', state)
        .eq('city', oldCityName);

      await supabase
        .from('temples')
        .update({ city: newCityName })
        .eq('state', state)
        .eq('city', oldCityName);
    } catch (cascadeErr) {
      console.warn('Cascade update notice:', cascadeErr);
    }

    // Revalidate cities cache
    try {
      const { revalidateTag } = await import('next/cache');
      revalidateTag('cities');
    } catch (cacheErr) {
      console.warn('Cache revalidate notice:', cacheErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating city:', error);
    return NextResponse.json({ error: error.message || 'Failed to update city' }, { status: 500 });
  }
}


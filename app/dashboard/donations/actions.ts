'use server';

import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import { getAuthUserFromCookies } from '@/lib/supabase/admin';

/**
 * Fetches donations for a specific user, bypassing RLS via service role.
 */
export async function fetchUserDonations(userId: string, accessToken?: string) {
  try {
    const user = await getAuthUserFromCookies();
    
    // Verify the requesting user is authenticated and matches target userId
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    // Use admin client to bypass RLS, but filter to only this user's donations
    const admin = getSadhanaAdminClient();
    const { data, error: donationsError } = await admin
      .from('donations')
      .select('*')
      .eq('tag_user_id', userId)
      .order('created_at', { ascending: false });

    if (donationsError) throw new Error(donationsError.message);

    return { success: true, donations: data };
  } catch (err: any) {
    console.error('fetchUserDonations error:', err);
    return { success: false, error: err.message };
  }
}

'use server';

import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import { getAdminClient, getAuthUserFromCookies } from '@/lib/supabase/admin';

/**
 * Fetches all donations from the secondary database.
 * Only allowed for Super Admins (Role 8).
 */
export async function fetchAllDonations(accessToken?: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const requesterId = user.id;

    // 2. Verify Role 8 using service-role client (avoids RLS dependency)
    const primaryAdmin = getAdminClient();
    const { data: userData, error: roleError } = await primaryAdmin
      .from('users')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (roleError || !userData?.role?.includes(8)) {
      throw new Error('Unauthorized: Super Admin access required.');
    }

    // 3. Fetch Donations using Sadhana Admin Client (Bypasses RLS)
    const sadhanaAdmin = getSadhanaAdminClient();
    const { data, error } = await sadhanaAdmin
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Donation fetch error:', error);
      throw new Error('Failed to load donations: ' + error.message);
    }

    return { success: true, donations: data };

  } catch (error: any) {
    console.error('fetchAllDonations error:', error);
    return { success: false, error: error.message };
  }
}

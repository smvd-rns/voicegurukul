'use server';

import { query } from '@/lib/db';
import { getAdminClient, getAuthUserFromCookies } from '@/lib/supabase/admin';

/**
 * Fetches all donations and enriches collector information directly from the database.
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

    const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
    const isSuperAdmin = roles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');

    if (roleError || !isSuperAdmin) {
      throw new Error('Unauthorized: Super Admin access required.');
    }

    // 3. Fetch Donations directly from database
    const { rows: donations } = await query(
      `SELECT * FROM donations ORDER BY created_at DESC`
    );

    // 4. Resolve collector details from users table
    const tagUserIds = Array.from(new Set(donations.map((d: any) => d.tag_user_id).filter(Boolean)));
    const collectorsMap: Record<string, any> = {};

    if (tagUserIds.length > 0) {
      const { rows: userRows } = await query(
        `SELECT id, name, donation_slug, parent_center, other_parent_center, parent_temple, other_parent_temple, current_center, other_center, current_temple, other_temple, center 
         FROM users WHERE id = ANY($1::uuid[])`,
        [tagUserIds]
      );

      userRows.forEach((u: any) => {
        let parentCenter = 'None';
        if (u.parent_center && u.parent_center !== 'None' && u.parent_center !== 'General') {
          parentCenter = u.parent_center === 'Other' && u.other_parent_center ? u.other_parent_center.trim() : u.parent_center.trim();
        }
        let parentTemple = 'None';
        if (u.parent_temple && u.parent_temple !== 'None' && u.parent_temple !== 'General') {
          parentTemple = u.parent_temple === 'Other' && u.other_parent_temple ? u.other_parent_temple.trim() : u.parent_temple.trim();
        }
        let currentCenter = 'None';
        if (u.current_center && u.current_center !== 'None' && u.current_center !== 'General') {
          currentCenter = u.current_center === 'Other' && u.other_center ? u.other_center.trim() : u.current_center.trim();
        } else if (u.center && u.center !== 'None') {
          currentCenter = u.center.trim();
        }
        let currentTemple = 'None';
        if (u.current_temple && u.current_temple !== 'None' && u.current_temple !== 'General') {
          currentTemple = u.current_temple === 'Other' && u.other_temple ? u.other_temple.trim() : u.current_temple.trim();
        }

        collectorsMap[u.id] = {
          name: u.name || 'Unknown',
          slug: u.donation_slug || '',
          parentCenter,
          parentTemple,
          currentCenter,
          currentTemple,
          center: parentCenter !== 'None' ? parentCenter : currentCenter,
          temple: parentTemple !== 'None' ? parentTemple : currentTemple
        };
      });
    }

    // 5. Attach resolved collector_slug and collector info directly to each donation record
    const enrichedDonations = donations.map((d: any) => {
      const collector = collectorsMap[d.tag_user_id];
      const resolvedSlug =
        collector?.slug ||
        d.metadata?.collector_slug ||
        d.metadata?.collector?.slug ||
        d.collector_slug ||
        '';

      return {
        ...d,
        collector_slug: resolvedSlug
      };
    });

    return { 
      success: true, 
      donations: enrichedDonations, 
      collectors: collectorsMap 
    };

  } catch (error: any) {
    console.error('fetchAllDonations error:', error);
    return { success: false, error: error.message };
  }
}

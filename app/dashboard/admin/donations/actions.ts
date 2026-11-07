'use server';

import { query } from '@/lib/db';
import { getAdminClient, getAuthUserFromCookies } from '@/lib/supabase/admin';

/**
 * Helper to ensure Super Admin access for administrative donation actions.
 */
async function verifySuperAdmin() {
  const user = await getAuthUserFromCookies();
  if (!user) throw new Error('Unauthorized');

  const primaryAdmin = getAdminClient();
  const { data: userData, error: roleError } = await primaryAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const isSuperAdmin = roles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');

  if (roleError || !isSuperAdmin) {
    throw new Error('Unauthorized: Super Admin access required.');
  }

  return user;
}

/**
 * Helper to verify whether user is Super Admin or has granted View-Only access to All Donations.
 */
async function verifyDonationsViewerOrAdmin() {
  const user = await getAuthUserFromCookies();
  if (!user) throw new Error('Unauthorized');

  const primaryAdmin = getAdminClient();
  const { data: userData, error: roleError } = await primaryAdmin
    .from('users')
    .select('role, can_view_all_donations, hierarchy')
    .eq('id', user.id)
    .single();

  const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const isSuperAdmin = roles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');
  const canViewAllDonations = Boolean(
    userData?.can_view_all_donations || 
    userData?.hierarchy?.can_view_all_donations || 
    userData?.hierarchy?.canViewAllDonations
  );

  if (roleError || (!isSuperAdmin && !canViewAllDonations)) {
    throw new Error('Unauthorized: You do not have permission to view donation logs.');
  }

  return { user, isSuperAdmin, isViewOnly: !isSuperAdmin };
}

/**
 * Fetches all donations and enriches collector information directly from the database.
 * Allowed for Super Admins (Role 8) and Authorized View-Only Donors/Accountants.
 */
export async function fetchAllDonations(accessToken?: string) {
  try {
    const { isSuperAdmin, isViewOnly } = await verifyDonationsViewerOrAdmin();

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
      collectors: collectorsMap,
      isViewOnly,
      isSuperAdmin
    };

  } catch (error: any) {
    console.error('fetchAllDonations error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the Behalf Devotees list, enriched with total amount raised.
 * Allowed for Super Admin and View-Only Donors/Accountants.
 */
export async function fetchBehalfDevotees() {
  try {
    await verifyDonationsViewerOrAdmin();

    const { rows: devotees } = await query(
      `SELECT d.*, 
              COALESCE(SUM(CASE WHEN dn.payment_status IN ('captured', 'success') THEN dn.amount ELSE 0 END), 0) AS total_raised,
              COUNT(CASE WHEN dn.payment_status IN ('captured', 'success') THEN 1 ELSE NULL END) AS donation_count
       FROM donation_behalf_devotees d
       LEFT JOIN donations dn ON (dn.on_behalf_of_id = d.user_id::text OR dn.on_behalf_of_id = d.id::text OR LOWER(TRIM(dn.on_behalf_of_name)) = LOWER(TRIM(d.name)))
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    );

    return { success: true, devotees };
  } catch (error: any) {
    console.error('fetchBehalfDevotees error:', error);
    return { success: false, error: error.message, devotees: [] };
  }
}

/**
 * Searches users from the users table for the Super Admin to add to the behalf list.
 */
export async function searchUsersForBehalf(searchQuery: string) {
  try {
    await verifySuperAdmin();
    const cleanQuery = `%${(searchQuery || '').trim()}%`;

    const { rows: users } = await query(
      `SELECT id, name, email, phone, current_center, current_temple, parent_center, parent_temple, center, donation_slug
       FROM users 
       WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR donation_slug ILIKE $1
       ORDER BY name ASC 
       LIMIT 15`,
      [cleanQuery]
    );

    return { success: true, users };
  } catch (error: any) {
    console.error('searchUsersForBehalf error:', error);
    return { success: false, error: error.message, users: [] };
  }
}

/**
 * Issues / Adds a devotee to the Behalf list.
 */
export async function addBehalfDevotee(data: {
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  center?: string;
  temple?: string;
}) {
  try {
    const adminUser = await verifySuperAdmin();

    if (!data.name || !data.name.trim()) {
      throw new Error('Devotee name is required.');
    }

    // Check if devotee already added by userId or name
    if (data.userId) {
      const { rows: existing } = await query(
        `SELECT id FROM donation_behalf_devotees WHERE user_id = $1`,
        [data.userId]
      );
      if (existing.length > 0) {
        throw new Error('This devotee is already in the behalf collection list.');
      }
    }

    const { rows: inserted } = await query(
      `INSERT INTO donation_behalf_devotees (user_id, name, email, phone, center, temple, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
       RETURNING *`,
      [
        data.userId || null,
        data.name.trim(),
        data.email?.trim() || null,
        data.phone?.trim() || null,
        data.center?.trim() || null,
        data.temple?.trim() || null,
        adminUser.id
      ]
    );

    return { success: true, devotee: inserted[0] };
  } catch (error: any) {
    console.error('addBehalfDevotee error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Removes a devotee from the Behalf list.
 */
export async function deleteBehalfDevotee(id: string) {
  try {
    await verifySuperAdmin();
    await query(`DELETE FROM donation_behalf_devotees WHERE id = $1`, [id]);
    return { success: true };
  } catch (error: any) {
    console.error('deleteBehalfDevotee error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggles the active status of a devotee in the Behalf list.
 */
export async function toggleBehalfDevoteeStatus(id: string, isActive: boolean) {
  try {
    await verifySuperAdmin();
    const { rows } = await query(
      `UPDATE donation_behalf_devotees SET is_active = $1 WHERE id = $2 RETURNING *`,
      [isActive, id]
    );
    return { success: true, devotee: rows[0] };
  } catch (error: any) {
    console.error('toggleBehalfDevoteeStatus error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all pending change requests from users who want to change their behalf collection devotee.
 */
export async function fetchBehalfChangeRequests() {
  try {
    const { isSuperAdmin } = await verifyDonationsViewerOrAdmin();
    if (!isSuperAdmin) {
      return { success: true, requests: [] };
    }

    const { rows: requests } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.current_center, u.current_temple, 
              u.parent_center, u.parent_temple, u.center, u.donation_slug,
              u.selected_behalf_id, u.selected_behalf_name,
              u.behalf_change_request_id, u.behalf_change_request_name,
              u.behalf_change_request_status, u.behalf_change_request_reason,
              u.behalf_change_requested_at
       FROM users u
       WHERE u.behalf_change_request_status = 'pending'
       ORDER BY u.behalf_change_requested_at DESC`
    );

    return { success: true, requests };
  } catch (error: any) {
    console.error('fetchBehalfChangeRequests error:', error);
    return { success: false, error: error.message, requests: [] };
  }
}

/**
 * Approves a user's behalf change request, locking in the new devotee.
 */
export async function approveBehalfChangeRequest(targetUserId: string) {
  try {
    await verifySuperAdmin();

    const { rows: userRows } = await query(
      `SELECT behalf_change_request_id, behalf_change_request_name FROM users WHERE id = $1`,
      [targetUserId]
    );

    if (userRows.length === 0 || !userRows[0].behalf_change_request_id) {
      throw new Error('No pending change request found for this user.');
    }

    const { rows: updated } = await query(
      `UPDATE users 
       SET selected_behalf_id = behalf_change_request_id,
           selected_behalf_name = behalf_change_request_name,
           behalf_change_request_status = 'approved',
           behalf_change_request_id = NULL,
           behalf_change_request_name = NULL,
           behalf_change_request_reason = NULL,
           behalf_change_requested_at = NULL
       WHERE id = $1
       RETURNING id, name, selected_behalf_id, selected_behalf_name`,
      [targetUserId]
    );

    return { success: true, user: updated[0] };
  } catch (error: any) {
    console.error('approveBehalfChangeRequest error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rejects a user's behalf change request.
 */
export async function rejectBehalfChangeRequest(targetUserId: string) {
  try {
    await verifySuperAdmin();

    await query(
      `UPDATE users 
       SET behalf_change_request_status = 'rejected',
           behalf_change_request_id = NULL,
           behalf_change_request_name = NULL,
           behalf_change_request_reason = NULL,
           behalf_change_requested_at = NULL
       WHERE id = $1`,
      [targetUserId]
    );

    return { success: true };
  } catch (error: any) {
    console.error('rejectBehalfChangeRequest error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unlocks or resets a user's behalf selection back to null so they can choose afresh.
 */
export async function adminResetUserBehalf(targetUserId: string) {
  try {
    await verifySuperAdmin();

    await query(
      `UPDATE users 
       SET selected_behalf_id = NULL,
           selected_behalf_name = NULL,
           behalf_change_request_status = NULL,
           behalf_change_request_id = NULL,
           behalf_change_request_name = NULL,
           behalf_change_request_reason = NULL,
           behalf_change_requested_at = NULL
       WHERE id = $1`,
      [targetUserId]
    );

    return { success: true };
  } catch (error: any) {
    console.error('adminResetUserBehalf error:', error);
    return { success: false, error: error.message };
  }
}

'use server';

import { query } from '@/lib/db';
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

    return { success: true, donations: data || [] };
  } catch (err: any) {
    console.error('fetchUserDonations error:', err);
    return { success: false, error: err.message, donations: [] };
  }
}

/**
 * Fetches all active devotees issued by Super Admin for on-behalf donation collection.
 */
export async function fetchActiveBehalfDevotees() {
  try {
    const user = await getAuthUserFromCookies();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { rows } = await query(
      `SELECT id, user_id, name, email, phone, center, temple 
       FROM donation_behalf_devotees 
       WHERE is_active = TRUE 
       ORDER BY name ASC`
    );

    return { success: true, devotees: rows };
  } catch (err: any) {
    console.error('fetchActiveBehalfDevotees error:', err);
    return { success: false, error: err.message, devotees: [] };
  }
}

/**
 * Checks if the current user is included in the Super Admin's behalf list,
 * and retrieves their behalf record if present.
 */
export async function checkIfUserIsOnBehalfList(userId: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user || user.id !== userId) {
      return { success: false, isOnList: false };
    }

    const { rows } = await query(
      `SELECT d.* 
       FROM donation_behalf_devotees d
       LEFT JOIN users u ON u.id = $1
       WHERE d.is_active = TRUE 
         AND (d.user_id = $1 OR LOWER(TRIM(d.name)) = LOWER(TRIM(u.name)) OR (d.email IS NOT NULL AND LOWER(TRIM(d.email)) = LOWER(TRIM(u.email))))
       LIMIT 1`,
      [userId]
    );

    if (rows.length > 0) {
      return { success: true, isOnList: true, behalfDevotee: rows[0] };
    }

    return { success: true, isOnList: false };
  } catch (err: any) {
    console.error('checkIfUserIsOnBehalfList error:', err);
    return { success: false, isOnList: false };
  }
}

/**
 * Fetches donations collected by other users ON BEHALF of this devotee.
 */
export async function fetchBehalfDonations(userId: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    // Look up user's name to match either ID or name in donations
    const { rows: userRows } = await query(`SELECT id, name FROM users WHERE id = $1`, [userId]);
    const userName = userRows[0]?.name || '';

    // Query donations where on_behalf_of_id matches userId OR on_behalf_of_name matches userName
    // Also join users to get the collector's name and details
    const { rows: donations } = await query(
      `SELECT dn.*, 
              u.name AS collector_name,
              u.email AS collector_email,
              u.phone AS collector_phone,
              u.current_center AS collector_center,
              u.current_temple AS collector_temple
       FROM donations dn
       LEFT JOIN users u ON u.id::text = dn.tag_user_id
       WHERE (dn.on_behalf_of_id = $1 
              OR ($2 <> '' AND LOWER(TRIM(dn.on_behalf_of_name)) = LOWER(TRIM($2))))
       ORDER BY dn.created_at DESC`,
      [userId, userName]
    );

    return { success: true, donations };
  } catch (err: any) {
    console.error('fetchBehalfDonations error:', err);
    return { success: false, error: err.message, donations: [] };
  }
}

/**
 * Fetches the user's currently frozen behalf devotee and any pending change request.
 */
export async function getUserBehalfStatus(userId: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    const { rows } = await query(
      `SELECT selected_behalf_id, selected_behalf_name, 
              behalf_change_request_id, behalf_change_request_name, 
              behalf_change_request_status, behalf_change_request_reason, 
              behalf_change_requested_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) return { success: false, error: 'User not found' };

    return { success: true, status: rows[0] };
  } catch (err: any) {
    console.error('getUserBehalfStatus error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Freezes the behalf devotee selection for the user. Once frozen, cannot be changed
 * without Super Admin approval.
 */
export async function freezeUserBehalfSelection(userId: string, behalfId: string, behalfName: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    if (!behalfId || !behalfName) {
      throw new Error('Behalf devotee is required to lock selection.');
    }

    // Verify devotee exists in active list
    const { rows: devoteeRows } = await query(
      `SELECT id, name FROM donation_behalf_devotees WHERE id = $1 AND is_active = TRUE`,
      [behalfId]
    );

    if (devoteeRows.length === 0) {
      throw new Error('Selected devotee is not active or valid.');
    }

    const { rows: userRows } = await query(
      `SELECT selected_behalf_id FROM users WHERE id = $1`,
      [userId]
    );

    // If already set, do not allow direct overwrite
    if (userRows[0]?.selected_behalf_id) {
      throw new Error('Behalf devotee is already locked. Submit a change request to modify it.');
    }

    const { rows: updated } = await query(
      `UPDATE users 
       SET selected_behalf_id = $1, selected_behalf_name = $2 
       WHERE id = $3 
       RETURNING selected_behalf_id, selected_behalf_name`,
      [behalfId, devoteeRows[0].name, userId]
    );

    return { success: true, user: updated[0] };
  } catch (err: any) {
    console.error('freezeUserBehalfSelection error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submits a change request to Super Admin to switch to a different behalf devotee.
 */
export async function requestBehalfChange(userId: string, newBehalfId: string, newBehalfName: string, reason?: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    if (!newBehalfId || !newBehalfName) {
      throw new Error('Target behalf devotee is required.');
    }

    const { rows: updated } = await query(
      `UPDATE users 
       SET behalf_change_request_id = $1,
           behalf_change_request_name = $2,
           behalf_change_request_status = 'pending',
           behalf_change_request_reason = $3,
           behalf_change_requested_at = NOW()
       WHERE id = $4
       RETURNING behalf_change_request_id, behalf_change_request_name, behalf_change_request_status`,
      [newBehalfId, newBehalfName, reason?.trim() || null, userId]
    );

    return { success: true, request: updated[0] };
  } catch (err: any) {
    console.error('requestBehalfChange error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Cancels a pending change request.
 */
export async function cancelBehalfChangeRequest(userId: string) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    await query(
      `UPDATE users 
       SET behalf_change_request_id = NULL,
           behalf_change_request_name = NULL,
           behalf_change_request_status = NULL,
           behalf_change_request_reason = NULL,
           behalf_change_requested_at = NULL
       WHERE id = $1`,
      [userId]
    );

    return { success: true };
  } catch (err: any) {
    console.error('cancelBehalfChangeRequest error:', err);
    return { success: false, error: err.message };
  }
}

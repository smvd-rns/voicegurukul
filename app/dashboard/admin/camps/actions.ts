'use server';

import { query } from '@/lib/db';
import { getAuthUserFromCookies } from '@/lib/supabase/admin';
import { Camp, CampRegistration, CampRefundRequest, CampAuditTransaction, CampAdminAllocation } from '@/types';
import { buildMealMatrix, sortMealDays, parseMealDayToIso } from '@/lib/camp-cost';
import { revalidatePath } from 'next/cache';

/**
 * Verify if the caller is an authorized admin (Super Admin / Higher Admin / Event Admin)
 */
async function verifyAdminAuth() {
  const user = await getAuthUserFromCookies();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const uRes = await query('SELECT role FROM users WHERE id = $1', [user.id]);
  if (uRes.rows.length === 0) {
    throw new Error('User record not found');
  }

  const role = uRes.rows[0].role;
  const roles = (Array.isArray(role) ? role : [role])
    .map((r: any) => Number(r))
    .filter((r: number) => !isNaN(r));

  const isSuperAdmin = roles.includes(8) || (Array.isArray(role) && role.includes('super_admin' as any));
  const isHigherAdmin = isSuperAdmin || roles.some((r: number) => [9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 30].includes(r));

  // Check assigned camp allocations
  const allocRes = await query(
    'SELECT camp_id, permission_type FROM camp_admin_allocations WHERE user_id = $1',
    [user.id]
  );
  const campAllocations = allocRes.rows as { camp_id: string; permission_type: 'attendance' | 'refunds' | 'both' | 'scan_pass' | 'prasadam' | 'payment_approvals' }[];

  if (!isHigherAdmin && campAllocations.length === 0) {
    throw new Error('Forbidden: Super Admin or Camp Coordinator privileges required');
  }

  return { user, isSuperAdmin, isHigherAdmin, campAllocations };
}

/**
 * Get all camps with summary stats (total registrations count, total revenue)
 * Super Admins see all camps; assigned coordinators see only their allocated camps.
 */
export async function getCampsAction() {
  try {
    const { isSuperAdmin, campAllocations } = await verifyAdminAuth();

    let sql = `
      SELECT 
        c.*,
        COUNT(r.id)::int AS registration_count,
        COALESCE(SUM(r.total_cost), 0)::numeric AS total_revenue
      FROM camps c
      LEFT JOIN camp_registrations r ON r.camp_id = c.id
    `;

    const params: any[] = [];
    if (!isSuperAdmin) {
      if (campAllocations.length === 0) {
        return { success: true, camps: [] };
      }
      const allowedCampIds = campAllocations.map(a => a.camp_id);
      sql += ` WHERE c.id = ANY($1::uuid[]) `;
      params.push(allowedCampIds);
    }

    sql += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const res = await query(sql, params);

    // Attach user permissions to each camp (supporting multiple concurrent roles)
    const campsWithPermissions = res.rows.map((camp: any) => {
      if (isSuperAdmin) {
        return {
          ...camp,
          user_permission: 'both',
          user_permissions: ['attendance', 'refunds', 'prasadam', 'scan_pass', 'payment_approvals', 'both']
        };
      }
      const allocs = campAllocations.filter(a => a.camp_id === camp.id);
      const perms = allocs.map(a => a.permission_type);
      const primary = perms.includes('both')
        ? 'both'
        : (perms.includes('attendance') && perms.includes('refunds'))
        ? 'both'
        : perms[0] || 'attendance';

      return {
        ...camp,
        user_permission: primary,
        user_permissions: perms.length > 0 ? perms : [primary]
      };
    });

    return { success: true, camps: campsWithPermissions as (Camp & { registration_count: number; total_revenue: number; user_permission?: string; user_permissions?: string[] })[] };
  } catch (error: any) {
    console.error('getCampsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single camp by ID or Slug (Public / Admin)
 */
export async function getCampBySlugAction(slug: string) {
  try {
    const res = await query('SELECT * FROM camps WHERE slug = $1', [slug]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Camp not found' };
    }
    return { success: true, camp: res.rows[0] as Camp };
  } catch (error: any) {
    console.error('getCampBySlugAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new camp
 */
export async function createCampAction(data: Omit<Camp, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { isSuperAdmin, isHigherAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin && !isHigherAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to create camps');
    }

    // Generate unique slug if not provided
    const slug = data.slug
      ? data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const checkRes = await query('SELECT id FROM camps WHERE slug = $1', [slug]);
    if (checkRes.rows.length > 0) {
      throw new Error(`A camp with slug "${slug}" already exists. Please choose a different title or slug.`);
    }

    // Ensure camp columns exist if migration 043 was not manually executed yet
    try {
      await query(`
        ALTER TABLE camps ADD COLUMN IF NOT EXISTS poster_url TEXT;
        ALTER TABLE camps ADD COLUMN IF NOT EXISTS criteria_message TEXT;
        ALTER TABLE camps ADD COLUMN IF NOT EXISTS banner_message TEXT;
      `);
    } catch (e: any) {
      console.warn('Notice: DDL auto-check for camp poster columns:', e?.message);
    }

    let res;
    try {
      const sql = `
        INSERT INTO camps (
          slug, title, description, venue, status,
          start_date, end_date,
          registration_start_date, late_fee_start_date, registration_deadline,
          late_fee, tracks, participant_types, meal_pricing,
          accommodation_pricing, special_waivers, payment_config, refund_config,
          eligible_centers, poster_url, criteria_message, banner_message
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22
        ) RETURNING *
      `;

      res = await query(sql, [
        slug,
        data.title,
        data.description || null,
        data.venue || 'Central VOICE, Pune',
        data.status || 'draft',
        data.start_date,
        data.end_date,
        data.registration_start_date || null,
        data.late_fee_start_date || null,
        data.registration_deadline || null,
        data.late_fee || 0,
        JSON.stringify(data.tracks || []),
        JSON.stringify(data.participant_types || []),
        JSON.stringify(data.meal_pricing || []),
        JSON.stringify(data.accommodation_pricing || {}),
        JSON.stringify(data.special_waivers || {}),
        JSON.stringify(data.payment_config || {}),
        JSON.stringify(data.refund_config || {}),
        JSON.stringify(data.eligible_centers || []),
        data.poster_url || null,
        data.criteria_message || null,
        data.banner_message || null
      ]);
    } catch (insertErr: any) {
      if (
        insertErr?.message?.includes('poster_url') ||
        insertErr?.message?.includes('criteria_message') ||
        insertErr?.message?.includes('banner_message')
      ) {
        console.warn('Falling back to INSERT without poster columns:', insertErr?.message);
        const fallbackSql = `
          INSERT INTO camps (
            slug, title, description, venue, status,
            start_date, end_date,
            registration_start_date, late_fee_start_date, registration_deadline,
            late_fee, tracks, participant_types, meal_pricing,
            accommodation_pricing, special_waivers, payment_config, refund_config,
            eligible_centers
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7,
            $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17, $18,
            $19
          ) RETURNING *
        `;
        res = await query(fallbackSql, [
          slug,
          data.title,
          data.description || null,
          data.venue || 'Central VOICE, Pune',
          data.status || 'draft',
          data.start_date,
          data.end_date,
          data.registration_start_date || null,
          data.late_fee_start_date || null,
          data.registration_deadline || null,
          data.late_fee || 0,
          JSON.stringify(data.tracks || []),
          JSON.stringify(data.participant_types || []),
          JSON.stringify(data.meal_pricing || []),
          JSON.stringify(data.accommodation_pricing || {}),
          JSON.stringify(data.special_waivers || {}),
          JSON.stringify(data.payment_config || {}),
          JSON.stringify(data.refund_config || {}),
          JSON.stringify(data.eligible_centers || [])
        ]);
      } else {
        throw insertErr;
      }
    }

    revalidatePath('/dashboard/admin/camps');
    return { success: true, camp: res.rows[0] as Camp };
  } catch (error: any) {
    console.error('createCampAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing camp
 */
export async function updateCampAction(id: string, data: Partial<Camp>) {
  try {
    const { isSuperAdmin, isHigherAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin && !isHigherAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to update camp configurations');
    }

    // Ensure camp columns exist if migration 043 was not manually executed yet
    try {
      await query(`
        ALTER TABLE camps ADD COLUMN IF NOT EXISTS poster_url TEXT;
        ALTER TABLE camps ADD COLUMN IF NOT EXISTS criteria_message TEXT;
        ALTER TABLE camps ADD COLUMN IF NOT EXISTS banner_message TEXT;
      `);
    } catch (e: any) {
      console.warn('Notice: DDL auto-check for camp poster columns:', e?.message);
    }

    let res;
    try {
      const sql = `
        UPDATE camps SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          venue = COALESCE($3, venue),
          status = COALESCE($4, status),
          start_date = COALESCE($5, start_date),
          end_date = COALESCE($6, end_date),
          registration_start_date = $7,
          late_fee_start_date = $8,
          registration_deadline = $9,
          late_fee = COALESCE($10, late_fee),
          tracks = COALESCE($11, tracks),
          participant_types = COALESCE($12, participant_types),
          meal_pricing = COALESCE($13, meal_pricing),
          accommodation_pricing = COALESCE($14, accommodation_pricing),
          special_waivers = COALESCE($15, special_waivers),
          payment_config = COALESCE($16, payment_config),
          refund_config = COALESCE($17, refund_config),
          eligible_centers = COALESCE($18, eligible_centers),
          poster_url = COALESCE($19, poster_url),
          criteria_message = COALESCE($20, criteria_message),
          banner_message = COALESCE($21, banner_message),
          updated_at = NOW()
        WHERE id = $22
        RETURNING *
      `;

      res = await query(sql, [
        data.title,
        data.description,
        data.venue,
        data.status,
        data.start_date,
        data.end_date,
        data.registration_start_date ?? null,
        data.late_fee_start_date ?? null,
        data.registration_deadline ?? null,
        data.late_fee,
        data.tracks ? JSON.stringify(data.tracks) : null,
        data.participant_types ? JSON.stringify(data.participant_types) : null,
        data.meal_pricing ? JSON.stringify(data.meal_pricing) : null,
        data.accommodation_pricing ? JSON.stringify(data.accommodation_pricing) : null,
        data.special_waivers ? JSON.stringify(data.special_waivers) : null,
        data.payment_config ? JSON.stringify(data.payment_config) : null,
        data.refund_config ? JSON.stringify(data.refund_config) : null,
        data.eligible_centers !== undefined ? JSON.stringify(data.eligible_centers) : null,
        data.poster_url !== undefined ? data.poster_url : null,
        data.criteria_message !== undefined ? data.criteria_message : null,
        data.banner_message !== undefined ? data.banner_message : null,
        id
      ]);
    } catch (updateErr: any) {
      if (
        updateErr?.message?.includes('poster_url') ||
        updateErr?.message?.includes('criteria_message') ||
        updateErr?.message?.includes('banner_message')
      ) {
        console.warn('Falling back to UPDATE without poster columns:', updateErr?.message);
        const fallbackSql = `
          UPDATE camps SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            venue = COALESCE($3, venue),
            status = COALESCE($4, status),
            start_date = COALESCE($5, start_date),
            end_date = COALESCE($6, end_date),
            registration_start_date = $7,
            late_fee_start_date = $8,
            registration_deadline = $9,
            late_fee = COALESCE($10, late_fee),
            tracks = COALESCE($11, tracks),
            participant_types = COALESCE($12, participant_types),
            meal_pricing = COALESCE($13, meal_pricing),
            accommodation_pricing = COALESCE($14, accommodation_pricing),
            special_waivers = COALESCE($15, special_waivers),
            payment_config = COALESCE($16, payment_config),
            refund_config = COALESCE($17, refund_config),
            eligible_centers = COALESCE($18, eligible_centers),
            updated_at = NOW()
          WHERE id = $19
          RETURNING *
        `;
        res = await query(fallbackSql, [
          data.title,
          data.description,
          data.venue,
          data.status,
          data.start_date,
          data.end_date,
          data.registration_start_date ?? null,
          data.late_fee_start_date ?? null,
          data.registration_deadline ?? null,
          data.late_fee,
          data.tracks ? JSON.stringify(data.tracks) : null,
          data.participant_types ? JSON.stringify(data.participant_types) : null,
          data.meal_pricing ? JSON.stringify(data.meal_pricing) : null,
          data.accommodation_pricing ? JSON.stringify(data.accommodation_pricing) : null,
          data.special_waivers ? JSON.stringify(data.special_waivers) : null,
          data.payment_config ? JSON.stringify(data.payment_config) : null,
          data.refund_config ? JSON.stringify(data.refund_config) : null,
          data.eligible_centers !== undefined ? JSON.stringify(data.eligible_centers) : null,
          id
        ]);
      } else {
        throw updateErr;
      }
    }

    if (res.rows.length === 0) {
      throw new Error('Camp not found');
    }

    revalidatePath('/dashboard/admin/camps');
    return { success: true, camp: res.rows[0] as Camp };
  } catch (error: any) {
    console.error('updateCampAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle camp active status
 */
export async function toggleCampStatusAction(id: string, newStatus: 'draft' | 'active' | 'closed' | 'completed' | 'archived') {
  try {
    const { isSuperAdmin, isHigherAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin && !isHigherAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to change camp status');
    }

    const res = await query(
      'UPDATE camps SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      [newStatus, id]
    );

    if (res.rows.length === 0) {
      throw new Error('Camp not found');
    }

    revalidatePath('/dashboard/admin/camps');
    return { success: true, status: res.rows[0].status };
  } catch (error: any) {
    console.error('toggleCampStatusAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Archive a camp
 */
export async function archiveCampAction(id: string) {
  return toggleCampStatusAction(id, 'archived');
}

/**
 * Restore an archived camp
 */
export async function unarchiveCampAction(id: string) {
  return toggleCampStatusAction(id, 'closed');
}

/**
 * Delete a camp (and cascade registrations)
 */
export async function deleteCampAction(id: string) {
  try {
    const { isSuperAdmin, isHigherAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin && !isHigherAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to delete a camp');
    }

    await query('DELETE FROM camps WHERE id = $1', [id]);
    revalidatePath('/dashboard/admin/camps');
    return { success: true };
  } catch (error: any) {
    console.error('deleteCampAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all registrations for a camp with optional search and filters
 */
export async function getCampRegistrationsAction(campId: string, searchTerm?: string) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    // Enforce role isolation: Non-superadmins must have explicit 'attendance', 'payment_approvals', or 'both' permission for this camp
    if (!isSuperAdmin) {
      const hasPerm = campAllocations.some((a) => a.camp_id === campId && ['attendance', 'payment_approvals', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: true, registrations: [], error: 'Forbidden: Attendance or Payment Approvals desk permission required' };
      }
    }

    let sql = `
      WITH camp_serials AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY camp_id ORDER BY created_at ASC) AS serial_no
        FROM camp_registrations
        WHERE camp_id = $1
      )
      SELECT 
        r.*, 
        cs.serial_no,
        u.current_center AS user_current_center,
        u.center AS user_center,
        u.other_center AS user_other_center,
        u.hierarchy AS user_hierarchy
      FROM camp_registrations r
      JOIN camp_serials cs ON cs.id = r.id
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, hierarchy
        FROM users
        WHERE LOWER(email) = LOWER(r.email) AND email <> ''
        LIMIT 1
      ) u ON TRUE
      WHERE r.camp_id = $1
    `;
    const params: any[] = [campId];

    if (searchTerm && searchTerm.trim()) {
      params.push(`%${searchTerm.trim()}%`);
      sql += ` AND (
        r.participant_name ILIKE $2 OR
        r.whatsapp ILIKE $2 OR
        r.email ILIKE $2 OR
        r.poc_name ILIKE $2 OR
        r.voice_name ILIKE $2 OR
        r.parent_temple ILIKE $2 OR
        r.counselor_name ILIKE $2
      )`;
    }

    sql += ' ORDER BY r.created_at DESC';

    const res = await query(sql, params);
    return { success: true, registrations: res.rows as (CampRegistration & { serial_no?: number })[] };
  } catch (error: any) {
    console.error('getCampRegistrationsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify and approve an Inter-Temple Transfer (ITT) registration
 */
export async function verifyAndApproveCampRegistrationAction(
  registrationId: string,
  data: { transactionId: string; receivedDate: string; remarks?: string }
) {
  try {
    const { user, isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    if (!data.transactionId || !data.transactionId.trim()) {
      return { success: false, error: 'Transaction ID / UTR is required for verification.' };
    }
    if (!data.receivedDate || !data.receivedDate.trim()) {
      return { success: false, error: 'Payment received date is required.' };
    }

    const regLookup = await query('SELECT camp_id FROM camp_registrations WHERE id = $1', [registrationId]);
    if (regLookup.rows.length === 0) {
      return { success: false, error: 'Registration record not found' };
    }
    const campId = regLookup.rows[0].camp_id;

    if (!isSuperAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === campId && ['payment_approvals', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Payment Approvals desk permission required to approve registrations for this camp.' };
      }
    }

    const adminIdentifier = user.email || user.id;

    const sql = `
      UPDATE camp_registrations
      SET 
        payment_status = 'completed',
        payment_id = $1,
        payment_date = $2,
        verified_at = NOW(),
        verified_by = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const res = await query(sql, [
      data.transactionId.trim(),
      data.receivedDate.trim(),
      adminIdentifier,
      registrationId
    ]);

    if (res.rows.length === 0) {
      return { success: false, error: 'Registration record not found' };
    }

    const reg = res.rows[0];
    revalidatePath(`/dashboard/admin/camps/${reg.camp_id}/registrations`);
    return { success: true, registration: reg as CampRegistration };
  } catch (error: any) {
    console.error('verifyAndApproveCampRegistrationAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Super Admin: Verify and approve an entire payment batch (ITT, IDT, or Manual)
 */
export async function verifyAndApproveCampBatchAction(
  batchId: string,
  data: { transactionId: string; receivedDate: string; remarks?: string }
) {
  try {
    const { user, isSuperAdmin, campAllocations } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      const checkRes = await query(
        'SELECT camp_id FROM camp_registrations WHERE group_id = $1 OR payment_id = $1 OR id::text = $1 LIMIT 1',
        [batchId]
      );
      if (checkRes.rows.length === 0) {
        return { success: false, error: 'No matching transaction records found.' };
      }
      const targetCampId = checkRes.rows[0].camp_id;
      const hasPerm = campAllocations.some(a => a.camp_id === targetCampId && ['payment_approvals', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Payment Approvals desk permission required to approve batches for this camp.' };
      }
    }

    if (!data.transactionId || !data.transactionId.trim()) {
      return { success: false, error: 'Transaction ID / UTR is required for verification.' };
    }
    if (!data.receivedDate || !data.receivedDate.trim()) {
      return { success: false, error: 'Payment received date is required.' };
    }

    const adminIdentifier = user.email || user.id;

    const sql = `
      UPDATE camp_registrations
      SET 
        payment_status = 'completed',
        payment_id = $1,
        payment_date = $2,
        verified_at = NOW(),
        verified_by = $3,
        updated_at = NOW()
      WHERE group_id = $4 OR payment_id = $4 OR id::text = $4
      RETURNING camp_id
    `;

    const res = await query(sql, [
      data.transactionId.trim(),
      data.receivedDate.trim(),
      adminIdentifier,
      batchId
    ]);

    if (res.rows.length === 0) {
      return { success: false, error: 'No matching transaction records found to verify.' };
    }

    const campId = res.rows[0].camp_id;
    revalidatePath(`/dashboard/admin/camps/${campId}/registrations`);
    revalidatePath(`/dashboard/admin/camps`);
    return { success: true, count: res.rows.length };
  } catch (error: any) {
    console.error('verifyAndApproveCampBatchAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all refund requests for a specific camp (Admin)
 */
export async function getCampRefundRequestsAction(campId: string) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    // Enforce role isolation: Non-superadmins must have explicit 'refunds' or 'both' permission for this camp
    if (!isSuperAdmin) {
      const hasPerm = campAllocations.some((a) => a.camp_id === campId && ['refunds', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: true, requests: [], error: 'Forbidden: Refunds desk permission required' };
      }
    }

    const sql = `
      SELECT r.*, 
        c.title AS camp_title,
        c.slug AS camp_slug
      FROM camp_refund_requests r
      JOIN camps c ON c.id = r.camp_id
      WHERE r.camp_id = $1
      ORDER BY r.created_at DESC
    `;

    const res = await query(sql, [campId]);
    const requests = res.rows.map((r: any) => {
      if (r.payout_date && r.payout_date instanceof Date) {
        r.payout_date = r.payout_date.toISOString().split('T')[0];
      }
      return r;
    });
    return { success: true, requests: requests as CampRefundRequest[] };
  } catch (error: any) {
    console.error('getCampRefundRequestsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process a refund request (mark as refunded / money transferred, or reject)
 */
export async function processCampRefundAction(
  refundRequestId: string,
  data: {
    status: 'refunded' | 'rejected' | 'pending';
    payout_txn_ref?: string;
    payout_date?: string;
    admin_notes?: string;
  }
) {
  try {
    const { user, isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    const refundLookup = await query('SELECT camp_id FROM camp_refund_requests WHERE id = $1', [refundRequestId]);
    if (refundLookup.rows.length === 0) {
      return { success: false, error: 'Refund request record not found.' };
    }
    const campId = refundLookup.rows[0].camp_id;

    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === campId && ['refunds', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Refunds desk permission required to process refunds for this camp.' };
      }
    }

    const adminIdentifier = user.email || user.id;

    if (data.status === 'refunded') {
      if (!data.payout_txn_ref || !data.payout_txn_ref.trim()) {
        return { success: false, error: 'Transaction UTR / Reference ID is required to mark as refunded.' };
      }
      if (!data.payout_date || !data.payout_date.trim()) {
        return { success: false, error: 'Payout transfer date is required.' };
      }
    }

    const updateSql = `
      UPDATE camp_refund_requests
      SET 
        status = $1,
        payout_txn_ref = $2,
        payout_date = $3,
        admin_notes = $4,
        processed_by = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const payoutTxnRef = data.status === 'refunded' ? data.payout_txn_ref?.trim() || null : null;
    const payoutDate = data.status === 'refunded' ? data.payout_date?.trim() || null : null;
    const adminNotes = data.admin_notes?.trim() || null;

    const res = await query(updateSql, [
      data.status,
      payoutTxnRef,
      payoutDate,
      adminNotes,
      adminIdentifier,
      refundRequestId
    ]);

    if (res.rows.length === 0) {
      return { success: false, error: 'Refund request record not found.' };
    }

    const refundReq = res.rows[0];

    // Sync camp_registrations based on new refund request status
    if (Array.isArray(refundReq.cancelled_registrations)) {
      const regIds = refundReq.cancelled_registrations
        .map((cr: any) => cr.reg_id)
        .filter(Boolean);

      if (regIds.length > 0) {
        if (data.status === 'refunded') {
          await query(
            `UPDATE camp_registrations 
             SET is_cancelled = true, payment_status = 'refunded', updated_at = NOW() 
             WHERE id = ANY($1::uuid[])`,
            [regIds]
          );
        } else if (data.status === 'rejected') {
          // If rejected, un-cancel attendee registrations so they remain active (and can re-apply if appropriate)
          await query(
            `UPDATE camp_registrations 
             SET is_cancelled = false, cancellation_id = null, cancellation_reason = null, payment_status = 'completed', updated_at = NOW() 
             WHERE id = ANY($1::uuid[])`,
            [regIds]
          );
        } else if (data.status === 'pending') {
          await query(
            `UPDATE camp_registrations 
             SET is_cancelled = true, cancellation_id = $2, payment_status = 'pending', updated_at = NOW() 
             WHERE id = ANY($1::uuid[])`,
            [regIds, refundReq.id]
          );
        }
      }
    }

    revalidatePath(`/dashboard/admin/camps/${refundReq.camp_id}/registrations`);
    return { success: true, refundRequest: refundReq as CampRefundRequest };
  } catch (error: any) {
    console.error('processCampRefundAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Resolves assigned temples and centers for leadership roles (11-16, 17, 8, etc.)
 * Strictly derives assignments from database allocation records (temples, centers, user_centers).
 * DOES NOT use caller's personal home or living center/temple.
 */
export async function getManagerAssignedLocations(userId: string, userRoles: number[]) {
  const isSuperAdmin = userRoles.includes(8);
  const isManagerialRole = isSuperAdmin || userRoles.some(r => [9, 10, 11, 12, 13, 14, 15, 16, 17, 21].includes(r));

  if (!isManagerialRole) {
    return {
      isSuperAdmin: false,
      isTempleLeadership: false,
      isManager: false,
      assignedTempleNames: [] as string[],
      assignedCenterNames: [] as string[],
      directlyAssignedCenterNames: [] as string[],
    };
  }

  const assignedTempleNames: string[] = [];
  const assignedCenterNames: string[] = [];
  const directlyAssignedCenterNames: string[] = [];

  // Check if caller is high-level temple leadership (Roles 8, 9, 10, 11, 12, 13)
  const isTempleLeadership = isSuperAdmin || userRoles.some(r => [8, 9, 10, 11, 12, 13].includes(r));

  // 1. Fetch allocated temples from temples table for temple leadership (11 MD, 12 Dir, 13 CVM, 9 VP, 10 Pres, 21 YP)
  try {
    const tAllocRes = await query(
      `SELECT name FROM temples 
       WHERE managing_director_id = $1 
          OR director_id = $1 
          OR central_voice_manager_id = $1 
          OR yp_id = $1`,
      [userId]
    );
    tAllocRes.rows.forEach(r => {
      if (r.name && r.name.trim()) assignedTempleNames.push(r.name.trim());
    });
  } catch (e) {
    console.warn('Error fetching temple assignments:', e);
  }

  // 2. Fetch allocated centers from centers table for center leadership (14 PA, 15 PM, 16 Acting Manager, 17 OC)
  try {
    const cAllocRes = await query(
      `SELECT c.name, COALESCE(c.temple_name, t.name) as temple_name 
       FROM centers c
       LEFT JOIN temples t ON c.temple_id = t.id
       WHERE c.project_manager_id = $1 
          OR c.project_advisor_id = $1 
          OR c.acting_manager_id = $1
          OR c.oc_id = $1`,
      [userId]
    );
    cAllocRes.rows.forEach(r => {
      if (r.name && r.name.trim()) {
        assignedCenterNames.push(r.name.trim());
        directlyAssignedCenterNames.push(r.name.trim());
      }
      if (r.temple_name && r.temple_name.trim()) {
        assignedTempleNames.push(r.temple_name.trim());
      }
    });
  } catch (e) {
    console.warn('Error fetching center assignments:', e);
  }

  // 3. ONLY for temple leadership (MD, Director, CVM, Super Admin, VP, President),
  // automatically include all centers belonging to their assigned temples.
  // Center managers (PM, PA, Acting Manager, OC) should NEVER pull other centers under the temple.
  if (isTempleLeadership && assignedTempleNames.length > 0) {
    try {
      const lowerTemples = Array.from(new Set(assignedTempleNames.map(t => t.toLowerCase())));
      const tCenters = await query(
        `SELECT name FROM centers WHERE LOWER(temple_name) = ANY($1)`,
        [lowerTemples]
      );
      tCenters.rows.forEach(r => {
        if (r.name && r.name.trim()) assignedCenterNames.push(r.name.trim());
      });
    } catch (e) {
      console.warn('Error fetching centers for assigned temples:', e);
    }
  }

  const uniqueCenterNames = Array.from(new Set(assignedCenterNames));
  const uniqueTempleNames = Array.from(new Set(assignedTempleNames));
  const uniqueDirectCenterNames = Array.from(new Set(directlyAssignedCenterNames));

  const hasAssignedLocations = uniqueCenterNames.length > 0 || uniqueTempleNames.length > 0;
  const isManager = isSuperAdmin || hasAssignedLocations;

  return {
    isSuperAdmin,
    isTempleLeadership,
    isManager,
    assignedTempleNames: uniqueTempleNames,
    assignedCenterNames: uniqueCenterNames,
    directlyAssignedCenterNames: uniqueDirectCenterNames,
  };
}

/**
 * Lookup camp registrations by WhatsApp / Phone, Email, or Booking Group ID
 * (Supports devotees, public guests with Group ID, and role 11-16 assigned center/temple managers)
 */
export async function lookupCampRegistrationsAction(
  campSlugOrId: string,
  identifier: string,
  callerUserId?: string
) {
  try {
    let rawId = (identifier || '').trim();
    if (!rawId || rawId.length < 5) {
      return { success: false, error: 'Please enter a complete 10-digit WhatsApp number, valid Email, or Booking Group ID (minimum 5 characters).' };
    }

    // 1. Fetch camp
    const campRes = await query(
      'SELECT id, title, slug, payment_config, refund_config FROM camps WHERE slug = $1 OR id::text = $1',
      [campSlugOrId]
    );

    if (campRes.rows.length === 0) {
      return { success: false, error: 'Camp retreat not found.' };
    }

    const camp = campRes.rows[0] as Camp;

    // Check if identifier is email, phone, or group ID
    let isEmail = rawId.includes('@');
    let digitsOnly = rawId.replace(/[^0-9]/g, '');
    let isPhone = digitsOnly.length >= 10;
    let phone10 = isPhone ? digitsOnly.slice(-10) : '';
    // Booking Group ID must strictly start with GRP_ (never loosely treat any 8+ char phone or string as group ID)
    let isGroupId = rawId.toUpperCase().startsWith('GRP_');

    if (!isEmail && !isPhone && !isGroupId) {
      return {
        success: false,
        error: 'Please enter a complete 10-digit mobile number, valid email address, or Booking Group ID (e.g. GRP_...).'
      };
    }

    // Security check: Check authenticated session & managerial roles
    const sessionUser = await getAuthUserFromCookies().catch(() => null);
    const resolvedUserId = callerUserId || sessionUser?.id;

    let managerLoc: { isSuperAdmin: boolean; isManager: boolean; assignedTempleNames: string[]; assignedCenterNames: string[] } = {
      isSuperAdmin: false,
      isManager: false,
      assignedTempleNames: [],
      assignedCenterNames: [],
    };
    let authEmail = '';
    let authPhone = '';

    if (resolvedUserId) {
      const uRes = await query('SELECT id, email, phone, role FROM users WHERE id = $1', [resolvedUserId]);
      const dbUser = uRes.rows[0];
      const role = dbUser?.role;
      const roles = (Array.isArray(role) ? role : [role]).map((r: any) => Number(r)).filter((r: number) => !isNaN(r));

      authEmail = (dbUser?.email || sessionUser?.email || '').trim().toLowerCase();
      authPhone = (dbUser?.phone || '').replace(/[^0-9]/g, '').slice(-10);

      managerLoc = await getManagerAssignedLocations(resolvedUserId, roles);

      if (!managerLoc.isManager) {
        // Ordinary user: strictly verify ownership to prevent scraping other users
        const isOwnEmail = isEmail && rawId.toLowerCase() === authEmail;
        const isOwnPhone = isPhone && phone10 === authPhone;

        if (!isOwnEmail && !isOwnPhone) {
          if (isGroupId) {
            const groupOwnerCheck = await query(
              `SELECT id FROM camp_registrations WHERE camp_id = $1 AND LOWER(group_id) = LOWER($2) AND (
                ($3 <> '' AND LOWER(email) = $3) OR
                ($4 <> '' AND (RIGHT(REGEXP_REPLACE(whatsapp, '[^0-9]', '', 'g'), 10) = $4 OR RIGHT(REGEXP_REPLACE(poc_contact, '[^0-9]', '', 'g'), 10) = $4))
              ) LIMIT 1`,
              [camp.id, rawId, authEmail, authPhone]
            );
            if (groupOwnerCheck.rows.length === 0) {
              return { success: false, error: 'Unauthorized: You can only look up registrations made under your own account.' };
            }
          } else {
            return {
              success: false,
              error: 'Unauthorized: You can only look up and cancel registrations made under your own account.'
            };
          }
        }
      }
    } else if (!isGroupId) {
      // For unauthenticated guests on the public page, require the unique Booking Group ID from confirmation email
      return {
        success: false,
        error: 'Please enter your unique Booking Group ID (e.g. GRP_...) from your confirmation email, or log in to manage your bookings.'
      };
    }

    // 2. Fetch registrations strictly matching exact identifier (No loose wildcard substring scraping)
    const regSql = `
      SELECT 
        id, camp_id, group_id, poc_name, poc_contact, email,
        parent_temple, voice_name, current_temple, current_center,
        participant_name, whatsapp, counselor_name,
        gender, age, married_since_year, camp_track, participant_type,
        first_meal_date, first_meal_type, last_meal_date, last_meal_type,
        dinner_type, accommodation,
        meal_cost, acc_cost, ac_cost, late_fee, entry_cost, total_cost,
        discount_amount, coupon_code,
        payment_method, payment_status, is_cancelled, cancellation_id,
        meals_served, checked_in, checked_in_at, created_at
      FROM camp_registrations
      WHERE camp_id = $1
        AND (
          ($2 <> '' AND LOWER(email) = LOWER($2)) OR
          ($3 <> '' AND (RIGHT(REGEXP_REPLACE(whatsapp, '[^0-9]', '', 'g'), 10) = $3 OR RIGHT(REGEXP_REPLACE(poc_contact, '[^0-9]', '', 'g'), 10) = $3)) OR
          ($4 <> '' AND LOWER(group_id) = LOWER($4))
        )
      ORDER BY created_at ASC
    `;

    const regRes = await query(regSql, [
      camp.id,
      isEmail ? rawId : '',
      phone10,
      isGroupId ? rawId : ''
    ]);

    if (regRes.rows.length === 0) {
      return {
        success: false,
        error: `No registrations found for "${rawId}" in this camp retreat.`
      };
    }

    const pendingUnapproved = regRes.rows.filter(r => r.payment_status !== 'completed' && !r.is_cancelled && r.payment_status !== 'refunded');
    const confirmedRegs = regRes.rows.filter(r => r.payment_status === 'completed' || r.is_cancelled || r.payment_status === 'refunded');

    if (confirmedRegs.length === 0 && pendingUnapproved.length > 0) {
      return {
        success: false,
        error: 'This booking is currently awaiting payment approval (IDT/ITT) and has not been confirmed yet. Registrations cannot be cancelled or refunded until payment is approved and confirmed.'
      };
    }

    let matchingRegs = regRes.rows as CampRegistration[];

    // If caller is a manager (and not super admin), verify that the registrations belong to their assigned temple or center
    if (managerLoc.isManager && !managerLoc.isSuperAdmin) {
      const lowerTemples = managerLoc.assignedTempleNames.map(t => t.trim().toLowerCase()).filter(Boolean);
      const lowerCenters = managerLoc.assignedCenterNames.map(c => c.trim().toLowerCase()).filter(Boolean);

      matchingRegs = matchingRegs.filter(r => {
        const pt = (r.parent_temple || '').trim().toLowerCase();
        const ct = (r.current_temple || '').trim().toLowerCase();
        const vn = (r.voice_name || '').trim().toLowerCase();
        const cc = (r.current_center || '').trim().toLowerCase();
        const rEmail = (r.email || '').trim().toLowerCase();
        const rPhone = (r.whatsapp || '').replace(/\D/g, '').slice(-10);
        const rPocPhone = (r.poc_contact || '').replace(/\D/g, '').slice(-10);

        const isOwn = Boolean(
          (authEmail && rEmail === authEmail) ||
          (authPhone && (rPhone === authPhone || rPocPhone === authPhone))
        );
        const inAssignedTemple = lowerTemples.some(t => pt === t || ct === t);
        const inAssignedCenter = lowerCenters.some(c => vn === c || cc === c);

        return isOwn || inAssignedTemple || inAssignedCenter;
      });

      if (matchingRegs.length === 0) {
        return {
          success: false,
          error: 'No registrations found matching this devotee in your assigned temple or center.'
        };
      }
    }

    // 3. Fetch any existing refund requests for these registrations
    const regIds = matchingRegs.map(r => r.id);
    const existingRefundsRes = await query(
      `SELECT * FROM camp_refund_requests WHERE camp_id = $1 AND (
         registration_id = ANY($2::uuid[]) OR 
         ($3 <> '' AND REGEXP_REPLACE(poc_contact, '[^0-9]', '', 'g') LIKE '%' || $3 || '%') OR 
         ($4 <> '' AND LOWER(email) = LOWER($4)) OR
         poc_contact ILIKE '%' || $5 || '%'
       ) ORDER BY created_at DESC`,
      [camp.id, regIds, phone10, isEmail ? rawId : '', rawId]
    );

    return {
      success: true,
      camp,
      registrations: matchingRegs,
      existingRefunds: existingRefundsRes.rows as CampRefundRequest[]
    };
  } catch (error: any) {
    console.error('lookupCampRegistrationsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit a cancellation & refund request by devotee (supports full, partial batch attendees, or partial days)
 */
export async function submitCampRefundRequestAction(
  data: {
    campId: string;
    poc_name: string;
    poc_contact: string;
    email: string;
    cancellation_type: 'FULL' | 'PARTIAL_ATTENDEES' | 'PARTIAL_DAYS';
    cancelled_reg_ids: string[];
    updated_itineraries?: Record<string, { first_meal_date: string; first_meal_type: string; last_meal_date: string; last_meal_type: string }>;
    payout_type: 'UPI' | 'BANK';
    upi_id?: string;
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    ifsc_code?: string;
    reason?: string;
  },
  callerUserId?: string
) {
  try {
    if (!data.campId) {
      return { success: false, error: 'Camp ID is required.' };
    }
    if (!data.cancelled_reg_ids || data.cancelled_reg_ids.length === 0) {
      return { success: false, error: 'Please select at least one attendee to cancel or modify.' };
    }

    if (data.payout_type === 'UPI') {
      if (!data.upi_id || !data.upi_id.trim()) {
        return { success: false, error: 'Please enter a valid UPI ID (e.g. devotee@okhdfcbank).' };
      }
    } else {
      if (!data.account_number || !data.account_number.trim()) {
        return { success: false, error: 'Bank account number is required.' };
      }
      if (!data.ifsc_code || !data.ifsc_code.trim()) {
        return { success: false, error: 'Bank IFSC code is required.' };
      }
      if (!data.account_name || !data.account_name.trim()) {
        return { success: false, error: 'Account holder name is required.' };
      }
    }

    // 1. Fetch Camp to get refund_config
    const campRes = await query('SELECT * FROM camps WHERE id = $1', [data.campId]);
    if (campRes.rows.length === 0) {
      return { success: false, error: 'Camp not found.' };
    }
    const camp = campRes.rows[0] as Camp;
    const refundConfig = camp.refund_config || {
      enable_refunds: true,
      refund_policy_rules: [],
      refund_meals: true,
      refund_accommodation: true
    };

    if (refundConfig.enable_refunds === false) {
      return { success: false, error: 'Cancellations and refunds are currently not accepted for this camp retreat.' };
    }

    // 2. Fetch the registrations being cancelled
    const regRes = await query(
      `SELECT * FROM camp_registrations WHERE id = ANY($1::uuid[]) AND camp_id = $2`,
      [data.cancelled_reg_ids, data.campId]
    );

    if (regRes.rows.length === 0) {
      return { success: false, error: 'No matching registration records found.' };
    }

    const regs = regRes.rows as CampRegistration[];

    // Security Check: Verify Ownership & Prevent Cancellation / Refund Hijacking
    const callerUser = await getAuthUserFromCookies().catch(() => null);
    const resolvedUserId = callerUserId || callerUser?.id;
    let managerLoc: { isSuperAdmin: boolean; isManager: boolean; assignedTempleNames: string[]; assignedCenterNames: string[] } = {
      isSuperAdmin: false,
      isManager: false,
      assignedTempleNames: [],
      assignedCenterNames: [],
    };
    let authUserEmail = '';
    let authUserPhone = '';

    if (resolvedUserId) {
      try {
        const uRes = await query('SELECT id, email, phone, role FROM users WHERE id = $1', [resolvedUserId]);
        const dbUser = uRes.rows[0];
        authUserEmail = (dbUser?.email || callerUser?.email || '').trim().toLowerCase();
        authUserPhone = (dbUser?.phone || '').replace(/\D/g, '').slice(-10);

        const role = dbUser?.role;
        const roles = (Array.isArray(role) ? role : [role]).map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
        managerLoc = await getManagerAssignedLocations(resolvedUserId, roles);
      } catch {
        // ignore
      }
    }

    for (const reg of regs) {
      if (reg.is_cancelled || reg.payment_status === 'refunded') {
        return {
          success: false,
          error: `Attendee "${reg.participant_name}" has already been cancelled/refunded.`
        };
      }

      if (reg.payment_status !== 'completed') {
        return {
          success: false,
          error: `Attendee "${reg.participant_name}" is currently awaiting payment approval (${reg.payment_status}) and is not confirmed yet. Neither the devotee nor the manager can cancel or apply for a refund on an unconfirmed registration.`
        };
      }

      const regEmail = (reg.email || '').trim().toLowerCase();
      const regPhone = (reg.whatsapp || '').replace(/\D/g, '').slice(-10);
      const regPocPhone = (reg.poc_contact || '').replace(/\D/g, '').slice(-10);

      let isAuthorized = false;
      if (managerLoc.isSuperAdmin) {
        isAuthorized = true;
      } else if (managerLoc.isManager) {
        // Roles 11-16 (and other managers) can cancel for themselves OR devotees in their assigned temple/center
        const isOwn = Boolean(
          (authUserEmail && regEmail === authUserEmail) ||
          (authUserPhone && (regPhone === authUserPhone || regPocPhone === authUserPhone))
        );
        const lowerTemples = managerLoc.assignedTempleNames.map(t => t.trim().toLowerCase()).filter(Boolean);
        const lowerCenters = managerLoc.assignedCenterNames.map(c => c.trim().toLowerCase()).filter(Boolean);
        const pt = (reg.parent_temple || '').trim().toLowerCase();
        const ct = (reg.current_temple || '').trim().toLowerCase();
        const vn = (reg.voice_name || '').trim().toLowerCase();
        const cc = (reg.current_center || '').trim().toLowerCase();

        const inAssignedTemple = lowerTemples.some(t => pt === t || ct === t);
        const inAssignedCenter = lowerCenters.some(c => vn === c || cc === c);
        isAuthorized = isOwn || inAssignedTemple || inAssignedCenter;
      } else if (resolvedUserId) {
        // Authenticated ordinary users can ONLY cancel registrations matching their OWN verified credentials
        isAuthorized = Boolean(
          (authUserEmail && regEmail === authUserEmail) ||
          (authUserPhone && (regPhone === authUserPhone || regPocPhone === authUserPhone))
        );
      } else {
        // Unauthenticated guests must match the registration's email or phone
        const cleanPocContact = (data.poc_contact || '').replace(/\D/g, '').slice(-10);
        const dataEmail = (data.email || '').trim().toLowerCase();
        isAuthorized = Boolean(
          (dataEmail && regEmail && dataEmail === regEmail) ||
          (cleanPocContact && (regPhone === cleanPocContact || regPocPhone === cleanPocContact))
        );
      }

      if (!isAuthorized) {
        return {
          success: false,
          error: `Security verification failed: You are not authorized to cancel attendee "${reg.participant_name}". Cancellation is only allowed for your own bookings or devotees in your assigned temple/center.`
        };
      }
    }

    // 3. Determine applicable refund tier by current date (local date YYYY-MM-DD)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const rules = refundConfig.refund_policy_rules || [];
    
    // Sort rules by cutoff_date ascending, with empty cutoff (fallback) last
    const sortedRules = [...rules].sort((a, b) => {
      if (!a.cutoff_date) return 1;
      if (!b.cutoff_date) return -1;
      return a.cutoff_date.localeCompare(b.cutoff_date);
    });

    let matchedTier = sortedRules.find(r => r.cutoff_date && todayStr <= r.cutoff_date);
    if (!matchedTier && sortedRules.length > 0) {
      // Use fallback tier without cutoff_date or the last tier
      matchedTier = sortedRules.find(r => !r.cutoff_date) || sortedRules[sortedRules.length - 1];
    }

    const baseRefundPercent = matchedTier ? Number(matchedTier.refund_percent) : 100;
    const tierLabel = matchedTier ? matchedTier.label : `Standard Policy (${baseRefundPercent}% Refund)`;

    let totalOriginalAmount = 0;
    let totalBaseFeeRefund = 0;
    let totalMealRefund = 0;
    let totalAccRefund = 0;

    const cancelledRegistrationsSummary: any[] = [];

    for (const reg of regs) {
      const originalTotal = Number(reg.total_cost || 0);
      totalOriginalAmount += originalTotal;

      const entryCost = Number(reg.entry_cost || 0);
      const discount = Number(reg.discount_amount || 0);
      const netEntryCost = Math.max(0, entryCost - discount);

      const mealCost = Number(reg.meal_cost || 0);
      const accCost = Number(reg.acc_cost || 0) + Number(reg.ac_cost || 0);

      // Base fee is any net fee excluding meals & accommodation (e.g. token fee, camp overhead)
      const baseCost = Math.max(0, netEntryCost - mealCost - accCost);

      // Base fee refund based on tier percent
      const thisBaseRefund = Math.round(baseCost * (baseRefundPercent / 100));
      totalBaseFeeRefund += thisBaseRefund;

      // Meal refund based on tier percent
      const thisMealRefund = refundConfig.refund_meals !== false 
        ? Math.round(mealCost * (baseRefundPercent / 100)) 
        : 0;
      totalMealRefund += thisMealRefund;

      // Acc refund based on tier percent
      const thisAccRefund = refundConfig.refund_accommodation !== false 
        ? Math.round(accCost * (baseRefundPercent / 100)) 
        : 0;
      totalAccRefund += thisAccRefund;

      const regRefund = Math.min(originalTotal, thisBaseRefund + thisMealRefund + thisAccRefund);

      cancelledRegistrationsSummary.push({
        reg_id: reg.id,
        participant_name: reg.participant_name,
        camp_track: reg.camp_track,
        original_total: originalTotal,
        base_cost: baseCost,
        meal_cost: mealCost,
        acc_cost: accCost,
        refund_amount: regRefund
      });
    }

    const calculatedRefundAmount = Math.min(totalOriginalAmount, totalBaseFeeRefund + totalMealRefund + totalAccRefund);

    // 4. Insert Refund Request
    const insertSql = `
      INSERT INTO camp_refund_requests (
        camp_id, registration_id, group_id,
        poc_name, poc_contact, email,
        cancellation_type, cancelled_registrations,
        original_total_amount, refund_amount, breakdown,
        payout_type, upi_id, account_name, account_number, bank_name, ifsc_code,
        reason, status
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, 'pending'
      ) RETURNING *
    `;

    const primaryReg = regs[0];
    const breakdown = {
      base_fee_refund: totalBaseFeeRefund,
      meal_refund: totalMealRefund,
      acc_refund: totalAccRefund,
      tier_label: tierLabel,
      base_refund_percent: baseRefundPercent,
      non_refundable_fee: Math.max(0, totalOriginalAmount - calculatedRefundAmount)
    };

    const insertRes = await query(insertSql, [
      data.campId,
      primaryReg.id,
      primaryReg.group_id || null,
      data.poc_name || primaryReg.poc_name,
      data.poc_contact || primaryReg.poc_contact,
      data.email || primaryReg.email,
      data.cancellation_type,
      JSON.stringify(cancelledRegistrationsSummary),
      totalOriginalAmount,
      calculatedRefundAmount,
      JSON.stringify(breakdown),
      data.payout_type,
      data.upi_id?.trim() || null,
      data.account_name?.trim() || null,
      data.account_number?.trim() || null,
      data.bank_name?.trim() || null,
      data.ifsc_code?.trim() || null,
      data.reason?.trim() || null
    ]);

    const newRefundReq = insertRes.rows[0];

    // 5. Update camp_registrations to mark as cancelled
    await query(
      `UPDATE camp_registrations
       SET is_cancelled = true,
           cancellation_id = $1,
           cancelled_at = NOW(),
           cancellation_reason = $2,
           payment_status = 'pending',
           updated_at = NOW()
       WHERE id = ANY($3::uuid[])`,
      [newRefundReq.id, data.reason || 'Devotee cancellation request', data.cancelled_reg_ids]
    );

    revalidatePath(`/dashboard/admin/camps/${data.campId}/registrations`);
    return {
      success: true,
      refundRequest: newRefundReq as CampRefundRequest,
      refundAmount: calculatedRefundAmount,
      breakdown
    };
  } catch (error: any) {
    console.error('submitCampRefundRequestAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Super Admin: Get all camp transactions across all camps grouped by payment batch
 * for complete financial accounting, reconciliation, and audit.
 */
export async function getAllCampTransactionsAction() {
  try {
    const { isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      return { success: false, error: 'Forbidden: Super Admin privileges are required to view organization financial audits.' };
    }

    const txSql = `
      SELECT 
        COALESCE(r.group_id, r.payment_id, r.id::text) AS txn_id,
        r.camp_id,
        c.title AS camp_title,
        c.slug AS camp_slug,
        MAX(r.poc_name) AS poc_name,
        MAX(r.poc_contact) AS poc_contact,
        MAX(r.email) AS email,
        MAX(r.payment_method) AS payment_method,
        MAX(r.payment_status) AS payment_status,
        MAX(r.payment_id) AS payment_id,
        MAX(r.order_id) AS order_id,
        MAX(r.deduction_source) AS deduction_source,
        MAX(r.passcode) AS passcode,
        MAX(r.payment_screenshot_url) AS payment_screenshot_url,
        MAX(r.verified_at) AS verified_at,
        MAX(r.verified_by) AS verified_by,
        MIN(r.created_at) AS created_at,
        COUNT(r.id)::int AS participant_count,
        COALESCE(SUM(r.total_cost), 0)::numeric AS total_amount,
        COALESCE(SUM(r.meal_cost), 0)::numeric AS total_meal_cost,
        COALESCE(SUM(r.acc_cost + COALESCE(r.ac_cost, 0)), 0)::numeric AS total_acc_cost,
        COALESCE(SUM(r.discount_amount), 0)::numeric AS total_discount,
        MAX(r.coupon_code) AS coupon_code,
        JSON_AGG(
          json_build_object(
            'id', r.id,
            'participant_name', r.participant_name,
            'whatsapp', r.whatsapp,
            'camp_track', r.camp_track,
            'participant_type', r.participant_type,
            'gender', r.gender,
            'voice_name', r.voice_name,
            'parent_temple', r.parent_temple,
            'counselor_name', r.counselor_name,
            'accommodation', r.accommodation,
            'first_meal_date', r.first_meal_date,
            'first_meal_type', r.first_meal_type,
            'last_meal_date', r.last_meal_date,
            'last_meal_type', r.last_meal_type,
            'total_cost', r.total_cost,
            'meal_cost', r.meal_cost,
            'acc_cost', r.acc_cost,
            'is_cancelled', r.is_cancelled,
            'payment_status', r.payment_status
          )
        ) AS participants
      FROM camp_registrations r
      JOIN camps c ON c.id = r.camp_id
      GROUP BY COALESCE(r.group_id, r.payment_id, r.id::text), r.camp_id, c.title, c.slug
      ORDER BY MIN(r.created_at) DESC
    `;

    const txRes = await query(txSql);
    const transactions = txRes.rows as CampAuditTransaction[];

    // Fetch all refunds across camps to cross-reference
    const refundsSql = `
      SELECT r.*, c.title AS camp_title, c.slug AS camp_slug
      FROM camp_refund_requests r
      JOIN camps c ON c.id = r.camp_id
      ORDER BY r.created_at DESC
    `;
    const refundsRes = await query(refundsSql);
    const allRefunds = refundsRes.rows as (CampRefundRequest & { camp_title: string; camp_slug: string })[];

    // Map refunds to transactions
    const refundMapByGroupId = new Map<string, CampRefundRequest>();
    const refundMapByRegId = new Map<string, CampRefundRequest>();
    for (const ref of allRefunds) {
      if (ref.payout_date && (ref.payout_date as any) instanceof Date) {
        ref.payout_date = (ref.payout_date as unknown as Date).toISOString().split('T')[0];
      }
      if (ref.group_id) {
        refundMapByGroupId.set(ref.group_id, ref);
      }
      if (ref.registration_id) {
        refundMapByRegId.set(ref.registration_id, ref);
      }
      if (Array.isArray(ref.cancelled_registrations)) {
        for (const cr of ref.cancelled_registrations) {
          if (cr.reg_id) {
            refundMapByRegId.set(cr.reg_id, ref);
          }
        }
      }
    }

    let totalCollected = 0;
    let totalGrossFee = 0;
    let totalDiscounts = 0;
    let totalCouponsCount = 0;
    let totalParticipants = 0;
    let totalRefunded = 0;
    let pendingVerificationCount = 0;

    for (const t of transactions) {
      // Numerical conversions
      t.total_amount = Number(t.total_amount || 0);
      t.total_meal_cost = Number(t.total_meal_cost || 0);
      t.total_acc_cost = Number(t.total_acc_cost || 0);
      t.total_discount = Number(t.total_discount || 0);
      t.participant_count = Number(t.participant_count || 0);

      // Match refund
      if (t.txn_id && refundMapByGroupId.has(t.txn_id)) {
        t.refund = refundMapByGroupId.get(t.txn_id);
      } else if (Array.isArray(t.participants)) {
        for (const p of t.participants) {
          if (p.id && refundMapByRegId.has(p.id)) {
            t.refund = refundMapByRegId.get(p.id);
            break;
          }
        }
      }

      if (t.payment_status === 'completed' || t.payment_status === 'refunded') {
        totalCollected += t.total_amount;
        totalGrossFee += (t.total_meal_cost + t.total_acc_cost);
        totalDiscounts += t.total_discount;
        if (t.total_discount > 0 || t.coupon_code) {
          totalCouponsCount++;
        }
      }
      totalParticipants += t.participant_count;

      if (t.payment_status === 'pending' || (t.payment_method === 'INTER_TEMPLE_TRANSFER' && !t.verified_at)) {
        pendingVerificationCount++;
      }
    }

    for (const r of allRefunds) {
      if (r.status === 'refunded') {
        totalRefunded += Number(r.refund_amount || 0);
      }
    }

    return {
      success: true,
      transactions,
      refunds: allRefunds,
      stats: {
        total_gross_fee: totalGrossFee,
        total_discounts: totalDiscounts,
        total_coupons_count: totalCouponsCount,
        total_collected: totalCollected,
        total_refunded: totalRefunded,
        net_revenue: Math.max(0, totalCollected - totalRefunded),
        total_transactions: transactions.length,
        total_participants: totalParticipants,
        pending_verifications: pendingVerificationCount,
        pending_refunds: allRefunds.filter(r => r.status === 'pending').length
      }
    };
  } catch (error: any) {
    console.error('getAllCampTransactionsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Super Admin: Get all refund requests across all camps with linked camp info
 */
export async function getAllCampRefundsAction() {
  try {
    const { isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      return { success: false, error: 'Forbidden: Super Admin privileges are required.' };
    }

    const sql = `
      SELECT r.*, 
        c.title AS camp_title,
        c.slug AS camp_slug
      FROM camp_refund_requests r
      JOIN camps c ON c.id = r.camp_id
      ORDER BY r.created_at DESC
    `;

    const res = await query(sql);
    return { success: true, refunds: res.rows as (CampRefundRequest & { camp_title: string; camp_slug: string })[] };
  } catch (error: any) {
    console.error('getAllCampRefundsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all registered centers for camp eligibility configuration
 */
export async function getAllCentersForCampConfigAction() {
  try {
    const res = await query(
      `SELECT id, name, temple_name 
       FROM centers 
       WHERE name IS NOT NULL AND name != ''
       ORDER BY name ASC`
    );
    return {
      success: true,
      centers: res.rows as { id: string; name: string; temple_name?: string }[]
    };
  } catch (error: any) {
    console.error('getAllCentersForCampConfigAction error:', error);
    return { success: false, error: error.message, centers: [] };
  }
}

/**
 * Public & User Dashboard: Fetch all currently active camps for devotee registration
 * Automatically filters camps based on center eligibility restrictions.
 */
export async function getActiveCampsForUserAction(clientUserId?: string) {
  try {
    const sessionUser = await getAuthUserFromCookies().catch(() => null);
    const resolvedUserId = clientUserId || sessionUser?.id;

    const sql = `
      SELECT 
        c.*,
        COUNT(r.id)::int AS registration_count
      FROM camps c
      LEFT JOIN camp_registrations r ON r.camp_id = c.id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.start_date ASC, c.created_at DESC
    `;
    const res = await query(sql);
    const allCamps = res.rows as (Camp & { registration_count?: number })[];

    if (!resolvedUserId) {
      // Unauthenticated view: only camps open to all centers are visible
      return {
        success: true,
        camps: allCamps.filter(c => {
          const eligible = Array.isArray(c.eligible_centers) ? c.eligible_centers : [];
          return eligible.length === 0;
        })
      };
    }

    // Lookup user to resolve all associated centers and managerial roles
    const uRes = await query(
      `SELECT id, role, current_center, center, other_center, hierarchy FROM users WHERE id = $1`,
      [resolvedUserId]
    );

    if (uRes.rows.length === 0) {
      return {
        success: true,
        camps: allCamps.filter(c => {
          const eligible = Array.isArray(c.eligible_centers) ? c.eligible_centers : [];
          return eligible.length === 0;
        })
      };
    }

    const caller = uRes.rows[0];
    const roles = (Array.isArray(caller.role) ? caller.role : [caller.role])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));

    const isSuperAdmin = roles.includes(8) || caller.role === 'super_admin' || (Array.isArray(caller.role) && caller.role.includes('super_admin' as any));

    // Super Admin can see ALL camps without restrictions
    if (isSuperAdmin) {
      return { success: true, camps: allCamps };
    }

    // Collect all centers belonging to this user
    const userCenterSet = new Set<string>();
    const addCenter = (val?: string | null) => {
      if (val && typeof val === 'string' && val.trim() && val.trim().toLowerCase() !== 'none') {
        userCenterSet.add(val.trim().toLowerCase());
      }
    };

    addCenter(caller.current_center);
    addCenter(caller.center);
    addCenter(caller.other_center);
    addCenter(caller.hierarchy?.currentCenter);
    addCenter(caller.hierarchy?.center);
    if (caller.hierarchy?.currentCenter?.name) addCenter(caller.hierarchy.currentCenter.name);

    // If manager, also check manager assigned centers
    const isManagerRole = roles.some((r: any) => [9, 10, 11, 12, 13, 14, 15, 16, 17].includes(Number(r)));
    if (isManagerRole) {
      try {
        const managerLoc = await getManagerAssignedLocations(caller.id, roles);
        (managerLoc.assignedCenterNames || []).forEach(c => addCenter(c));
        (managerLoc.directlyAssignedCenterNames || []).forEach(c => addCenter(c));
      } catch (locErr) {
        console.warn('Error fetching manager assigned locations in getActiveCampsForUserAction:', locErr);
      }
    }

    // Filter camps: either open to all (eligible_centers is empty), or user's center is in eligible_centers
    const visibleCamps = allCamps.filter(c => {
      const eligible = Array.isArray(c.eligible_centers) ? c.eligible_centers : [];
      if (eligible.length === 0) return true; // Open to all centers

      return eligible.some(ec => {
        const ecLower = ec.toLowerCase().trim();
        for (const uc of userCenterSet) {
          if (uc === ecLower || uc.includes(ecLower) || ecLower.includes(uc)) {
            return true;
          }
        }
        return false;
      });
    });

    return { success: true, camps: visibleCamps };
  } catch (error: any) {
    console.error('getActiveCampsForUserAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * User Dashboard: Fetch camp registrations belonging to the current user (by phone or email)
 */
export async function getUserCampRegistrationsAction(identifier?: { email?: string; phone?: string; callerUserId?: string }) {
  try {
    const sessionUser = await getAuthUserFromCookies().catch(() => null);
    const resolvedUserId = identifier?.callerUserId || sessionUser?.id;
    if (!resolvedUserId) {
      return { success: false, error: 'Authentication required' };
    }

    const uRes = await query('SELECT id, email, phone, role FROM users WHERE id = $1', [resolvedUserId]);
    const dbUser = uRes.rows[0];
    const roles = (Array.isArray(dbUser?.role) ? dbUser.role : [dbUser?.role]).map((r: any) => Number(r)).filter((r: number) => !isNaN(r));

    const cleanEmail = (dbUser?.email || sessionUser?.email || identifier?.email || '').trim().toLowerCase();
    const rawPhone = dbUser?.phone || identifier?.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);

    const managerLoc = await getManagerAssignedLocations(resolvedUserId, roles);

    let sql = `
      WITH camp_serials AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY camp_id ORDER BY created_at ASC) AS serial_no
        FROM camp_registrations
      ),
      unique_regs AS (
        SELECT DISTINCT ON (r.id)
          r.*,
          cs.serial_no,
          c.title AS camp_title,
          c.slug AS camp_slug,
          c.venue AS camp_venue,
          c.start_date AS camp_start_date,
          c.end_date AS camp_end_date,
          c.refund_config AS camp_refund_config,
          c.meal_pricing AS camp_meal_pricing,
          c.tracks AS camp_tracks,
          u.current_center AS user_current_center,
          u.center AS user_center,
          u.other_center AS user_other_center,
          u.hierarchy AS user_hierarchy
        FROM camp_registrations r
        JOIN camp_serials cs ON cs.id = r.id
        JOIN camps c ON c.id = r.camp_id
        LEFT JOIN LATERAL (
          SELECT current_center, center, other_center, current_temple, parent_temple, hierarchy
          FROM users
          WHERE (r.email <> '' AND LOWER(email) = LOWER(r.email))
             OR (r.whatsapp <> '' AND phone IS NOT NULL AND phone <> '' AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(r.whatsapp, '[^0-9]', '', 'g'), 10))
          LIMIT 1
        ) u ON TRUE
        WHERE (
          ($1 <> '' AND LOWER(r.email) = $1) OR
          ($2 <> '' AND (
            RIGHT(r.poc_contact, 10) = $2 OR 
            RIGHT(r.whatsapp, 10) = $2
          ))
    `;

    const params: any[] = [cleanEmail, cleanPhone];

    if (managerLoc.isSuperAdmin) {
      sql += ` OR TRUE `;
    } else if (managerLoc.isManager) {
      const lowerTemples = managerLoc.assignedTempleNames.map(t => t.toLowerCase());
      const lowerCenters = managerLoc.assignedCenterNames.map(c => c.toLowerCase());
      const conditions: string[] = [];

      if (lowerTemples.length > 0) {
        params.push(lowerTemples);
        const pIdx = params.length;
        conditions.push(`LOWER(r.parent_temple) = ANY($${pIdx}) OR LOWER(r.current_temple) = ANY($${pIdx}) OR LOWER(u.current_temple) = ANY($${pIdx}) OR LOWER(u.parent_temple) = ANY($${pIdx})`);
      }
      if (lowerCenters.length > 0) {
        params.push(lowerCenters);
        const pIdx = params.length;
        conditions.push(`LOWER(r.voice_name) = ANY($${pIdx}) OR LOWER(r.current_center) = ANY($${pIdx}) OR LOWER(u.current_center) = ANY($${pIdx}) OR LOWER(u.center) = ANY($${pIdx})`);
      }

      if (conditions.length > 0) {
        sql += ` OR (${conditions.join(' OR ')}) `;
      }
    }

    sql += `
        )
      )
      SELECT * FROM unique_regs
      ORDER BY created_at DESC
    `;

    const res = await query(sql, params);
    const registrations = res.rows.map((r: any) => {
      const rEmail = (r.email || '').trim().toLowerCase();
      const rPhone = (r.whatsapp || r.poc_contact || '').replace(/\D/g, '').slice(-10);
      const isOwn = Boolean(
        (cleanEmail && rEmail === cleanEmail) ||
        (cleanPhone && rPhone === cleanPhone)
      );
      return {
        ...r,
        is_own_registration: isOwn
      };
    }) as (CampRegistration & {
      serial_no?: number;
      camp_title: string;
      camp_slug: string;
      camp_venue: string;
      camp_start_date: string;
      camp_end_date: string;
      camp_refund_config?: any;
      camp_meal_pricing?: any[];
      camp_tracks?: any[];
      is_own_registration: boolean;
    })[];

    let refundRequests: CampRefundRequest[] = [];
    if (registrations.length > 0) {
      const regIds = registrations.map(r => r.id);
      const groupIds = Array.from(new Set(registrations.map(r => r.group_id).filter(Boolean)));

      const refundSql = `
        SELECT * FROM camp_refund_requests 
        WHERE registration_id = ANY($1) 
           OR group_id = ANY($2)
           OR ($3 <> '' AND LOWER(email) = $3)
        ORDER BY created_at DESC
      `;
      const refundRes = await query(refundSql, [regIds, groupIds, cleanEmail]);
      refundRequests = refundRes.rows;
    }

    return { 
      success: true, 
      registrations,
      refundRequests,
      isManager: managerLoc.isManager,
      assignedTemples: managerLoc.assignedTempleNames,
      assignedCenters: managerLoc.assignedCenterNames,
    };
  } catch (error: any) {
    console.error('getUserCampRegistrationsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Public/Admin QR Verification: Fetch a camp registration and meal validity by registration ID
 */
export async function verifyCampRegistrationAction(registrationId: string) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    const cleanId = (registrationId || '').trim();
    if (!cleanId) {
      return { success: false, error: 'Invalid or missing registration ID.' };
    }

    const sql = `
      WITH camp_serials AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY camp_id ORDER BY created_at ASC) AS serial_no
        FROM camp_registrations
      )
      SELECT 
        r.*,
        cs.serial_no,
        c.title AS camp_title,
        c.slug AS camp_slug,
        c.venue AS camp_venue,
        c.start_date AS camp_start_date,
        c.end_date AS camp_end_date,
        c.meal_pricing AS camp_meal_pricing,
        c.tracks AS camp_tracks,
        c.status AS camp_status,
        u.current_center AS user_current_center,
        u.center AS user_center,
        u.other_center AS user_other_center,
        u.hierarchy AS user_hierarchy
      FROM camp_registrations r
      JOIN camp_serials cs ON cs.id = r.id
      JOIN camps c ON c.id = r.camp_id
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, hierarchy
        FROM users
        WHERE LOWER(email) = LOWER(r.email) AND email <> ''
        LIMIT 1
      ) u ON TRUE
      WHERE r.id::text = $1
    `;
    const res = await query(sql, [cleanId]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Registration pass not found or invalid QR code.' };
    }

    const registration = res.rows[0];

    // Enforce camp allocation isolation for staff members
    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === registration.camp_id);
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: You do not have permissions for this camp.' };
      }
    }

    // Check for refund requests
    const refundSql = `
      SELECT * FROM camp_refund_requests 
      WHERE registration_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const refundRes = await query(refundSql, [cleanId]);
    const refund = refundRes.rows[0] || null;

    return {
      success: true,
      registration,
      refund,
    };
  } catch (error: any) {
    console.error('verifyCampRegistrationAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gate Check-In & Meal Attendance punch for a devotee pass
 */
export async function checkInCampAttendeeAction(registrationId: string, mealKey?: string) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();
    const cleanId = (registrationId || '').trim();
    if (!cleanId) {
      return { success: false, error: 'Registration ID required' };
    }

    const regLookup = await query('SELECT camp_id, payment_status, is_cancelled FROM camp_registrations WHERE id = $1', [cleanId]);
    if (regLookup.rows.length === 0) return { success: false, error: 'Registration not found' };
    const { camp_id: campId, payment_status, is_cancelled } = regLookup.rows[0];

    if (is_cancelled || payment_status === 'refunded') {
      return { success: false, error: 'Registration is cancelled / refunded. Gate entry and meals cannot be recorded.' };
    }
    if (payment_status === 'processing' || payment_status === 'pending') {
      return { success: false, error: 'Payment is pending approval (IDT/ITT). Devotee pass is not active until approved.' };
    }

    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === campId && ['scan_pass', 'prasadam', 'attendance', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: You do not have check-in privileges for this camp.' };
      }
    }

    if (mealKey) {
      // Mark meal served in meals_served jsonb map
      const sql = `
        UPDATE camp_registrations
        SET meals_served = jsonb_set(COALESCE(meals_served, '{}'::jsonb), ARRAY[$2], 'true'::jsonb),
            checked_in = true,
            checked_in_at = COALESCE(checked_in_at, NOW()),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const res = await query(sql, [cleanId, mealKey]);
      if (res.rows.length === 0) return { success: false, error: 'Registration not found' };
      return { success: true, registration: res.rows[0], message: `Meal recorded: ${mealKey}` };
    } else {
      // Mark gate entry check-in
      const sql = `
        UPDATE camp_registrations
        SET checked_in = true,
            checked_in_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const res = await query(sql, [cleanId]);
      if (res.rows.length === 0) return { success: false, error: 'Registration not found' };
      return { success: true, registration: res.rows[0], message: 'Attendee check-in recorded!' };
    }
  } catch (error: any) {
    console.error('checkInCampAttendeeAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search users to allocate as staff (Super Admin only)
 */
export async function searchUsersForStaffAction(searchTerm: string) {
  try {
    const { isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      throw new Error('Forbidden: Super Admin privileges required');
    }

    const term = `%${(searchTerm || '').trim()}%`;
    const sql = `
      SELECT id, name, email, phone, current_center, role
      FROM users
      WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
      ORDER BY name ASC
      LIMIT 20
    `;
    const res = await query(sql, [term]);
    return { success: true, users: res.rows };
  } catch (error: any) {
    console.error('searchUsersForStaffAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch staff allocations for camps (Super Admin only)
 */
export async function getCampAllocationsAction(campId?: string) {
  try {
    const { isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      throw new Error('Forbidden: Super Admin privileges required');
    }

    let sql = `
      SELECT 
        a.*,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        c.title AS camp_title
      FROM camp_admin_allocations a
      JOIN users u ON u.id = a.user_id
      JOIN camps c ON c.id = a.camp_id
    `;
    const params: any[] = [];
    if (campId) {
      sql += ' WHERE a.camp_id = $1 ';
      params.push(campId);
    }
    sql += ' ORDER BY a.created_at DESC ';

    const res = await query(sql, params);
    return { success: true, allocations: res.rows as CampAdminAllocation[] };
  } catch (error: any) {
    console.error('getCampAllocationsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign staff member to a camp with granular permissions (Super Admin only)
 */
export async function assignCampStaffAction(data: {
  userId: string;
  campId: string;
  permissionType?: 'attendance' | 'refunds' | 'both' | 'scan_pass' | 'prasadam' | 'payment_approvals';
  permissionTypes?: ('attendance' | 'refunds' | 'both' | 'scan_pass' | 'prasadam' | 'payment_approvals')[];
  notes?: string;
}) {
  try {
    const { user, isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to assign staff');
    }

    const typesToAssign: ('attendance' | 'refunds' | 'both' | 'scan_pass' | 'prasadam' | 'payment_approvals')[] =
      data.permissionTypes && data.permissionTypes.length > 0
        ? data.permissionTypes
        : data.permissionType
        ? [data.permissionType]
        : ['attendance'];

    // Sync permissions: Delete any previous roles for this user & camp that were not selected
    await query(
      `DELETE FROM camp_admin_allocations 
       WHERE user_id = $1 AND camp_id = $2 AND NOT (permission_type = ANY($3::text[]))`,
      [data.userId, data.campId, typesToAssign]
    );

    const insertedRows = [];
    for (const pType of typesToAssign) {
      const sql = `
        INSERT INTO camp_admin_allocations (user_id, camp_id, permission_type, assigned_by, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, camp_id, permission_type)
        DO UPDATE SET 
          notes = EXCLUDED.notes,
          assigned_by = EXCLUDED.assigned_by,
          updated_at = NOW()
        RETURNING *
      `;
      const res = await query(sql, [
        data.userId,
        data.campId,
        pType,
        user.id,
        data.notes || null,
      ]);
      if (res.rows[0]) insertedRows.push(res.rows[0]);
    }

    revalidatePath('/dashboard/admin/camps');
    return { success: true, allocations: insertedRows, allocation: insertedRows[0] };
  } catch (error: any) {
    console.error('assignCampStaffAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke staff member allocation from a camp (Super Admin only)
 */
export async function revokeCampStaffAction(allocationId: string) {
  try {
    const { isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to revoke staff');
    }

    // Check if row exists and delete any duplicate matching rows for this (user_id, camp_id, permission_type)
    const findRes = await query('SELECT user_id, camp_id, permission_type FROM camp_admin_allocations WHERE id = $1', [allocationId]);
    if (findRes.rows.length > 0) {
      const { user_id, camp_id, permission_type } = findRes.rows[0];
      await query(
        'DELETE FROM camp_admin_allocations WHERE user_id = $1 AND camp_id = $2 AND permission_type = $3',
        [user_id, camp_id, permission_type]
      );
    } else {
      await query('DELETE FROM camp_admin_allocations WHERE id = $1', [allocationId]);
    }

    revalidatePath('/dashboard/admin/camps');
    return { success: true };
  } catch (error: any) {
    console.error('revokeCampStaffAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke ALL staff roles for a specific user in a camp (Super Admin only)
 */
export async function revokeCampStaffUserAction(userId: string, campId: string) {
  try {
    const { isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      throw new Error('Forbidden: Super Admin privileges required to revoke staff');
    }

    await query('DELETE FROM camp_admin_allocations WHERE user_id = $1 AND camp_id = $2', [userId, campId]);
    revalidatePath('/dashboard/admin/camps');
    return { success: true };
  } catch (error: any) {
    console.error('revokeCampStaffUserAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get allocated camps for the currently logged-in user (Super Admin gets all active camps)
 * Groups multiple role allocations per camp into user_roles array.
 */
export async function getUserAllocatedCampsAction() {
  try {
    const user = await getAuthUserFromCookies();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const uRes = await query('SELECT role FROM users WHERE id = $1', [user.id]);
    const role = uRes.rows[0]?.role;
    const roles = (Array.isArray(role) ? role : [role])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));
    const isSuperAdmin = roles.includes(8) || (Array.isArray(role) && role.includes('super_admin' as any));

    if (isSuperAdmin) {
      const res = await query('SELECT * FROM camps WHERE status IN (\'active\', \'completed\', \'closed\') ORDER BY created_at DESC');
      const camps = res.rows.map(c => ({
        ...c,
        user_role: 'super_admin',
        user_roles: ['attendance', 'refunds', 'prasadam', 'scan_pass', 'payment_approvals', 'both'],
      }));
      return { success: true, camps, isSuperAdmin: true };
    }

    const allocRes = await query(
      `SELECT a.permission_type, a.notes AS staff_notes, c.*
       FROM camp_admin_allocations a
       JOIN camps c ON c.id = a.camp_id
       WHERE a.user_id = $1
       ORDER BY c.start_date DESC`,
      [user.id]
    );

    // Group allocations by camp ID so a devotee assigned multiple roles sees all their privileges
    const campMap = new Map<string, any>();
    for (const row of allocRes.rows) {
      const cid = row.id;
      if (!campMap.has(cid)) {
        campMap.set(cid, {
          ...row,
          user_role: row.permission_type || 'scan_pass',
          user_roles: [row.permission_type || 'scan_pass'],
        });
      } else {
        const existing = campMap.get(cid);
        if (!existing.user_roles.includes(row.permission_type)) {
          existing.user_roles.push(row.permission_type);
        }
        // If has both attendance and refunds, or has 'both', promote primary user_role
        if (existing.user_roles.includes('both') || (existing.user_roles.includes('attendance') && existing.user_roles.includes('refunds'))) {
          existing.user_role = 'both';
        }
      }
    }

    return { success: true, camps: Array.from(campMap.values()), isSuperAdmin: false };
  } catch (error: any) {
    console.error('getUserAllocatedCampsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check logged-in user's exact permissions for a specific camp:
 * Supports multiple roles assigned to the same user for this camp.
 */
export async function getCampUserAccessAction(campId: string) {
  try {
    const { isSuperAdmin, campAllocations } = await verifyAdminAuth();
    if (isSuperAdmin) {
      return {
        success: true,
        isSuperAdmin: true,
        permission: 'super_admin' as const,
        permissions: ['attendance', 'refunds', 'prasadam', 'scan_pass', 'payment_approvals', 'both'] as string[],
        canAttendance: true,
        canRefunds: true,
        canPrasadam: true,
        canScan: true,
        canPaymentApprovals: true,
      };
    }

    const matching = campAllocations.filter((a) => a.camp_id === campId);
    const permissions = matching.map((a) => a.permission_type);

    const hasBoth = permissions.includes('both');
    const canAttendance = isSuperAdmin || hasBoth || permissions.includes('attendance') || permissions.includes('payment_approvals');
    const canRefunds = isSuperAdmin || hasBoth || permissions.includes('refunds');
    const canPrasadam = isSuperAdmin || hasBoth || permissions.includes('prasadam');
    const canScan = isSuperAdmin || hasBoth || permissions.includes('scan_pass') || permissions.includes('attendance') || permissions.includes('prasadam');
    const canPaymentApprovals = isSuperAdmin || hasBoth || permissions.includes('payment_approvals');

    const primaryPermission = hasBoth
      ? 'both'
      : (permissions[0] as 'attendance' | 'refunds' | 'prasadam' | 'scan_pass' | 'payment_approvals' | null) || null;

    return {
      success: true,
      isSuperAdmin: false,
      permission: primaryPermission,
      permissions,
      canAttendance,
      canRefunds,
      canPrasadam,
      canScan,
      canPaymentApprovals,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      isSuperAdmin: false,
      permission: null,
      permissions: [],
      canAttendance: false,
      canRefunds: false,
      canPrasadam: false,
      canScan: false,
      canPaymentApprovals: false,
    };
  }
}

/**
 * Real-time Scanner Action:
 * Verifies scanned pass for specific Camp, Date, and Meal, preventing duplicates and automatically punching meal!
 */
export async function verifyAndPunchMealPassAction(data: {
  rawPassInput: string;
  campId: string;
  mealDate: string;
  mealName: string;
}) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    if (data.campId && !isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === data.campId && ['scan_pass', 'prasadam', 'attendance', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, status: 'UNAUTHORIZED_CAMP', message: 'You are not assigned scanning or prasadam privileges for this camp.' };
      }
    }

    let cleanId = (data.rawPassInput || '').trim();
    if (!cleanId) {
      return { success: false, status: 'EMPTY_INPUT', message: 'No QR code or registration ID provided.' };
    }

    // 1. Extract standard UUID if present anywhere in the string (e.g. from ?id=UUID or /verify-pass?id=UUID)
    const uuidMatch = cleanId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      cleanId = uuidMatch[0].toLowerCase();
    } else {
      // Extract from URL query parameter or path if not a raw UUID
      try {
        if (cleanId.includes('?')) {
          const parsedUrl = new URL(cleanId.startsWith('http') ? cleanId : `https://example.com/${cleanId}`);
          const idParam = parsedUrl.searchParams.get('id');
          if (idParam) cleanId = idParam.trim();
        } else if (cleanId.startsWith('http') || cleanId.includes('/')) {
          const parsedUrl = new URL(cleanId.startsWith('http') ? cleanId : `https://example.com/${cleanId}`);
          const parts = parsedUrl.pathname.split('/').filter(Boolean);
          const lastPart = parts[parts.length - 1];
          if (lastPart) cleanId = lastPart.trim();
        }
      } catch {
        // not a url
      }
    }

    const regSql = `
      WITH camp_serials AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY camp_id ORDER BY created_at ASC) AS serial_no
        FROM camp_registrations
      )
      SELECT 
        r.*,
        cs.serial_no,
        c.title AS camp_title,
        c.venue AS camp_venue,
        c.start_date AS camp_start_date,
        c.end_date AS camp_end_date,
        c.meal_pricing AS camp_meal_pricing,
        u.current_center AS user_current_center,
        u.center AS user_center,
        u.other_center AS user_other_center,
        u.profile_image AS user_profile_image
      FROM camp_registrations r
      JOIN camp_serials cs ON cs.id = r.id
      JOIN camps c ON c.id = r.camp_id
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, profile_image
        FROM users
        WHERE LOWER(email) = LOWER(r.email) AND email <> ''
        LIMIT 1
      ) u ON TRUE
      WHERE r.id::text = $1 OR r.whatsapp = $1 OR r.poc_contact = $1
      LIMIT 1
    `;
    const regRes = await query(regSql, [cleanId]);
    if (regRes.rows.length === 0) {
      return {
        success: false,
        status: 'NOT_FOUND',
        message: 'Pass not found. Verify the registration ID or QR code.'
      };
    }

    const r = regRes.rows[0];

    // Check Camp Match
    if (data.campId && r.camp_id !== data.campId) {
      return {
        success: false,
        status: 'WRONG_CAMP',
        message: `Pass belongs to "${r.camp_title}", not the selected camp!`,
        attendee: {
          name: r.participant_name,
          campTitle: r.camp_title,
          token: r.serial_no || r.id?.slice(0, 5),
        }
      };
    }

    // Check Cancellation / Refund
    const refundRes = await query(
      'SELECT status FROM camp_refund_requests WHERE registration_id = $1 ORDER BY created_at DESC LIMIT 1',
      [r.id]
    );
    const refund = refundRes.rows[0];
    if (r.is_cancelled || r.payment_status === 'refunded' || refund?.status === 'refunded') {
      return {
        success: false,
        status: 'CANCELLED',
        message: 'Pass is CANCELLED / REFUNDED. Meal cannot be served.',
        attendee: {
          name: r.participant_name,
          track: r.camp_track,
          token: r.serial_no || r.id?.slice(0, 5)
        }
      };
    }

    // Check Pending Payment
    if (r.payment_status === 'pending' || r.payment_status === 'processing') {
      return {
        success: false,
        status: 'PENDING_PAYMENT',
        message: 'Payment verification pending. Devotee must obtain approval from Payment Approvals desk before pass is valid.',
        attendee: {
          name: r.participant_name,
          track: r.camp_track,
          token: r.serial_no || r.id?.slice(0, 5)
        }
      };
    }

    // Evaluate Meal Eligibility in Matrix
    const matrix = buildMealMatrix(
      r.camp_meal_pricing || [],
      r.first_meal_date,
      r.first_meal_type,
      r.last_meal_date,
      r.last_meal_type,
      r.camp_start_date,
      r.camp_end_date
    );

    const inputDate = (data.mealDate || '').trim();
    if (!inputDate) {
      return {
        success: false,
        status: 'EMPTY_DATE',
        message: 'No meal date was selected. Please select a valid Meal Date in the desk header.',
      };
    }

    // Helper to format date key into friendly label (e.g. "30 - Oct")
    const getFriendlyDateLabel = (dateKey: string) => {
      const match = (r.camp_meal_pricing || []).find((m: any) => String(m.date) === String(dateKey) || m.full_date === String(dateKey));
      if (match?.label) return match.label;
      if (match?.full_date) {
        const [y, m, d] = match.full_date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
      return dateKey;
    };

    const dayCol = matrix.find(col => 
      col.date === inputDate || 
      (col.full_date && col.full_date === inputDate) ||
      (inputDate.includes('-') && (
        col.date === inputDate.split('-')[2] || 
        col.date === String(parseInt(inputDate.split('-')[2], 10))
      )) ||
      (col.date.includes('-') && (
        inputDate === col.date.split('-')[2] ||
        inputDate === String(parseInt(col.date.split('-')[2], 10))
      ))
    );
    const normMeal = data.mealName.toLowerCase();
    const isOnlyMilk = String(r.dinner_type || '').toLowerCase().includes('milk');
    let isEligible = false;
    if (dayCol) {
      if (normMeal.startsWith('b')) isEligible = dayCol.breakfast;
      else if (normMeal.startsWith('l')) isEligible = dayCol.lunch;
      else if (normMeal.startsWith('d')) isEligible = dayCol.dinner && !isOnlyMilk;
      else if (normMeal.startsWith('m')) isEligible = dayCol.dinner && isOnlyMilk;
    }

    if (!isEligible) {
      let customMsg = `${data.mealName} on ${dayCol?.label || dayCol?.full_date || data.mealDate} is NOT included in this devotee's pass.`;
      if (dayCol?.dinner && normMeal.startsWith('d') && isOnlyMilk) {
        customMsg = `Devotee chose 'Only Milk' for dinner preference. Complete Dinner Meal is NOT included on ${dayCol?.label || data.mealDate}.`;
      } else if (dayCol?.dinner && normMeal.startsWith('m') && !isOnlyMilk) {
        customMsg = `Devotee chose 'Dinner Meal' for dinner preference. Night Milk pass is NOT included on ${dayCol?.label || data.mealDate}.`;
      }

      return {
        success: false,
        status: 'NOT_ELIGIBLE',
        message: customMsg,
        attendee: {
          name: r.participant_name,
          track: r.camp_track,
          token: r.serial_no || r.id?.slice(0, 5),
          firstMeal: `${getFriendlyDateLabel(r.first_meal_date)} (${r.first_meal_type})`,
          lastMeal: `${getFriendlyDateLabel(r.last_meal_date)} (${r.last_meal_type})`
        }
      };
    }

    // Check Duplicate Scan (Already Served)
    // Key uses canonical ISO date when available, but checks day number and raw formats too
    const canonicalDate = dayCol?.full_date || dayCol?.date || data.mealDate;
    const mealKey = `${canonicalDate}_${data.mealName}`;
    const altMealKey = dayCol?.date ? `${dayCol.date}_${data.mealName}` : mealKey;
    const rawMealKey = `${data.mealDate}_${data.mealName}`;
    const alreadyServedTime = r.meals_served?.[mealKey] || r.meals_served?.[altMealKey] || r.meals_served?.[rawMealKey];
    if (alreadyServedTime) {
      let timeFormatted = 'earlier today';
      let secondsAgo = 9999;
      try {
        const d = new Date(alreadyServedTime);
        if (!isNaN(d.getTime())) {
          timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          secondsAgo = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
        }
      } catch {
        // ignore
      }

      // If scanned within the last 15 seconds, it is the exact same attendee still standing at the camera.
      // Reassure volunteer that the pass was successfully cleared just seconds ago!
      if (secondsAgo <= 15) {
        return {
          success: true,
          status: 'JUST_PUNCHED',
          message: `PASS ALREADY CLEARED (${secondsAgo}s ago) • ALLOW DEVOTEE TO PROCEED`,
          servedAt: timeFormatted,
          secondsAgo,
          attendee: {
            id: r.id,
            name: r.participant_name,
            track: r.camp_track,
            token: r.serial_no || r.id?.slice(0, 5),
            center: r.voice_name || r.user_current_center || r.user_center || 'Central VOICE',
            whatsapp: r.whatsapp || r.poc_contact,
            profileImage: r.user_profile_image || null,
          }
        };
      }

      const timeAgoDesc = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)} min ago`;
      return {
        success: false,
        status: 'ALREADY_SERVED',
        message: `DUPLICATE SCAN! Already collected ${data.mealName} at ${timeFormatted} (${timeAgoDesc}).`,
        servedAt: timeFormatted,
        secondsAgo,
        attendee: {
          id: r.id,
          name: r.participant_name,
          track: r.camp_track,
          token: r.serial_no || r.id?.slice(0, 5),
          center: r.voice_name || r.user_current_center || r.user_center || 'Central VOICE',
          whatsapp: r.whatsapp || r.poc_contact,
          profileImage: r.user_profile_image || null,
        }
      };
    }

    // Automatically Punch Meal with ACID Concurrency Lock (prevents friends double-scanning at different counters)
    const updateSql = `
      UPDATE camp_registrations
      SET meals_served = jsonb_set(
            COALESCE(meals_served, '{}'::jsonb),
            ARRAY[$2],
            to_jsonb(NOW()::text)
          ),
          checked_in = true,
          checked_in_at = COALESCE(checked_in_at, NOW()),
          updated_at = NOW()
      WHERE id = $1 AND (
        (meals_served->$2) IS NULL AND 
        (meals_served->$3) IS NULL AND 
        (meals_served->$4) IS NULL
      )
      RETURNING meals_served
    `;
    const updateRes = await query(updateSql, [r.id, mealKey, altMealKey, rawMealKey]);
    if (updateRes.rows.length === 0) {
      // Concurrency protection: Another volunteer at Counter B punched this pass in the exact same fraction of a second!
      return {
        success: false,
        status: 'ALREADY_SERVED',
        message: `DUPLICATE SCAN! Another counter just punched ${data.mealName} for this pass!`,
        servedAt: 'just now',
        secondsAgo: 1,
        attendee: {
          id: r.id,
          name: r.participant_name,
          track: r.camp_track,
          token: r.serial_no || r.id?.slice(0, 5),
          center: r.voice_name || r.user_current_center || r.user_center || 'Central VOICE',
          whatsapp: r.whatsapp || r.poc_contact,
          profileImage: r.user_profile_image || null,
        }
      };
    }

    // Count Total Meals Served in this Session
    const countSql = `
      SELECT COUNT(*)::int AS count 
      FROM camp_registrations 
      WHERE camp_id = $1 AND (
        (meals_served->$2) IS NOT NULL OR 
        (meals_served->$3) IS NOT NULL OR 
        (meals_served->$4) IS NOT NULL
      )
    `;
    const countRes = await query(countSql, [r.camp_id, mealKey, altMealKey, rawMealKey]);
    const devoteeCount = countRes.rows[0]?.count || 1;

    let extraServed = 0;
    try {
      const extraServedRes = await query(`
        SELECT COALESCE(extra_served_count, 0) as extra_served_count
        FROM camp_kitchen_extra_meals
        WHERE camp_id = $1 AND (meal_date = $2 OR meal_date = $3) AND meal_name = $4
        LIMIT 1
      `, [r.camp_id, data.mealDate, altMealKey.split('_')[0], data.mealName]);
      extraServed = Number(extraServedRes.rows[0]?.extra_served_count) || 0;
    } catch (e) {
      // fallback
    }
    const totalServedCount = devoteeCount + extraServed;

    return {
      success: true,
      status: 'ALLOWED',
      message: `MEAL ALLOWED • ${data.mealName.toUpperCase()} PUNCHED`,
      totalServed: totalServedCount,
      devoteeServed: devoteeCount,
      extraServed,
      attendee: {
        id: r.id,
        name: r.participant_name,
        track: r.camp_track,
        token: r.serial_no || r.id?.slice(0, 5),
        center: r.voice_name || r.user_current_center || r.user_center || 'Central VOICE',
        whatsapp: r.whatsapp || r.poc_contact,
        accommodation: r.accommodation === 'Yes' ? 'Provided (Included)' : 'Day Scholar',
        profileImage: r.user_profile_image || null,
      }
    };
  } catch (error: any) {
    console.error('verifyAndPunchMealPassAction error:', error);
    return { success: false, status: 'ERROR', message: error.message };
  }
}

/**
 * Helper to resolve Devotee Center and Temple with historical snapshot priority:
 * 1. Priority 1 (Audit Snapshot): Registration record fields (voice_name / parent_temple)
 *    frozen at the time of registration so that 2+ years later history does not mutate.
 * 2. Fallback (Old/Blank records): Attendee's live user profile (current_center, center, other_center, current_temple, parent_temple).
 * 3. Fallback: POC profile if attendee profile is blank or None.
 */
function resolveDevoteeCenterAndTemple(r: any): { center: string; temple: string } {
  const resolveField = (cur: any, oth: any, def: any): string => {
    const c = (cur || '').trim();
    const o = (oth || '').trim();
    const d = (def || '').trim();
    if (c) {
      if (c.toLowerCase() === 'other') return o ? o : 'Other';
      if (c.toLowerCase() === 'none') return 'None';
      return c;
    }
    if (d) {
      if (d.toLowerCase() === 'other') return o ? o : 'Other';
      if (d.toLowerCase() === 'none') return 'None';
      return d;
    }
    return '';
  };

  // 1. Priority 1: Frozen Registration Record Snapshots
  let center = '';
  const regVoice = (r.voice_name || r.center || '').trim();
  if (regVoice && regVoice.toLowerCase() !== 'none') {
    center = regVoice.toLowerCase() === 'other' ? (r.other_center || 'Other') : regVoice;
  }

  let temple = '';
  const regTemple = (r.parent_temple || '').trim();
  if (regTemple && regTemple.toLowerCase() !== 'none') {
    temple = regTemple.toLowerCase() === 'other' ? (r.other_temple || 'Other') : regTemple;
  }

  // 2. Fallback: Attendee live profile if registration snapshot is missing
  if (!center || center === 'None') {
    const attCenter = resolveField(r.user_current_center, r.user_other_center, r.user_center);
    if (attCenter && attCenter !== 'None') {
      center = attCenter;
    }
  }

  if (!temple || temple === 'None') {
    const attTemple = resolveField(r.user_current_temple, r.user_other_temple, r.user_parent_temple);
    if (attTemple && attTemple !== 'None') {
      temple = attTemple;
    }
  }

  // 3. Fallback: POC's profile if attendee has no center or temple
  if (!center || center === 'None') {
    const pocCenter = resolveField(r.poc_current_center, r.poc_other_center, r.poc_center);
    if (pocCenter && pocCenter !== 'None') {
      center = pocCenter;
    }
  }

  if (!temple || temple === 'None') {
    const pocTemple = resolveField(r.poc_current_temple, r.poc_other_temple, r.poc_parent_temple);
    if (pocTemple && pocTemple !== 'None') {
      temple = pocTemple;
    }
  }

  if (!center) center = 'None';
  if (!temple) temple = 'None';

  return { center, temple };
}

/**
 * 1. Fetch comprehensive Prasadam Logs, Kitchen Headcount Tally & Attendee Status for a single camp
 */
export async function getCampPrasadamLogsAction(campId: string) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    if (!isSuperAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === campId && ['prasadam', 'attendance', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Prasadam or Attendance desk permission required for this camp.' };
      }
    }

    // Camp details
    const campRes = await query(`
      SELECT id, title, start_date, end_date, meal_pricing, tracks, venue
      FROM camps
      WHERE id = $1
    `, [campId]);

    if (campRes.rows.length === 0) {
      return { success: false, error: 'Camp not found' };
    }
    const camp = campRes.rows[0];

    // Registrations with attendee user AND POC user joins
    const regSql = `
      WITH camp_serials AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY camp_id ORDER BY created_at ASC) AS serial_no
        FROM camp_registrations
      )
      SELECT 
        r.id,
        cs.serial_no,
        r.participant_name,
        r.whatsapp,
        r.email,
        r.camp_track,
        r.first_meal_date,
        r.first_meal_type,
        r.last_meal_date,
        r.last_meal_type,
        r.meals_served,
        r.parent_temple,
        r.voice_name,
        r.poc_name,
        r.poc_contact,
        r.dinner_type,
        r.is_cancelled,
        u.current_center AS user_current_center,
        u.center AS user_center,
        u.other_center AS user_other_center,
        u.current_temple AS user_current_temple,
        u.other_temple AS user_other_temple,
        u.parent_temple AS user_parent_temple,
        poc_u.current_center AS poc_current_center,
        poc_u.center AS poc_center,
        poc_u.other_center AS poc_other_center,
        poc_u.current_temple AS poc_current_temple,
        poc_u.other_temple AS poc_other_temple,
        poc_u.parent_temple AS poc_parent_temple
      FROM camp_registrations r
      JOIN camp_serials cs ON cs.id = r.id
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, current_temple, other_temple, parent_temple
        FROM users
        WHERE (
          (r.email IS NOT NULL AND r.email <> '' AND LOWER(email) = LOWER(r.email))
          OR (r.whatsapp IS NOT NULL AND r.whatsapp <> '' AND phone = r.whatsapp)
        )
        LIMIT 1
      ) u ON TRUE
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, current_temple, other_temple, parent_temple
        FROM users
        WHERE (
          (r.poc_contact IS NOT NULL AND r.poc_contact <> '' AND phone = r.poc_contact)
        )
        LIMIT 1
      ) poc_u ON TRUE
      WHERE r.camp_id = $1 AND COALESCE(r.is_cancelled, false) = false
      ORDER BY cs.serial_no ASC
    `;
    const regRes = await query(regSql, [campId]);
    const registrations = regRes.rows;

    // Extra / Guest meals for kitchen
    const extraRes = await query(`
      SELECT meal_date, meal_name, extra_count, COALESCE(extra_served_count, 0) as extra_served_count, notes, added_by_name, updated_at
      FROM camp_kitchen_extra_meals
      WHERE camp_id = $1
    `, [campId]);
    const extrasMap = new Map<string, any>();
    extraRes.rows.forEach((e: any) => {
      const dStr = e.meal_date instanceof Date ? e.meal_date.toISOString().split('T')[0] : String(e.meal_date);
      extrasMap.set(`${dStr}_${e.meal_name}`, e);
      extrasMap.set(`${e.meal_date}_${e.meal_name}`, e);
      const rawD = dStr.split('-').pop() || dStr;
      extrasMap.set(`${rawD}_${e.meal_name}`, e);
    });

    const mealPricing = camp.meal_pricing || [];
    const sortedPricing = sortMealDays(mealPricing, camp.start_date);

    // Build unique schedule dates and kitchen tally
    const kitchenTally: any[] = [];
    const attendeeLogs: any[] = [];
    const devotees: any[] = [];
    const tracksSet = new Set<string>();
    const centersSet = new Set<string>();
    const templesSet = new Set<string>();
    const datesSet = new Set<string>();

    const centerAggMap = new Map<string, { totalDevotees: number; totalTaken: number; totalExpected: number }>();
    const templeAggMap = new Map<string, { totalDevotees: number; totalTaken: number; totalExpected: number }>();

    // Cache matrix for each registration
    const regMatrices = new Map<string, any[]>();
    registrations.forEach((r: any) => {
      const m = buildMealMatrix(
        sortedPricing,
        r.first_meal_date,
        r.first_meal_type,
        r.last_meal_date,
        r.last_meal_type,
        camp.start_date,
        camp.end_date
      );
      regMatrices.set(r.id, m);

      if (r.camp_track) tracksSet.add(r.camp_track);

      // Resolve center and temple with POC fallback
      const { center, temple } = resolveDevoteeCenterAndTemple(r);
      r._resolvedCenter = center;
      r._resolvedTemple = temple;
      centersSet.add(center);
      templesSet.add(temple);

      // Initialize Aggregations
      if (!centerAggMap.has(center)) {
        centerAggMap.set(center, { totalDevotees: 0, totalTaken: 0, totalExpected: 0 });
      }
      centerAggMap.get(center)!.totalDevotees++;

      if (!templeAggMap.has(temple)) {
        templeAggMap.set(temple, { totalDevotees: 0, totalTaken: 0, totalExpected: 0 });
      }
      templeAggMap.get(temple)!.totalDevotees++;
    });

    // 1. Build Kitchen Tally per meal session
    sortedPricing.forEach((day: any) => {
      let dateKey = day.full_date;
      if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        dateKey = parseMealDayToIso(day, camp.start_date) || String(day.date);
      }
      const rawDate = String(day.date);
      const dateLabel = (day.label || rawDate).replace(/\s*-\s*/g, ' ');
      datesSet.add(dateKey);

      (['Breakfast', 'Lunch', 'Dinner', 'Milk'] as const).forEach((mealName) => {
        let scheduledCount = 0;
        let takenCount = 0;

        registrations.forEach((r: any) => {
          const matrix = regMatrices.get(r.id) || [];
          const col = matrix.find((c: any) =>
            c.full_date === dateKey ||
            c.date === rawDate ||
            (c.full_date && dateKey.includes('-') && c.full_date === dateKey)
          );
          if (!col) return;

          const isOnlyMilk = String(r.dinner_type || '').toLowerCase().includes('milk');
          let isEligible = false;
          if (mealName === 'Breakfast') isEligible = col.breakfast;
          else if (mealName === 'Lunch') isEligible = col.lunch;
          else if (mealName === 'Dinner') isEligible = col.dinner && !isOnlyMilk;
          else if (mealName === 'Milk') isEligible = col.dinner && isOnlyMilk;

          if (isEligible) {
            scheduledCount++;
            const mealKey = `${dateKey}_${mealName}`;
            const altKey = `${rawDate}_${mealName}`;
            const servedTime = r.meals_served?.[mealKey] || r.meals_served?.[altKey];
            if (servedTime) {
              takenCount++;
            }

            // Flat log for Excel export and granular tracking
            attendeeLogs.push({
              regId: r.id,
              token: r.serial_no,
              name: r.participant_name,
              phone: r.whatsapp || r.poc_contact || '',
              track: r.camp_track || 'General Track',
              center: r._resolvedCenter,
              temple: r._resolvedTemple,
              date: dateKey,
              rawDate,
              dateLabel,
              meal: mealName,
              status: servedTime ? 'TAKEN' : 'NOT_TAKEN',
              servedAt: servedTime || null,
            });
          }
        });

        const extraKey = `${dateKey}_${mealName}`;
        const altExtraKey = `${rawDate}_${mealName}`;
        const extraRec = extrasMap.get(extraKey) || extrasMap.get(altExtraKey);
        const extraCount = Number(extraRec?.extra_count) || 0;
        const extraServedCount = Number(extraRec?.extra_served_count) || 0;

        kitchenTally.push({
          date: dateKey,
          rawDate,
          dateLabel,
          meal: mealName,
          scheduledCount,
          takenCount,
          notTakenCount: Math.max(0, scheduledCount - takenCount),
          extraCount,
          extraServedCount,
          totalHonored: takenCount + extraServedCount,
          totalKitchenTarget: scheduledCount + extraCount,
          totalServedSoFar: takenCount + extraServedCount,
          notes: extraRec?.notes || '',
          updatedAt: extraRec?.updated_at || null,
          addedBy: extraRec?.added_by_name || null,
        });
      });
    });

    // 2. Build Devotee Matrix (1 row per devotee with BF / LN / DN columns per day)
    registrations.forEach((r: any) => {
      const mealsServedMap = r.meals_served || {};
      let devEligible = 0;
      let devTaken = 0;

      const dateMatrix = sortedPricing.map((day: any) => {
        let dateKey = day.full_date;
        if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          dateKey = parseMealDayToIso(day, camp.start_date) || String(day.date);
        }
        const rawDate = String(day.date);
        const dateLabel = (day.label || rawDate).replace(/\s*-\s*/g, ' ');

        const matrix = regMatrices.get(r.id) || [];
        const col = matrix.find((c: any) =>
          c.full_date === dateKey ||
          c.date === rawDate ||
          (c.full_date && dateKey.includes('-') && c.full_date === dateKey)
        );

        const isOnlyMilk = String(r.dinner_type || '').toLowerCase().includes('milk');
        const bfEligible = !!col?.breakfast;
        const lnEligible = !!col?.lunch;
        const dnEligible = !!col?.dinner && !isOnlyMilk;
        const mlEligible = !!col?.dinner && isOnlyMilk;

        const bfPunch = mealsServedMap[`${dateKey}_Breakfast`] || mealsServedMap[`${rawDate}_Breakfast`] || null;
        const lnPunch = mealsServedMap[`${dateKey}_Lunch`] || mealsServedMap[`${rawDate}_Lunch`] || null;
        const dnPunch = mealsServedMap[`${dateKey}_Dinner`] || mealsServedMap[`${rawDate}_Dinner`] || null;
        const mlPunch = mealsServedMap[`${dateKey}_Milk`] || mealsServedMap[`${rawDate}_Milk`] || null;

        if (bfEligible) {
          devEligible++;
          if (bfPunch) devTaken++;
        }
        if (lnEligible) {
          devEligible++;
          if (lnPunch) devTaken++;
        }
        if (dnEligible) {
          devEligible++;
          if (dnPunch) devTaken++;
        }
        if (mlEligible) {
          devEligible++;
          if (mlPunch) devTaken++;
        }

        return {
          date: dateKey,
          rawDate,
          dateLabel,
          breakfast: {
            eligible: bfEligible,
            punched: !!bfPunch,
            punchedAt: bfPunch,
          },
          lunch: {
            eligible: lnEligible,
            punched: !!lnPunch,
            punchedAt: lnPunch,
          },
          dinner: {
            eligible: dnEligible,
            punched: !!dnPunch,
            punchedAt: dnPunch,
          },
          milk: {
            eligible: mlEligible,
            punched: !!mlPunch,
            punchedAt: mlPunch,
          }
        };
      });

      // Update Center & Temple Aggregates
      const centerAgg = centerAggMap.get(r._resolvedCenter);
      if (centerAgg) {
        centerAgg.totalExpected += devEligible;
        centerAgg.totalTaken += devTaken;
      }
      const templeAgg = templeAggMap.get(r._resolvedTemple);
      if (templeAgg) {
        templeAgg.totalExpected += devEligible;
        templeAgg.totalTaken += devTaken;
      }

      devotees.push({
        regId: r.id,
        token: r.serial_no,
        name: r.participant_name,
        phone: r.whatsapp || r.poc_contact || '',
        track: r.camp_track || 'General Track',
        center: r._resolvedCenter,
        temple: r._resolvedTemple,
        pocName: r.poc_name,
        pocContact: r.poc_contact,
        dinnerType: r.dinner_type || 'Dinner Meal',
        firstMeal: `${r.first_meal_date} (${r.first_meal_type})`,
        lastMeal: `${r.last_meal_date} (${r.last_meal_type})`,
        eligibleCount: devEligible,
        takenCount: devTaken,
        dateMatrix,
      });
    });

    const totalScheduled = kitchenTally.reduce((sum, k) => sum + k.scheduledCount, 0);
    const totalTaken = kitchenTally.reduce((sum, k) => sum + k.takenCount, 0);
    const totalExtraGuests = kitchenTally.reduce((sum, k) => sum + k.extraCount, 0);
    const totalExtraServed = kitchenTally.reduce((sum, k) => sum + (k.extraServedCount || 0), 0);
    const totalPlatesHonored = totalTaken + totalExtraServed;

    const centerSummary = Array.from(centerAggMap.entries()).map(([center, val]) => ({
      center,
      ...val,
      clearancePercent: val.totalExpected > 0 ? Math.round((val.totalTaken / val.totalExpected) * 100) : 0,
    })).sort((a, b) => b.totalDevotees - a.totalDevotees);

    const templeSummary = Array.from(templeAggMap.entries()).map(([temple, val]) => ({
      temple,
      ...val,
      clearancePercent: val.totalExpected > 0 ? Math.round((val.totalTaken / val.totalExpected) * 100) : 0,
    })).sort((a, b) => b.totalDevotees - a.totalDevotees);

    return {
      success: true,
      camp: {
        id: camp.id,
        title: camp.title,
        venue: camp.venue,
        startDate: camp.start_date,
        endDate: camp.end_date,
      },
      stats: {
        totalScheduled,
        totalTaken,
        totalPending: Math.max(0, totalScheduled - totalTaken),
        totalExtraGuests,
        totalExtraServed,
        totalPlatesHonored,
        totalKitchenTarget: totalScheduled + totalExtraGuests,
        clearancePercent: totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0,
      },
      kitchenTally,
      attendeeLogs,
      devotees,
      centerSummary,
      templeSummary,
      filterOptions: {
        dates: Array.from(datesSet).map((d) => {
          const m = sortedPricing.find((p: any) => p.full_date === d || String(p.date) === d);
          return { date: d, label: m?.label || d };
        }),
        tracks: Array.from(tracksSet).sort(),
        centers: Array.from(centersSet).sort(),
        temples: Array.from(templesSet).sort(),
      },
    };
  } catch (error: any) {
    console.error('getCampPrasadamLogsAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Save Extra / Guest Meals for Kitchen Headcount Tally
 */
export async function saveCampKitchenExtraMealsAction(data: {
  campId: string;
  mealDate: string;
  mealName: string;
  extraCount: number;
  extraServedCount?: number;
  notes?: string;
}) {
  try {
    const { user, isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();
    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === data.campId && ['prasadam', 'attendance', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Kitchen & Prasadam desk permission required for this camp.' };
      }
    }
    let adminName = (user as any)?.name || user?.user_metadata?.name || 'Camp Admin';
    if (user?.id) {
      try {
        const uRes = await query('SELECT name FROM users WHERE id = $1', [user.id]);
        if (uRes.rows[0]?.name) {
          adminName = uRes.rows[0].name;
        }
      } catch (e) {
        // fallback to adminName
      }
    }

    if (data.extraServedCount !== undefined) {
      await query(`
        INSERT INTO camp_kitchen_extra_meals (
          camp_id, meal_date, meal_name, extra_count, extra_served_count, notes, added_by_name, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (camp_id, meal_date, meal_name)
        DO UPDATE SET
          extra_count = EXCLUDED.extra_count,
          extra_served_count = EXCLUDED.extra_served_count,
          notes = EXCLUDED.notes,
          added_by_name = EXCLUDED.added_by_name,
          updated_at = NOW()
      `, [
        data.campId,
        data.mealDate,
        data.mealName,
        Math.max(0, Number(data.extraCount) || 0),
        Math.max(0, Number(data.extraServedCount) || 0),
        data.notes || '',
        adminName,
      ]);
    } else {
      await query(`
        INSERT INTO camp_kitchen_extra_meals (
          camp_id, meal_date, meal_name, extra_count, notes, added_by_name, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (camp_id, meal_date, meal_name)
        DO UPDATE SET
          extra_count = EXCLUDED.extra_count,
          notes = EXCLUDED.notes,
          added_by_name = EXCLUDED.added_by_name,
          updated_at = NOW()
      `, [
        data.campId,
        data.mealDate,
        data.mealName,
        Math.max(0, Number(data.extraCount) || 0),
        data.notes || '',
        adminName,
      ]);
    }

    revalidatePath(`/dashboard/admin/camps/${data.campId}/registrations`);
    revalidatePath(`/dashboard/admin/camps`);
    return { success: true };
  } catch (err: any) {
    console.error('saveCampKitchenExtraMealsAction error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 2b. Record Extra Guest Meals Served Directly from Scanner (Without QR)
 */
export async function recordExtraGuestMealPunchAction(data: {
  campId: string;
  mealDate: string;
  mealName: string;
  increment?: number;
  setExactCount?: number;
  notes?: string;
}) {
  try {
    const { user, isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();
    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === data.campId && ['prasadam', 'attendance', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Kitchen & Prasadam desk permission required for this camp.' };
      }
    }
    let adminName = (user as any)?.name || user?.user_metadata?.name || 'Gate Scanner Desk';
    if (user?.id) {
      try {
        const uRes = await query('SELECT name FROM users WHERE id = $1', [user.id]);
        if (uRes.rows[0]?.name) {
          adminName = uRes.rows[0].name;
        }
      } catch (e) {}
    }

    const increment = Number(data.increment) || 0;
    let extraServedCount = 0;
    let extraCount = 0;

    if (data.setExactCount !== undefined) {
      const exactVal = Math.max(0, Number(data.setExactCount) || 0);
      const res = await query(`
        INSERT INTO camp_kitchen_extra_meals (
          camp_id, meal_date, meal_name, extra_count, extra_served_count, notes, added_by_name, updated_at
        ) VALUES (
          $1, $2, $3, 0, $4, $5, $6, NOW()
        )
        ON CONFLICT (camp_id, meal_date, meal_name)
        DO UPDATE SET
          extra_served_count = $4,
          notes = CASE WHEN $5 <> '' THEN $5 ELSE camp_kitchen_extra_meals.notes END,
          updated_at = NOW()
        RETURNING extra_count, extra_served_count
      `, [
        data.campId,
        data.mealDate,
        data.mealName,
        exactVal,
        data.notes || '',
        adminName
      ]);
      extraServedCount = Number(res.rows[0]?.extra_served_count) || exactVal;
      extraCount = Number(res.rows[0]?.extra_count) || 0;
    } else {
      const res = await query(`
        INSERT INTO camp_kitchen_extra_meals (
          camp_id, meal_date, meal_name, extra_count, extra_served_count, notes, added_by_name, updated_at
        ) VALUES (
          $1, $2, $3, 0, GREATEST(0, $4::int), $5, $6, NOW()
        )
        ON CONFLICT (camp_id, meal_date, meal_name)
        DO UPDATE SET
          extra_served_count = GREATEST(0, camp_kitchen_extra_meals.extra_served_count + $4::int),
          notes = CASE WHEN $5 <> '' THEN $5 ELSE camp_kitchen_extra_meals.notes END,
          updated_at = NOW()
        RETURNING extra_count, extra_served_count
      `, [
        data.campId,
        data.mealDate,
        data.mealName,
        increment,
        data.notes || '',
        adminName
      ]);
      extraServedCount = Number(res.rows[0]?.extra_served_count) || 0;
      extraCount = Number(res.rows[0]?.extra_count) || 0;
    }

    // Calculate total devotees punched for this session
    const mealKey = `${data.mealDate}_${data.mealName}`;
    let altMealKey = mealKey;
    if (data.mealDate.includes('-')) {
      try {
        const [y, m, d] = data.mealDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        altMealKey = `${dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}_${data.mealName}`;
      } catch {}
    }
    const rawMealKey = `${data.mealDate.split('-').slice(1).join('-')}_${data.mealName}`;

    const countSql = `
      SELECT COUNT(*)::int AS count 
      FROM camp_registrations 
      WHERE camp_id = $1 
        AND COALESCE(is_cancelled, false) = false
        AND (
          (meals_served->$2) IS NOT NULL OR 
          (meals_served->$3) IS NOT NULL OR 
          (meals_served->$4) IS NOT NULL
        )
    `;
    const countRes = await query(countSql, [data.campId, mealKey, altMealKey, rawMealKey]);
    const devoteeServedCount = countRes.rows[0]?.count || 0;

    revalidatePath(`/dashboard/admin/camps/${data.campId}/registrations`);
    revalidatePath(`/dashboard/admin/camps`);

    return {
      success: true,
      extraServedCount,
      extraCount,
      devoteeServedCount,
      totalServedCount: devoteeServedCount + extraServedCount,
      message: increment > 0 
        ? `Added +${increment} Extra Guest Plate(s) without QR.` 
        : increment < 0 
        ? `Reverted 1 Extra Guest Plate.` 
        : `Updated Extra Guest count to ${extraServedCount}.`
    };
  } catch (err: any) {
    console.error('recordExtraGuestMealPunchAction error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 2c. Get Live Session Meal Stats for Scanner Desk
 */
export async function getSessionMealStatsAction(data: {
  campId: string;
  mealDate: string;
  mealName: string;
}) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();
    if (!data.campId || !data.mealDate || !data.mealName) {
      return { success: false, error: 'Missing parameters' };
    }
    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === data.campId && ['prasadam', 'attendance', 'scan_pass', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Prasadam desk permission required for this camp.' };
      }
    }

    const extraRes = await query(`
      SELECT extra_count, COALESCE(extra_served_count, 0) as extra_served_count, notes
      FROM camp_kitchen_extra_meals
      WHERE camp_id = $1 AND meal_date = $2 AND meal_name = $3
      LIMIT 1
    `, [data.campId, data.mealDate, data.mealName]);
    const extraRec = extraRes.rows[0];
    const extraServedCount = Number(extraRec?.extra_served_count) || 0;
    const extraCount = Number(extraRec?.extra_count) || 0;

    const mealKey = `${data.mealDate}_${data.mealName}`;
    let altMealKey = mealKey;
    if (data.mealDate.includes('-')) {
      try {
        const [y, m, d] = data.mealDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        altMealKey = `${dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}_${data.mealName}`;
      } catch {}
    }
    const rawMealKey = `${data.mealDate.split('-').slice(1).join('-')}_${data.mealName}`;

    const countSql = `
      SELECT COUNT(*)::int AS count 
      FROM camp_registrations 
      WHERE camp_id = $1 
        AND COALESCE(is_cancelled, false) = false
        AND (
          (meals_served->$2) IS NOT NULL OR 
          (meals_served->$3) IS NOT NULL OR 
          (meals_served->$4) IS NOT NULL
        )
    `;
    const countRes = await query(countSql, [data.campId, mealKey, altMealKey, rawMealKey]);
    const devoteeServedCount = countRes.rows[0]?.count || 0;

    return {
      success: true,
      devoteeServedCount,
      extraServedCount,
      extraCount,
      totalServedCount: devoteeServedCount + extraServedCount,
      notes: extraRec?.notes || ''
    };
  } catch (err: any) {
    console.error('getSessionMealStatsAction error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Quick Manual Toggle Punch / Unpunch for a Devotee
 */
export async function toggleManualDevoteeMealPunchAction(
  regId: string,
  mealDate: string,
  mealName: string,
  shouldPunch: boolean
) {
  try {
    const { isSuperAdmin, isHigherAdmin, campAllocations } = await verifyAdminAuth();

    const regRes = await query(`SELECT id, camp_id, meals_served FROM camp_registrations WHERE id = $1`, [regId]);
    if (regRes.rows.length === 0) return { success: false, error: 'Registration not found' };

    const reg = regRes.rows[0];
    if (!isSuperAdmin && !isHigherAdmin) {
      const hasPerm = campAllocations.some(a => a.camp_id === reg.camp_id && ['prasadam', 'attendance', 'both'].includes(a.permission_type));
      if (!hasPerm) {
        return { success: false, error: 'Forbidden: Prasadam or Attendance desk permission required for this camp.' };
      }
    }
    const mealsServed = { ...(reg.meals_served || {}) };
    const key = `${mealDate}_${mealName}`;

    if (shouldPunch) {
      mealsServed[key] = new Date().toISOString();
    } else {
      delete mealsServed[key];
    }

    await query(
      `UPDATE camp_registrations SET meals_served = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(mealsServed), regId]
    );

    revalidatePath(`/dashboard/admin/camps/${reg.camp_id}/registrations`);
    return { success: true, mealsServed };
  } catch (error: any) {
    console.error('toggleManualDevoteeMealPunchAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. Super Admin Global Prasadam Audit across ALL camps
 */
export async function getGlobalPrasadamAuditAction() {
  try {
    await verifyAdminAuth();

    // Fetch all camps
    const campsRes = await query(`
      SELECT id, title, start_date, end_date, meal_pricing, tracks, venue, status
      FROM camps
      ORDER BY created_at DESC
    `);
    const camps = campsRes.rows;

    // Fetch all kitchen extra meals across camps
    const extraRes = await query(`
      SELECT camp_id, meal_date, meal_name, extra_count, COALESCE(extra_served_count, 0) as extra_served_count, notes, added_by_name, updated_at
      FROM camp_kitchen_extra_meals
    `);
    const allExtras = extraRes.rows;
    const extrasMap = new Map<string, any>();
    allExtras.forEach((e: any) => {
      const dStr = e.meal_date instanceof Date ? e.meal_date.toISOString().split('T')[0] : String(e.meal_date);
      extrasMap.set(`${e.camp_id}_${dStr}_${e.meal_name}`, e);
      extrasMap.set(`${e.camp_id}_${e.meal_date}_${e.meal_name}`, e);
      const rawD = dStr.split('-').pop() || dStr;
      extrasMap.set(`${e.camp_id}_${rawD}_${e.meal_name}`, e);
    });

    // Fetch all active registrations with attendee and POC user details
    const regSql = `
      WITH camp_serials AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY camp_id ORDER BY created_at ASC) AS serial_no
        FROM camp_registrations
      )
      SELECT 
        r.id,
        r.camp_id,
        cs.serial_no,
        r.participant_name,
        r.whatsapp,
        r.email,
        r.camp_track,
        r.first_meal_date,
        r.first_meal_type,
        r.last_meal_date,
        r.last_meal_type,
        r.meals_served,
        r.parent_temple,
        r.voice_name,
        r.poc_name,
        r.poc_contact,
        r.dinner_type,
        c.title AS camp_title,
        u.current_center AS user_current_center,
        u.center AS user_center,
        u.other_center AS user_other_center,
        u.current_temple AS user_current_temple,
        u.other_temple AS user_other_temple,
        u.parent_temple AS user_parent_temple,
        poc_u.current_center AS poc_current_center,
        poc_u.center AS poc_center,
        poc_u.other_center AS poc_other_center,
        poc_u.current_temple AS poc_current_temple,
        poc_u.other_temple AS poc_other_temple,
        poc_u.parent_temple AS poc_parent_temple
      FROM camp_registrations r
      JOIN camp_serials cs ON cs.id = r.id
      JOIN camps c ON c.id = r.camp_id
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, current_temple, other_temple, parent_temple
        FROM users
        WHERE (
          (r.email IS NOT NULL AND r.email <> '' AND LOWER(email) = LOWER(r.email))
          OR (r.whatsapp IS NOT NULL AND r.whatsapp <> '' AND phone = r.whatsapp)
        )
        LIMIT 1
      ) u ON TRUE
      LEFT JOIN LATERAL (
        SELECT current_center, center, other_center, current_temple, other_temple, parent_temple
        FROM users
        WHERE (
          (r.poc_contact IS NOT NULL AND r.poc_contact <> '' AND phone = r.poc_contact)
        )
        LIMIT 1
      ) poc_u ON TRUE
      WHERE COALESCE(r.is_cancelled, false) = false
      ORDER BY c.created_at DESC, cs.serial_no ASC
    `;
    const regRes = await query(regSql);
    const registrations = regRes.rows;

    const campSummaries: any[] = [];
    const allAttendeeLogs: any[] = [];
    const allDevotees: any[] = [];
    const globalKitchenTally: any[] = [];
    const campsList = camps.map((c: any) => ({ id: c.id, title: c.title, status: c.status }));
    const tracksSet = new Set<string>();
    const centersSet = new Set<string>();
    const templesSet = new Set<string>();
    const datesSet = new Set<string>();

    const centerAggMap = new Map<string, { totalDevotees: number; totalTaken: number; totalExpected: number }>();
    const templeAggMap = new Map<string, { totalDevotees: number; totalTaken: number; totalExpected: number }>();

    let totalGlobalScheduled = 0;
    let totalGlobalTaken = 0;
    let totalGlobalExtras = 0;
    let totalGlobalExtraServed = 0;

    camps.forEach((camp: any) => {
      const campRegs = registrations.filter((r: any) => r.camp_id === camp.id);
      const mealPricing = camp.meal_pricing || [];
      const sortedPricing = sortMealDays(mealPricing, camp.start_date);

      let campScheduled = 0;
      let campTaken = 0;
      let campExtras = 0;
      let campExtraServed = 0;

      // Cache matrix for each registration in this camp
      const regMatrices = new Map<string, any[]>();
      campRegs.forEach((r: any) => {
        const m = buildMealMatrix(
          sortedPricing,
          r.first_meal_date,
          r.first_meal_type,
          r.last_meal_date,
          r.last_meal_type,
          camp.start_date,
          camp.end_date
        );
        regMatrices.set(r.id, m);

        if (r.camp_track) tracksSet.add(r.camp_track);
        const { center, temple } = resolveDevoteeCenterAndTemple(r);
        r._resolvedCenter = center;
        r._resolvedTemple = temple;
        centersSet.add(center);
        templesSet.add(temple);

        if (!centerAggMap.has(center)) {
          centerAggMap.set(center, { totalDevotees: 0, totalTaken: 0, totalExpected: 0 });
        }
        centerAggMap.get(center)!.totalDevotees++;

        if (!templeAggMap.has(temple)) {
          templeAggMap.set(temple, { totalDevotees: 0, totalTaken: 0, totalExpected: 0 });
        }
        templeAggMap.get(temple)!.totalDevotees++;
      });

      sortedPricing.forEach((day: any) => {
        let dateKey = day.full_date;
        if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          dateKey = parseMealDayToIso(day, camp.start_date) || String(day.date);
        }
        const rawDate = String(day.date);
        const dateLabel = (day.label || rawDate).replace(/\s*-\s*/g, ' ');
        datesSet.add(dateKey);

        (['Breakfast', 'Lunch', 'Dinner', 'Milk'] as const).forEach((mealName) => {
          let scheduledCount = 0;
          let takenCount = 0;

          campRegs.forEach((r: any) => {
            const matrix = regMatrices.get(r.id) || [];
            const col = matrix.find((c: any) =>
              c.full_date === dateKey ||
              c.date === rawDate ||
              (c.full_date && dateKey.includes('-') && c.full_date === dateKey)
            );
            if (!col) return;

            const isOnlyMilk = String(r.dinner_type || '').toLowerCase().includes('milk');
            let isEligible = false;
            if (mealName === 'Breakfast') isEligible = col.breakfast;
            else if (mealName === 'Lunch') isEligible = col.lunch;
            else if (mealName === 'Dinner') isEligible = col.dinner && !isOnlyMilk;
            else if (mealName === 'Milk') isEligible = col.dinner && isOnlyMilk;

            if (isEligible) {
              scheduledCount++;
              const mealKey = `${dateKey}_${mealName}`;
              const altKey = `${rawDate}_${mealName}`;
              const servedTime = r.meals_served?.[mealKey] || r.meals_served?.[altKey];
              if (servedTime) {
                takenCount++;
              }

              allAttendeeLogs.push({
                campId: camp.id,
                campTitle: camp.title,
                regId: r.id,
                token: r.serial_no,
                name: r.participant_name,
                phone: r.whatsapp || r.poc_contact || '',
                track: r.camp_track || 'General Track',
                center: r._resolvedCenter,
                temple: r._resolvedTemple,
                date: dateKey,
                dateLabel,
                meal: mealName,
                status: servedTime ? 'TAKEN' : 'NOT_TAKEN',
                servedAt: servedTime || null,
              });
            }
          });

          const extraKey = `${camp.id}_${dateKey}_${mealName}`;
          const altExtraKey = `${camp.id}_${rawDate}_${mealName}`;
          const extraRec = extrasMap.get(extraKey) || extrasMap.get(altExtraKey);
          const extraCount = Number(extraRec?.extra_count) || 0;
          const extraServedCount = Number(extraRec?.extra_served_count) || 0;

          campScheduled += scheduledCount;
          campTaken += takenCount;
          campExtras += extraCount;
          campExtraServed += extraServedCount;

          globalKitchenTally.push({
            campId: camp.id,
            campTitle: camp.title,
            date: dateKey,
            rawDate,
            dateLabel,
            meal: mealName,
            scheduledCount,
            takenCount,
            notTakenCount: Math.max(0, scheduledCount - takenCount),
            extraCount,
            extraServedCount,
            totalHonored: takenCount + extraServedCount,
            totalKitchenTarget: scheduledCount + extraCount,
            totalServedSoFar: takenCount + extraServedCount,
            notes: extraRec?.notes || '',
          });
        });
      });

      // Build devotee-level matrix for this camp
      campRegs.forEach((r: any) => {
        const mealsServedMap = r.meals_served || {};
        let devEligible = 0;
        let devTaken = 0;

        const dateMatrix = sortedPricing.map((day: any) => {
          let dateKey = day.full_date;
          if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            dateKey = parseMealDayToIso(day, camp.start_date) || String(day.date);
          }
          const rawDate = String(day.date);
          const dateLabel = (day.label || rawDate).replace(/\s*-\s*/g, ' ');

          const matrix = regMatrices.get(r.id) || [];
          const col = matrix.find((c: any) =>
            c.full_date === dateKey ||
            c.date === rawDate ||
            (c.full_date && dateKey.includes('-') && c.full_date === dateKey)
          );

          const isOnlyMilk = String(r.dinner_type || '').toLowerCase().includes('milk');
          const bfEligible = !!col?.breakfast;
          const lnEligible = !!col?.lunch;
          const dnEligible = !!col?.dinner && !isOnlyMilk;
          const mlEligible = !!col?.dinner && isOnlyMilk;

          const bfPunch = mealsServedMap[`${dateKey}_Breakfast`] || mealsServedMap[`${rawDate}_Breakfast`] || null;
          const lnPunch = mealsServedMap[`${dateKey}_Lunch`] || mealsServedMap[`${rawDate}_Lunch`] || null;
          const dnPunch = mealsServedMap[`${dateKey}_Dinner`] || mealsServedMap[`${rawDate}_Dinner`] || null;
          const mlPunch = mealsServedMap[`${dateKey}_Milk`] || mealsServedMap[`${rawDate}_Milk`] || null;

          if (bfEligible) {
            devEligible++;
            if (bfPunch) devTaken++;
          }
          if (lnEligible) {
            devEligible++;
            if (lnPunch) devTaken++;
          }
          if (dnEligible) {
            devEligible++;
            if (dnPunch) devTaken++;
          }
          if (mlEligible) {
            devEligible++;
            if (mlPunch) devTaken++;
          }

          return {
            date: dateKey,
            rawDate,
            dateLabel,
            breakfast: { eligible: bfEligible, punched: !!bfPunch, punchedAt: bfPunch },
            lunch: { eligible: lnEligible, punched: !!lnPunch, punchedAt: lnPunch },
            dinner: { eligible: dnEligible, punched: !!dnPunch, punchedAt: dnPunch },
            milk: { eligible: mlEligible, punched: !!mlPunch, punchedAt: mlPunch }
          };
        });

        const centerAgg = centerAggMap.get(r._resolvedCenter);
        if (centerAgg) {
          centerAgg.totalExpected += devEligible;
          centerAgg.totalTaken += devTaken;
        }
        const templeAgg = templeAggMap.get(r._resolvedTemple);
        if (templeAgg) {
          templeAgg.totalExpected += devEligible;
          templeAgg.totalTaken += devTaken;
        }

        allDevotees.push({
          campId: camp.id,
          campTitle: camp.title,
          regId: r.id,
          token: r.serial_no,
          name: r.participant_name,
          phone: r.whatsapp || r.poc_contact || '',
          track: r.camp_track || 'General Track',
          center: r._resolvedCenter,
          temple: r._resolvedTemple,
          pocName: r.poc_name,
          pocContact: r.poc_contact,
          eligibleCount: devEligible,
          takenCount: devTaken,
          dateMatrix,
        });
      });

      totalGlobalScheduled += campScheduled;
      totalGlobalTaken += campTaken;
      totalGlobalExtras += campExtras;
      totalGlobalExtraServed += campExtraServed;

      campSummaries.push({
        id: camp.id,
        title: camp.title,
        status: camp.status,
        attendeesCount: campRegs.length,
        scheduledMeals: campScheduled,
        takenMeals: campTaken,
        extraMeals: campExtras,
        extraServedMeals: campExtraServed,
        totalHonoredMeals: campTaken + campExtraServed,
        clearancePercent: campScheduled > 0 ? Math.round((campTaken / campScheduled) * 100) : 0,
      });
    });

    const centerSummary = Array.from(centerAggMap.entries()).map(([center, val]) => ({
      center,
      ...val,
      clearancePercent: val.totalExpected > 0 ? Math.round((val.totalTaken / val.totalExpected) * 100) : 0,
    })).sort((a, b) => b.totalDevotees - a.totalDevotees);

    const templeSummary = Array.from(templeAggMap.entries()).map(([temple, val]) => ({
      temple,
      ...val,
      clearancePercent: val.totalExpected > 0 ? Math.round((val.totalTaken / val.totalExpected) * 100) : 0,
    })).sort((a, b) => b.totalDevotees - a.totalDevotees);

    return {
      success: true,
      stats: {
        totalGlobalScheduled,
        totalGlobalTaken,
        totalGlobalPending: Math.max(0, totalGlobalScheduled - totalGlobalTaken),
        totalGlobalExtras,
        totalGlobalExtraServed,
        totalGlobalPlatesHonored: totalGlobalTaken + totalGlobalExtraServed,
        overallClearancePercent: totalGlobalScheduled > 0 ? Math.round((totalGlobalTaken / totalGlobalScheduled) * 100) : 0,
      },
      campSummaries,
      globalKitchenTally,
      allAttendeeLogs,
      allDevotees,
      centerSummary,
      templeSummary,
      filterOptions: {
        camps: campsList,
        tracks: Array.from(tracksSet).sort(),
        centers: Array.from(centersSet).sort(),
        temples: Array.from(templesSet).sort(),
        dates: Array.from(datesSet).sort(),
      },
    };
  } catch (error: any) {
    console.error('getGlobalPrasadamAuditAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch existing users/devotees belonging to the caller's center/temple for fast 1-click camp registration.
 * Scoped strictly to managerial roles (roles 8-17 or allowed roles).
 */
export async function getCenterDevoteesForCampRegistrationAction(campId?: string, clientUserId?: string) {
  try {
    const user = await getAuthUserFromCookies();
    const userId = user?.id || clientUserId;
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    const uRes = await query(
      `SELECT id, name, email, phone, role, current_center, center, other_center, current_temple, parent_temple, other_temple, hierarchy, birth_date, ashram
       FROM users WHERE id = $1`,
      [userId]
    );
    if (uRes.rows.length === 0) {
      return { success: false, error: 'User record not found' };
    }

    const caller = uRes.rows[0];
    const role = caller.role;
    const roles = (Array.isArray(role) ? role : [role])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));

    // Check camp custom managerial roles if campId is passed
    // Only these roles are permitted:
    // 8 (Super admin), 9 (VP), 10 (President), 11 (MD), 12 (Director), 13 (Central VOICE Manager),
    // 14 (Project Advisor), 15 (Project Manager), 16 (Acting Manager), 17 (OC)
    let allowedManagerialRoles = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    if (campId) {
      const cRes = await query('SELECT payment_config FROM camps WHERE id = $1', [campId]);
      if (cRes.rows.length > 0 && Array.isArray(cRes.rows[0].payment_config?.allowed_managerial_roles)) {
        allowedManagerialRoles = cRes.rows[0].payment_config.allowed_managerial_roles;
      }
    }

    const isSuperAdmin = roles.includes(8) || (Array.isArray(role) && role.includes('super_admin' as any));
    const isManager = isSuperAdmin || roles.some((r) => allowedManagerialRoles.includes(r));

    if (!isManager) {
      return { success: false, error: 'Access restricted to center managers and administrators' };
    }

    // Strictly fetch allocated centers and temples from database allocation tables
    const managerLoc = await getManagerAssignedLocations(caller.id, roles);
    const uniqueCenterNames = managerLoc.assignedCenterNames || [];
    const uniqueTempleNames = managerLoc.assignedTempleNames || [];
    const directCenterNames = managerLoc.directlyAssignedCenterNames || [];

    // Non-super-admins MUST have assigned centers or temples. If not assigned, return empty list.
    if (!isSuperAdmin && uniqueCenterNames.length === 0 && uniqueTempleNames.length === 0) {
      return {
        success: true,
        centerName: '',
        templeName: '',
        devotees: [],
      };
    }

    let sql = `
      SELECT id, name, email, phone, birth_date, ashram, current_center, center, other_center, current_temple, parent_temple, hierarchy, verification_status, rounds
      FROM users
      WHERE email IS NOT NULL AND email <> ''
    `;
    const params: any[] = [];

    if (!isSuperAdmin) {
      const conditions: string[] = [];

      // If manager has directly assigned centers (e.g. Roles 14-17 like Project Manager),
      // they must ONLY see users belonging to those specific centers!
      if (directCenterNames.length > 0) {
        const lowerCenters = directCenterNames.map(c => c.toLowerCase());
        params.push(lowerCenters);
        const pIdx = params.length;
        conditions.push(`LOWER(current_center) = ANY($${pIdx}) OR LOWER(center) = ANY($${pIdx}) OR LOWER(hierarchy->>'currentCenter') = ANY($${pIdx}) OR LOWER(hierarchy->>'center') = ANY($${pIdx}) OR LOWER(hierarchy->'currentCenter'->>'name') = ANY($${pIdx})`);
      } else {
        // Otherwise, for temple leadership without specific center allocations:
        if (uniqueCenterNames.length > 0) {
          const lowerCenters = uniqueCenterNames.map(c => c.toLowerCase());
          params.push(lowerCenters);
          const pIdx = params.length;
          conditions.push(`LOWER(current_center) = ANY($${pIdx}) OR LOWER(center) = ANY($${pIdx}) OR LOWER(hierarchy->>'currentCenter') = ANY($${pIdx}) OR LOWER(hierarchy->>'center') = ANY($${pIdx}) OR LOWER(hierarchy->'currentCenter'->>'name') = ANY($${pIdx})`);
        }
        if (uniqueTempleNames.length > 0) {
          const lowerTemples = uniqueTempleNames.map(t => t.toLowerCase());
          params.push(lowerTemples);
          const pIdx = params.length;
          conditions.push(`LOWER(current_temple) = ANY($${pIdx}) OR LOWER(parent_temple) = ANY($${pIdx}) OR LOWER(hierarchy->>'currentTemple') = ANY($${pIdx}) OR LOWER(hierarchy->>'parentTemple') = ANY($${pIdx})`);
        }
      }

      if (conditions.length > 0) {
        sql += ` AND (${conditions.join(' OR ')})`;
      } else {
        sql += ` AND 1 = 0`;
      }
    }

    sql += ` ORDER BY name ASC LIMIT 500`;

    const res = await query(sql, params);

    // Fetch existing registrations for this camp to identify which tracks each devotee already holds
    const tracksByEmail = new Map<string, string[]>();
    const tracksByPhone = new Map<string, string[]>();
    if (campId) {
      try {
        const regRes = await query(
          `SELECT email, whatsapp, camp_track 
           FROM camp_registrations 
           WHERE camp_id = $1 
             AND is_cancelled IS NOT TRUE 
             AND payment_status != 'failed'`,
          [campId]
        );
        for (const r of regRes.rows) {
          const track = (r.camp_track || '').trim();
          if (!track) continue;
          if (r.email) {
            const em = r.email.trim().toLowerCase();
            const list = tracksByEmail.get(em) || [];
            if (!list.includes(track)) list.push(track);
            tracksByEmail.set(em, list);
          }
          if (r.whatsapp) {
            const ph = String(r.whatsapp).replace(/[^0-9]/g, '').slice(-10);
            if (ph) {
              const list = tracksByPhone.get(ph) || [];
              if (!list.includes(track)) list.push(track);
              tracksByPhone.set(ph, list);
            }
          }
        }
      } catch (regErr) {
        console.warn('Could not query existing camp registrations for track check:', regErr);
      }
    }

    const devotees = res.rows.map((row) => {
      let calculatedAge = '';
      if (row.birth_date) {
        const bDate = new Date(row.birth_date);
        if (!isNaN(bDate.getTime())) {
          const ageDiff = Date.now() - bDate.getTime();
          const ageDate = new Date(ageDiff);
          calculatedAge = String(Math.abs(ageDate.getUTCFullYear() - 1970));
        }
      }

      let mappedGender = 'Male - Bachelor';
      const hGender = String(row.hierarchy?.gender || '').toLowerCase();
      const isFemale = hGender.startsWith('f') || hGender === 'female';
      const isMarried = (row.ashram && row.ashram.toLowerCase().includes('grihastha')) || hGender.includes('married');
      if (isFemale) {
        mappedGender = isMarried ? 'Female - Married' : 'Female - Unmarried';
      } else {
        mappedGender = isMarried ? 'Male - Married' : 'Male - Bachelor';
      }

      const counselor = row.hierarchy?.brahmachariCounselor || row.hierarchy?.grihasthaCounselor || row.hierarchy?.counselor || '';
      const center = row.current_center || row.center || row.other_center || row.hierarchy?.currentCenter || row.hierarchy?.center || '';
      const temple = row.current_temple || row.parent_temple || row.hierarchy?.currentTemple || row.hierarchy?.parentTemple || '';
      const isPending = row.verification_status === 'pending';

      const devEmail = (row.email || '').trim().toLowerCase();
      const devPhone = String(row.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const registeredTracks = Array.from(new Set([
        ...(tracksByEmail.get(devEmail) || []),
        ...(devPhone ? tracksByPhone.get(devPhone) || [] : [])
      ]));

      return {
        id: row.id,
        name: isPending ? `${row.name} (Pending Approval)` : row.name,
        email: row.email,
        phone: row.phone || '',
        gender: mappedGender,
        age: calculatedAge,
        counselor,
        center,
        temple,
        rounds: row.rounds !== undefined && row.rounds !== null ? row.rounds : (row.hierarchy?.rounds || ''),
        isPending,
        registeredTracks,
      };
    });

    const displayCenterName = directCenterNames.length > 0
      ? directCenterNames.join(', ')
      : (uniqueCenterNames.join(', ') || uniqueTempleNames.join(', '));

    return {
      success: true,
      centerName: displayCenterName,
      templeName: uniqueTempleNames.join(', '),
      devotees,
    };
  } catch (error: any) {
    console.error('getCenterDevoteesForCampRegistrationAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Super Admin Emergency: Update any detail of an attendee's camp registration.
 * Allows editing participant info, arrival/departure prasadam dates, meal types,
 * accommodation, fees, payment status, counselor, center, and registration date.
 * Strictly restricted to Super Admin.
 */
export async function superAdminUpdateCampRegistrationAction(
  registrationId: string,
  data: {
    participant_name?: string;
    whatsapp?: string;
    email?: string;
    gender?: string;
    age?: number | string | null;
    married_since_year?: number | string | null;
    voice_name?: string;
    parent_temple?: string;
    counselor_name?: string;
    poc_name?: string;
    poc_contact?: string;
    camp_track?: string;
    participant_type?: string;
    first_meal_date?: string;
    first_meal_type?: string;
    last_meal_date?: string;
    last_meal_type?: string;
    dinner_type?: string;
    accommodation?: string;
    total_cost?: number;
    meal_cost?: number;
    acc_cost?: number;
    late_fee?: number;
    discount_amount?: number;
    coupon_code?: string;
    payment_method?: string;
    payment_status?: string;
    transaction_ref?: string;
    payment_id?: string;
    checked_in?: boolean;
    checked_in_at?: string | null;
    created_at?: string;
  }
) {
  try {
    const { user, isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      throw new Error('Forbidden: Only Super Admin can edit camp registrations in emergency mode.');
    }

    if (!registrationId) {
      throw new Error('Registration ID is required.');
    }

    // Fetch existing record first
    const existingRes = await query('SELECT * FROM camp_registrations WHERE id = $1', [registrationId]);
    if (existingRes.rows.length === 0) {
      throw new Error('Registration record not found.');
    }
    const current = existingRes.rows[0];

    const updatedFields: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    const addField = (col: string, val: any) => {
      if (val !== undefined) {
        updatedFields.push(`${col} = $${pIdx++}`);
        params.push(val);
      }
    };

    if (data.participant_name !== undefined) addField('participant_name', data.participant_name.trim());
    if (data.whatsapp !== undefined) addField('whatsapp', data.whatsapp.trim());
    if (data.email !== undefined) addField('email', data.email.trim());
    if (data.gender !== undefined) addField('gender', data.gender.trim());
    if (data.age !== undefined) addField('age', data.age ? Number(data.age) : null);
    if (data.married_since_year !== undefined) addField('married_since_year', data.married_since_year ? Number(data.married_since_year) : null);
    if (data.voice_name !== undefined) addField('voice_name', data.voice_name.trim());
    if (data.parent_temple !== undefined) addField('parent_temple', data.parent_temple.trim());
    if (data.counselor_name !== undefined) addField('counselor_name', data.counselor_name.trim());
    if (data.poc_name !== undefined) addField('poc_name', data.poc_name.trim());
    if (data.poc_contact !== undefined) addField('poc_contact', data.poc_contact.trim());
    if (data.camp_track !== undefined) addField('camp_track', data.camp_track.trim());
    if (data.participant_type !== undefined) addField('participant_type', data.participant_type.trim());
    if (data.first_meal_date !== undefined) addField('first_meal_date', data.first_meal_date.trim());
    if (data.first_meal_type !== undefined) addField('first_meal_type', data.first_meal_type.trim());
    if (data.last_meal_date !== undefined) addField('last_meal_date', data.last_meal_date.trim());
    if (data.last_meal_type !== undefined) addField('last_meal_type', data.last_meal_type.trim());
    if (data.dinner_type !== undefined) addField('dinner_type', data.dinner_type.trim());
    if (data.accommodation !== undefined) addField('accommodation', data.accommodation.trim());
    if (data.total_cost !== undefined) addField('total_cost', Number(data.total_cost) || 0);
    if (data.meal_cost !== undefined) addField('meal_cost', Number(data.meal_cost) || 0);
    if (data.acc_cost !== undefined) addField('acc_cost', Number(data.acc_cost) || 0);
    if (data.late_fee !== undefined) addField('late_fee', Number(data.late_fee) || 0);
    if (data.discount_amount !== undefined) addField('discount_amount', Number(data.discount_amount) || 0);
    if (data.coupon_code !== undefined) addField('coupon_code', data.coupon_code ? data.coupon_code.trim() : null);
    if (data.payment_method !== undefined) addField('payment_method', data.payment_method.trim());
    if (data.payment_status !== undefined) addField('payment_status', data.payment_status.trim());
    if (data.transaction_ref !== undefined) addField('transaction_ref', data.transaction_ref ? data.transaction_ref.trim() : null);
    if (data.payment_id !== undefined) addField('payment_id', data.payment_id ? data.payment_id.trim() : null);
    if (data.checked_in !== undefined) addField('checked_in', Boolean(data.checked_in));
    if (data.checked_in_at !== undefined) addField('checked_in_at', data.checked_in_at ? new Date(data.checked_in_at) : null);
    if (data.created_at !== undefined && data.created_at) addField('created_at', new Date(data.created_at));

    updatedFields.push(`updated_at = NOW()`);

    params.push(registrationId);
    const sql = `
      UPDATE camp_registrations
      SET ${updatedFields.join(', ')}
      WHERE id = $${pIdx}
      RETURNING *
    `;

    const res = await query(sql, params);
    const updated = res.rows[0];

    // Revalidate relevant paths
    revalidatePath(`/dashboard/admin/camps/${current.camp_id}/registrations`);
    revalidatePath('/dashboard/camp');
    revalidatePath('/camps/verify-pass');

    return { success: true, registration: updated as CampRegistration };
  } catch (error: any) {
    console.error('superAdminUpdateCampRegistrationAction error:', error);
    return { success: false, error: error.message };
  }
}








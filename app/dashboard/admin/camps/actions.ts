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

    const sql = `
      INSERT INTO camps (
        slug, title, description, venue, status,
        start_date, end_date,
        registration_start_date, late_fee_start_date, registration_deadline,
        late_fee, tracks, participant_types, meal_pricing,
        accommodation_pricing, special_waivers, payment_config, refund_config
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18
      ) RETURNING *
    `;

    const res = await query(sql, [
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
      JSON.stringify(data.refund_config || {})
    ]);

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
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `;

    const res = await query(sql, [
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
      id
    ]);

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
 * Lookup camp registrations by WhatsApp / Phone or Email (Public - for devotees cancelling/modifying)
 */
export async function lookupCampRegistrationsAction(campSlugOrId: string, identifier: string) {
  try {
    const rawId = (identifier || '').trim();
    if (!rawId || rawId.length < 5) {
      return { success: false, error: 'Please enter a complete 10-digit WhatsApp number, valid Email, or Booking Group ID (minimum 5 characters).' };
    }

    // 1. Fetch camp
    const campRes = await query(
      'SELECT id, title, slug FROM camps WHERE slug = $1 OR id::text = $1',
      [campSlugOrId]
    );

    if (campRes.rows.length === 0) {
      return { success: false, error: 'Camp retreat not found.' };
    }

    const camp = campRes.rows[0] as Camp;

    // Check if identifier is email, phone, or group ID
    const isEmail = rawId.includes('@');
    const digitsOnly = rawId.replace(/[^0-9]/g, '');
    const isPhone = digitsOnly.length >= 10;
    const phone10 = isPhone ? digitsOnly.slice(-10) : '';
    const isGroupId = rawId.toUpperCase().startsWith('GRP_') || rawId.length >= 8;

    if (!isEmail && !isPhone && !isGroupId) {
      return {
        success: false,
        error: 'Please enter a complete 10-digit mobile number, valid email address, or Booking Group ID.'
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
        error: `No registrations found for "${rawId}" in this camp retreat. Please verify the phone number or email used during registration.`
      };
    }

    // 3. Fetch any existing refund requests for these registrations
    const regIds = regRes.rows.map(r => r.id);
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
      registrations: regRes.rows as CampRegistration[],
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
export async function submitCampRefundRequestAction(data: {
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
}) {
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
    const callerEmail = (callerUser?.email || data.email || '').trim().toLowerCase();
    const cleanPocContact = (data.poc_contact || '').replace(/\D/g, '').slice(-10);

    for (const reg of regs) {
      if (reg.is_cancelled || reg.payment_status === 'refunded') {
        return {
          success: false,
          error: `Attendee "${reg.participant_name}" has already been cancelled/refunded.`
        };
      }

      const regEmail = (reg.email || '').trim().toLowerCase();
      const regPhone = (reg.whatsapp || reg.poc_contact || '').replace(/\D/g, '').slice(-10);

      const emailMatches = Boolean(callerEmail && regEmail && callerEmail === regEmail);
      const phoneMatches = Boolean(cleanPocContact && regPhone && cleanPocContact === regPhone);

      let isCallerAdmin = false;
      if (callerUser) {
        try {
          const uRes = await query('SELECT role FROM users WHERE id = $1', [callerUser.id]);
          const role = uRes.rows[0]?.role;
          const roles = (Array.isArray(role) ? role : [role]).map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
          if (roles.includes(8) || roles.some((r: number) => [9, 10, 11, 12, 13, 14, 15, 16, 17, 21].includes(r))) {
            isCallerAdmin = true;
          }
        } catch {
          // ignore
        }
      }

      if (!emailMatches && !phoneMatches && !isCallerAdmin) {
        return {
          success: false,
          error: `Security verification failed: You are not authorized to cancel or request a refund for attendee "${reg.participant_name}". Contact details must match the registration record.`
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
 * Public & User Dashboard: Fetch all currently active camps for devotee registration
 */
export async function getActiveCampsForUserAction() {
  try {
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
    return { success: true, camps: res.rows as (Camp & { registration_count?: number })[] };
  } catch (error: any) {
    console.error('getActiveCampsForUserAction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * User Dashboard: Fetch camp registrations belonging to the current user (by phone or email)
 */
export async function getUserCampRegistrationsAction(identifier: { email?: string; phone?: string }) {
  try {
    // Security: Require active session and bind query strictly to authenticated user's own email/phone
    const sessionUser = await getAuthUserFromCookies();
    if (!sessionUser) {
      return { success: false, error: 'Authentication required' };
    }

    const uRes = await query('SELECT email, phone, role FROM users WHERE id = $1', [sessionUser.id]);
    const dbUser = uRes.rows[0];
    const roles = (Array.isArray(dbUser?.role) ? dbUser.role : [dbUser?.role]).map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
    const isSuperAdmin = roles.includes(8) || roles.some((r: number) => [9, 10, 11, 12, 13, 14, 15, 16, 17, 21].includes(r));

    // Non-admins can strictly only fetch registrations matching their OWN verified credentials
    const cleanEmail = isSuperAdmin && identifier.email ? identifier.email.trim().toLowerCase() : (dbUser?.email || sessionUser.email || '').trim().toLowerCase();
    const rawPhone = isSuperAdmin && identifier.phone ? identifier.phone : (dbUser?.phone || '');
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);

    if (!cleanEmail && !cleanPhone) {
      return { success: true, registrations: [] };
    }

    const sql = `
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
          SELECT current_center, center, other_center, hierarchy
          FROM users
          WHERE (r.email <> '' AND LOWER(email) = LOWER(r.email))
             OR ($1 <> '' AND LOWER(email) = $1)
             OR ($2 <> '' AND phone IS NOT NULL AND phone <> '' AND (RIGHT(phone, 10) = RIGHT(r.whatsapp, 10) OR RIGHT(phone, 10) = $2))
          LIMIT 1
        ) u ON TRUE
        WHERE (
          ($1 <> '' AND LOWER(r.email) = $1) OR
          ($2 <> '' AND (
            RIGHT(r.poc_contact, 10) = $2 OR 
            RIGHT(r.whatsapp, 10) = $2
          ))
        )
      )
      SELECT * FROM unique_regs
      ORDER BY created_at DESC
    `;

    const res = await query(sql, [cleanEmail, cleanPhone ? cleanPhone.slice(-10) : '']);
    const registrations = res.rows as (CampRegistration & {
      serial_no?: number;
      camp_title: string;
      camp_slug: string;
      camp_venue: string;
      camp_start_date: string;
      camp_end_date: string;
      camp_refund_config?: any;
      camp_meal_pricing?: any[];
      camp_tracks?: any[];
    })[];

    let refundRequests: CampRefundRequest[] = [];
    if (registrations.length > 0) {
      const regIds = registrations.map(r => r.id);
      const groupIds = Array.from(new Set(registrations.map(r => r.group_id).filter(Boolean)));

      const refundSql = `
        SELECT * FROM camp_refund_requests 
        WHERE registration_id = ANY($1) 
           OR group_id = ANY($2)
           OR LOWER(email) = $3
        ORDER BY created_at DESC
      `;
      const refundRes = await query(refundSql, [regIds, groupIds, cleanEmail]);
      refundRequests = refundRes.rows;
    }

    return { 
      success: true, 
      registrations,
      refundRequests
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

    const regLookup = await query('SELECT camp_id FROM camp_registrations WHERE id = $1', [cleanId]);
    if (regLookup.rows.length === 0) return { success: false, error: 'Registration not found' };
    const campId = regLookup.rows[0].camp_id;

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
    const canAttendance = isSuperAdmin || hasBoth || permissions.includes('attendance');
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
    if (r.payment_status === 'pending') {
      return {
        success: false,
        status: 'PENDING_PAYMENT',
        message: 'Payment verification pending. Please verify at Accounts Desk.',
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
    let isEligible = false;
    if (dayCol) {
      if (normMeal.startsWith('b')) isEligible = dayCol.breakfast;
      else if (normMeal.startsWith('l')) isEligible = dayCol.lunch;
      else if (normMeal.startsWith('d')) isEligible = dayCol.dinner;
    }

    if (!isEligible) {
      return {
        success: false,
        status: 'NOT_ELIGIBLE',
        message: `${data.mealName} on ${dayCol?.label || dayCol?.full_date || data.mealDate} is NOT included in this devotee's pass.`,
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

      (['Breakfast', 'Lunch', 'Dinner'] as const).forEach((mealName) => {
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

          let isEligible = false;
          if (mealName === 'Breakfast') isEligible = col.breakfast;
          else if (mealName === 'Lunch') isEligible = col.lunch;
          else if (mealName === 'Dinner') isEligible = col.dinner;

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

        const bfEligible = !!col?.breakfast;
        const lnEligible = !!col?.lunch;
        const dnEligible = !!col?.dinner;

        const bfPunch = mealsServedMap[`${dateKey}_Breakfast`] || mealsServedMap[`${rawDate}_Breakfast`] || null;
        const lnPunch = mealsServedMap[`${dateKey}_Lunch`] || mealsServedMap[`${rawDate}_Lunch`] || null;
        const dnPunch = mealsServedMap[`${dateKey}_Dinner`] || mealsServedMap[`${rawDate}_Dinner`] || null;

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

        (['Breakfast', 'Lunch', 'Dinner'] as const).forEach((mealName) => {
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

            let isEligible = false;
            if (mealName === 'Breakfast') isEligible = col.breakfast;
            else if (mealName === 'Lunch') isEligible = col.lunch;
            else if (mealName === 'Dinner') isEligible = col.dinner;

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

          const bfEligible = !!col?.breakfast;
          const lnEligible = !!col?.lunch;
          const dnEligible = !!col?.dinner;

          const bfPunch = mealsServedMap[`${dateKey}_Breakfast`] || mealsServedMap[`${rawDate}_Breakfast`] || null;
          const lnPunch = mealsServedMap[`${dateKey}_Lunch`] || mealsServedMap[`${rawDate}_Lunch`] || null;
          const dnPunch = mealsServedMap[`${dateKey}_Dinner`] || mealsServedMap[`${rawDate}_Dinner`] || null;

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

          return {
            date: dateKey,
            rawDate,
            dateLabel,
            breakfast: { eligible: bfEligible, punched: !!bfPunch, punchedAt: bfPunch },
            lunch: { eligible: lnEligible, punched: !!lnPunch, punchedAt: lnPunch },
            dinner: { eligible: dnEligible, punched: !!dnPunch, punchedAt: dnPunch }
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






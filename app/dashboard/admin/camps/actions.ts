'use server';

import { query } from '@/lib/db';
import { getAuthUserFromCookies } from '@/lib/supabase/admin';
import { Camp, CampRegistration, CampRefundRequest, CampAuditTransaction } from '@/types';
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

  if (!isHigherAdmin) {
    throw new Error('Forbidden: Super Admin or Camp Admin privileges required');
  }

  return { user, isSuperAdmin };
}

/**
 * Get all camps with summary stats (total registrations count, total revenue)
 */
export async function getCampsAction() {
  try {
    await verifyAdminAuth();

    const sql = `
      SELECT 
        c.*,
        COUNT(r.id)::int AS registration_count,
        COALESCE(SUM(r.total_cost), 0)::numeric AS total_revenue
      FROM camps c
      LEFT JOIN camp_registrations r ON r.camp_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const res = await query(sql);
    return { success: true, camps: res.rows as (Camp & { registration_count: number; total_revenue: number })[] };
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
    await verifyAdminAuth();

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
    await verifyAdminAuth();

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
    await verifyAdminAuth();

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
    await verifyAdminAuth();

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
    await verifyAdminAuth();

    let sql = 'SELECT * FROM camp_registrations WHERE camp_id = $1';
    const params: any[] = [campId];

    if (searchTerm && searchTerm.trim()) {
      params.push(`%${searchTerm.trim()}%`);
      sql += ` AND (
        participant_name ILIKE $2 OR
        whatsapp ILIKE $2 OR
        email ILIKE $2 OR
        poc_name ILIKE $2 OR
        voice_name ILIKE $2 OR
        parent_temple ILIKE $2 OR
        counselor_name ILIKE $2
      )`;
    }

    sql += ' ORDER BY created_at DESC';

    const res = await query(sql, params);
    return { success: true, registrations: res.rows as CampRegistration[] };
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
    const { user } = await verifyAdminAuth();

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
    const { user, isSuperAdmin } = await verifyAdminAuth();
    if (!isSuperAdmin) {
      return { success: false, error: 'Forbidden: Super Admin privileges required.' };
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
    await verifyAdminAuth();

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
    const { user } = await verifyAdminAuth();
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
    if (!rawId) {
      return { success: false, error: 'Please enter your registered WhatsApp / Phone number or Email address.' };
    }

    // 1. Fetch camp
    const campRes = await query(
      'SELECT * FROM camps WHERE slug = $1 OR id::text = $1',
      [campSlugOrId]
    );

    if (campRes.rows.length === 0) {
      return { success: false, error: 'Camp retreat not found.' };
    }

    const camp = campRes.rows[0] as Camp;

    // Check if identifier is email or phone
    const isEmail = rawId.includes('@');
    const digitsOnly = rawId.replace(/[^0-9]/g, '');
    const phone10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // 2. Fetch registrations matching identifier (supports with or without country code +91)
    const regSql = `
      SELECT * FROM camp_registrations
      WHERE camp_id = $1
        AND (
          ($2 <> '' AND LOWER(email) = LOWER($2)) OR
          ($3 <> '' AND (
            REGEXP_REPLACE(whatsapp, '[^0-9]', '', 'g') LIKE '%' || $3 || '%' OR
            REGEXP_REPLACE(poc_contact, '[^0-9]', '', 'g') LIKE '%' || $3 || '%'
          )) OR
          whatsapp ILIKE '%' || $4 || '%' OR
          poc_contact ILIKE '%' || $4 || '%'
        )
      ORDER BY created_at ASC
    `;

    const regRes = await query(regSql, [
      camp.id,
      isEmail ? rawId : '',
      phone10,
      rawId
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
    const cleanEmail = (identifier.email || '').trim().toLowerCase();
    const cleanPhone = (identifier.phone || '').trim().replace(/[^0-9]/g, '');

    if (!cleanEmail && !cleanPhone) {
      return { success: true, registrations: [] };
    }

    const sql = `
      SELECT 
        r.*,
        c.title AS camp_title,
        c.slug AS camp_slug,
        c.venue AS camp_venue,
        c.start_date AS camp_start_date,
        c.end_date AS camp_end_date,
        c.refund_config AS camp_refund_config
      FROM camp_registrations r
      JOIN camps c ON c.id = r.camp_id
      WHERE (
        ($1 <> '' AND LOWER(r.email) = $1) OR
        ($2 <> '' AND (
          r.poc_contact LIKE '%' || $2 || '%' OR 
          r.whatsapp LIKE '%' || $2 || '%'
        ))
      )
      ORDER BY r.created_at DESC
    `;

    const res = await query(sql, [cleanEmail, cleanPhone ? cleanPhone.slice(-10) : '']);
    const registrations = res.rows as (CampRegistration & { camp_title: string; camp_slug: string; camp_venue: string; camp_start_date: string; camp_end_date: string; camp_refund_config?: any })[];

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



import { query } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Razorpay from 'razorpay';
import { sendCampDevoteeWelcomeAccountEmail } from '@/lib/utils/email';
import { calculateDynamicCampCost } from '@/lib/camp-cost';

const UNDERPAY_TOLERANCE_PAISE = 100; // ₹1 rounding only — never allow intentional underpay

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Recompute the exact amount that SHOULD have been paid for this order
 * from camp pricing + stored entries (never trust client-only amounts).
 */
function computeExpectedAmountPaise(camp: any, campOrder: any, participantEntries: any[]): number {
  const now = new Date(campOrder.created_at || Date.now());
  const isLate = Boolean(
    (Number(camp.late_fee) > 0 && camp.late_fee_start_date && now >= new Date(camp.late_fee_start_date)) ||
    (camp.late_fee_config?.enabled && camp.late_fee_config?.start_date && now >= new Date(camp.late_fee_config.start_date))
  );

  const lockedOrderAmount = Number(campOrder.amount) || 0;

  // No entries stored: trust create-order locked amount (already includes surcharge)
  if (!participantEntries.length) {
    return Math.round(lockedOrderAmount * 100);
  }

  let serverBaseTotal = 0;
  for (const entry of participantEntries) {
    const cost = calculateDynamicCampCost(camp, {
      firstMealDate: entry.first_meal_date || entry.firstMealDate || '',
      firstMealType: entry.first_meal_type || entry.firstMealType || 'Breakfast',
      lastMealDate: entry.last_meal_date || entry.lastMealDate || '',
      lastMealType: entry.last_meal_type || entry.lastMealType || 'Dinner',
      accommodation: entry.accommodation || 'No',
      participantType: entry.participant_type || entry.participantType || 'Camp Participant',
      campTrack: entry.camp_track || entry.campTrack
    }, isLate);
    serverBaseTotal += cost.totalCost;
  }

  const formData = parseJsonField<any>(campOrder.form_data, {});
  let serverDiscount = 0;
  const requestedCoupon = formData?.couponCode || formData?.coupon_code;
  if (requestedCoupon && serverBaseTotal > 0) {
    const coupons: any[] = camp.special_waivers?.coupons || [];
    const cleanCode = String(requestedCoupon).trim().toUpperCase();
    const matchedCoupon = coupons.find((c) => String(c.code).trim().toUpperCase() === cleanCode);
    if (matchedCoupon) {
      if (!matchedCoupon.max_uses || (Number(matchedCoupon.used_count) || 0) < matchedCoupon.max_uses) {
        if (matchedCoupon.discount_type === 'PERCENT') {
          serverDiscount = Math.round((serverBaseTotal * Number(matchedCoupon.discount_value)) / 100);
        } else {
          serverDiscount = Math.min(serverBaseTotal, Number(matchedCoupon.discount_value));
        }
      }
    }
  }

  const netCampFee = Math.max(0, serverBaseTotal - serverDiscount);
  const surchargePercent = Number(camp.payment_config?.surcharge_percent || 0);
  const surchargeAmount = surchargePercent > 0 ? Math.round((netCampFee * surchargePercent) / 100) : 0;
  const recomputedTotal = netCampFee + surchargeAmount;

  // Use the higher of recomputed vs locked order amount so nobody slips through with a lower stored amount
  return Math.round(Math.max(recomputedTotal, lockedOrderAmount) * 100);
}

/**
 * Automatically creates camp registrations from a captured payment order.
 * This runs when:
 * 1. Razorpay server-to-server webhook fires and devotee's mobile browser was killed/switched to PhonePe/GPay.
 * 2. Devotee returns to the camp page after app switching.
 *
 * SECURITY: Never creates a booking for underpayment. Always verifies live with Razorpay
 * and recomputes expected camp fee from stored entries.
 */
export async function autoCompleteCampOrderRegistration(
  orderId: string,
  paymentId?: string
): Promise<{
  success: boolean;
  count?: number;
  groupId?: string;
  amount?: number;
  payerName?: string;
  payerContact?: string;
  payerEmail?: string;
  error?: string;
  alreadyRegistered?: boolean;
  underpaid?: boolean;
}> {
  try {
    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    // 1. Fetch order details from camp_payment_orders
    const orderRes = await query(
      `SELECT * FROM camp_payment_orders WHERE order_id = $1 LIMIT 1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return { success: false, error: `Order ${orderId} not found in camp_payment_orders` };
    }

    const campOrder = orderRes.rows[0];

    // Hard block: never auto-register flagged underpayments
    if (campOrder.status === 'underpaid_flagged') {
      return {
        success: false,
        underpaid: true,
        error: 'Cannot auto-register an underpaid order. Manual finance review required.'
      };
    }

    let finalPaymentId = paymentId || campOrder.payment_id;

    // 2. Security: Verify live with Razorpay API that the payment was TRULY captured
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return { success: false, error: 'Razorpay gateway not configured for verification' };
    }

    let paidPaise = 0;
    try {
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

      if (!finalPaymentId) {
        const orderPayments: any = await razorpay.orders.fetchPayments(orderId);
        const capturedItem = (orderPayments?.items || []).find(
          (p: any) => p.status === 'captured' || p.status === 'authorized'
        );
        if (!capturedItem) {
          console.log(`[Auto-Register] No captured payment on Razorpay for order ${orderId}. User returned without paying.`);
          return { success: false, error: 'No captured payment found on Razorpay for this order. Payment was not completed.' };
        }
        finalPaymentId = capturedItem.id;
      }

      const payment = await razorpay.payments.fetch(finalPaymentId);

      // Payment must belong to this order
      if (payment.order_id && payment.order_id !== orderId) {
        console.warn(`[Auto-Register] Payment ${finalPaymentId} order mismatch: ${payment.order_id} vs ${orderId}`);
        return { success: false, error: 'Payment does not belong to this camp order' };
      }

      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        console.warn(`[Auto-Register] Payment ${finalPaymentId} for order ${orderId} is not captured. Status: ${payment.status}`);
        return { success: false, error: `Payment is not in captured status on gateway (Current status: ${payment.status})` };
      }

      paidPaise = Number(payment.amount) || 0;
    } catch (gateErr: any) {
      console.error('[Auto-Register] Razorpay live payment check failed:', gateErr);
      return { success: false, error: `Gateway verification failed: ${gateErr.message}` };
    }

    if (!finalPaymentId) {
      return { success: false, error: `Payment ID is missing for order ${orderId}` };
    }

    // Persist capture immediately so recovery paths can find this order even if registration insert fails later
    await query(
      `UPDATE camp_payment_orders
       SET status = CASE
             WHEN status = 'underpaid_flagged' THEN status
             WHEN status = 'registration_completed' THEN status
             ELSE 'captured'
           END,
           payment_id = COALESCE($1, payment_id),
           updated_at = NOW()
       WHERE order_id = $2`,
      [finalPaymentId, orderId]
    );

    // 3. Check if registration already exists for this payment_id or order_id
    const regCheck = await query(
      `SELECT id, group_id FROM camp_registrations WHERE payment_id = $1 OR order_id = $2 LIMIT 1`,
      [finalPaymentId, orderId]
    );

    if (regCheck.rows.length > 0) {
      await query(
        `UPDATE camp_payment_orders
         SET status = 'registration_completed', booking_status = 'confirmed', payment_id = $1, updated_at = NOW()
         WHERE order_id = $2`,
        [finalPaymentId, orderId]
      );
      const countRes = await query(
        `SELECT COUNT(*)::int AS c FROM camp_registrations WHERE group_id = $1 OR payment_id = $2 OR order_id = $3`,
        [regCheck.rows[0].group_id, finalPaymentId, orderId]
      );
      return {
        success: true,
        alreadyRegistered: true,
        groupId: regCheck.rows[0].group_id,
        count: countRes.rows[0]?.c || 1,
        amount: Number(campOrder.amount) || 0,
        payerName: campOrder.payer_name || undefined,
        payerContact: campOrder.payer_contact || undefined,
        payerEmail: campOrder.payer_email || undefined,
      };
    }

    // 4. Fetch camp details
    const campRes = await query(`SELECT * FROM camps WHERE id = $1 LIMIT 1`, [campOrder.camp_id]);
    if (campRes.rows.length === 0) {
      return { success: false, error: `Camp ${campOrder.camp_id} not found` };
    }
    const camp = campRes.rows[0];

    // 5. Parse participant entries
    let participantEntries: any[] = parseJsonField<any[]>(campOrder.entries_payload, []);
    if (!Array.isArray(participantEntries)) participantEntries = [];

    // 6. STRICT anti-underpay: recompute expected fee and compare to live Razorpay amount
    const expectedPaise = computeExpectedAmountPaise(camp, campOrder, participantEntries);
    if (expectedPaise <= 0) {
      return { success: false, error: 'Could not determine expected camp fee for this order' };
    }

    if (paidPaise < expectedPaise - UNDERPAY_TOLERANCE_PAISE) {
      console.warn(
        `[Auto-Register] UNDERPAYMENT BLOCKED: Paid ${paidPaise} paise, Expected ${expectedPaise} paise for order ${orderId}`
      );
      await query(
        `UPDATE camp_payment_orders
         SET status = 'underpaid_flagged', payment_id = $1, error_message = $2, updated_at = NOW()
         WHERE order_id = $3`,
        [
          finalPaymentId,
          `Underpayment blocked: received ₹${(paidPaise / 100).toFixed(2)}, expected ₹${(expectedPaise / 100).toFixed(2)}`,
          orderId
        ]
      );
      return {
        success: false,
        underpaid: true,
        error: `Underpayment detected. Received ₹${(paidPaise / 100).toFixed(2)} but ₹${(expectedPaise / 100).toFixed(2)} is required. Registration blocked.`
      };
    }

    const campStartIso = camp.start_date
      ? new Date(camp.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const campEndIso = camp.end_date
      ? new Date(camp.end_date).toISOString().split('T')[0]
      : campStartIso;

    // Fallback if entries_payload is empty: generate 1 entry from payer details
    if (!participantEntries || participantEntries.length === 0) {
      participantEntries = [{
        participant_name: campOrder.payer_name || 'Devotee',
        whatsapp: campOrder.payer_contact || '',
        email: campOrder.payer_email || '',
        camp_track: (camp.tracks && camp.tracks[0]?.name) || 'GS Camp - 1st Timer',
        participant_type: 'Camp Participant',
        gender: 'Male - Bachelor',
        first_meal_date: campStartIso,
        first_meal_type: 'Breakfast',
        last_meal_date: campEndIso,
        last_meal_type: 'Dinner',
        dinner_type: 'Dinner Meal',
        accommodation: 'No',
        total_cost: campOrder.amount,
        meal_cost: 0,
        acc_cost: 0,
      }];
    }

    const groupId = `camp_group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const unitCost = Math.round(Number(campOrder.amount) / participantEntries.length);
    const insertedRegistrations: any[] = [];

    for (const entry of participantEntries) {
      const pName = entry.participant_name || entry.participantName || campOrder.payer_name || 'Devotee';
      const pPhone = entry.whatsapp || entry.phone || campOrder.payer_contact || '';
      const pEmail = (entry.email || campOrder.payer_email || '').trim().toLowerCase();
      const pTrack = entry.camp_track || entry.campTrack || (camp.tracks && camp.tracks[0]?.name) || 'GS Camp - 1st Timer';
      const pType = entry.participant_type || entry.participantType || 'Camp Participant';
      const pGender = entry.gender || 'Male - Bachelor';
      const pAcc = entry.accommodation || 'No';
      const pFirstMealDate = String(entry.first_meal_date || entry.firstMealDate || campStartIso);
      const pFirstMealType = String(entry.first_meal_type || entry.firstMealType || 'Breakfast');
      const pLastMealDate = String(entry.last_meal_date || entry.lastMealDate || campEndIso);
      const pLastMealType = String(entry.last_meal_type || entry.lastMealType || 'Dinner');
      const pDinnerType = String(entry.dinner_type || entry.dinnerType || 'Dinner Meal');
      const pCenter = entry.current_center || entry.currentCenter || entry.voice_name || entry.voiceName || 'Central VOICE';
      const pTemple = entry.current_temple || entry.currentTemple || entry.parent_temple || entry.parentTemple || 'ISKCON NVCC • PUNE';
      const pCounselor = entry.counselor_name || entry.counselorName || null;
      const pAge = entry.age ? Number(entry.age) : null;
      const pMarriedYear = entry.married_since_year ? Number(entry.married_since_year) : null;

      const insertSql = `
        INSERT INTO camp_registrations (
          camp_id, group_id, poc_name, poc_contact, email,
          parent_temple, voice_name, current_temple, current_center,
          participant_name, whatsapp, counselor_name,
          gender, age, married_since_year, camp_track, participant_type,
          first_meal_date, first_meal_type, last_meal_date, last_meal_type,
          dinner_type, accommodation,
          meal_cost, acc_cost, ac_cost, entry_cost, total_cost,
          payment_method, payment_status, payment_id, order_id,
          verified_at, verified_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23,
          $24, $25, $26, $27, $28,
          'RAZORPAY', 'completed', $29, $30,
          NOW(), 'Razorpay Webhook Auto-Sync'
        ) RETURNING *
      `;

      const values = [
        camp.id,
        groupId,
        campOrder.payer_name || pName,
        campOrder.payer_contact || pPhone,
        pEmail,
        pTemple,
        pCenter,
        pTemple,
        pCenter,
        pName,
        pPhone,
        pCounselor,
        pGender,
        pAge,
        pMarriedYear,
        pTrack,
        pType,
        pFirstMealDate,
        pFirstMealType,
        pLastMealDate,
        pLastMealType,
        pDinnerType,
        pAcc,
        Number(entry.meal_cost || 0),
        Number(entry.acc_cost || 0),
        Number(entry.ac_cost || 0),
        Number(entry.entry_cost || 0),
        Number(entry.total_cost || unitCost || 0),
        finalPaymentId,
        orderId
      ];

      const res = await query(insertSql, values);
      insertedRegistrations.push(res.rows[0]);

      // Create / link student account if email provided
      if (pEmail) {
        try {
          const userCheck = await query(
            `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
            [pEmail]
          );

          if (userCheck.rows.length === 0) {
            const newUserId = crypto.randomUUID();
            const first4Digits = (pPhone || '1234').replace(/\D/g, '').slice(0, 4) || '1234';
            const plainPassword = `${first4Digits}HareKrishna@108`;
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(plainPassword, salt);

            await query(
              `INSERT INTO users (
                id, email, name, phone,
                role, verification_status, ashram,
                current_temple, parent_temple, current_center, parent_center, center,
                password_hash,
                created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4,
                2, 'approved', 'Student and Not decided',
                $5, $5, $6, $6, $6,
                $7,
                NOW(), NOW()
              )`,
              [newUserId, pEmail, pName, pPhone, pTemple, pCenter, passwordHash]
            );

            sendCampDevoteeWelcomeAccountEmail({
              userEmail: pEmail,
              userName: pName,
              tempPassword: plainPassword,
              campTitle: camp.title,
              trackName: pTrack,
              centerName: pCenter,
              templeName: pTemple
            }).catch(e => console.warn('[Auto-Register Devotee] Email notice error:', e));
          } else {
            sendCampDevoteeWelcomeAccountEmail({
              userEmail: pEmail,
              userName: userCheck.rows[0].name || pName,
              campTitle: camp.title,
              trackName: pTrack,
              centerName: pCenter,
              templeName: pTemple
            }).catch(e => console.warn('[Auto-Register Devotee] Email notice error:', e));
          }
        } catch (accErr) {
          console.warn('[Auto-Register Devotee] Account creation notice:', accErr);
        }
      }
    }

    // 7. Update camp_payment_orders status
    await query(
      `UPDATE camp_payment_orders
       SET status = 'registration_completed', booking_status = 'confirmed', payment_id = $1, updated_at = NOW()
       WHERE order_id = $2`,
      [finalPaymentId, orderId]
    );

    console.log(`[Auto-Register] Successfully auto-registered ${insertedRegistrations.length} devotee(s) for camp order ${orderId} (Payment: ${finalPaymentId})`);
    return {
      success: true,
      count: insertedRegistrations.length,
      groupId,
      amount: Number(campOrder.amount) || paidPaise / 100,
      payerName: campOrder.payer_name || undefined,
      payerContact: campOrder.payer_contact || undefined,
      payerEmail: campOrder.payer_email || undefined,
    };
  } catch (err: any) {
    console.error('[Auto-Register] Failed to auto-complete registration:', err);
    return { success: false, error: err.message };
  }
}

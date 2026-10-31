import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { query } from '@/lib/db';
import { CampRegistration, Camp } from '@/types';
import { calculateDynamicCampCost } from '@/lib/camp-cost';
import { isCampManagerialUser } from '@/lib/utils/roles';
import { getAuthUserFromCookies } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { sendCampDevoteeWelcomeAccountEmail } from '@/lib/utils/email';
import { getManagerAssignedLocations } from '@/app/dashboard/admin/camps/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campId,
      entries,
      email,
      totalAmount,
      paymentMethod, // 'RAZORPAY' or 'IDT'
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      deductionSource,
      passcode,
    } = body;

    if (!campId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Valid camp ID and participant entries are required' }, { status: 400 });
    }

    // 1. Fetch Camp to verify configuration & payment authorization
    const campRes = await query('SELECT * FROM camps WHERE id = $1', [campId]);
    if (campRes.rows.length === 0) {
      return NextResponse.json({ error: 'Camp event not found' }, { status: 404 });
    }
    const camp = campRes.rows[0];

    // Enforce Active Status: Reject if camp is archived, closed, or draft
    if (camp.status !== 'active') {
      return NextResponse.json({
        error: `Registrations are closed for this camp (Status: ${camp.status.toUpperCase()}). New registrations cannot be accepted.`
      }, { status: 400 });
    }

    const now = new Date();
    if (camp.registration_start_date && now < new Date(camp.registration_start_date)) {
      return NextResponse.json({
        error: `Registrations for "${camp.title}" open on ${new Date(camp.registration_start_date).toLocaleDateString('en-IN')}. New registrations cannot be accepted yet.`
      }, { status: 400 });
    }

    if (camp.registration_deadline && now > new Date(camp.registration_deadline)) {
      return NextResponse.json({
        error: `Registrations for "${camp.title}" closed on ${new Date(camp.registration_deadline).toLocaleDateString('en-IN')}. The deadline has passed.`
      }, { status: 400 });
    }

    // 1.5 Enforce Student single-registration restriction
    if (entries.length > 1) {
      const sessionUser = await getAuthUserFromCookies();
      const resolvedUserId = body.callerUserId || sessionUser?.id;
      if (!resolvedUserId) {
        return NextResponse.json({
          error: 'Registering multiple attendees is restricted to center managers. Please log in to your account.'
        }, { status: 403 });
      }
      const uRes = await query('SELECT role FROM users WHERE id = $1', [resolvedUserId]);
      if (uRes.rows.length === 0 || !isCampManagerialUser(uRes.rows[0].role, camp.payment_config?.allowed_managerial_roles)) {
        return NextResponse.json({
          error: 'Student accounts can only register for themselves (1 attendee maximum). Registering multiple attendees is restricted to center managers.'
        }, { status: 403 });
      }
    }

    // 1.8 Enforce Uniqueness by Camp Event + Camp Track:
    // A devotee can register for multiple different tracks (e.g., 'Nistha' and later 'Royal') in the same camp,
    // but cannot register for the SAME track in this camp more than once.
    const seenBatchKeys = new Set<string>();
    for (const entry of entries) {
      const entryName = entry.participant_name || entry.participantName || entry.poc_name || 'Participant';
      const entryTrack = (entry.camp_track || entry.campTrack || '').trim();
      const entryEmail = (entry.email || email || body.email || '').trim().toLowerCase();
      const rawPhone = String(entry.whatsapp || entry.phone || body.whatsapp || body.phone || '');
      const entryPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);

      if (entryTrack) {
        // A. Reject internal duplicates within the submitted batch
        const batchKeyEmail = entryEmail ? `${entryEmail}:::${entryTrack.toLowerCase()}` : '';
        const batchKeyPhone = entryPhone ? `${entryPhone}:::${entryTrack.toLowerCase()}` : '';
        if ((batchKeyEmail && seenBatchKeys.has(batchKeyEmail)) || (batchKeyPhone && seenBatchKeys.has(batchKeyPhone))) {
          return NextResponse.json({
            error: `Duplicate entry in batch: "${entryName}" is listed more than once for the "${entryTrack}" track.`
          }, { status: 400 });
        }
        if (batchKeyEmail) seenBatchKeys.add(batchKeyEmail);
        if (batchKeyPhone) seenBatchKeys.add(batchKeyPhone);

        // B. Check against database for existing active registrations
        const dupParams: any[] = [campId, entryTrack.toLowerCase()];
        const matchConditions: string[] = [];
        if (entryEmail) {
          dupParams.push(entryEmail);
          matchConditions.push(`LOWER(email) = $${dupParams.length}`);
        }
        if (entryPhone) {
          dupParams.push(entryPhone);
          matchConditions.push(`RIGHT(whatsapp, 10) = $${dupParams.length}`);
        }

        if (matchConditions.length > 0) {
          const dupRes = await query(
            `SELECT id, participant_name, camp_track 
             FROM camp_registrations 
             WHERE camp_id = $1 
               AND LOWER(camp_track) = $2
               AND is_cancelled IS NOT TRUE 
               AND payment_status != 'failed'
               AND (${matchConditions.join(' OR ')})
             LIMIT 1`,
            dupParams
          );
          if (dupRes.rows.length > 0) {
            return NextResponse.json({
              error: `"${entryName}" is already registered for track "${entryTrack}" in this camp. Duplicate registration rejected.`
            }, { status: 400 });
          }
        }

        // C. Enforce sub-camp minimum rounds requirement
        const trackFees = camp.special_waivers?.track_fees || [];
        const trackFeeObj = trackFees.find((tf: any) => tf.track?.toLowerCase() === entryTrack.toLowerCase());
        const requiredMinRounds = trackFeeObj?.min_rounds ? Number(trackFeeObj.min_rounds) : 0;
        const entryRoundsNum = entry.rounds !== undefined && entry.rounds !== null && entry.rounds !== '' ? Number(entry.rounds) : 0;
        if (requiredMinRounds > 0 && entryRoundsNum < requiredMinRounds) {
          return NextResponse.json({
            error: `Participant "${entryName}" does not meet the chanting requirement for "${entryTrack}". Minimum ${requiredMinRounds} rounds required (Participant has ${entryRoundsNum} rounds).`
          }, { status: 400 });
        }

        // D. Enforce Center-Based Registration Restriction
        const eligibleCenters: string[] = Array.isArray(camp.eligible_centers) ? camp.eligible_centers : [];
        if (eligibleCenters.length > 0) {
          const entryCenter = String(entry.voice_name || entry.voiceName || entry.center || '').trim();
          const isMatch = eligibleCenters.some((c) =>
            c.trim().toLowerCase() === entryCenter.toLowerCase() ||
            entryCenter.toLowerCase().includes(c.trim().toLowerCase()) ||
            c.trim().toLowerCase().includes(entryCenter.toLowerCase())
          );
          if (!isMatch) {
            return NextResponse.json({
              error: `Registration for "${camp.title}" is restricted to devotees from: ${eligibleCenters.join(', ')}. Participant "${entryName}" has center "${entryCenter || 'Unspecified'}" which is not eligible.`
            }, { status: 403 });
          }
        }
      }
    }

    // 2. Validate coupon code if applied
    let matchedCoupon: any = null;
    if (body.couponCode) {
      const coupons: any[] = camp.special_waivers?.coupons || [];
      const cleanCode = String(body.couponCode).trim().toUpperCase();
      matchedCoupon = coupons.find((c) => String(c.code).trim().toUpperCase() === cleanCode);
      if (!matchedCoupon) {
        return NextResponse.json({ error: `Promo code "${cleanCode}" is invalid or expired.` }, { status: 400 });
      }
      if (matchedCoupon.max_uses && (Number(matchedCoupon.used_count) || 0) >= matchedCoupon.max_uses) {
        return NextResponse.json({
          error: `Promo code "${cleanCode}" has reached its maximum usage limit of ${matchedCoupon.max_uses} users.`
        }, { status: 400 });
      }
    }

    // 2.5 Recalculate true cost on the server to prevent client-side price tampering
    const isLate = Boolean(
      camp.late_fee_config?.enabled &&
      camp.late_fee_config?.start_date &&
      now >= new Date(camp.late_fee_config.start_date)
    );

    let serverBaseTotal = 0;
    const computedEntryCosts = entries.map((entry: any) => {
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
      return cost;
    });

    let serverDiscount = 0;
    if (matchedCoupon && serverBaseTotal > 0) {
      if (matchedCoupon.discount_type === 'PERCENT') {
        serverDiscount = Math.round((serverBaseTotal * Number(matchedCoupon.discount_value)) / 100);
      } else {
        serverDiscount = Math.min(serverBaseTotal, Number(matchedCoupon.discount_value));
      }
    }
    const serverFinalTotal = Math.max(0, serverBaseTotal - serverDiscount);

    // 3. Payment Verification & Anti-Tampering Checks
    if (paymentMethod === 'RAZORPAY') {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing online payment details' }, { status: 400 });
      }

      // Anti-Replay Check: Ensure this transaction ID has not already been used
      const dupCheck = await query(
        'SELECT id FROM camp_registrations WHERE payment_id = $1 LIMIT 1',
        [razorpay_payment_id]
      );
      if (dupCheck.rows.length > 0) {
        return NextResponse.json({
          error: 'This payment transaction ID has already been registered. Duplicate submission rejected.'
        }, { status: 400 });
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return NextResponse.json({ error: 'Gateway configuration missing' }, { status: 500 });
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature verification failed' }, { status: 400 });
      }

      // Security check: Verify actual amount paid on Razorpay to prevent underpayment / ₹1 order tampering
      if (keyId) {
        try {
          const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
          const payment = await razorpay.payments.fetch(razorpay_payment_id);
          
          if (payment.order_id && payment.order_id !== razorpay_order_id) {
            return NextResponse.json({ error: 'Order ID mismatch for this payment ID' }, { status: 400 });
          }

          const expectedPaise = Math.round(serverFinalTotal * 100);
          const paidPaise = Number(payment.amount) || 0;
          // Payment must be at least the expected total (surcharge may make it slightly higher)
          if (paidPaise < expectedPaise) {
            return NextResponse.json({
              error: `Payment amount discrepancy: Received ₹${(paidPaise / 100).toFixed(2)}, but ₹${serverFinalTotal.toFixed(2)} is required. Registration rejected.`
            }, { status: 400 });
          }
        } catch (gatewayErr: any) {
          console.error('Failed to verify payment with Razorpay:', gatewayErr);
          return NextResponse.json({ error: 'Payment verification failed with gateway' }, { status: 400 });
        }
      }
    } else if (paymentMethod === 'IDT') {
      if (!deductionSource || !passcode) {
        return NextResponse.json({ error: 'Both deduction source VOICE and passcode are required for IDT' }, { status: 400 });
      }

      const allowedPasscodes: string[] = camp.payment_config?.idt_passcodes || [];
      const cleanInputCode = String(passcode).trim();
      const isValidPasscode = allowedPasscodes.some(
        (code) => String(code).trim().toLowerCase() === cleanInputCode.toLowerCase()
      );

      if (!isValidPasscode) {
        return NextResponse.json({ error: 'Invalid IDT Authorization Key. Please contact Central VOICE.' }, { status: 403 });
      }
    } else if (paymentMethod === 'INTER_TEMPLE_TRANSFER' || paymentMethod === 'ITT') {
      const screenshot = body.payment_screenshot_url || body.paymentScreenshotUrl;
      const ref = body.transaction_ref || body.transactionRef;
      if (!screenshot) {
        return NextResponse.json({ error: 'Payment screenshot proof is required for Inter-Temple Transfer' }, { status: 400 });
      }
      if (!ref) {
        return NextResponse.json({ error: 'Transaction Reference / UTR number is required for Inter-Temple Transfer' }, { status: 400 });
      }
    } else if (paymentMethod === 'COUPON' || paymentMethod === 'ROLE_WAIVER' || paymentMethod === 'FREE') {
      if (paymentMethod === 'COUPON' && !matchedCoupon) {
        return NextResponse.json({ error: 'Valid coupon code is required for coupon-based registration.' }, { status: 400 });
      }

      // Security Check: If server-calculated cost is greater than 0, reject free registration!
      if (serverFinalTotal > 0) {
        return NextResponse.json({
          error: `Payment bypass rejected: This registration requires payment of ₹${serverFinalTotal.toLocaleString('en-IN')}. Free/waiver registration is not permitted without a 100% waiver or coupon.`
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    }

    // 3. Resolve logged-in manager's assigned center & temple, with personal profile fallback
    const sessionUser = await getAuthUserFromCookies();
    const resolvedCallerId = body.callerUserId || sessionUser?.id;
    let managerAssignedCenter = '';
    let managerAssignedTemple = '';
    let managerCurrentTemple = 'ISKCON NVCC • PUNE';
    let managerCurrentCenter = 'Central VOICE';

    if (resolvedCallerId) {
      try {
        const callerRes = await query(
          `SELECT role, current_center, center, other_center, current_temple, parent_temple, other_temple, hierarchy FROM users WHERE id = $1`,
          [resolvedCallerId]
        );
        if (callerRes.rows.length > 0) {
          const c = callerRes.rows[0];
          const rawRole = c.role;
          const callerRoles = (Array.isArray(rawRole) ? rawRole : [rawRole])
            .map((r: any) => Number(r))
            .filter((r: number) => !isNaN(r));

          // Priority 1: Check assigned center and assigned temple allocations
          try {
            const assignedLoc = await getManagerAssignedLocations(resolvedCallerId, callerRoles);
            if (assignedLoc.assignedCenterNames && assignedLoc.assignedCenterNames.length > 0) {
              managerAssignedCenter = assignedLoc.assignedCenterNames[0].trim();
            }
            if (assignedLoc.assignedTempleNames && assignedLoc.assignedTempleNames.length > 0) {
              managerAssignedTemple = assignedLoc.assignedTempleNames[0].trim();
            }
          } catch (locErr) {
            console.warn('Error getting manager assigned locations in register route:', locErr);
          }

          // Priority 2: Fallback to personal profile locations if not assigned
          const curT = (c.current_temple || c.hierarchy?.currentTemple || '').trim();
          const othT = (c.other_temple || c.hierarchy?.otherTemple || '').trim();
          const parT = (c.parent_temple || c.hierarchy?.parentTemple || '').trim();
          if (curT && curT.toLowerCase() !== 'none') {
            managerCurrentTemple = curT.toLowerCase() === 'other' ? (othT || 'Other') : curT;
          } else if (parT && parT.toLowerCase() !== 'none') {
            managerCurrentTemple = parT.toLowerCase() === 'other' ? (othT || 'Other') : parT;
          }

          const curC = (c.current_center || c.hierarchy?.currentCenter || '').trim();
          const othC = (c.other_center || c.hierarchy?.otherCenter || '').trim();
          const cenC = (c.center || c.hierarchy?.center || '').trim();
          if (curC && curC.toLowerCase() !== 'none') {
            managerCurrentCenter = curC.toLowerCase() === 'other' ? (othC || 'Other') : curC;
          } else if (cenC && cenC.toLowerCase() !== 'none') {
            managerCurrentCenter = cenC.toLowerCase() === 'other' ? (othC || 'Other') : cenC;
          }
        }
      } catch (err) {
        console.warn('Could not resolve manager current temple/center:', err);
      }
    }

    // 3.1 Insert all devotee entries in batch with a shared group_id
    const groupId = `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const insertedRecords: any[] = [];
    const isItt = paymentMethod === 'INTER_TEMPLE_TRANSFER' || paymentMethod === 'ITT';
    const isIdt = paymentMethod === 'IDT';
    const isPendingVerification = isItt || isIdt;
    // Both ITT and IDT go to 'processing' (pending administrative verification)
    const paymentStatus = isPendingVerification ? 'processing' : 'completed';
    const screenshotUrl = body.payment_screenshot_url || body.paymentScreenshotUrl || null;
    const transactionRef = body.transaction_ref || body.transactionRef || null;

    for (const entry of entries) {
      const entryPocName = entry.poc_name || entry.pocName || body.pocName || body.poc_name || 'Participant';
      const entryPocContact = entry.poc_contact || entry.pocContact || body.pocContact || body.poc_contact || entry.whatsapp || '';
      const entryEmail = (entry.email || email || body.email || '').trim().toLowerCase();
      const entryParticipantName = entry.participant_name || entry.participantName || entryPocName;
      const entryWhatsapp = entry.whatsapp || entry.phone || entryPocContact;
      let entryParentTemple = entry.current_temple || entry.currentTemple || entry.parent_temple || entry.parentTemple || managerCurrentTemple || null;
      let entryVoiceName = entry.current_center || entry.currentCenter || entry.voice_name || entry.voiceName || managerCurrentCenter || null;
      let entryCounselorName = entry.counselor_name || entry.counselorName || null;
      const entryOtherCounselor = (entry.other_counselor || entry.otherCounselor || '').trim();
      if ((!entryCounselorName || entryCounselorName === 'Other') && entryOtherCounselor) {
        entryCounselorName = entryOtherCounselor;
      }

      // Ensure historical audit immutability: Snapshot devotee's current center, temple, and counselor at registration time
      const needsCenter = !entryVoiceName || entryVoiceName.toLowerCase() === 'none';
      const needsTemple = !entryParentTemple || entryParentTemple.toLowerCase() === 'none';
      if (needsCenter || needsTemple || !entryCounselorName) {
        try {
          const userLookup = await query(
            `SELECT current_center, center, other_center, current_temple, parent_temple, other_temple, brahmachari_counselor, grihastha_counselor, hierarchy 
             FROM users 
             WHERE (email IS NOT NULL AND email <> '' AND LOWER(email) = LOWER($1))
                OR (phone IS NOT NULL AND phone <> '' AND (RIGHT(phone, 10) = RIGHT($2, 10)))
             LIMIT 1`,
            [entryEmail, entryWhatsapp]
          );
          if (userLookup.rows.length > 0) {
            const u = userLookup.rows[0];
            if (needsCenter) {
              const cur = (u.current_center || '').trim();
              const oth = (u.other_center || '').trim();
              const cen = (u.center || '').trim();
              if (cur && cur.toLowerCase() !== 'none') {
                entryVoiceName = cur.toLowerCase() === 'other' ? (oth || 'Other') : cur;
              } else if (cen && cen.toLowerCase() !== 'none') {
                entryVoiceName = cen.toLowerCase() === 'other' ? (oth || 'Other') : cen;
              } else if (u.hierarchy?.currentCenter) {
                entryVoiceName = u.hierarchy.currentCenter;
              } else if (u.hierarchy?.center) {
                entryVoiceName = u.hierarchy.center;
              }
            }
            if (needsTemple) {
              const curT = (u.current_temple || '').trim();
              const parT = (u.parent_temple || '').trim();
              const othT = (u.other_temple || '').trim();
              if (curT && curT.toLowerCase() !== 'none') {
                entryParentTemple = curT.toLowerCase() === 'other' ? (othT || 'Other') : curT;
              } else if (parT && parT.toLowerCase() !== 'none') {
                entryParentTemple = parT.toLowerCase() === 'other' ? (othT || 'Other') : parT;
              } else if (u.hierarchy?.parentTemple) {
                entryParentTemple = u.hierarchy.parentTemple;
              }
            }
            if (!entryCounselorName) {
              entryCounselorName = u.brahmachari_counselor || u.grihastha_counselor || u.hierarchy?.brahmachariCounselor || null;
            }
          }
        } catch (e) {
          console.warn('Could not auto-snapshot user center/temple at registration:', e);
        }
      }

      // Per user explicit requirement:
      // When a center manager registers users, use their assigned center & temple (e.g. Test Center & Test Temple)
      // Parent center & temple strictly equal the assigned location
      const resolvedTemple = (
        entry.assigned_temple ||
        entry.current_temple ||
        entry.currentTemple ||
        managerAssignedTemple ||
        managerCurrentTemple ||
        entryParentTemple ||
        'ISKCON NVCC • PUNE'
      ).trim();

      const resolvedCenter = (
        entry.assigned_center ||
        entry.current_center ||
        entry.currentCenter ||
        entry.voice_name ||
        entry.voiceName ||
        managerAssignedCenter ||
        managerCurrentCenter ||
        'Central VOICE'
      ).trim();

      const entryCurrentCenter = resolvedCenter;
      const entryCurrentTemple = resolvedTemple;
      entryVoiceName = resolvedCenter;
      entryParentTemple = resolvedTemple;

      const entryGender = entry.gender || 'Male - Bachelor';
      const entryAge = entry.age ? Number(entry.age) : null;
      const entryMarriedYear = (entry.married_since_year || entry.marriedSinceYear) ? Number(entry.married_since_year || entry.marriedSinceYear) : null;
      const entryCampTrack = entry.camp_track || entry.campTrack || 'GS Camp - 1st Timer';
      const entryParticipantType = entry.participant_type || entry.participantType || 'Camp Participant';
      const entryFirstMealDate = String(entry.first_meal_date || entry.firstMealDate || '');
      const entryFirstMealType = entry.first_meal_type || entry.firstMealType || 'Breakfast';
      const entryLastMealDate = String(entry.last_meal_date || entry.lastMealDate || '');
      const entryLastMealType = entry.last_meal_type || entry.lastMealType || 'Dinner';
      const entryDinnerType = entry.dinner_type || entry.dinnerType || 'Dinner Meal';
      const entryAccommodation = entry.accommodation || 'No';
      const costResult = computedEntryCosts[entries.indexOf(entry)] || {
        mealCost: 0,
        accCost: 0,
        acCost: 0,
        lateFee: 0,
        entryCost: 0,
        totalCost: 0
      };
      const entryMealCost = costResult.mealCost;
      const entryAccCost = costResult.accCost;
      const entryAcCost = costResult.acCost;
      const entryLateFee = costResult.lateFee;
      const entryEntryCost = costResult.entryCost;
      const entryTotalCost = costResult.totalCost;

      const cleanCouponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
      let entryDiscountAmount = 0;
      if (paymentMethod === 'COUPON' || paymentMethod === 'ROLE_WAIVER' || paymentMethod === 'FREE') {
        entryDiscountAmount = entryTotalCost;
      } else if (serverDiscount > 0) {
        entryDiscountAmount = Math.round(serverDiscount / entries.length);
      }

      const sql = `
        INSERT INTO camp_registrations (
          camp_id, group_id, poc_name, poc_contact, email,
          parent_temple, voice_name, current_temple, current_center,
          participant_name, whatsapp, counselor_name,
          gender, age, married_since_year, camp_track, participant_type,
          first_meal_date, first_meal_type, last_meal_date, last_meal_type,
          dinner_type, accommodation,
          meal_cost, acc_cost, ac_cost, late_fee, entry_cost, total_cost,
          discount_amount, coupon_code,
          payment_method, payment_status, payment_id, order_id, deduction_source, passcode,
          payment_screenshot_url, transaction_ref
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23,
          $24, $25, $26, $27, $28, $29,
          $30, $31,
          $32, $33, $34, $35, $36, $37,
          $38, $39
        ) RETURNING *
      `;

      const values = [
        campId,
        groupId,
        entryPocName,
        entryPocContact,
        entryEmail,
        entryParentTemple,
        entryVoiceName,
        entryCurrentTemple,
        entryCurrentCenter,
        entryParticipantName,
        entryWhatsapp,
        entryCounselorName,
        entryGender,
        entryAge,
        entryMarriedYear,
        entryCampTrack,
        entryParticipantType,
        entryFirstMealDate,
        entryFirstMealType,
        entryLastMealDate,
        entryLastMealType,
        entryDinnerType,
        entryAccommodation,
        entryMealCost,
        entryAccCost,
        entryAcCost,
        entryLateFee,
        entryEntryCost,
        entryTotalCost,
        entryDiscountAmount,
        cleanCouponCode,
        paymentMethod,
        paymentStatus,
        paymentMethod === 'RAZORPAY' ? razorpay_payment_id : (cleanCouponCode ? `COUPON_${cleanCouponCode}` : (isItt ? transactionRef : null)),
        paymentMethod === 'RAZORPAY' ? razorpay_order_id : null,
        paymentMethod === 'IDT' ? deductionSource : (deductionSource || (cleanCouponCode ? `Coupon: ${cleanCouponCode}` : (paymentMethod === 'ROLE_WAIVER' ? 'Role Waiver' : null))),
        paymentMethod === 'IDT' ? passcode : null,
        screenshotUrl,
        transactionRef
      ];

      const res = await query(sql, values);
      insertedRecords.push(res.rows[0]);
    }

    // 3.5 Auto-create student accounts for newly registered devotees & send Welcome Email
    for (const entry of entries) {
      const entryEmail = (entry.email || email || body.email || '').trim().toLowerCase();
      if (!entryEmail) continue;

      const entryParticipantName = entry.participant_name || entry.participantName || entry.poc_name || 'Participant';
      const rawPhone = String(entry.whatsapp || entry.phone || entry.poc_contact || '');
      const entryWhatsapp = rawPhone.replace(/[^0-9]/g, '').slice(-10);
      const entryBirthDate = entry.birth_date || entry.birthDate || entry.dob || null;
      const rawCounselorSelection = entry.counselor_selection || entry.counselorSelection;
      const entryOtherCounselor = (entry.other_counselor || entry.otherCounselor || '').trim() || null;
      let entryCounselorName = entry.counselor_name || entry.counselorName || null;

      const isOtherCounselor = rawCounselorSelection === 'Other' || Boolean(entryOtherCounselor) || entryCounselorName === 'Other';
      const isNoneCounselor = rawCounselorSelection === 'None' || (entryCounselorName && entryCounselorName.trim().toLowerCase() === 'none');

      let userProfileCounselor: string | null = null;
      let userProfileOtherCounselor: string | null = null;
      let hierarchyBrahmachariCounselor: string | null = null;

      if (isOtherCounselor) {
        userProfileCounselor = 'Other';
        userProfileOtherCounselor = entryOtherCounselor || (entryCounselorName !== 'Other' ? entryCounselorName : null);
        hierarchyBrahmachariCounselor = userProfileOtherCounselor;
      } else if (isNoneCounselor) {
        userProfileCounselor = 'None';
        userProfileOtherCounselor = null;
        hierarchyBrahmachariCounselor = 'None';
      } else if (entryCounselorName) {
        userProfileCounselor = entryCounselorName;
        userProfileOtherCounselor = null;
        hierarchyBrahmachariCounselor = entryCounselorName;
      }

      const entryIntroducedToKc = entry.introduced_to_kc_in || entry.introducedToKcIn || entry.introducedToKcSince || null;
      const entryCampTrack = entry.camp_track || entry.campTrack || 'GS Camp - 1st Timer';

      // Ensure student's parent temple and center strictly equal the manager's assigned center & temple
      const studentTemple = (
        entry.assigned_temple ||
        entry.current_temple ||
        entry.currentTemple ||
        managerAssignedTemple ||
        managerCurrentTemple ||
        'ISKCON NVCC • PUNE'
      ).trim();

      const studentCenter = (
        entry.assigned_center ||
        entry.current_center ||
        entry.currentCenter ||
        entry.voice_name ||
        entry.voiceName ||
        managerAssignedCenter ||
        managerCurrentCenter ||
        'Central VOICE'
      ).trim();

      try {
        const userCheck = await query(
          `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [entryEmail]
        );

        if (userCheck.rows.length === 0) {
          // A. Devotee does NOT have an account: Create approved student account
          const newUserId = crypto.randomUUID();
          const first4Digits = entryWhatsapp.slice(0, 4) || '1234';
          const plainPassword = `${first4Digits}HareKrishna@108`;
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(plainPassword, salt);

          let counselorId = null;
          if (userProfileCounselor && userProfileCounselor !== 'Other' && userProfileCounselor !== 'None') {
            try {
              const cLookup = await query(
                `SELECT id FROM counselors WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                [userProfileCounselor.trim()]
              );
              if (cLookup.rows.length > 0) {
                counselorId = cLookup.rows[0].id;
              }
            } catch (ce) {
              console.warn('Counselor lookup notice:', ce);
            }
          }

          const rawEntryRounds = entry.rounds !== undefined && entry.rounds !== null && entry.rounds !== ''
            ? parseInt(String(entry.rounds), 10)
            : null;
          const entryRounds = rawEntryRounds !== null && !isNaN(rawEntryRounds) ? rawEntryRounds : null;

          const hierarchyObj = {
            currentTemple: studentTemple,
            parentTemple: studentTemple, // MUST strictly equal current temple per user specification
            currentCenter: studentCenter,
            parentCenter: studentCenter, // MUST strictly equal current center
            center: studentCenter,
            counselor: userProfileCounselor || '',
            otherCounselor: userProfileOtherCounselor,
            brahmachariCounselor: hierarchyBrahmachariCounselor || '',
            counselorId: counselorId,
            ashram: 'Student and Not decided',
            introducedToKcIn: entryIntroducedToKc || '',
            birthDate: entryBirthDate || '',
            rounds: entryRounds
          };

          await query(
            `INSERT INTO users (
              id, email, name, phone, birth_date,
              role, verification_status, ashram,
              current_temple, parent_temple, current_center, parent_center, center,
              counselor, counselor_id, other_counselor, brahmachari_counselor, introduced_to_kc_in,
              rounds,
              password_hash, hierarchy,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8,
              $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18,
              $19,
              $20, $21,
              NOW(), NOW()
            )`,
            [
              newUserId,
              entryEmail,
              entryParticipantName,
              entryWhatsapp,
              entryBirthDate ? new Date(entryBirthDate) : null,
              [1], // Student role
              'approved', // Auto-approved because Center Manager registered them directly
              'Student and Not decided',
              studentTemple,
              studentTemple, // parent temple equals current temple
              studentCenter,
              studentCenter, // parent center equals current center
              studentCenter,
              userProfileCounselor || null,
              counselorId,
              userProfileOtherCounselor,
              hierarchyBrahmachariCounselor || null,
              entryIntroducedToKc || null,
              entryRounds,
              passwordHash,
              JSON.stringify(hierarchyObj)
            ]
          );

          // Asynchronously dispatch welcome email with login credentials
          sendCampDevoteeWelcomeAccountEmail({
            userEmail: entryEmail,
            userName: entryParticipantName,
            tempPassword: plainPassword,
            campTitle: camp.title,
            trackName: entryCampTrack,
            centerName: studentCenter,
            templeName: studentTemple,
            isExistingAccount: false
          }).catch((mailErr) => console.error('Failed to send welcome email to new student:', mailErr));
        } else {
          // B. Devotee ALREADY exists: Prevent duplicate account creation, send registration confirmation email
          const rawEntryRounds = entry.rounds !== undefined && entry.rounds !== null && entry.rounds !== ''
            ? parseInt(String(entry.rounds), 10)
            : null;
          const entryRounds = rawEntryRounds !== null && !isNaN(rawEntryRounds) ? rawEntryRounds : null;

          if (entryRounds !== null) {
            try {
              await query(
                `UPDATE users 
                 SET rounds = $1,
                     hierarchy = jsonb_set(COALESCE(hierarchy, '{}'::jsonb), '{rounds}', to_jsonb($1::int))
                 WHERE id = $2`,
                [entryRounds, userCheck.rows[0].id]
              );
            } catch (updRoundsErr) {
              console.warn('Could not update rounds for existing user:', updRoundsErr);
            }
          }

          if (userProfileCounselor) {
            try {
              await query(
                `UPDATE users 
                 SET counselor = COALESCE(NULLIF(counselor, ''), $1),
                     other_counselor = CASE WHEN $1 = 'Other' THEN COALESCE(NULLIF(other_counselor, ''), $2) ELSE other_counselor END,
                     brahmachari_counselor = COALESCE(NULLIF(brahmachari_counselor, ''), $3)
                 WHERE id = $4 AND (counselor IS NULL OR counselor = '' OR counselor = 'None')`,
                [userProfileCounselor, userProfileOtherCounselor, hierarchyBrahmachariCounselor, userCheck.rows[0].id]
              );
            } catch (updErr) {
              console.warn('Could not update counselor for existing user:', updErr);
            }
          }
          sendCampDevoteeWelcomeAccountEmail({
            userEmail: entryEmail,
            userName: userCheck.rows[0].name || entryParticipantName,
            campTitle: camp.title,
            trackName: entryCampTrack,
            centerName: studentCenter,
            templeName: studentTemple,
            isExistingAccount: true
          }).catch((mailErr) => console.error('Failed to send camp registration email to existing student:', mailErr));
        }
      } catch (accErr) {
        console.error('Non-blocking user account creation error:', accErr);
      }
    }

    // 4. Increment coupon used_count if a coupon was redeemed
    if (matchedCoupon && body.couponCode) {
      try {
        const cleanCode = String(body.couponCode).trim().toUpperCase();
        const updatedCoupons = (camp.special_waivers?.coupons || []).map((c: any) => {
          if (String(c.code).trim().toUpperCase() === cleanCode) {
            return {
              ...c,
              used_count: (Number(c.used_count) || 0) + 1
            };
          }
          return c;
        });
        const updatedSpecialWaivers = {
          ...camp.special_waivers,
          coupons: updatedCoupons
        };
        await query('UPDATE camps SET special_waivers = $1 WHERE id = $2', [
          JSON.stringify(updatedSpecialWaivers),
          campId
        ]);
      } catch (couponUpdateErr: any) {
        console.error('Non-blocking coupon usage increment error:', couponUpdateErr.message);
      }
    }

    // 5. Optional: Forward entries to Google Sheets webhook asynchronously if configured
    const sheetsWebhook = camp.payment_config?.sheets_webhook_url;
    if (sheetsWebhook) {
      try {
        const formattedData = insertedRecords.map((reg) => ({
          name: reg.participant_name,
          email: reg.email,
          phone: reg.whatsapp,
          event: reg.camp_track,
          gender: reg.gender,
          age: reg.age,
          counselorName: reg.counselor_name,
          firstMeal: `${reg.first_meal_date} - ${reg.first_meal_type}`,
          lastMeal: `${reg.last_meal_date} - ${reg.last_meal_type}`,
          accommodation: reg.accommodation,
          cost: reg.total_cost,
          paymentMethod: reg.payment_method,
          deductionSource: reg.deduction_source,
          passcode: reg.passcode,
          pocName: reg.poc_name,
          pocContact: reg.poc_contact,
          parentTemple: reg.parent_temple,
          voiceName: reg.voice_name,
          participantType: reg.participant_type,
          dinnerType: reg.dinner_type,
          marriedSinceYear: reg.married_since_year,
        }));

        const encodedData = encodeURIComponent(JSON.stringify(formattedData));
        const encodedRecipient = encodeURIComponent(email);
        fetch(`${sheetsWebhook}?data=${encodedData}&recipient=${encodedRecipient}`).catch((err) =>
          console.error('Non-blocking Google Sheets sync notice:', err.message)
        );
      } catch (sheetsErr) {
        console.error('Google Sheets forwarding error:', sheetsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: isPendingVerification
        ? `Registration recorded! Your ${paymentMethod} transfer details have been submitted and are pending verification.`
        : 'Camp registrations submitted successfully!',
      groupId,
      count: insertedRecords.length,
      paymentStatus,
      registrations: insertedRecords,
    });
  } catch (error: any) {
    console.error('Camp registration endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error processing registration' }, { status: 500 });
  }
}

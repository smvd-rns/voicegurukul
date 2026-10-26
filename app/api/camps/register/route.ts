import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { CampRegistration } from '@/types';

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

    // 3. Payment Verification
    if (paymentMethod === 'RAZORPAY') {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing online payment details' }, { status: 400 });
      }

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
    } else {
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    }

    // 3. Insert all devotee entries in batch with a shared group_id
    const groupId = `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const insertedRecords: any[] = [];
    const isItt = paymentMethod === 'INTER_TEMPLE_TRANSFER' || paymentMethod === 'ITT';
    const paymentStatus = isItt ? 'processing' : 'completed';
    const screenshotUrl = body.payment_screenshot_url || body.paymentScreenshotUrl || null;
    const transactionRef = body.transaction_ref || body.transactionRef || null;

    for (const entry of entries) {
      const entryPocName = entry.poc_name || entry.pocName || body.pocName || body.poc_name || 'Participant';
      const entryPocContact = entry.poc_contact || entry.pocContact || body.pocContact || body.poc_contact || entry.whatsapp || '';
      const entryEmail = entry.email || email || body.email || '';
      const entryParticipantName = entry.participant_name || entry.participantName || entryPocName;
      const entryWhatsapp = entry.whatsapp || entry.phone || entryPocContact;
      let entryParentTemple = entry.current_temple || entry.currentTemple || entry.parent_temple || entry.parentTemple || null;
      let entryVoiceName = entry.current_center || entry.currentCenter || entry.voice_name || entry.voiceName || null;
      let entryCounselorName = entry.counselor_name || entry.counselorName || null;

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

      const entryCurrentCenter = entryVoiceName || 'Central VOICE';
      const entryCurrentTemple = entryParentTemple || 'ISKCON NVCC • PUNE';

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
      const entryMealCost = Number(entry.meal_cost ?? entry.mealCost) || 0;
      const entryAccCost = Number(entry.acc_cost ?? entry.accCost) || 0;
      const entryAcCost = Number(entry.ac_cost ?? entry.acCost) || 0;
      const entryLateFee = Number(entry.late_fee ?? entry.lateFee) || 0;
      const entryEntryCost = Number(entry.entry_cost ?? entry.entryCost) || 0;
      const entryTotalCost = Number(entry.total_cost ?? entry.totalCost ?? entryEntryCost) || 0;

      const cleanCouponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
      let entryDiscountAmount = 0;
      if (paymentMethod === 'COUPON' || paymentMethod === 'ROLE_WAIVER' || paymentMethod === 'FREE') {
        entryDiscountAmount = entryTotalCost;
      } else if (body.discountAmount && Number(body.discountAmount) > 0) {
        entryDiscountAmount = Math.round(Number(body.discountAmount) / entries.length);
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
      message: 'Camp registrations submitted successfully!',
      groupId,
      count: insertedRecords.length,
      registrations: insertedRecords,
    });
  } catch (error: any) {
    console.error('Camp registration endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error processing registration' }, { status: 500 });
  }
}

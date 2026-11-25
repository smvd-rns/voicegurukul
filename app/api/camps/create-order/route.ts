import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { query } from '@/lib/db';
import { calculateDynamicCampCost } from '@/lib/camp-cost';
import { userHasEligibleRole } from '@/lib/utils/roles';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campId,
      amount,
      payerName,
      payerEmail,
      payerContact,
      entries,
      formData,
      website: clientWebsite
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // Verify camp exists and is active
    const campRes = await query('SELECT * FROM camps WHERE id = $1', [campId]);
    if (campRes.rows.length === 0) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 });
    }
    const camp = campRes.rows[0];
    if (camp.status !== 'active') {
      return NextResponse.json({
        error: `Registrations are not open for "${camp.title}" (Status: ${camp.status.toUpperCase()}). Payment cannot be accepted.`
      }, { status: 400 });
    }

    const now = new Date();
    if (camp.registration_start_date && now < new Date(camp.registration_start_date)) {
      return NextResponse.json({
        error: `Registrations for "${camp.title}" open on ${new Date(camp.registration_start_date).toLocaleDateString('en-IN')}. Payment cannot be accepted.`
      }, { status: 400 });
    }

    if (camp.registration_deadline && now > new Date(camp.registration_deadline)) {
      return NextResponse.json({
        error: `Registrations for "${camp.title}" closed on ${new Date(camp.registration_deadline).toLocaleDateString('en-IN')}. Payment cannot be accepted.`
      }, { status: 400 });
    }

    // --- Strict Anti-Tampering: Recompute true cost server-side ---
    const entriesList = Array.isArray(entries) && entries.length > 0 ? entries : [];
    if (entriesList.length === 0) {
      return NextResponse.json({ error: 'At least one participant entry is required to create a payment order.' }, { status: 400 });
    }

    // --- Strict Pre-flight Validation: Prevent charging Razorpay if any participant is ineligible ---
    const trackFees = camp.special_waivers?.track_fees || [];
    const eligibleCenters: string[] = Array.isArray(camp.eligible_centers) ? camp.eligible_centers : [];

    for (const entry of entriesList) {
      const entryName = entry.participant_name || entry.participantName || entry.poc_name || 'Participant';
      const entryTrack = (entry.camp_track || entry.campTrack || '').trim();
      const entryEmail = (entry.email || payerEmail || '').trim().toLowerCase();
      const rawPhone = String(entry.whatsapp || entry.phone || payerContact || '');
      const entryPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);

      if (entryTrack) {
        const trackFeeObj = trackFees.find((tf: any) => tf.track?.toLowerCase() === entryTrack.toLowerCase());

        // 1. Min rounds requirement
        const requiredMinRounds = trackFeeObj?.min_rounds ? Number(trackFeeObj.min_rounds) : 0;
        const entryRoundsNum = entry.rounds !== undefined && entry.rounds !== null && entry.rounds !== '' ? Number(entry.rounds) : 0;
        if (requiredMinRounds > 0 && entryRoundsNum < requiredMinRounds) {
          return NextResponse.json({
            error: `Participant "${entryName}" does not meet the chanting requirement for "${entryTrack}". Minimum ${requiredMinRounds} rounds required (Participant has ${entryRoundsNum} rounds). Payment cannot be initiated.`
          }, { status: 400 });
        }

        // 2. Sub-camp role restriction (e.g. Royal / manager tracks)
        if (trackFeeObj?.applicable_roles && Array.isArray(trackFeeObj.applicable_roles) && trackFeeObj.applicable_roles.length > 0) {
          let userRole = entry.role;
          let userRoyal = entry.royalMember !== undefined ? entry.royalMember : entry.royal_member;

          if (!userRole || userRoyal === undefined) {
            const userLookupParams: any[] = [];
            const userLookupConds: string[] = [];
            if (entryEmail) {
              userLookupParams.push(entryEmail);
              userLookupConds.push(`LOWER(email) = $${userLookupParams.length}`);
            }
            if (entryPhone) {
              userLookupParams.push(entryPhone);
              userLookupConds.push(`RIGHT(phone, 10) = $${userLookupParams.length}`);
            }
            if (userLookupConds.length > 0) {
              const uRes = await query(
                `SELECT role, royal_member, hierarchy FROM users WHERE ${userLookupConds.join(' OR ')} LIMIT 1`,
                userLookupParams
              );
              if (uRes.rows.length > 0) {
                const u = uRes.rows[0];
                if (!userRole) userRole = u.role;
                if (userRoyal === undefined) {
                  userRoyal = Boolean(
                    u.royal_member === 'yes' ||
                    u.royal_member === true ||
                    u.hierarchy?.royalMember === 'yes' ||
                    u.hierarchy?.royalMember === true ||
                    u.hierarchy?.royal_member === 'yes' ||
                    u.hierarchy?.royal_member === true
                  );
                }
              }
            }
          }

          const hasAccess = userHasEligibleRole(userRole, userRoyal, trackFeeObj.applicable_roles);
          if (!hasAccess) {
            return NextResponse.json({
              error: `The "${entryTrack}" sub-camp is restricted to specific roles (${trackFeeObj.applicable_roles.join(', ')}). Participant "${entryName}" does not have an eligible role. Payment cannot be initiated.`
            }, { status: 400 });
          }
        }

        // 3. Center-based restriction
        if (eligibleCenters.length > 0) {
          const entryCenter = String(entry.voice_name || entry.voiceName || entry.center || '').trim();
          const isMatch = eligibleCenters.some((c) =>
            c.trim().toLowerCase() === entryCenter.toLowerCase() ||
            entryCenter.toLowerCase().includes(c.trim().toLowerCase()) ||
            c.trim().toLowerCase().includes(entryCenter.toLowerCase())
          );
          if (!isMatch) {
            return NextResponse.json({
              error: `Registration for "${camp.title}" is restricted to devotees from: ${eligibleCenters.join(', ')}. Participant "${entryName}" has center "${entryCenter || 'Unspecified'}" which is not eligible. Payment cannot be initiated.`
            }, { status: 400 });
          }
        }
      }
    }

    const isLate = Boolean(
      (Number(camp.late_fee) > 0 && camp.late_fee_start_date && now >= new Date(camp.late_fee_start_date)) ||
      (camp.late_fee_config?.enabled && camp.late_fee_config?.start_date && now >= new Date(camp.late_fee_config.start_date))
    );

    let serverBaseTotal = 0;
    for (const entry of entriesList) {
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

    // Validate coupon code against camp configuration if provided
    let serverDiscount = 0;
    const requestedCoupon = formData?.couponCode || body.couponCode;
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
    const serverExpectedTotal = netCampFee + surchargeAmount;

    // Reject underpayment / tampering attempts immediately (allowing ₹1 tolerance for integer rounding)
    if (Number(amount) < serverExpectedTotal - 1) {
      return NextResponse.json({
        error: `Security Alert: Invalid payment amount detected. Expected ₹${serverExpectedTotal}, but client requested ₹${amount}. Order creation blocked.`
      }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay payment gateway not configured' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Razorpay amount MUST always be the server-calculated verified amount
    const amountInPaise = Math.round(serverExpectedTotal * 100);

    // Resolve full website URL with public slug
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'voicegurukul.com';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const fallbackWebsite = `${proto}://${host}/camps/${camp.slug}`;
    const resolvedWebsite = clientWebsite || fallbackWebsite;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `camp_${Date.now()}`,
      notes: {
        payment_for: String(camp.title || '').substring(0, 100),
        website: String(resolvedWebsite || '').substring(0, 120),
        payer_name: String(payerName || '').substring(0, 100),
        payer_email: String(payerEmail || '').substring(0, 100),
        payer_contact: String(payerContact || '').substring(0, 50),
        camp_id: String(camp.id || ''),
      },
    });

    // Record order attempt and store devotee entries in camp_payment_orders
    try {
      await query(
        `INSERT INTO camp_payment_orders (
          order_id, camp_id, amount, currency,
          payer_name, payer_email, payer_contact,
          entries_payload, form_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (order_id) DO UPDATE SET
          amount = EXCLUDED.amount,
          payer_name = EXCLUDED.payer_name,
          payer_email = EXCLUDED.payer_email,
          payer_contact = EXCLUDED.payer_contact,
          entries_payload = EXCLUDED.entries_payload,
          form_data = EXCLUDED.form_data,
          updated_at = NOW()`,
        [
          order.id,
          camp.id,
          Number(serverExpectedTotal),
          'INR',
          payerName || null,
          payerEmail || null,
          payerContact || null,
          JSON.stringify(Array.isArray(entries) ? entries : []),
          JSON.stringify(formData || {}),
          'created'
        ]
      );
    } catch (dbErr) {
      console.error('Failed to log camp payment order:', dbErr);
    }

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error: any) {
    console.error('Camp order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment order' }, { status: 500 });
  }
}

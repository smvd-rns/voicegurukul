import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, donorName, donorEmail, donorMobile, donorAddress, donorPan, targetUserId, center, temple, ashram } = body;

    if (!amount || !donorName || !donorEmail || !donorMobile || !targetUserId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment gateway configuration is missing on server.' 
      }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });

    // Resolve collector's parent center and parent temple from DB
    let finalCenter = center || null;
    let finalTemple = temple || null;

    const sadhanaDb = getSadhanaAdminClient();

    if (targetUserId) {
      try {
        const { data: collectorUser } = await sadhanaDb
          .from('users')
          .select('parent_center, other_parent_center, parent_temple, other_parent_temple')
          .eq('id', targetUserId)
          .single();

        if (collectorUser) {
          let resolvedParentCenter = 'None';
          if (collectorUser.parent_center && collectorUser.parent_center !== 'None' && collectorUser.parent_center !== 'General') {
            if (collectorUser.parent_center === 'Other') {
              resolvedParentCenter = collectorUser.other_parent_center ? collectorUser.other_parent_center.trim() : 'Other';
            } else {
              resolvedParentCenter = collectorUser.parent_center.trim();
            }
          }

          let resolvedParentTemple = 'None';
          if (collectorUser.parent_temple && collectorUser.parent_temple !== 'None' && collectorUser.parent_temple !== 'General') {
            if (collectorUser.parent_temple === 'Other') {
              resolvedParentTemple = collectorUser.other_parent_temple ? collectorUser.other_parent_temple.trim() : 'Other';
            } else {
              resolvedParentTemple = collectorUser.parent_temple.trim();
            }
          }

          finalCenter = resolvedParentCenter;
          finalTemple = resolvedParentTemple;
        }
      } catch (err) {
        console.error('Error resolving collector parent center/temple:', err);
      }
    }

    // 1. Create Razorpay Order
    const options = {
      amount: Math.round(parseFloat(amount) * 100), // convert to paise
      currency: "INR",
      receipt: `RCPT_${Date.now()}_${targetUserId.substring(0,5)}`,
      notes: {
        donor_name: donorName,
        donor_email: donorEmail,
        donor_mobile: donorMobile,
        donor_address: donorAddress || "",
        donor_pan: donorPan || "",
        target_user_id: targetUserId,
        center: finalCenter || "",
        temple: finalTemple || "",
        ashram: ashram || ""
      }
    };
    const order = await razorpay.orders.create(options);

    // 2. Save pending donation to Supabase
    const donationData = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      donor_name: donorName,
      donor_email: donorEmail,
      donor_mobile: donorMobile,
      donor_address: donorAddress || null,
      donor_pan: donorPan || null,
      amount: parseFloat(amount),
      payment_status: 'pending',
      payment_method: 'Razorpay',
      txnid: order.id, // Store Razorpay Order ID as our internal transaction ID
      tag_user_id: targetUserId,
      center: finalCenter || null,
      temple: finalTemple || null,
      ashram: ashram || null,
      metadata: {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        order_receipt: options.receipt
      }
    };

    const { error: dbError } = await sadhanaDb
      .from('donations')
      .insert([donationData]);

    if (dbError) {
      console.error('Failed to create pending donation record:', dbError);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      orderId: order.id, 
      amount: options.amount,
      keyId: razorpayKeyId
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

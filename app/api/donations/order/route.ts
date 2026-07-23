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

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });

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
        center: center || "",
        temple: temple || "",
        ashram: ashram || ""
      }
    };
    const order = await razorpay.orders.create(options);

    // 2. Save pending donation to Supabase
    const sadhanaDb = getSadhanaAdminClient();
    const donationData = {
      id: crypto.randomUUID(),
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
      center: center || null,
      temple: temple || null,
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

    return NextResponse.json({ success: true, orderId: order.id, amount: options.amount });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

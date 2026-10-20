import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing payment metadata' }, { status: 400 });
    }

    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not configured on server');
      return NextResponse.json({ success: false, error: 'Payment gateway configuration error' }, { status: 500 });
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Update Database to 'captured'
    const sadhanaDb = getSadhanaAdminClient();
    const { error } = await sadhanaDb
      .from('donations')
      .update({ 
        payment_status: 'captured', 
        payment_id: razorpay_payment_id 
      })
      .eq('txnid', razorpay_order_id)
      .eq('payment_status', 'pending'); // Prevent overwriting refunded/failed status
      
    if (error) {
      console.error('Failed to update donation to captured:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Verification error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

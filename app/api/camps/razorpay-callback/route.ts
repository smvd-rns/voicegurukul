import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { autoCompleteCampOrderRegistration } from '@/lib/camps/auto-register';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    let paymentId = formData?.get('razorpay_payment_id')?.toString();
    let orderId = formData?.get('razorpay_order_id')?.toString();
    let signature = formData?.get('razorpay_signature')?.toString();

    // Fallback to URL search params if needed
    if (!paymentId || !orderId) {
      const url = new URL(req.url);
      paymentId = url.searchParams.get('razorpay_payment_id') || paymentId;
      orderId = url.searchParams.get('razorpay_order_id') || orderId;
      signature = url.searchParams.get('razorpay_signature') || signature;
    }

    if (!orderId) {
      return NextResponse.redirect(new URL('/camps', req.url));
    }

    // Lookup camp slug
    const orderRes = await query(
      `SELECT o.camp_id, c.slug, o.status, o.booking_status
       FROM camp_payment_orders o
       LEFT JOIN camps c ON c.id = o.camp_id
       WHERE o.order_id = $1 LIMIT 1`,
      [orderId]
    );

    const campSlug = orderRes.rows[0]?.slug || '';
    const redirectBase = campSlug ? `/camps/${campSlug}` : '/camps';

    // Cryptographic security check: Require valid Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret) {
      if (!signature || !paymentId) {
        console.warn(`[Razorpay Callback Security] Rejected unsigned payment callback for order ${orderId}`);
        return NextResponse.redirect(new URL(`${redirectBase}?payment_error=missing_credentials`, req.url));
      }

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error(`[Razorpay Callback Security] Signature mismatch for order ${orderId}`);
        return NextResponse.redirect(new URL(`${redirectBase}?payment_error=signature_mismatch`, req.url));
      }
    }

    // Auto-complete registration on the server
    const autoRes = await autoCompleteCampOrderRegistration(orderId, paymentId);
    console.log(`[Razorpay Callback] Auto-complete result for ${orderId}:`, autoRes);

    if (autoRes.underpaid) {
      return NextResponse.redirect(new URL(`${redirectBase}?payment_error=underpaid`, req.url));
    }

    return NextResponse.redirect(new URL(`${redirectBase}?payment_success=true&order_id=${encodeURIComponent(orderId)}`, req.url));
  } catch (error: any) {
    console.error('[Razorpay Callback] Error processing callback:', error);
    return NextResponse.redirect(new URL('/camps?payment_error=processing_failed', req.url));
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}


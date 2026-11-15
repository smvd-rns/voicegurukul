import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      orderId,
      paymentId,
      status, // 'failed' | 'attempted'
      errorCode,
      errorMessage,
    } = await req.json();

    if (!orderId && !paymentId) {
      return NextResponse.json({ error: 'Order ID or Payment ID is required' }, { status: 400 });
    }

    if (orderId) {
      await query(
        `UPDATE camp_payment_orders 
         SET 
           status = COALESCE($1, status),
           payment_id = COALESCE($2, payment_id),
           error_code = COALESCE($3, error_code),
           error_message = COALESCE($4, error_message),
           updated_at = NOW()
         WHERE order_id = $5`,
        [status || 'failed', paymentId || null, errorCode || null, errorMessage || null, orderId]
      );
    } else if (paymentId) {
      await query(
        `UPDATE camp_payment_orders 
         SET 
           status = COALESCE($1, status),
           error_code = COALESCE($2, error_code),
           error_message = COALESCE($3, error_message),
           updated_at = NOW()
         WHERE payment_id = $4`,
        [status || 'failed', errorCode || null, errorMessage || null, paymentId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in record-payment-attempt:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


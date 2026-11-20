import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import { query } from '@/lib/db';
import { sendDonationCapturedEmails } from '@/lib/utils/email';
import { autoCompleteCampOrderRegistration } from '@/lib/camps/auto-register';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    
    // Use Key Secret if user hasn't set an explicit Webhook Secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return NextResponse.json({ success: false, error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const paymentId = payment?.id;

      if (!orderId) {
        return NextResponse.json({ success: true, message: 'No order_id, ignored' });
      }

      // Check if this belongs to camps
      try {
        const campOrderRes = await query(
          'SELECT * FROM camp_payment_orders WHERE order_id = $1 LIMIT 1',
          [orderId]
        );

        if (campOrderRes.rows.length > 0) {
          const campOrder = campOrderRes.rows[0];
          const paidPaise = Number(payment?.amount) || 0;
          const expectedPaise = Math.round(Number(campOrder.amount) * 100);

          // Anti-Tampering: Underpayment guard
          if (paidPaise < expectedPaise - 100) {
            console.warn(`[Camp Razorpay Webhook] Security Alert: Underpayment detected for order ${orderId}! Expected: ${expectedPaise}, Paid: ${paidPaise}`);
            await query(
              `UPDATE camp_payment_orders 
               SET status = 'underpaid_flagged', payment_id = $1, error_message = $2, updated_at = NOW() 
               WHERE order_id = $3`,
              [paymentId, `Underpayment alert: received ₹${(paidPaise / 100).toFixed(2)}, expected ₹${Number(campOrder.amount).toFixed(2)}`, orderId]
            );
            return NextResponse.json({ success: false, error: 'Underpayment flagged' }, { status: 400 });
          }

          // Check if registration already completed
          const regRes = await query(
            'SELECT id FROM camp_registrations WHERE payment_id = $1 OR order_id = $2 LIMIT 1',
            [paymentId, orderId]
          );

          if (regRes.rows.length > 0) {
            // Already created by browser callback
            await query(
              `UPDATE camp_payment_orders 
               SET status = 'registration_completed', payment_id = $1, updated_at = NOW() 
               WHERE order_id = $2`,
              [paymentId, orderId]
            );
            console.log(`[Camp Razorpay Webhook] Camp order ${orderId} already registered. Marked completed.`);
            return NextResponse.json({ success: true, type: 'camp_order', status: 'registration_completed' });
          }

          // If registration was NOT created by browser (e.g. devotee app-switched to PhonePe/GPay on mobile):
          // Auto-create the registration immediately from the verified camp_payment_orders payload!
          console.log(`[Camp Razorpay Webhook] Registration not yet created by browser for order ${orderId} (mobile app switch). Auto-completing booking now...`);
          const autoRes = await autoCompleteCampOrderRegistration(orderId, paymentId);
          console.log(`[Camp Razorpay Webhook] Auto-registration result for ${orderId}:`, autoRes);

          return NextResponse.json({
            success: true,
            type: 'camp_order',
            status: 'registration_completed',
            autoRegistered: autoRes.success
          });
        }
      } catch (campErr) {
        console.error('[Razorpay Webhook] Error updating camp payment order:', campErr);
      }

      const sadhanaDb = getSadhanaAdminClient();
      
      // Update donation status to captured
      const { error } = await sadhanaDb
        .from('donations')
        .update({
          payment_status: 'captured',
          payment_id: paymentId,
        })
        .eq('txnid', orderId);

      if (error) {
        console.error('Webhook DB update error:', error);
      } else {
        sendDonationCapturedEmails(orderId, paymentId).catch(e => {
          console.error('[Razorpay Webhook] Error triggering donation captured emails:', e);
        });
      }
    } else if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const paymentId = payment?.id;

      if (orderId || paymentId) {
        try {
          await query(
            `UPDATE camp_payment_orders 
             SET 
               status = 'failed',
               payment_id = COALESCE($1, payment_id),
               error_code = $2,
               error_message = $3,
               updated_at = NOW()
             WHERE order_id = $4 OR payment_id = $1`,
            [
              paymentId || null,
              payment?.error_code || null,
              payment?.error_description || payment?.error_reason || 'Payment failed',
              orderId || null
            ]
          );
          console.log(`[Camp Razorpay Webhook] Payment failed for ${paymentId || orderId}: ${payment?.error_description}`);
        } catch (failErr) {
          console.error('[Razorpay Webhook] Error recording failed payment:', failErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import { query } from '@/lib/db';
import { sendDonationCapturedEmails } from '@/lib/utils/email';
import { autoCompleteCampOrderRegistration } from '@/lib/camps/auto-register';

const UNDERPAY_TOLERANCE_PAISE = 100; // ₹1 rounding only

function extractCampPayment(event: any): { orderId?: string; paymentId?: string; paidPaise: number; status?: string } {
  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;

  // payment.captured / payment.authorized — payment entity is primary
  if (payment?.order_id || payment?.id) {
    return {
      orderId: payment.order_id || order?.id,
      paymentId: payment.id,
      paidPaise: Number(payment.amount) || 0,
      status: payment.status,
    };
  }

  // order.paid — may only have order entity; payment may be nested differently
  if (order?.id) {
    return {
      orderId: order.id,
      paymentId: undefined,
      paidPaise: Number(order.amount) || 0,
      status: order.status,
    };
  }

  return { paidPaise: 0 };
}

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

    if (event.event === 'payment.captured' || event.event === 'order.paid' || event.event === 'payment.authorized') {
      const { orderId, paymentId, paidPaise } = extractCampPayment(event);

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
          const expectedPaise = Math.round(Number(campOrder.amount) * 100);

          // Persist capture FIRST so mobile recovery can find this order even if auto-register fails momentarily
          if (paymentId) {
            await query(
              `UPDATE camp_payment_orders
               SET payment_id = COALESCE($1, payment_id),
                   status = CASE
                     WHEN status IN ('registration_completed', 'underpaid_flagged') THEN status
                     ELSE 'captured'
                   END,
                   updated_at = NOW()
               WHERE order_id = $2`,
              [paymentId, orderId]
            );
          }

          // Anti-Tampering: Underpayment guard — NEVER auto-create booking for less payment
          if (paidPaise > 0 && paidPaise < expectedPaise - UNDERPAY_TOLERANCE_PAISE) {
            console.warn(`[Camp Razorpay Webhook] Security Alert: Underpayment detected for order ${orderId}! Expected: ${expectedPaise}, Paid: ${paidPaise}`);
            await query(
              `UPDATE camp_payment_orders
               SET status = 'underpaid_flagged', payment_id = COALESCE($1, payment_id), error_message = $2, updated_at = NOW()
               WHERE order_id = $3`,
              [paymentId, `Underpayment alert: received ₹${(paidPaise / 100).toFixed(2)}, expected ₹${Number(campOrder.amount).toFixed(2)}`, orderId]
            );
            // 200 so Razorpay does not retry; booking intentionally NOT created
            return NextResponse.json({ success: true, type: 'camp_order', status: 'underpaid_flagged', blocked: true });
          }

          // Check if registration already completed
          const regRes = await query(
            'SELECT id FROM camp_registrations WHERE payment_id = $1 OR order_id = $2 LIMIT 1',
            [paymentId || '', orderId]
          );

          if (regRes.rows.length > 0) {
            await query(
              `UPDATE camp_payment_orders
               SET status = 'registration_completed', booking_status = 'confirmed', payment_id = COALESCE($1, payment_id), updated_at = NOW()
               WHERE order_id = $2`,
              [paymentId, orderId]
            );
            console.log(`[Camp Razorpay Webhook] Camp order ${orderId} already registered. Marked completed.`);
            return NextResponse.json({ success: true, type: 'camp_order', status: 'registration_completed' });
          }

          // Mobile UPI app-switch case: browser handler never ran — auto-create booking now
          console.log(`[Camp Razorpay Webhook] Registration not yet created by browser for order ${orderId} (mobile app switch). Auto-completing booking now...`);
          const autoRes = await autoCompleteCampOrderRegistration(orderId, paymentId);
          console.log(`[Camp Razorpay Webhook] Auto-registration result for ${orderId}:`, autoRes);

          if (autoRes.underpaid) {
            return NextResponse.json({ success: true, type: 'camp_order', status: 'underpaid_flagged', blocked: true });
          }

          if (!autoRes.success && !autoRes.alreadyRegistered) {
            // Ask Razorpay to retry shortly — payment is already marked captured for client-side recovery
            console.error(`[Camp Razorpay Webhook] Auto-register failed for ${orderId}: ${autoRes.error}`);
            return NextResponse.json(
              { success: false, type: 'camp_order', status: 'captured_pending_registration', error: autoRes.error },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            type: 'camp_order',
            status: 'registration_completed',
            autoRegistered: true,
            groupId: autoRes.groupId,
          });
        }
      } catch (campErr) {
        console.error('[Razorpay Webhook] Error updating camp payment order:', campErr);
        // Retryable — client recovery still works once payment_id is persisted on a later attempt
        return NextResponse.json({ success: false, error: 'Camp webhook processing error' }, { status: 500 });
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

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { campId, amount, payerName, website: clientWebsite } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // Verify camp exists and is active
    const campRes = await query('SELECT id, status, title, slug FROM camps WHERE id = $1', [campId]);
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

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay payment gateway not configured' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaise = Math.round(Number(amount) * 100);

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
      },
    });

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

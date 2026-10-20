import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const easebuzzSalt = process.env.EASEBUZZ_SALT;
    const easebuzzKey = process.env.EASEBUZZ_KEY;

    if (!easebuzzSalt || !easebuzzKey) {
      console.error('Easebuzz webhook secrets not configured');
      return NextResponse.json({ success: false, error: 'Webhook configuration error' }, { status: 500 });
    }

    const status = formData.get('status') as string;
    const txnid = formData.get('txnid') as string;
    const amount = formData.get('amount') as string;
    const productinfo = formData.get('productinfo') as string;
    const firstname = formData.get('firstname') as string;
    const email = formData.get('email') as string;
    const paymentId = formData.get('easepayid') as string;
    const hash = formData.get('hash') as string;

    const hashString = `${easebuzzSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${easebuzzKey}`;
    const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    if (hash !== generatedHash) {
      console.error('Easebuzz Webhook Hash mismatch! Potential payload forgery.');
      return NextResponse.json({ success: false, error: 'Invalid Hash Signature' }, { status: 400 });
    }

    const sadhanaDb = getSadhanaAdminClient();

    if (status === 'success') {
      await sadhanaDb
        .from('donations')
        .update({ 
          payment_status: 'captured', 
          payment_id: paymentId,
          metadata: { webhook_received: true, timestamp: new Date().toISOString() }
        })
        .eq('txnid', txnid);
    } else {
      await sadhanaDb
        .from('donations')
        .update({ payment_status: 'failed' })
        .eq('txnid', txnid)
        .eq('payment_status', 'pending');
    }

    return NextResponse.json({ success: true, message: 'Webhook Processed' });

  } catch (error: any) {
    console.error('Easebuzz Webhook error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

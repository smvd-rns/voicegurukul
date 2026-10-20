import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';

export async function POST(req: Request) {
  try {
    // Easebuzz POSTs form data back to the SURL/FURL
    const formData = await req.formData();
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    
    const easebuzzSalt = process.env.EASEBUZZ_SALT;
    const easebuzzKey = process.env.EASEBUZZ_KEY;
    
    if (!easebuzzSalt || !easebuzzKey) {
      console.error('Easebuzz secrets not configured');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/?mode=error&message=gateway_config_error`, 303);
    }
    
    const status = formData.get('status') as string;
    const txnid = formData.get('txnid') as string;
    const amount = formData.get('amount') as string;
    const productinfo = formData.get('productinfo') as string;
    const firstname = formData.get('firstname') as string;
    const email = formData.get('email') as string;
    const paymentId = formData.get('easepayid') as string;
    const hash = formData.get('hash') as string;

    // Verify reverse hash from Easebuzz
    // Format: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const hashString = `${easebuzzSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${easebuzzKey}`;
    const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    if (hash !== generatedHash) {
      console.error('Easebuzz Hash mismatch! Potential tampering.');
      // Still redirect to UI but with failure
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/donate/${slug}?mode=error&message=security_failed`, 303);
    }

    const sadhanaDb = getSadhanaAdminClient();

    if (status === 'success') {
      // Update DB to captured
      await sadhanaDb
        .from('donations')
        .update({ payment_status: 'captured', payment_id: paymentId })
        .eq('txnid', txnid)
        .eq('payment_status', 'pending');
        
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/donate/${slug}?mode=success`, 303);
    } else {
      // payment failed or user cancelled
      await sadhanaDb
        .from('donations')
        .update({ payment_status: 'failed', metadata: Object.fromEntries(formData.entries()) })
        .eq('txnid', txnid)
        .eq('payment_status', 'pending');
        
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/donate/${slug}?mode=error&message=payment_failed`, 303);
    }

  } catch (error) {
    console.error('Easebuzz verification handler broke:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/`, 303);
  }
}

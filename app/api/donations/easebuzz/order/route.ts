import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, donorName, donorEmail, donorMobile, donorAddress, donorPan, targetUserId, slug, center, temple, ashram } = body;

    const easebuzzKey = process.env.EASEBUZZ_KEY;
    const easebuzzSalt = process.env.EASEBUZZ_SALT;
    const env = process.env.EASEBUZZ_ENV || 'test';

    // Fail gracefully if keys aren't added yet
    if (!easebuzzKey || !easebuzzSalt || easebuzzKey === 'your_key_here') {
      return NextResponse.json({ success: false, error: 'Easebuzz Gateway is currently inactive (Missing Credentials in .env.local)' }, { status: 400 });
    }

    const txnid = `EBD_${Date.now()}_${targetUserId.substring(0, 5)}`;
    const productInfo = `Donation via ${slug}`;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const surl = `${baseUrl}/api/donations/easebuzz/verify?status=success&slug=${slug}`;
    const furl = `${baseUrl}/api/donations/easebuzz/verify?status=failed&slug=${slug}`;

    // Easebuzz strict hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const formatAmount = parseFloat(amount).toFixed(2); // strictly requires 2 decimals
    const udf1 = donorAddress || "";
    const udf2 = donorPan || "";
    const udf3 = slug || "";
    const udf4 = targetUserId || "";
    const hashString = `${easebuzzKey}|${txnid}|${formatAmount}|${productInfo}|${donorName}|${donorEmail}|${udf1}|${udf2}|${udf3}|${udf4}|||||||${easebuzzSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // 1. Create Pending DB Record first
    const sadhanaDb = getSadhanaAdminClient();
    const { error: dbError } = await sadhanaDb.from('donations').insert([{
      id: crypto.randomUUID(),
      donor_name: donorName,
      donor_email: donorEmail,
      donor_mobile: donorMobile,
      donor_address: donorAddress || null,
      donor_pan: donorPan || null,
      amount: parseFloat(amount),
      payment_status: 'pending',
      payment_method: 'Easebuzz',
      txnid: txnid,
      tag_user_id: targetUserId,
      center: center || null,
      temple: temple || null,
      ashram: ashram || null,
      metadata: { environment: env, created_at: new Date().toISOString() }
    }]);

    if (dbError) throw dbError;

    // 2. Call Easebuzz S2S /payment/initiateLink API
    const endpoint = env === 'prod' ? 'https://pay.easebuzz.in/payment/initiateLink' : 'https://testpay.easebuzz.in/payment/initiateLink';
    
    // Easebuzz requires x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('key', easebuzzKey);
    formData.append('txnid', txnid);
    formData.append('amount', formatAmount);
    formData.append('productinfo', productInfo);
    formData.append('firstname', donorName);
    formData.append('phone', donorMobile);
    formData.append('email', donorEmail);
    formData.append('surl', surl);
    formData.append('furl', furl);
    formData.append('hash', hash);
    formData.append('udf1', udf1);
    formData.append('udf2', udf2);
    formData.append('udf3', udf3);
    formData.append('udf4', udf4);
    formData.append('common_page_url', `${baseUrl}/api/webhooks/easebuzz`);

    const initRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const initData = await initRes.json();

    if (initData.status === 1) {
      // Success, easebuzz returns the access_key
      const paymentUrl = env === 'prod' 
        ? `https://pay.easebuzz.in/pay/${initData.data}`
        : `https://testpay.easebuzz.in/pay/${initData.data}`;
        
      return NextResponse.json({ success: true, paymentUrl });
    } else {
      throw new Error(initData.data || 'Failed to initiate Easebuzz payment');
    }

  } catch (error: any) {
    console.error('Easebuzz init error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';

export async function POST(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
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
    const productInfo = `Donation via ${body.collectorName || slug}`;
    const surl = `${baseUrl}/api/donations/easebuzz/verify?status=success&slug=${slug}`;
    const furl = `${baseUrl}/api/donations/easebuzz/verify?status=failed&slug=${slug}`;

    const hostHeader = req.headers.get('host') || '';
    const detectedWebsite = body.website || hostHeader || 'voicegurukul.com';
    const detectedUrl = body.websiteUrl || '';

    // Easebuzz strict hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const formatAmount = parseFloat(amount).toFixed(2); // strictly requires 2 decimals
    const udf1 = donorAddress || "";
    const udf2 = donorPan || "";
    const udf3 = slug || "";
    const udf4 = targetUserId || "";
    const udf5 = body.paymentFor || "Donation";
    const hashString = `${easebuzzKey}|${txnid}|${formatAmount}|${productInfo}|${donorName}|${donorEmail}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${easebuzzSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // Resolve collector details from DB
    let collectorName = body.collectorName || '';
    let collectorEmail = body.collectorEmail || '';
    let collectorMobile = body.collectorMobile || '';
    let resolvedParentCenter = body.parentCenter || 'None';
    let resolvedParentTemple = body.parentTemple || 'None';
    let resolvedCurrentCenter = body.currentCenter || 'None';
    let resolvedCurrentTemple = body.currentTemple || 'None';
    let collectorAshram = ashram || body.ashram || 'N/A';

    const sadhanaDb = getSadhanaAdminClient();

    if (targetUserId) {
      try {
        const { data: collectorUser } = await sadhanaDb
          .from('users')
          .select('name, email, phone, donation_slug, parent_center, other_parent_center, parent_temple, other_parent_temple, current_center, other_center, current_temple, other_temple, center, ashram')
          .eq('id', targetUserId)
          .single();

        if (collectorUser) {
          if (collectorUser.name) collectorName = collectorUser.name;
          if (collectorUser.email) collectorEmail = collectorUser.email;
          if (collectorUser.phone) collectorMobile = collectorUser.phone;
          if (collectorUser.ashram) collectorAshram = collectorUser.ashram;

          // Parent Center
          if (collectorUser.parent_center && collectorUser.parent_center !== 'None' && collectorUser.parent_center !== 'General') {
            resolvedParentCenter = (collectorUser.parent_center === 'Other' && collectorUser.other_parent_center)
              ? collectorUser.other_parent_center.trim()
              : collectorUser.parent_center.trim();
          }

          // Parent Temple
          if (collectorUser.parent_temple && collectorUser.parent_temple !== 'None' && collectorUser.parent_temple !== 'General') {
            resolvedParentTemple = (collectorUser.parent_temple === 'Other' && collectorUser.other_parent_temple)
              ? collectorUser.other_parent_temple.trim()
              : collectorUser.parent_temple.trim();
          }

          // Current Center
          if (collectorUser.current_center && collectorUser.current_center !== 'None' && collectorUser.current_center !== 'General') {
            resolvedCurrentCenter = (collectorUser.current_center === 'Other' && collectorUser.other_center)
              ? collectorUser.other_center.trim()
              : collectorUser.current_center.trim();
          } else if (collectorUser.center && collectorUser.center !== 'None') {
            resolvedCurrentCenter = collectorUser.center.trim();
          }

          // Current Temple
          if (collectorUser.current_temple && collectorUser.current_temple !== 'None' && collectorUser.current_temple !== 'General') {
            resolvedCurrentTemple = (collectorUser.current_temple === 'Other' && collectorUser.other_temple)
              ? collectorUser.other_temple.trim()
              : collectorUser.current_temple.trim();
          }
        }
      } catch (err) {
        console.error('Error resolving collector info for Easebuzz:', err);
      }
    }

    const primaryCenter = resolvedParentCenter !== 'None' ? resolvedParentCenter : (resolvedCurrentCenter !== 'None' ? resolvedCurrentCenter : null);
    const primaryTemple = resolvedParentTemple !== 'None' ? resolvedParentTemple : (resolvedCurrentTemple !== 'None' ? resolvedCurrentTemple : null);

    // 1. Create Pending DB Record first
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
      center: primaryCenter,
      temple: primaryTemple,
      ashram: collectorAshram !== 'N/A' ? collectorAshram : null,
      metadata: {
        payment_for: body.paymentFor || 'Donation',
        category: 'Donation',
        website: detectedWebsite,
        website_url: detectedUrl,
        collector: {
          id: targetUserId,
          name: collectorName,
          email: collectorEmail,
          mobile: collectorMobile,
          slug: slug,
          parent_center: resolvedParentCenter,
          parent_temple: resolvedParentTemple,
          current_center: resolvedCurrentCenter,
          current_temple: resolvedCurrentTemple,
          ashram: collectorAshram
        },
        donor: {
          name: donorName,
          email: donorEmail,
          mobile: donorMobile,
          address: donorAddress || null,
          pan: donorPan || null
        },
        environment: env,
        created_at: new Date().toISOString()
      }
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

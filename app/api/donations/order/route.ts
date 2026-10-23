import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      amount, 
      donorName, 
      donorEmail, 
      donorMobile, 
      donorAddress, 
      donorPan, 
      targetUserId,
      collectorSlug,
      paymentFor = 'Donation',
      website: clientWebsite,
      websiteUrl: clientWebsiteUrl
    } = body;

    if (!amount || !donorName || !donorEmail || !donorMobile || !targetUserId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment gateway configuration is missing on server.' 
      }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });

    // Detect calling website origin / domain
    const hostHeader = req.headers.get('host') || '';
    const originHeader = req.headers.get('origin') || '';
    const refererHeader = req.headers.get('referer') || '';
    const detectedWebsite = clientWebsite || hostHeader || 'voicegurukul.com';
    const detectedUrl = clientWebsiteUrl || refererHeader || originHeader || '';

    // Collector details defaults from body
    let collectorName = body.collectorName || '';
    let collectorEmail = body.collectorEmail || '';
    let collectorMobile = body.collectorMobile || '';
    let collectorSlugValue = collectorSlug || body.slug || '';
    let resolvedParentCenter = body.parentCenter || 'None';
    let resolvedParentTemple = body.parentTemple || 'None';
    let resolvedCurrentCenter = body.currentCenter || 'None';
    let resolvedCurrentTemple = body.currentTemple || 'None';
    let collectorAshram = body.ashram || 'N/A';

    const sadhanaDb = getSadhanaAdminClient();

    // Query comprehensive collector information from primary DB
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
          if (collectorUser.donation_slug) collectorSlugValue = collectorUser.donation_slug;
          if (collectorUser.ashram) collectorAshram = collectorUser.ashram;

          // 1. Resolve Parent Center
          if (collectorUser.parent_center && collectorUser.parent_center !== 'None' && collectorUser.parent_center !== 'General') {
            resolvedParentCenter = (collectorUser.parent_center === 'Other' && collectorUser.other_parent_center)
              ? collectorUser.other_parent_center.trim()
              : collectorUser.parent_center.trim();
          }

          // 2. Resolve Parent Temple
          if (collectorUser.parent_temple && collectorUser.parent_temple !== 'None' && collectorUser.parent_temple !== 'General') {
            resolvedParentTemple = (collectorUser.parent_temple === 'Other' && collectorUser.other_parent_temple)
              ? collectorUser.other_parent_temple.trim()
              : collectorUser.parent_temple.trim();
          }

          // 3. Resolve Current Center
          if (collectorUser.current_center && collectorUser.current_center !== 'None' && collectorUser.current_center !== 'General') {
            resolvedCurrentCenter = (collectorUser.current_center === 'Other' && collectorUser.other_center)
              ? collectorUser.other_center.trim()
              : collectorUser.current_center.trim();
          } else if (collectorUser.center && collectorUser.center !== 'None') {
            resolvedCurrentCenter = collectorUser.center.trim();
          }

          // 4. Resolve Current Temple
          if (collectorUser.current_temple && collectorUser.current_temple !== 'None' && collectorUser.current_temple !== 'General') {
            resolvedCurrentTemple = (collectorUser.current_temple === 'Other' && collectorUser.other_temple)
              ? collectorUser.other_temple.trim()
              : collectorUser.current_temple.trim();
          }
        }
      } catch (err) {
        console.error('Error resolving collector info for donation:', err);
      }
    }

    // 1. Create Razorpay Order with strictly required notes payload
    const paymentForTitle = paymentFor || body.payment_for || "Donation";
    
    const notesPayload: Record<string, string> = {
      payment_for: String(paymentForTitle).substring(0, 50),
      website: String(detectedWebsite).substring(0, 40),
      donor_name: String(donorName || "").substring(0, 50),
      collector_parent_center: String(resolvedParentCenter || "None").substring(0, 50)
    };

    if (donorAddress && typeof donorAddress === 'string' && donorAddress.trim() && donorAddress.trim().toUpperCase() !== 'N/A') {
      notesPayload.donor_address = String(donorAddress.trim()).substring(0, 100);
    }

    if (donorPan && typeof donorPan === 'string' && donorPan.trim() && donorPan.trim().toUpperCase() !== 'N/A') {
      notesPayload.donor_pan = String(donorPan.trim()).substring(0, 20);
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // convert to paise
      currency: "INR",
      receipt: `RCPT_${Date.now()}_${targetUserId.substring(0, 5)}`,
      notes: notesPayload
    };
    const order = await razorpay.orders.create(options);

    // Primary center & temple for indexed table columns
    const primaryCenter = resolvedParentCenter !== 'None' ? resolvedParentCenter : (resolvedCurrentCenter !== 'None' ? resolvedCurrentCenter : null);
    const primaryTemple = resolvedParentTemple !== 'None' ? resolvedParentTemple : (resolvedCurrentTemple !== 'None' ? resolvedCurrentTemple : null);

    // 2. Save pending donation to Supabase with comprehensive audit metadata
    const donationData = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      donor_name: donorName,
      donor_email: donorEmail,
      donor_mobile: donorMobile,
      donor_address: donorAddress || null,
      donor_pan: donorPan || null,
      amount: parseFloat(amount),
      payment_status: 'pending',
      payment_method: 'Razorpay',
      txnid: order.id, // Store Razorpay Order ID as our internal transaction ID
      tag_user_id: targetUserId,
      center: primaryCenter,
      temple: primaryTemple,
      ashram: collectorAshram !== 'N/A' ? collectorAshram : null,
      metadata: {
        payment_for: paymentForTitle,
        category: paymentForTitle.toLowerCase().includes('camp') ? 'Camp' : 'Donation',
        website: detectedWebsite,
        website_url: detectedUrl,
        donor_name: donorName,
        donor_phone: donorMobile,
        donor_email: donorEmail,
        donor_address: donorAddress || null,
        donor_pan: donorPan || null,
        collector_parent_temple: resolvedParentTemple,
        collector_parent_center: resolvedParentCenter,
        collector_slug: collectorSlugValue,
        collector: {
          id: targetUserId,
          name: collectorName,
          email: collectorEmail,
          mobile: collectorMobile,
          slug: collectorSlugValue,
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
        order_receipt: options.receipt,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    };

    const { error: dbError } = await sadhanaDb
      .from('donations')
      .insert([donationData]);

    if (dbError) {
      console.error('Failed to create pending donation record:', dbError);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      orderId: order.id, 
      amount: options.amount,
      keyId: razorpayKeyId
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

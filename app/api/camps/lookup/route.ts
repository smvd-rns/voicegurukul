import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    // Auth: Require valid session — this endpoint returns PII (names, phones, emails, payment data)
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Login required to look up registrations' }, { status: 401 });
    }

    const { campId, query: lookupQuery } = await req.json();

    if (!campId || !lookupQuery || typeof lookupQuery !== 'string') {
      return NextResponse.json({ error: 'Camp ID and search query are required' }, { status: 400 });
    }

    const cleanQuery = lookupQuery.trim();
    if (!cleanQuery || cleanQuery.length < 5) {
      return NextResponse.json({
        error: 'Please enter a valid 10-digit phone number, full email address, or Booking Group ID (minimum 5 characters).'
      }, { status: 400 });
    }

    // Strip out non-digits to check for 10-digit phone
    const numericOnly = cleanQuery.replace(/\D/g, '');
    const isPhone = numericOnly.length >= 10;
    const phoneTen = isPhone ? numericOnly.slice(-10) : '';

    const isEmail = cleanQuery.includes('@');
    const isGroupId = cleanQuery.toUpperCase().startsWith('GRP_') || cleanQuery.length >= 8;

    if (!isPhone && !isEmail && !isGroupId) {
      return NextResponse.json({
        error: 'Lookup requires a full 10-digit mobile number, valid email address, or Booking Group ID.'
      }, { status: 400 });
    }

    // Secure exact-match query (Prevents scraping attendee database by partial name)
    const sql = `
      SELECT 
        id, camp_id, group_id, poc_name, poc_contact, email,
        parent_temple, voice_name, current_temple, current_center,
        participant_name, whatsapp, counselor_name,
        gender, age, married_since_year, camp_track, participant_type,
        first_meal_date, first_meal_type, last_meal_date, last_meal_type,
        dinner_type, accommodation,
        meal_cost, acc_cost, ac_cost, late_fee, entry_cost, total_cost,
        discount_amount, coupon_code,
        payment_method, payment_status, is_cancelled, cancellation_id,
        meals_served, checked_in, checked_in_at, created_at
      FROM camp_registrations
      WHERE camp_id = $1
        AND (
          ($2 <> '' AND (RIGHT(whatsapp, 10) = $2 OR RIGHT(poc_contact, 10) = $2))
          OR ($3 <> '' AND LOWER(email) = LOWER($3))
          OR ($4 <> '' AND LOWER(group_id) = LOWER($4))
        )
      ORDER BY created_at DESC
      LIMIT 25
    `;

    const res = await query(sql, [
      campId,
      phoneTen,
      isEmail ? cleanQuery : '',
      cleanQuery
    ]);

    return NextResponse.json({ data: res.rows });
  } catch (err: any) {
    console.error('Camp registration lookup error:', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}

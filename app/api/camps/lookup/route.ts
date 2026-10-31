import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getManagerAssignedLocations } from '@/app/dashboard/admin/camps/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { campId, query: lookupQuery, callerUserId } = body;

    // Auth: Require valid session — this endpoint returns PII (names, phones, emails, payment data)
    const authUser = await getAuthUserFromRequest(req);
    const resolvedUserId = callerUserId || authUser?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'Unauthorized: Login required to look up registrations' }, { status: 401 });
    }

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
    // Group ID strictly requires GRP_ prefix
    const isGroupId = cleanQuery.toUpperCase().startsWith('GRP_');

    if (!isPhone && !isEmail && !isGroupId) {
      return NextResponse.json({
        error: 'Lookup requires a full 10-digit mobile number, valid email address, or Booking Group ID (e.g. GRP_...).'
      }, { status: 400 });
    }

    // Fetch caller details from users table
    const uRes = await query('SELECT id, email, phone, role FROM users WHERE id = $1', [resolvedUserId]);
    const dbUser = uRes.rows[0];
    const roles = (Array.isArray(dbUser?.role) ? dbUser.role : [dbUser?.role]).map(Number).filter((r: number) => !isNaN(r));
    const authEmail = (dbUser?.email || authUser?.email || '').trim().toLowerCase();
    const authPhone = (dbUser?.phone || '').replace(/\D/g, '').slice(-10);

    const managerLoc = await getManagerAssignedLocations(resolvedUserId, roles);

    // If ordinary user: strictly verify ownership
    if (!managerLoc.isManager) {
      const isOwnEmail = isEmail && cleanQuery.toLowerCase() === authEmail;
      const isOwnPhone = isPhone && phoneTen === authPhone;

      if (!isOwnEmail && !isOwnPhone) {
        if (isGroupId) {
          const groupCheck = await query(
            `SELECT id FROM camp_registrations WHERE camp_id = $1 AND LOWER(group_id) = LOWER($2) AND (
               ($3 <> '' AND LOWER(email) = $3) OR
               ($4 <> '' AND (RIGHT(REGEXP_REPLACE(whatsapp, '[^0-9]', '', 'g'), 10) = $4 OR RIGHT(REGEXP_REPLACE(poc_contact, '[^0-9]', '', 'g'), 10) = $4))
             ) LIMIT 1`,
            [campId, cleanQuery, authEmail, authPhone]
          );
          if (groupCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Unauthorized: You can only look up registrations made under your own account.' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Unauthorized: You can only look up registrations made under your own account.' }, { status: 403 });
        }
      }
    }

    // Secure exact-match query
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
          ($2 <> '' AND (RIGHT(REGEXP_REPLACE(whatsapp, '[^0-9]', '', 'g'), 10) = $2 OR RIGHT(REGEXP_REPLACE(poc_contact, '[^0-9]', '', 'g'), 10) = $2))
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
      isGroupId ? cleanQuery : ''
    ]);

    let matchingRows = res.rows;

    // If caller is a manager (and not super admin), filter to assigned center/temple or own bookings
    if (managerLoc.isManager && !managerLoc.isSuperAdmin) {
      const lowerTemples = managerLoc.assignedTempleNames.map(t => t.trim().toLowerCase()).filter(Boolean);
      const lowerCenters = managerLoc.assignedCenterNames.map(c => c.trim().toLowerCase()).filter(Boolean);

      matchingRows = matchingRows.filter((r: any) => {
        const pt = (r.parent_temple || '').trim().toLowerCase();
        const ct = (r.current_temple || '').trim().toLowerCase();
        const vn = (r.voice_name || '').trim().toLowerCase();
        const cc = (r.current_center || '').trim().toLowerCase();
        const rEmail = (r.email || '').trim().toLowerCase();
        const rPhone = (r.whatsapp || '').replace(/\D/g, '').slice(-10);
        const rPocPhone = (r.poc_contact || '').replace(/\D/g, '').slice(-10);

        const isOwn = Boolean(
          (authEmail && rEmail === authEmail) ||
          (authPhone && (rPhone === authPhone || rPocPhone === authPhone))
        );
        const inAssignedTemple = lowerTemples.some(t => pt === t || ct === t);
        const inAssignedCenter = lowerCenters.some(c => vn === c || cc === c);
        return isOwn || inAssignedTemple || inAssignedCenter;
      });
    }

    return NextResponse.json({ data: matchingRows });
  } catch (err: any) {
    console.error('Camp registration lookup error:', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}

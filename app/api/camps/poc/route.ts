import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromCookies, getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campId = searchParams.get('campId');
    const centerName = searchParams.get('centerName');

    if (!campId) {
      return NextResponse.json({ success: false, error: 'campId is required' }, { status: 400 });
    }

    if (!centerName) {
      // Return all POCs configured for this camp
      const allRes = await query(
        `SELECT * FROM camp_center_pocs 
         WHERE camp_id = $1 
         ORDER BY center_name ASC`,
        [campId]
      );
      return NextResponse.json({ success: true, pocs: allRes.rows });
    }

    const cleanCenter = centerName.trim();
    const res = await query(
      `SELECT * FROM camp_center_pocs 
       WHERE camp_id = $1 AND LOWER(TRIM(center_name)) = LOWER(TRIM($2))
       LIMIT 1`,
      [campId, cleanCenter]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: true, poc: null });
    }

    return NextResponse.json({ success: true, poc: res.rows[0] });
  } catch (err: any) {
    console.error('Error fetching camp center POC:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = (await getAuthUserFromRequest(req)) || (await getAuthUserFromCookies());
    const body = await req.json();
    const { campId, centerName, pocName, pocPhone, userId } = body;

    const effectiveUserId = sessionUser?.id || userId || null;
    if (!sessionUser && !effectiveUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Login required to manage POCs' }, { status: 401 });
    }

    if (!campId || !centerName || !pocName || !pocPhone) {
      return NextResponse.json({
        success: false,
        error: 'campId, centerName, pocName, and pocPhone are all required'
      }, { status: 400 });
    }

    const cleanCenter = centerName.trim();
    const cleanName = pocName.trim();
    const cleanPhone = pocPhone.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid 10-digit mobile number'
      }, { status: 400 });
    }

    const res = await query(`
      INSERT INTO camp_center_pocs (camp_id, center_name, poc_name, poc_phone, created_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (camp_id, LOWER(TRIM(center_name)))
      DO UPDATE SET
        poc_name = EXCLUDED.poc_name,
        poc_phone = EXCLUDED.poc_phone,
        created_by = COALESCE(EXCLUDED.created_by, camp_center_pocs.created_by),
        updated_at = NOW()
      RETURNING *;
    `, [campId, cleanCenter, cleanName, cleanPhone, effectiveUserId]);

    return NextResponse.json({ success: true, poc: res.rows[0] });
  } catch (err: any) {
    console.error('Error saving camp center POC:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

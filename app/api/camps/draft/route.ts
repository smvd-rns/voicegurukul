import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromCookies } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/camps/draft?campId=...
 * Retrieve the saved registration progress/draft for the logged-in manager & camp
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campId = searchParams.get('campId');
    if (!campId) {
      return NextResponse.json({ error: 'campId query parameter is required' }, { status: 400 });
    }
    const sessionUser = await getAuthUserFromCookies();
    const resolvedUserId = sessionUser?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ success: true, draft: null });
    }

    const res = await query(
      `SELECT * FROM camp_registration_drafts 
       WHERE user_id = $1 AND camp_id = $2 
       LIMIT 1`,
      [resolvedUserId, campId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: true, draft: null });
    }

    return NextResponse.json({ success: true, draft: res.rows[0] });
  } catch (error: any) {
    console.error('Error fetching camp registration draft:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch draft' }, { status: 500 });
  }
}

/**
 * POST /api/camps/draft
 * Save or update registration progress for the manager & camp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campId,
      entries = [],
      formData = {},
      paymentMethod = null,
      ittTempleName = null,
      ittTransactionRef = null,
      ittTransactionDate = null,
      idtSource = null,
      idtPasscode = null,
      couponCode = null,
      callerUserId = null
    } = body;

    if (!campId) {
      return NextResponse.json({ error: 'campId is required' }, { status: 400 });
    }

    const sessionUser = await getAuthUserFromCookies();
    const resolvedUserId = sessionUser?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'Authentication required to save progress' }, { status: 401 });
    }

    // Upsert into camp_registration_drafts
    const sql = `
      INSERT INTO camp_registration_drafts (
        user_id, camp_id, entries, form_data, payment_method,
        itt_temple_name, itt_transaction_ref, itt_transaction_date,
        idt_source, idt_passcode, coupon_code, updated_at
      ) VALUES (
        $1, $2, $3::jsonb, $4::jsonb, $5,
        $6, $7, $8,
        $9, $10, $11, NOW()
      )
      ON CONFLICT (user_id, camp_id)
      DO UPDATE SET
        entries = EXCLUDED.entries,
        form_data = EXCLUDED.form_data,
        payment_method = EXCLUDED.payment_method,
        itt_temple_name = EXCLUDED.itt_temple_name,
        itt_transaction_ref = EXCLUDED.itt_transaction_ref,
        itt_transaction_date = EXCLUDED.itt_transaction_date,
        idt_source = EXCLUDED.idt_source,
        idt_passcode = EXCLUDED.idt_passcode,
        coupon_code = EXCLUDED.coupon_code,
        updated_at = NOW()
      RETURNING *
    `;

    const res = await query(sql, [
      resolvedUserId,
      campId,
      JSON.stringify(entries),
      JSON.stringify(formData),
      paymentMethod,
      ittTempleName,
      ittTransactionRef,
      ittTransactionDate,
      idtSource,
      idtPasscode,
      couponCode
    ]);

    return NextResponse.json({
      success: true,
      message: 'Registration progress saved successfully',
      draft: res.rows[0]
    });
  } catch (error: any) {
    console.error('Error saving camp registration draft:', error);
    return NextResponse.json({ error: error.message || 'Failed to save draft' }, { status: 500 });
  }
}

/**
 * DELETE /api/camps/draft?campId=...
 * Discard or clear the draft once registration is complete or discarded
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campId = searchParams.get('campId');
    if (!campId) {
      return NextResponse.json({ error: 'campId query parameter is required' }, { status: 400 });
    }
    const sessionUser = await getAuthUserFromCookies();
    const resolvedUserId = sessionUser?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ success: true });
    }

    await query(
      `DELETE FROM camp_registration_drafts 
       WHERE user_id = $1 AND camp_id = $2`,
      [resolvedUserId, campId]
    );

    return NextResponse.json({ success: true, message: 'Draft cleared successfully' });
  } catch (error: any) {
    console.error('Error deleting camp registration draft:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete draft' }, { status: 500 });
  }
}

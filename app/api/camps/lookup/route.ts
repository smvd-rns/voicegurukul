import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { campId, query: lookupQuery } = await req.json();

    if (!campId || !lookupQuery || typeof lookupQuery !== 'string') {
      return NextResponse.json({ error: 'Camp ID and search query are required' }, { status: 400 });
    }

    const cleanQuery = lookupQuery.trim();
    if (!cleanQuery) {
      return NextResponse.json({ data: [] });
    }

    // Strip out non-digits for phone matching if it looks like a phone number
    const numericOnly = cleanQuery.replace(/\D/g, '');

    const sql = `
      SELECT *
      FROM camp_registrations
      WHERE camp_id = $1
        AND (
          whatsapp = $2
          OR poc_contact = $2
          OR ($3 != '' AND (whatsapp LIKE '%' || $3 || '%' OR poc_contact LIKE '%' || $3 || '%'))
          OR LOWER(email) = LOWER($2)
          OR group_id ILIKE $2
          OR participant_name ILIKE '%' || $2 || '%'
          OR poc_name ILIKE '%' || $2 || '%'
        )
      ORDER BY created_at DESC
    `;

    const res = await query(sql, [campId, cleanQuery, numericOnly]);

    return NextResponse.json({ data: res.rows });
  } catch (err: any) {
    console.error('Camp registration lookup error:', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}

import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getBulkSadhanaReportsByRange } from '@/lib/supabase/sadhana';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const requester = await getAuthUserFromRequest(request);
        if (!requester) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userIds, from, to } = body;

        if (!userIds || !Array.isArray(userIds) || !from || !to) {
            return NextResponse.json({ error: 'Missing required parameters (userIds, from, to)' }, { status: 400 });
        }

        // Safety limit to avoid super heavy queries
        if (userIds.length > 5000) {
            return NextResponse.json({ error: 'Too many users requested' }, { status: 400 });
        }

        const reports = await getBulkSadhanaReportsByRange(userIds, from, to);

        return NextResponse.json({ success: true, data: reports });

    } catch (error: any) {
        console.error('Sadhana Bulk History API POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

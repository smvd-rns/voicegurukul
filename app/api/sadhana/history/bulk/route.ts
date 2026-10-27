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

        const supabase = createClient();
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', requester.id)
            .single();

        const roles = Array.isArray(profile?.role) ? profile.role : [profile?.role];
        const numRoles = roles.map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
        const isLeadershipOrCounselor = numRoles.some((r: number) => [2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 31].includes(r)) ||
            roles.includes('super_admin') || roles.includes('counselor') || roles.includes('managing_director');

        // Validate date format (YYYY-MM-DD)
        const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
        if (typeof from !== 'string' || typeof to !== 'string' || !DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
            return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 });
        }

        let targetUserIds = userIds;
        if (!isLeadershipOrCounselor) {
            // Normal students are scoped strictly to their own ID
            targetUserIds = [requester.id];
        }

        // Validate UUIDs to prevent malformed queries
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUserIds = targetUserIds.filter((id: any) => typeof id === 'string' && UUID_REGEX.test(id));
        if (validUserIds.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        const reports = await getBulkSadhanaReportsByRange(validUserIds, from, to);

        return NextResponse.json({ success: true, data: reports });

    } catch (error: any) {
        console.error('Sadhana Bulk History API POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

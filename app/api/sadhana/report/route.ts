import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUserFromRequest } from '@/lib/supabase/admin';
import {
    getSadhanaReportByDate,
    submitSadhanaReport
} from '@/lib/supabase/sadhana';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { canAdminManageTarget } from '@/lib/utils/roles';

export async function GET(request: Request) {
    try {
        const requester = await getAuthUserFromRequest(request);
        if (!requester) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const targetUserId = searchParams.get('userId') || requester.id;

        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }

        // Authorization Check
        if (targetUserId !== requester.id) {
            const supabaseAdmin = getAdminClient();

            // Fetch profiles
            const { data: requesterProfile } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', requester.id)
                .single();

            const { data: targetProfile } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', targetUserId)
                .single();

            const isAuthorized = canAdminManageTarget(requesterProfile.role, targetProfile.role, requester.id, targetUserId);

            if (!isAuthorized) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const report = await getSadhanaReportByDate(targetUserId, date);
        const headers = new Headers();
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        headers.set('Pragma', 'no-cache');
        return NextResponse.json({ success: true, data: report }, { headers });

    } catch (error: any) {
        console.error('Sadhana Report API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { report } = body;

        console.log('[SadhanaSubmit] Payload:', JSON.stringify(report));

        if (!report) {
            return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
        }

        // Security: Ensure the user can only submit for themselves
        const reportWithUserId = {
            ...report,
            userId: user.id
        };

        const reportId = await submitSadhanaReport(reportWithUserId);
        return NextResponse.json({ success: true, id: reportId });

    } catch (error: any) {
        console.error('Sadhana Report API POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

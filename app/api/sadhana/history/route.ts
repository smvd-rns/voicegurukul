import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUserFromRequest } from '@/lib/supabase/admin';
import {
    getSadhanaReportsByRange,
    getUserSadhanaReports
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
        const targetUserId = searchParams.get('userId') || requester.id;
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 30;

        // Authorization Check
        if (targetUserId !== requester.id) {
            const supabaseAdmin = getAdminClient();

            // Fetch requester profile
            const { data: requesterProfile } = await supabaseAdmin
                .from('users')
                .select('role, id, email')
                .eq('id', requester.id)
                .single();

            // Fetch target user profile
            const { data: targetProfile } = await supabaseAdmin
                .from('users')
                .select('role, id, counselor_id, hierarchy')
                .eq('id', targetUserId)
                .single();

            // check permissions using role logic
            let isAuthorized = canAdminManageTarget(requesterProfile.role, targetProfile.role, requester.id, targetUserId);

            // If not strictly role-authorized, check if requester is the user's counselor
            if (!isAuthorized && targetProfile && requesterProfile) {
                const requesterEmail = requesterProfile.email?.trim().toLowerCase();
                const h = (targetProfile.hierarchy as any) || {};

                const bE = (h.brahmachariCounselorEmail || '').trim().toLowerCase();
                const gE = (h.grihasthaCounselorEmail || '').trim().toLowerCase();

                if (requesterEmail && (bE === requesterEmail || gE === requesterEmail)) {
                    isAuthorized = true;
                } else if (targetProfile.counselor_id && requesterEmail) {
                    // Check if requester's counselor profile matches target's counselor_id
                    const { data: reqCounselor } = await supabaseAdmin
                        .from('counselors')
                        .select('id')
                        .eq('email', requesterEmail)
                        .maybeSingle();

                    if (reqCounselor && reqCounselor.id === targetProfile.counselor_id) {
                        isAuthorized = true;
                    }
                }
            }

            if (!isAuthorized) {
                return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
            }
        }

        let reports;
        if (from && to) {
            reports = await getSadhanaReportsByRange(targetUserId, from, to);
        } else {
            reports = await getUserSadhanaReports(targetUserId, limit);
        }

        // Prevent any caching so scores always reflect current DB state
        const headers = new Headers();
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        headers.set('Pragma', 'no-cache');
        return NextResponse.json({ success: true, data: reports }, { headers });

    } catch (error: any) {
        console.error('Sadhana History API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

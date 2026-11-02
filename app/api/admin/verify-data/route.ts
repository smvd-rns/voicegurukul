import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { createClient } from '@/lib/supabase/server-db';
import { revalidateTag } from 'next/cache';
import { verifyToken } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, id, ids, action } = body;

        if (!type || (!id && (!ids || ids.length === 0)) || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Robust ID handling: flatten any arrays and filter out falsy values
        const targetIds = [
            ...(Array.isArray(ids) ? ids : (ids ? [ids] : [])),
            ...(Array.isArray(id) ? id : (id ? [id] : []))
        ].filter(Boolean);

        if (targetIds.length === 0) {
            return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
        }

        // Use Service Role Key to bypass RLS for admin actions
        const supabase = createClient();

        // Verify the requester using custom JWT session token or Bearer token
        const cookieToken = request.cookies.get('session_token')?.value;
        const authHeader = request.headers.get('authorization');
        const token = cookieToken || (authHeader ? authHeader.replace('Bearer ', '') : null);

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // Fetch user from Droplet DB
        const dbRes = await dbQuery('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
        const dbUser = dbRes.rows[0];

        if (!dbUser) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
        }

        const user = { id: dbUser.id, email: dbUser.email };
        const userData = { role: dbUser.role };

        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        const roleNums = roles.map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
        const roleStrings = roles.map((r: any) => String(r).toLowerCase());

        const isSuperAdmin = roleNums.includes(8) || roleStrings.includes('super_admin') || roleStrings.includes('admin');
        const isTempleAdmin = roleNums.some((r: number) => [10, 11, 12, 13, 21].includes(r)) ||
            roleStrings.some((s: string) => ['president', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(s));
        const isCenterAdmin = roleNums.some((r: number) => [14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(r)) ||
            roleStrings.some((s: string) => ['project_advisor', 'project_manager', 'acting_manager', 'oc'].includes(s));
        const isCounselor = roleNums.some((r: number) => [2, 3, 4, 20, 31].includes(r)) ||
            roleStrings.some((s: string) => ['counselor', 'care_giver', 'grihstha_counselor'].includes(s));

        const allowedRoleNums = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 2, 20];
        const allowedRoleNames = [
            'super_admin', 'managing_director', 'director', 'central_voice_manager',
            'project_advisor', 'project_manager', 'acting_manager', 'oc', 'counselor', 'care_giver',
            'youth_preacher', 'internal_manager', 'preaching_coordinator', 'morning_program_in_charge',
            'mentor', 'frontliner', 'accountant', 'kitchen_head', 'study_in_charge', 'event_admin',
            'grihstha_counselor', 'easy_incharge', 'prerna_incharge'
        ];

        const hasPermission = isSuperAdmin || isTempleAdmin || isCenterAdmin || isCounselor ||
            roles.some((r: any) => allowedRoleNums.includes(Number(r)) || allowedRoleNames.includes(String(r).toLowerCase()));

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Perform Action
        const tableMap: Record<string, string> = {
            'center': 'centers',
            'city': 'cities',
            'counselor': 'counselors',
            'user': 'users'
        };
        const tableName = tableMap[type];

        if (!tableName) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        if (tableName === 'users') {
            const { reason } = body;

            // Scoping Check for Non-Super-Admins
            if (!isSuperAdmin) {
                // Fetch target users to verify assignment
                const { data: targetUsers, error: targetError } = await supabase
                    .from('users')
                    .select('id, current_center, center, current_temple, parent_temple, hierarchy, counselor_id, other_counselor')
                    .in('id', targetIds);

                if (targetError || !targetUsers) {
                    return NextResponse.json({ error: 'Failed to verify target users' }, { status: 500 });
                }

                // Helper to normalize strings
                const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '');

                // 1. Gather managed temple names if Temple Admin
                let managedTempleNames: string[] = [];
                if (isTempleAdmin) {
                    const { data: managedTemples } = await supabase
                        .from('temples')
                        .select('name')
                        .or(`managing_director_id.eq.${user.id},director_id.eq.${user.id},central_voice_manager_id.eq.${user.id},yp_id.eq.${user.id}`);
                    if (managedTemples) {
                        managedTempleNames = managedTemples.map((t: any) => norm(t.name)).filter(Boolean);
                    }
                }

                // 2. Gather managed center IDs and names if Center Admin (e.g. Acting Manager, PM, PA)
                let managedCenterIds: string[] = [];
                let managedCenterNames: string[] = [];
                if (isCenterAdmin) {
                    const { data: directCenters } = await supabase
                        .from('centers')
                        .select('id, name')
                        .or(`project_manager_id.eq.${user.id},project_advisor_id.eq.${user.id},acting_manager_id.eq.${user.id},oc_id.eq.${user.id},care_giver_id.eq.${user.id},youth_preacher_id.eq.${user.id},internal_manager_id.eq.${user.id},preaching_coordinator_id.eq.${user.id},morning_program_in_charge_id.eq.${user.id},accountant_id.eq.${user.id},kitchen_head_id.eq.${user.id},study_in_charge_id.eq.${user.id},event_admin_id.eq.${user.id},grihstha_counselor_id.eq.${user.id},easy_incharge_id.eq.${user.id},prerna_incharge_id.eq.${user.id}`);
                    if (directCenters) {
                        directCenters.forEach((c: any) => {
                            if (c.id) managedCenterIds.push(c.id);
                            if (c.name) managedCenterNames.push(norm(c.name));
                        });
                    }

                    // Junction table allocations (user_centers)
                    const { data: userCenters } = await supabase
                        .from('user_centers')
                        .select('center_id')
                        .eq('user_id', user.id);
                    if (userCenters && userCenters.length > 0) {
                        const cIds = userCenters.map((uc: any) => uc.center_id).filter(Boolean);
                        if (cIds.length > 0) {
                            const { data: cData } = await supabase
                                .from('centers')
                                .select('id, name')
                                .in('id', cIds);
                            if (cData) {
                                cData.forEach((c: any) => {
                                    if (c.id) managedCenterIds.push(c.id);
                                    if (c.name) managedCenterNames.push(norm(c.name));
                                });
                            }
                        }
                    }
                }

                // 3. Gather Counselor info if Counselor
                let adminCounselorId: string | null = null;
                let counselorName: string | null = null;
                const normalizedAdminEmail = norm(user.email);
                if (isCounselor && normalizedAdminEmail) {
                    const { data: counselorData } = await supabase
                        .from('counselors')
                        .select('id, name')
                        .eq('email', normalizedAdminEmail)
                        .maybeSingle();
                    if (counselorData) {
                        adminCounselorId = counselorData.id;
                        counselorName = norm(counselorData.name);
                    }
                }

                // Profile update requests to check requested counselors
                const { data: pReqs } = await supabase
                    .from('profile_update_requests')
                    .select('user_id, requested_changes')
                    .in('user_id', targetIds)
                    .eq('status', 'pending');

                const userToRequested = new Map<string, { emails: string[], names: string[] }>();
                if (pReqs) {
                    pReqs.forEach((r: any) => {
                        const rC = r.requested_changes || {};
                        const emails: string[] = [];
                        const names: string[] = [];
                        if (rC.brahmachariCounselorEmail) emails.push(norm(rC.brahmachariCounselorEmail));
                        if (rC.grihasthaCounselorEmail) emails.push(norm(rC.grihasthaCounselorEmail));
                        if (rC.brahmachariCounselor) names.push(norm(rC.brahmachariCounselor));
                        if (rC.grihasthaCounselor) names.push(norm(rC.grihasthaCounselor));
                        userToRequested.set(r.user_id, { emails, names });
                    });
                }

                // Validate each target user
                const allMatch = (targetUsers as any[]).every((u: any) => {
                    const uH = u.hierarchy || {};

                    // A. Check Temple Authority
                    if (managedTempleNames.length > 0) {
                        const userTemple = norm(u.current_temple || u.parent_temple || uH.currentTemple?.name || uH.currentTemple || uH.parentTemple);
                        if (userTemple && managedTempleNames.includes(userTemple)) {
                            return true;
                        }
                    }

                    // B. Check Center Authority (Acting Manager, PM, PA, OC, etc.)
                    if (managedCenterNames.length > 0 || managedCenterIds.length > 0) {
                        const userCenterName = norm(u.current_center || u.center || uH.currentCenter?.name || uH.currentCenter || uH.center);
                        const userCenterId = u.center_id || uH.centerId;
                        if (userCenterName && managedCenterNames.includes(userCenterName)) {
                            return true;
                        }
                        if (userCenterId && managedCenterIds.includes(userCenterId)) {
                            return true;
                        }
                    }

                    // C. Check Counselor Authority
                    if (isCounselor) {
                        const bE = norm(uH.brahmachariCounselorEmail);
                        const gE = norm(uH.grihasthaCounselorEmail);
                        const bN = norm(uH.brahmachariCounselor);
                        const gN = norm(uH.grihasthaCounselor);
                        const uE = norm(uH.counselorEmail);
                        const uN = norm(uH.counselor);

                        if (adminCounselorId && u.counselor_id === adminCounselorId) return true;
                        if (normalizedAdminEmail && (bE === normalizedAdminEmail || gE === normalizedAdminEmail || uE === normalizedAdminEmail)) return true;
                        if (counselorName && (bN === counselorName || gN === counselorName || uN === counselorName)) return true;

                        if (uN === 'other' && (u.other_counselor || uH.otherCounselor)) {
                            const otherN = norm(u.other_counselor || uH.otherCounselor);
                            if (counselorName && otherN === counselorName) return true;
                        }

                        const reqObj = userToRequested.get(u.id);
                        if (reqObj) {
                            if (normalizedAdminEmail && reqObj.emails.includes(normalizedAdminEmail)) return true;
                            if (counselorName && reqObj.names.includes(counselorName)) return true;
                        }
                    }

                    return false;
                });

                if (!allMatch) {
                    return NextResponse.json({ error: 'Unauthorized: Some users are not assigned to your managed center, temple, or counseling group' }, { status: 403 });
                }
            }

            // Execute update via raw Droplet DB query
            // IMPORTANT: Only update users whose verification_status is not already set to target statusVal.
            // This prevents duplicate Welcome Emails if an approval request is triggered multiple times.
            const statusVal = action === 'approve' ? 'approved' : 'rejected';
            const reasonVal = action === 'reject' ? (reason || null) : null;
            const now = new Date().toISOString();

            const updateRes = await dbQuery(
                `UPDATE users 
                 SET verification_status = $1, rejection_reason = $2, reviewed_at = $3, reviewed_by = $4 
                 WHERE id = ANY($5::uuid[]) AND (verification_status IS DISTINCT FROM $1)
                 RETURNING id`,
                [statusVal, reasonVal, now, user.id, targetIds]
            );

            const newlyUpdatedIds: string[] = (updateRes.rows || []).map((r: any) => r.id);

            // Side Effects (Emails & Membership IDs) - ONLY execute for users whose status actually changed
            const { sendApprovalNotification, sendRejectionNotification } = await import('@/lib/utils/email');

            if (action === 'approve') {
                const { generateMembershipIdForUser } = await import('@/lib/utils/membership');

                for (const userId of newlyUpdatedIds) {
                    try {
                        // Generate Membership ID first if not present
                        let membershipId: string | undefined = undefined;
                        try {
                            membershipId = await generateMembershipIdForUser(supabase, userId);
                        } catch (genErr) {
                            console.error(`Failed to generate membership ID for ${userId} in verify-data:`, genErr);
                        }

                        const userRes = await dbQuery('SELECT email, name, phone, hierarchy, current_center, current_temple, donation_slug AS membership_id FROM users WHERE id = $1', [userId]);
                        const userDetails = userRes.rows[0];

                        if (userDetails?.email) {
                            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://voicegurukul.com';
                            await sendApprovalNotification(userDetails.email, userDetails.name || 'Devotee', `${baseUrl}/dashboard`);
                        }
                    } catch (sideEffectError) {
                        console.error(`Error in approval side effects for user ${userId}:`, sideEffectError);
                    }
                }
            } else if (action === 'reject') {
                for (const userId of newlyUpdatedIds) {
                    try {
                        const userRes = await dbQuery('SELECT email, name FROM users WHERE id = $1', [userId]);
                        const userDetails = userRes.rows[0];

                        if (userDetails?.email) {
                            await sendRejectionNotification(
                                userDetails.email,
                                userDetails.name || 'Devotee',
                                reason || 'Information provided was insufficient.'
                            );
                        }
                    } catch (sideEffectError) {
                        console.error(`Error sending rejection email for user ${userId}:`, sideEffectError);
                    }
                }
            }

        } else {
            // Non-user types (centers, cities, counselors) still require higher levels or super admin
            if (isCounselor && !isSuperAdmin && !isTempleAdmin && !isCenterAdmin) {
                return NextResponse.json({ error: 'Forbidden: Counselor can only verify students' }, { status: 403 });
            }

            if (action === 'approve') {
                const { error } = await supabase
                    .from(tableName)
                    .update({ is_verified: true })
                    .in('id', targetIds);

                if (error) throw error;
                
                if (tableName === 'centers') revalidateTag('centers');
                if (tableName === 'cities') revalidateTag('cities');
            } else if (action === 'reject') {
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in('id', targetIds);

                if (error) throw error;

                if (tableName === 'centers') revalidateTag('centers');
                if (tableName === 'cities') revalidateTag('cities');
            } else {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true, count: targetIds.length });
    } catch (error: any) {
        console.error('Admin verify error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}

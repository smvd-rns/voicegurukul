import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sendProfileUpdateApprovalNotification } from '@/lib/utils/email';
import { generateMembershipIdForUser } from '@/lib/utils/membership';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg); // Forced console log for debugging
        debugLogs.push(msg);
    };

    try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        const { id } = params;
        log(`Processing PATCH for ID: ${id}`);

        const supabaseAdmin = createClient();

        const adminUser = await getAuthUserFromRequest(request);
        if (!adminUser) {
            log('Auth error: User not found');
            return NextResponse.json({ error: 'Unauthorized', debug: debugLogs }, { status: 401 });
        }

        // Verify admin role (Role 8 or 11)
        const { data: adminData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        log(`Admin loaded: ${adminUser.id}, Role Data: ${JSON.stringify(adminData)}`);

        const roles = Array.isArray(adminData?.role) ? adminData.role : [adminData?.role];
        const isSuperAdmin = roles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin' || String(r) === 'admin');

        const isGlobalAdmin = roles.some((r: any) =>
            [12, 13].includes(Number(r)) ||
            ['director', 'central_voice_manager'].includes(String(r))
        );

        const isTempleAdmin = roles.some((r: any) =>
            [11, 17, 21].includes(Number(r)) ||
            ['managing_director', 'oc', 'youth_preacher'].includes(String(r))
        );

        const isProjectAdmin = roles.some((r: any) =>
            [14, 15, 16].includes(Number(r)) ||
            ['project_manager', 'project_advisor', 'acting_manager'].includes(String(r))
        );

        const isCounselor = roles.some((r: any) =>
            [2, 20].includes(Number(r)) ||
            ['counselor', 'care_giver'].includes(String(r))
        );

        log(`Roles check: Super=${isSuperAdmin}, Global=${isGlobalAdmin}, Temple=${isTempleAdmin}, Project=${isProjectAdmin}, Counselor=${isCounselor}`);

        if (!isSuperAdmin && !isGlobalAdmin && !isTempleAdmin && !isProjectAdmin && !isCounselor) {
            return NextResponse.json({ error: 'Unauthorized', debug: debugLogs }, { status: 403 });
        }

        const body = await request.json();
        const { status, feedback, approvedFields } = body;
        log(`Status: ${status}, ApprovedFields: ${JSON.stringify(approvedFields)}`);

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status', debug: debugLogs }, { status: 400 });
        }

        // Fetch the request
        const { data: profileRequest, error: fetchError } = await supabaseAdmin
            .from('profile_update_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !profileRequest) {
            log(`Fetch error: ${fetchError?.message}`);
            return NextResponse.json({ error: 'Request not found', debug: debugLogs }, { status: 404 });
        }

        // Scoped Security for Temple Admins and Counselors
        if (!isSuperAdmin && !isGlobalAdmin) {
            log('Applying scoped security');
            const { data: targetUser } = await supabaseAdmin
                .from('users')
                .select('hierarchy, counselor_id')
                .eq('id', profileRequest.user_id)
                .single();

            const uH = targetUser?.hierarchy || {};

            let isAuthorized = false;
            let errorMsg = 'Unauthorized: Scope mismatch';

            if (isTempleAdmin) {
                const { data: managedTemples } = await supabaseAdmin
                    .from('temples')
                    .select('name')
                    .or(`managing_director_id.eq.${adminUser.id},director_id.eq.${adminUser.id},central_voice_manager_id.eq.${adminUser.id},yp_id.eq.${adminUser.id}`);
                    
                const allowedTempleNames = (managedTemples as any[] || []).map((t: any) => t.name.trim().toLowerCase());

                const userTemple = uH.currentTemple?.name || uH.currentTemple;
                const userT = (typeof userTemple === 'string' ? userTemple : userTemple?.name || '').trim().toLowerCase();
                const reqT = (profileRequest.temple_name || '').trim().toLowerCase();

                log(`Temple Check: Allowed=${allowedTempleNames.join(',')}, UserTemple=${userT}, ReqTemple=${reqT}`);

                if ((userT && allowedTempleNames.includes(userT)) || (reqT && allowedTempleNames.includes(reqT))) {
                    isAuthorized = true;
                } else {
                    errorMsg = 'Unauthorized: Temple mismatch';
                }
            } 
            
            if (!isAuthorized && isProjectAdmin) {
                const { data: managedCenters } = await supabaseAdmin
                    .from('centers')
                    .select('name')
                    .or(`project_manager_id.eq.${adminUser.id},project_advisor_id.eq.${adminUser.id},acting_manager_id.eq.${adminUser.id}`);

                const allowedCenterNames = (managedCenters as any[] || []).map((c: any) => c.name.trim().toLowerCase());

                const userCenter = uH.center?.name || uH.center;
                const userC = (typeof userCenter === 'string' ? userCenter : userCenter?.name || '').trim().toLowerCase();
                const reqC = (profileRequest.center_name || '').trim().toLowerCase();

                log(`Center Check: Allowed=${allowedCenterNames.join(',')}, UserCenter=${userC}, ReqCenter=${reqC}`);

                if ((userC && allowedCenterNames.includes(userC)) || (reqC && allowedCenterNames.includes(reqC))) {
                    isAuthorized = true;
                } else {
                    errorMsg = 'Unauthorized: Center mismatch';
                }
            } 
            
            if (!isAuthorized && isCounselor) {
                // Counselor Scoping: Check if admin email matches target user's counselor email OR requested counselor email
                const adminEmail = adminUser.email;
                if (!adminEmail) {
                    errorMsg = 'Unauthorized: Admin email missing';
                } else {

                const normalizedAdminEmail = adminEmail.trim().toLowerCase();

                // Lookup Counselor ID and Name
                const { data: counselorData } = await supabaseAdmin
                    .from('counselors')
                    .select('id, name, user_id')
                    .ilike('email', normalizedAdminEmail)
                    .maybeSingle();

                const counselorName = counselorData?.name ? counselorData.name.trim().toLowerCase() : null;
                const adminCounselorId = counselorData?.id || null;
                const adminCounselorUserId = counselorData?.user_id || null;

                // Current Counselor Emails/Names
                const bE = (uH.brahmachariCounselorEmail || uH.counselorEmail || targetUser?.counselor_email || '').trim().toLowerCase();
                const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
                const bN = (uH.brahmachariCounselor || uH.counselor || targetUser?.counselor || '').trim().toLowerCase();
                const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

                // Requested Counselor Emails/Names/IDs
                const rC = profileRequest.requested_changes || {};
                const rbE = (rC.brahmachariCounselorEmail || rC.counselorEmail || '').trim().toLowerCase();
                const rgE = (rC.grihasthaCounselorEmail || '').trim().toLowerCase();
                const rbN = (rC.brahmachariCounselor || rC.counselor || '').trim().toLowerCase();
                const rgN = (rC.grihasthaCounselor || '').trim().toLowerCase();
                const rcId = (rC.counselorId || rC.counselor_id || '').trim();

                // Existing Counselor ID
                const uId = (uH.counselorId || uH.counselor_id || '').trim();
                const uTopId = (targetUser?.counselor_id || '').trim();

                log(`Counselor Check: AdminID=${adminUser.id}, AdminCounselorID=${adminCounselorId}, AdminEmail=${normalizedAdminEmail}, Name=${counselorName}, rbE=${rbE}, rgE=${rgE}, rbN=${rbN}, rgN=${rgN}, rcId=${rcId}, uId=${uId}, uTopId=${uTopId}`);

                // 1. Matches by Stable ID (Preferred)
                const matchesId = (adminCounselorId && (rcId === adminCounselorId || uTopId === adminCounselorId)) || 
                                  (adminCounselorUserId && (rcId === adminCounselorUserId || uTopId === adminCounselorUserId)) ||
                                  adminUser.id === rcId || adminUser.id === uId || adminUser.id === uTopId;

                // 2. Matches by Email (Legacy)
                const matchesEmail = bE === normalizedAdminEmail || gE === normalizedAdminEmail ||
                    rbE === normalizedAdminEmail || rgE === normalizedAdminEmail;

                // 3. Matches by Name (Fallback)
                const matchesName = counselorName && (
                    bN === counselorName || gN === counselorName ||
                    rbN === counselorName || rgN === counselorName
                );

                    if (matchesId || matchesEmail || matchesName) {
                        isAuthorized = true;
                    } else {
                        errorMsg = 'Unauthorized: Counselor mismatch';
                    }
                }
            }

            if (!isAuthorized) {
                return NextResponse.json({ error: errorMsg, debug: debugLogs }, { status: 403 });
            }
        }

        if (profileRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Request already processed', debug: debugLogs }, { status: 400 });
        }

        if (status === 'approved') {
            let requestedChanges = profileRequest.requested_changes || {}; // Safety default
            const userId = profileRequest.user_id;

            // If selective approval is requested, filter the changes
            if (approvedFields && Array.isArray(approvedFields)) {
                const filteredChanges: any = {};
                approvedFields.forEach((field: string) => {
                    if (requestedChanges[field] !== undefined) {
                        filteredChanges[field] = requestedChanges[field];
                    }
                });
                requestedChanges = filteredChanges;
            }

            // Prepare database column updates
            const dbUpdates: any = {
                updated_at: new Date().toISOString()
            };

            // Map frontend fields (camelCase usually in requested_changes) to snake_case DB columns
            if (requestedChanges.initiationStatus !== undefined) dbUpdates.initiation_status = requestedChanges.initiationStatus;
            if (requestedChanges.initiatedName !== undefined) dbUpdates.initiated_name = requestedChanges.initiatedName;
            if (requestedChanges.spiritualMasterName !== undefined) dbUpdates.spiritual_master_name = requestedChanges.spiritualMasterName;
            if (requestedChanges.aspiringSpiritualMasterName !== undefined) dbUpdates.aspiring_spiritual_master_name = requestedChanges.aspiringSpiritualMasterName;

            // Safe integer parsing for rounds
            if (requestedChanges.rounds !== undefined) {
                const roundsVal = parseInt(String(requestedChanges.rounds));
                dbUpdates.rounds = isNaN(roundsVal) ? null : roundsVal;
            }

            if (requestedChanges.introducedToKcIn !== undefined) dbUpdates.introduced_to_kc_in = requestedChanges.introducedToKcIn;
            if (requestedChanges.ashram !== undefined) dbUpdates.ashram = requestedChanges.ashram;
            if (requestedChanges.parentTemple !== undefined) dbUpdates.parent_temple = requestedChanges.parentTemple;
            if (requestedChanges.otherParentTemple !== undefined) dbUpdates.other_parent_temple = requestedChanges.otherParentTemple;
            if (requestedChanges.parentCenter !== undefined) dbUpdates.parent_center = requestedChanges.parentCenter;
            if (requestedChanges.currentTemple !== undefined) dbUpdates.current_temple = requestedChanges.currentTemple;
            if (requestedChanges.currentCenter !== undefined) dbUpdates.current_center = requestedChanges.currentCenter;
            if (requestedChanges.counselor !== undefined) dbUpdates.counselor = requestedChanges.counselor;
            if (requestedChanges.counselorId !== undefined) dbUpdates.counselor_id = requestedChanges.counselorId;
            if (requestedChanges.counselor_id !== undefined) dbUpdates.counselor_id = requestedChanges.counselor_id;
            if (requestedChanges.otherCounselor !== undefined) dbUpdates.other_counselor = requestedChanges.otherCounselor;
            if (requestedChanges.otherCenter !== undefined) dbUpdates.other_center = requestedChanges.otherCenter;
            if (requestedChanges.otherParentCenter !== undefined) dbUpdates.other_parent_center = requestedChanges.otherParentCenter;

            // Fetch current user to get existing hierarchy for merger
            const { data: currentUser } = await supabaseAdmin
                .from('users')
                .select('hierarchy')
                .eq('id', userId)
                .single();

            const updatedHierarchy = {
                ...(currentUser?.hierarchy || {}),
                ...requestedChanges
            };
            dbUpdates.hierarchy = updatedHierarchy;

            log(`Applying updates to user ${userId}`);

            // Apply updates to the user
            const { error: updateUserError } = await supabaseAdmin
                .from('users')
                .update(dbUpdates)
                .eq('id', userId);

            if (updateUserError) {
                log(`User update error: ${updateUserError.message}`);
                return NextResponse.json({ error: 'Failed to apply changes to user profile', debug: debugLogs }, { status: 500 });
            }

            // --- Post-Approval Actions (Email & Membership ID) ---
            try {
                // Fetch user data again to ensure we have the latest (including email for notification)
                const { data: approvedUser } = await supabaseAdmin
                    .from('users')
                    .select('email, name, verification_status, phone, hierarchy, current_center, current_temple')
                    .eq('id', userId)
                    .single();

                if (approvedUser?.email) {
                    
                    // 1. Send Profile Update Approval Email
                    const changedFields = Object.keys(profileRequest.requested_changes || {});
                    await sendProfileUpdateApprovalNotification(approvedUser.email, approvedUser.name || 'Devotee', `${baseUrl}/dashboard`, changedFields);
                    log('Profile update approval email sent');

                    // 2. Generate Membership ID (if required fields are present and ID is missing)
                    try {
                        await generateMembershipIdForUser(supabaseAdmin, userId);
                        log('Membership ID generated/verified');
                    } catch (genErr: any) {
                        log(`Membership ID generation skipped/failed: ${genErr.message}`);
                    }
                }
            } catch (postErr: any) {
                log(`Error in post-approval actions: ${postErr.message}`);
                // Don't fail the whole request if email/ID fails
            }
        }

        // Update the request status
        const { error: updateRequestError } = await supabaseAdmin
            .from('profile_update_requests')
            .update({
                status,
                admin_feedback: feedback || null, // Save feedback even if approved
                reviewed_by: adminUser.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateRequestError) {
            log(`Request update error: ${updateRequestError.message}`);
            return NextResponse.json({ error: 'Failed to update request status', debug: debugLogs }, { status: 500 });
        }

        return NextResponse.json({ success: true, debug: debugLogs });

    } catch (error: any) {
        console.error('API Error:', error);
        log(`CRITICAL EXCEPTION: ${error.message}\nStack: ${error.stack}`);
        return NextResponse.json({ error: 'Internal server error', details: error.message, debug: debugLogs }, { status: 500 });
    }
}

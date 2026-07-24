import { createClient } from '@/lib/supabase/server-db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg); // Forced console log for debugging
        debugLogs.push(msg);
    };

    try {

        const supabase = createClient();

        const user = await getAuthUserFromRequest(request);

        if (!user) {
            log(`Auth error: User not authenticated`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
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

        log(`Batch Batch Roles check: Super=${isSuperAdmin}, Global=${isGlobalAdmin}, Temple=${isTempleAdmin}, Project=${isProjectAdmin}, Counselor=${isCounselor}`);

        if (!isSuperAdmin && !isGlobalAdmin && !isTempleAdmin && !isProjectAdmin && !isCounselor) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions', debug: debugLogs }, { status: 403 });
        }

        const { requestIds, status, feedback } = await request.json();

        if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
            return NextResponse.json({ error: 'Invalid request: No IDs provided' }, { status: 400 });
        }

        // Temple Scoped Security for Temple Admin (Batch)
        let allowedTempleNames: string[] = [];
        let allowedCenterNames: string[] = [];
        
        if (isTempleAdmin && !isSuperAdmin && !isGlobalAdmin) {
            const { data: managedTemples } = await supabase
                .from('temples')
                .select('name')
                .or(`managing_director_id.eq.${user.id},director_id.eq.${user.id},central_voice_manager_id.eq.${user.id},yp_id.eq.${user.id}`);
            
            allowedTempleNames = (managedTemples as any[] || []).map((t: any) => t.name.trim().toLowerCase());

            if (allowedTempleNames.length === 0 && !isProjectAdmin) {
                return NextResponse.json({ error: 'Forbidden: No temples assigned to Admin', debug: debugLogs }, { status: 403 });
            }
        }
        
        if (isProjectAdmin && !isSuperAdmin && !isGlobalAdmin) {
            const { data: managedCenters } = await supabase
                .from('centers')
                .select('name')
                .or(`project_manager_id.eq.${user.id},project_advisor_id.eq.${user.id},acting_manager_id.eq.${user.id}`);
            
            allowedCenterNames = (managedCenters as any[] || []).map((c: any) => c.name.trim().toLowerCase());

            if (allowedCenterNames.length === 0 && !isTempleAdmin) {
                return NextResponse.json({ error: 'Forbidden: No centers assigned to Admin', debug: debugLogs }, { status: 403 });
            }
        }

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        log(`Batch processing ${requestIds.length} requests as ${status}`);

        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Process each request
        for (const id of requestIds) {
            try {
                // 1. Fetch the request details
                const { data: requestData, error: fetchError } = await supabase
                    .from('profile_update_requests')
                    .select('id, user_id, status, requested_changes')
                    .eq('id', id)
                    .single();

                if (fetchError || !requestData) {
                    results.push({ id, success: false, error: 'Request not found' });
                    failCount++;
                    continue;
                }

                if (requestData.status !== 'pending') {
                    results.push({ id, success: false, error: 'Request is not pending' });
                    failCount++;
                    continue;
                }

                // Scoped Security Check
                if (!isSuperAdmin && !isGlobalAdmin) {
                    const { data: targetUser } = await supabase
                        .from('users')
                        .select('hierarchy, counselor_id')
                        .eq('id', requestData.user_id)
                        .single();

                    const uH = targetUser?.hierarchy || {};

                    let isAuthorized = false;
                    let errorMsg = 'Unauthorized: Scope mismatch';

                    if (isTempleAdmin) {
                        const userT = uH.currentTemple?.name || uH.currentTemple;
                        const userTempleName = (typeof userT === 'string' ? userT : userT?.name || '').trim().toLowerCase();
                        const reqTempleName = (requestData.temple_name || '').trim().toLowerCase();

                        if ((userTempleName && allowedTempleNames.includes(userTempleName)) || 
                            (reqTempleName && allowedTempleNames.includes(reqTempleName))) {
                            isAuthorized = true;
                        } else {
                            errorMsg = 'Unauthorized: Temple mismatch';
                        }
                    } 
                    
                    if (!isAuthorized && isProjectAdmin) {
                        const userC = uH.center?.name || uH.center;
                        const userCenterName = (typeof userC === 'string' ? userC : userC?.name || '').trim().toLowerCase();
                        const reqCenterName = (requestData.center_name || '').trim().toLowerCase();

                        if ((userCenterName && allowedCenterNames.includes(userCenterName)) || 
                            (reqCenterName && allowedCenterNames.includes(reqCenterName))) {
                            isAuthorized = true;
                        } else {
                            errorMsg = 'Unauthorized: Center mismatch';
                        }
                    } 
                    
                    if (!isAuthorized && isCounselor) {
                        const adminEmail = user.email;
                        if (!adminEmail) {
                            errorMsg = 'Unauthorized: Admin email missing';
                        } else {

                        const normalizedAdminEmail = adminEmail.trim().toLowerCase();

                        // Lookup Counselor ID and Name
                        const { data: counselorData } = await supabase
                            .from('counselors')
                            .select('id, name')
                            .eq('email', normalizedAdminEmail)
                            .maybeSingle();

                        const counselorName = counselorData?.name ? counselorData.name.trim().toLowerCase() : null;
                        const adminCounselorId = counselorData?.id || null;

                        // Current Counselor Emails/Names
                        const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
                        const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
                        const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
                        const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

                        // Requested Counselor Emails/Names/IDs
                        const rC = requestData.requested_changes || {};
                        const rbE = (rC.brahmachariCounselorEmail || '').trim().toLowerCase();
                        const rgE = (rC.grihasthaCounselorEmail || '').trim().toLowerCase();
                        const rbN = (rC.brahmachariCounselor || '').trim().toLowerCase();
                        const rgN = (rC.grihasthaCounselor || '').trim().toLowerCase();
                        const rcId = (rC.counselorId || rC.counselor_id || '').trim();

                        // Existing Counselor ID
                        const uId = (uH.counselorId || uH.counselor_id || '').trim();
                        const uTopId = (targetUser?.counselor_id || '').trim();

                        // 1. Matches by Stable ID (Preferred)
                        const matchesId = (adminCounselorId && (rcId === adminCounselorId || uTopId === adminCounselorId)) || user.id === rcId || user.id === uId || user.id === uTopId;

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
                    results.push({ id, success: false, error: errorMsg });
                    failCount++;
                    continue;
                }
            }

            // 2. If approved, update the user profile
                if (status === 'approved') {
                    const requestedChanges = requestData.requested_changes || {};
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
                    if (requestedChanges.otherCounselor !== undefined) dbUpdates.other_counselor = requestedChanges.otherCounselor;
                    if (requestedChanges.otherCenter !== undefined) dbUpdates.other_center = requestedChanges.otherCenter;
                    if (requestedChanges.otherParentCenter !== undefined) dbUpdates.other_parent_center = requestedChanges.otherParentCenter;

                    // Fetch current user to get existing hierarchy for merger
                    const { data: currentUser } = await supabase
                        .from('users')
                        .select('hierarchy')
                        .eq('id', requestData.user_id)
                        .single();

                    const updatedHierarchy = {
                        ...(currentUser?.hierarchy || {}),
                        ...requestedChanges
                    };
                    dbUpdates.hierarchy = updatedHierarchy;

                    // Update user table
                    const { error: updateError } = await supabase
                        .from('users')
                        .update(dbUpdates)
                        .eq('id', requestData.user_id);

                    if (updateError) {
                        throw new Error(`Failed to update user profile: ${updateError.message}`);
                    }
                }

                // 3. Update request status
                const { error: statusError } = await supabase
                    .from('profile_update_requests')
                    .update({
                        status: status,
                        admin_feedback: feedback || null,
                        reviewed_by: user.id, // Correct column name
                        reviewed_at: new Date().toISOString() // Correct column name
                    })
                    .eq('id', id);

                if (statusError) {
                    throw new Error(`Failed to update request status: ${statusError.message}`);
                }

                results.push({ id, success: true });
                successCount++;

            } catch (err: any) {
                console.error(`Error processing request ${id}:`, err);
                results.push({ id, success: false, error: err.message });
                failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${requestIds.length} requests: ${successCount} successful, ${failCount} failed`,
            results,
            debug: debugLogs
        });

    } catch (error: any) {
        log(`Batch processing error: ${error.message}`);
        return NextResponse.json({ error: 'Internal server error', details: error.message, debug: debugLogs }, { status: 500 });
    }
}

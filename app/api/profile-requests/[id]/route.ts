import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { sendApprovalNotification } from '@/lib/utils/email';
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
        const { id } = params;
        log(`Processing PATCH for ID: ${id}`);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            log('Server configuration error');
            return NextResponse.json({ error: 'Server configuration error', debug: debugLogs }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            log('Missing authorization header');
            return NextResponse.json({ error: 'Missing authorization header', debug: debugLogs }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !adminUser) {
            log(`Auth error: ${authError?.message}`);
            return NextResponse.json({ error: 'Invalid token', debug: debugLogs }, { status: 401 });
        }

        // Verify admin role (Role 8 or 11)
        const { data: adminData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        log(`Admin loaded: ${adminUser.id}, Role Data: ${JSON.stringify(adminData)}`);

        const roles = Array.isArray(adminData?.role) ? adminData.role : [adminData?.role];
        const isSuperAdmin = roles.some((r: any) => r === 8 || r === 'super_admin' || r === 'admin');

        const isGlobalAdmin = roles.some((r: any) =>
            [12, 13].includes(Number(r)) ||
            ['director', 'central_voice_manager'].includes(String(r))
        );

        const isTempleAdmin = roles.some((r: any) =>
            [11, 14, 15, 16, 17, 21].includes(Number(r)) ||
            ['managing_director', 'project_advisor', 'project_manager', 'acting_manager', 'oc', 'youth_preacher'].includes(String(r))
        );

        const isCounselor = roles.some((r: any) =>
            [2, 20].includes(Number(r)) ||
            ['counselor', 'care_giver'].includes(String(r))
        );

        log(`Roles check: Super=${isSuperAdmin}, Global=${isGlobalAdmin}, Temple=${isTempleAdmin}, Counselor=${isCounselor}`);

        if (!isSuperAdmin && !isGlobalAdmin && !isTempleAdmin && !isCounselor) {
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

            if (isTempleAdmin) {
                const { data: adminFullData } = await supabaseAdmin
                    .from('users')
                    .select('hierarchy')
                    .eq('id', adminUser.id)
                    .single();

                const adminTemple = adminFullData?.hierarchy?.currentTemple?.name || adminFullData?.hierarchy?.currentTemple;
                const userTemple = uH.currentTemple?.name || uH.currentTemple;

                const adminT = (typeof adminTemple === 'string' ? adminTemple : adminTemple?.name || '').trim().toLowerCase();
                const userT = (typeof userTemple === 'string' ? userTemple : userTemple?.name || '').trim().toLowerCase();

                log(`Temple Check: AdminTemple=${adminT}, UserTemple=${userT}`);

                if (!adminT || adminT !== userT) {
                    return NextResponse.json({ error: 'Unauthorized: Temple mismatch', debug: debugLogs }, { status: 403 });
                }
            } else if (isCounselor) {
                // Counselor Scoping: Check if admin email matches target user's counselor email OR requested counselor email
                const adminEmail = adminUser.email;
                if (!adminEmail) {
                    return NextResponse.json({ error: 'Unauthorized: Admin email missing', debug: debugLogs }, { status: 403 });
                }

                const normalizedAdminEmail = adminEmail.trim().toLowerCase();

                // Lookup Counselor ID and Name
                const { data: counselorData } = await supabaseAdmin
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
                const rC = profileRequest.requested_changes || {};
                const rbE = (rC.brahmachariCounselorEmail || '').trim().toLowerCase();
                const rgE = (rC.grihasthaCounselorEmail || '').trim().toLowerCase();
                const rbN = (rC.brahmachariCounselor || '').trim().toLowerCase();
                const rgN = (rC.grihasthaCounselor || '').trim().toLowerCase();
                const rcId = (rC.counselorId || rC.counselor_id || '').trim();

                // Existing Counselor ID
                const uId = (uH.counselorId || uH.counselor_id || '').trim();
                const uTopId = (targetUser?.counselor_id || '').trim();

                log(`Counselor Check: AdminID=${adminUser.id}, AdminCounselorID=${adminCounselorId}, AdminEmail=${normalizedAdminEmail}, Name=${counselorName}, rbE=${rbE}, rgE=${rgE}, rbN=${rbN}, rgN=${rgN}, rcId=${rcId}, uId=${uId}, uTopId=${uTopId}`);

                // 1. Matches by Stable ID (Preferred)
                const matchesId = (adminCounselorId && (rcId === adminCounselorId || uTopId === adminCounselorId)) || adminUser.id === rcId || adminUser.id === uId || adminUser.id === uTopId;

                // 2. Matches by Email (Legacy)
                const matchesEmail = bE === normalizedAdminEmail || gE === normalizedAdminEmail ||
                    rbE === normalizedAdminEmail || rgE === normalizedAdminEmail;

                // 3. Matches by Name (Fallback)
                const matchesName = counselorName && (
                    bN === counselorName || gN === counselorName ||
                    rbN === counselorName || rgN === counselorName
                );

                if (!matchesId && !matchesEmail && !matchesName) {
                    return NextResponse.json({ error: 'Unauthorized: Counselor mismatch', debug: debugLogs }, { status: 403 });
                }
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
                    .select('email, name, verification_status')
                    .eq('id', userId)
                    .single();

                if (approvedUser?.email) {
                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                    
                    // 1. Send Approval Email
                    await sendApprovalNotification(approvedUser.email, approvedUser.name || 'Devotee', `${baseUrl}/dashboard`);
                    log('Approval email sent');

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

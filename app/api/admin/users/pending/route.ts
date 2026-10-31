import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabase = getAdminClient();

        // Auth check
        const adminUser = await getAuthUserFromRequest(request);
        if (!adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check Permissions
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, hierarchy, current_temple, current_center, center_id')
            .eq('id', adminUser.id)
            .single();

        if (!adminProfile) {
            return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
        }

        const roles = Array.isArray(adminProfile.role) ? adminProfile.role : [adminProfile?.role];
        const roleNums = roles.map((r: any) => Number(r));

        // Roles
        const isSuperAdmin = roleNums.includes(8);
        const isTempleAdmin = roleNums.some((r: number) => [11, 12, 13, 21].includes(r));
        const isCenterAdmin = roleNums.some((r: number) => [14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(r));
        const isCounselor = roleNums.some((r: number) => [2, 20].includes(r));

        if (!isSuperAdmin && !isTempleAdmin && !isCenterAdmin && !isCounselor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Helper to safely extract name from hierarchy field (string | object)
        const extractName = (val: any) => {
            if (!val) return '';
            if (typeof val === 'string') return val;
            return val.name || '';
        };

        // Normalize string for comparison
        const normalize = (str: string) => (str || '').trim().toLowerCase();

        // 1. Fetch user's allocated temples if they are a temple admin (strictly from DB, NO home temple fallback)
        let allocatedTempleNames: string[] = [];
        if (isTempleAdmin) {
            const { data: assignedTemples } = await supabase
                .from('temples')
                .select('name')
                .or(`managing_director_id.eq.${adminUser.id},director_id.eq.${adminUser.id},central_voice_manager_id.eq.${adminUser.id},yp_id.eq.${adminUser.id}`);

            if (assignedTemples && assignedTemples.length > 0) {
                allocatedTempleNames = assignedTemples.map((t: any) => normalize(t.name)).filter(Boolean);
            }
        }

        // 2. Fetch user's allocated centers if they are a center admin (strictly from DB, NO home center fallback)
        let allocatedCenterIds: string[] = [];
        let allocatedCenterNames: string[] = [];

        if (isCenterAdmin) {
            // Direct allocations on centers table
            const { data: directCenters } = await supabase
                .from('centers')
                .select('id, name')
                .or(`project_manager_id.eq.${adminUser.id},project_advisor_id.eq.${adminUser.id},acting_manager_id.eq.${adminUser.id},oc_id.eq.${adminUser.id},care_giver_id.eq.${adminUser.id},youth_preacher_id.eq.${adminUser.id},internal_manager_id.eq.${adminUser.id},preaching_coordinator_id.eq.${adminUser.id},morning_program_in_charge_id.eq.${adminUser.id},accountant_id.eq.${adminUser.id},kitchen_head_id.eq.${adminUser.id},study_in_charge_id.eq.${adminUser.id},event_admin_id.eq.${adminUser.id},grihstha_counselor_id.eq.${adminUser.id},easy_incharge_id.eq.${adminUser.id},prerna_incharge_id.eq.${adminUser.id}`);

            if (directCenters && directCenters.length > 0) {
                directCenters.forEach((c: any) => {
                    if (c.id) allocatedCenterIds.push(c.id);
                    if (c.name) allocatedCenterNames.push(normalize(c.name));
                });
            }

            // Junction table allocations (user_centers)
            const { data: userCenters } = await supabase
                .from('user_centers')
                .select('center_id')
                .eq('user_id', adminUser.id);

            if (userCenters && userCenters.length > 0) {
                const cIds = userCenters.map((uc: any) => uc.center_id).filter(Boolean);
                if (cIds.length > 0) {
                    const { data: cData } = await supabase
                        .from('centers')
                        .select('id, name')
                        .in('id', cIds);
                    if (cData) {
                        cData.forEach((c: any) => {
                            if (c.id) allocatedCenterIds.push(c.id);
                            if (c.name) allocatedCenterNames.push(normalize(c.name));
                        });
                    }
                }
            }

            allocatedCenterIds = Array.from(new Set(allocatedCenterIds));
            allocatedCenterNames = Array.from(new Set(allocatedCenterNames));
        }

        console.log(`PendingUsers Debug: Admin=${adminUser.email} Roles=${roleNums} AllocatedTemples=${allocatedTempleNames.join(',')} AllocatedCenters=${allocatedCenterNames.join(',')}`);

        // 4. Fetch Pending Users
        // We fetch ALL pending users first, then filter in memory based on admin rights
        // This allows complex matching (fuzzy hierarchy, etc.) that is hard to do in SQL policies alone
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select(`
                id, email, name, role, hierarchy, 
                current_temple, current_center, center, center_id, 
                counselor_id, verification_status,
                counselor:counselors(name)
            `)
            .eq('verification_status', 'pending');

        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        // NEW: Fetch Counselor ID and Name for the current admin
        const { data: adminCounselor } = await supabase
            .from('counselors')
            .select('id, name')
            .eq('email', normalize(adminUser.email || ''))
            .maybeSingle();

        const counselorName = adminCounselor?.name ? normalize(adminCounselor.name) : null;
        const adminCounselorId = adminCounselor?.id || null;

        // NEW: Fetch all pending profile update requests to check for counselor changes
        const { data: profileRequests } = await supabase
            .from('profile_update_requests')
            .select('user_id, requested_changes')
            .eq('status', 'pending');

        const userToRequestedCounselor = new Map<string, { emails: string[], names: string[] }>();
        if (profileRequests) {
            profileRequests.forEach((req: any) => {
                const rC = req.requested_changes || {};
                const emails: string[] = [];
                const names: string[] = [];
                if (rC.brahmachariCounselorEmail) emails.push(normalize(rC.brahmachariCounselorEmail));
                if (rC.grihasthaCounselorEmail) emails.push(normalize(rC.grihasthaCounselorEmail));
                if (rC.brahmachariCounselor) names.push(normalize(rC.brahmachariCounselor));
                if (rC.grihasthaCounselor) names.push(normalize(rC.grihasthaCounselor));

                if (emails.length > 0 || names.length > 0) {
                    userToRequestedCounselor.set(req.user_id, { emails, names });
                }
            });
        }

        // ------------------------------------------------------------------
        // Filter Logic
        // ------------------------------------------------------------------
        const filteredUsers = (users || []).filter((user: any) => {
            // 1. Super Admin sees all
            if (isSuperAdmin) return true;

            const matches = [];

            // 2. Temple Admin: Check Temple Match ONLY against explicitly allocated temples in DB
            if (isTempleAdmin && allocatedTempleNames.length > 0) {
                const userTemple = normalize(user.current_temple || extractName(user.hierarchy?.currentTemple) || user.hierarchy?.temple);
                if (userTemple && allocatedTempleNames.includes(userTemple)) {
                    matches.push(true);
                }
            }

            // 3. Center Admin: Check Center Match ONLY against explicitly allocated centers in DB
            if (isCenterAdmin && (allocatedCenterNames.length > 0 || allocatedCenterIds.length > 0)) {
                const userCenter = normalize(user.current_center || user.center || extractName(user.hierarchy?.currentCenter) || extractName(user.hierarchy?.center));
                const userCenterId = user.center_id || user.hierarchy?.centerId;
                if ((userCenter && allocatedCenterNames.includes(userCenter)) ||
                    (userCenterId && allocatedCenterIds.includes(userCenterId))) {
                    matches.push(true);
                }
            }

            // 4. Counselor Admin: Check Counselor Email/Name Match (Dual Visibility)
            if (isCounselor) {
                const adminEmail = normalize(adminUser.email || '');
                if (adminEmail) {
                    const uH = user.hierarchy || {};
                    const bE = normalize(uH.brahmachariCounselorEmail || '');
                    const gE = normalize(uH.grihasthaCounselorEmail || '');
                    const bN = normalize(uH.brahmachariCounselor || '');
                    const gN = normalize(uH.grihasthaCounselor || '');

                    // Authority via Stable ID (Preferred)
                    const matchesId = adminCounselorId && user.counselor_id === adminCounselorId;

                    // Authority via Current Counselor (Email or Name - Legacy)
                    const matchesLegacy = (bE === adminEmail || gE === adminEmail) ||
                        (counselorName && (bN === counselorName || gN === counselorName));

                    if (matchesId || matchesLegacy) {
                        matches.push(true);
                    } else {
                        // Check if admin is the newly REQUESTED counselor (Email or Name)
                        const reqObj = userToRequestedCounselor.get(user.id);
                        if (reqObj) {
                            const matchesRequested = reqObj.emails.includes(adminEmail) ||
                                (counselorName && reqObj.names.includes(counselorName));
                            if (matchesRequested) {
                                matches.push(true);
                            }
                        }
                    }
                }
            }

            return matches.length > 0;
        });

        console.log(`PendingUsers Final Count: ${filteredUsers.length}`);

        return NextResponse.json({ success: true, data: filteredUsers });

    } catch (error: any) {
        console.error('Error fetching pending users:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

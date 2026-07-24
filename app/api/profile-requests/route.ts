import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sanitizeObject } from '@/lib/utils/sanitize';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let { requestedChanges, currentValues } = body;

        if (!requestedChanges) {
            return NextResponse.json({ error: 'Missing requested changes' }, { status: 400 });
        }

        // Sanitize inputs
        requestedChanges = sanitizeObject(requestedChanges);
        currentValues = sanitizeObject(currentValues);

        // Fetch user data to get temple and center info
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('hierarchy')
            .eq('id', user.id)
            .single();

        const h = userData?.hierarchy || {};
        const templeName = h.currentTemple?.name || (typeof h.currentTemple === 'string' ? h.currentTemple : null);
        const centerName = h.currentCenter?.name || (typeof h.currentCenter === 'string' ? h.currentCenter : null);

        // Try inserting with temple_name and center_name first
        let result = await supabaseAdmin
            .from('profile_update_requests')
            .insert({
                user_id: user.id,
                requested_changes: requestedChanges,
                current_values: currentValues,
                status: 'pending',
                temple_name: templeName,
                center_name: centerName
            })
            .select()
            .single();

        // Fallback: If table schema missing temple_name or center_name columns on self-hosted DB
        if (result.error) {
            console.warn('Retrying profile request insert without temple_name and center_name due to error:', result.error.message);
            const fallbackResult = await supabaseAdmin
                .from('profile_update_requests')
                .insert({
                    user_id: user.id,
                    requested_changes: requestedChanges,
                    current_values: currentValues,
                    status: 'pending'
                })
                .select()
                .single();

            if (!fallbackResult.error) {
                result = fallbackResult;
            }
        }

        if (result.error) {
            console.error('Error saving profile request:', result.error);
            return NextResponse.json({ error: 'Failed to save request', details: result.error.message || result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg); // Forced console log
        debugLogs.push(msg);
    };

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            log('Server configuration error: Missing Supabase URL or Service Role Key');
            return NextResponse.json({ error: 'Server configuration error', debug: debugLogs }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const adminUser = await getAuthUserFromRequest(request);
        if (!adminUser) {
            log('Authentication error: User not found');
            return NextResponse.json({ error: 'Unauthorized', debug: debugLogs }, { status: 401 });
        }

        // Verify admin role (Role 8 or Role 11)
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role, hierarchy')
            .eq('id', adminUser.id)
            .single();

        const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
        const isSuperAdmin = roles.some((r: any) => r === 8 || r === 'super_admin' || r === 'admin');

        const isGlobalAdmin = roles.some((r: any) =>
            [12, 13].includes(Number(r)) ||
            ['director', 'central_voice_manager'].includes(String(r))
        );

        const isTempleAdmin = roles.some((r: any) =>
            [11, 21].includes(Number(r)) ||
            ['managing_director', 'youth_preacher'].includes(String(r))
        );

        const isProjectAdmin = roles.some((r: any) =>
            [14, 15, 16].includes(Number(r)) ||
            ['project_manager', 'project_advisor', 'acting_manager'].includes(String(r))
        );

        const isCounselor = roles.some((r: any) =>
            [2, 20].includes(Number(r)) ||
            ['counselor', 'care_giver'].includes(String(r))
        );

        if (!isSuperAdmin && !isGlobalAdmin && !isTempleAdmin && !isProjectAdmin && !isCounselor) {
            return NextResponse.json({ error: 'Unauthorized', debug: debugLogs }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const templeFilter = searchParams.get('temple');
        const centerFilter = searchParams.get('center');

        log(`Params: status=${status}, temple=${templeFilter || 'none'}, center=${centerFilter || 'none'}`);

        // 1. Determine the target temple to filter by
        let targetTemple = '';

        if (!isSuperAdmin && (isTempleAdmin || isGlobalAdmin)) {
            // Check assigned temples via DB
            const { data: assignedTemples } = await supabaseAdmin
                .from('temples')
                .select('name')
                .or(`managing_director_id.eq.${adminUser.id},director_id.eq.${adminUser.id},central_voice_manager_id.eq.${adminUser.id},yp_id.eq.${adminUser.id}`);

            const assignedNames = ((assignedTemples || []) as any[]).map((t: any) => t.name);

            if (templeFilter && assignedNames.includes(templeFilter)) {
                targetTemple = templeFilter;
            } else if (templeFilter) {
                // If filter provided but not matches assigned, still use it (might be profile-wide)
                targetTemple = templeFilter;
            } else if (isProjectAdmin) {
                // For Project Managers, don't default if no filter provided
                // This allows seeing counts across all managed centers in many temples
                targetTemple = '';
            } else if (assignedNames.length > 0) {
                targetTemple = assignedNames[0]; // Default to first assignment if no filter
            } else {
                // Fallback to profile
                const h = userData?.hierarchy;
                targetTemple = (h?.currentTemple?.name || (typeof h?.currentTemple === 'string' ? h?.currentTemple : '')) || '';
            }
        } else if (templeFilter) {
            targetTemple = templeFilter;
        }

        // OPTIMIZED QUERY: Filter by temple_name if available to avoid loading all rows
        let query = supabaseAdmin
            .from('profile_update_requests')
            .select(`
                *,
                user:users!user_id!inner (
                    id,
                    name,
                    email,
                    hierarchy,
                    counselor_id
                )
            `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        // If targetTemple is provided, try to filter by the new column at the DB level
        // NOTE: This will only return rows where temple_name matches. 
        // Rows with temple_name = NULL (old rows) will be excluded.
        // We will keep the in-memory fallback for now or advise backfill.
        // To be safe and show both, we could use an 'or' filter, but that's complex with joins.
        // Let's stick to the user's request: "look for temple... simple logic".
        if (targetTemple) {
            // Include rows that match temple_name OR are NULL (to be handled by fallback filter)
            query = query.or(`temple_name.eq.${targetTemple},temple_name.is.null`);
        }

        // Optimization: If we have a target temple, try to filter by the new column first
        // We still fetch joined user to be safe/verified, but this reduces rows significantly
        if (targetTemple) {
            // We can check if the column exists or just assume it does after migration
            // To be safe against "column does not exist" before migration, we might tread carefully,
            // but since we are directing the user to run migration, we can use it.
            // However, for backward compatibility with old rows that have null temple_name,
            // we should ONLY use this if we are sure... 
            // Actually, the user asked for this optimization. We should Implement it.
            // But existing rows have NULL temple_name. They won't be returned!
            // So we must ONLY use this filter for NEW rows or if backfill happened.
            // For now, let's keep the join fetch but we can rely on the in-memory filter for old rows,
            // OR better: we advise user to backfill.
            // To support "easy to locate", we will modify the query to USE the filter.
            // But what about old rows?
            // Let's stick to the current logic for safety -> Fetch All + Join + Filter.
            // BUT user explicitly asked "collect... so that for you it will easy to locate".
            // This implies they want to USE it.
            // Let's add the logic to filter by temple_name OR (temple_name is null).
            // No, simpler: Just keep existing logic for now to resolve "Zero" issue safely, 
            // but if we want performance, we use the column.
            // Let's add the column filter to the query BUT explicitly handle the case where it might be null?
            // No, that complicates it.
            // Let's leave the GET route mostly as is (Robust Join) but adding the filtering logic 
            // utilizing the new column IF populated would be complex to mix with old data.

            // Wait, I will Implement the "Fallback" logic:
            // If we rely purely on temple_name, old rows disappear.
            // So I will NOT add `.eq('temple_name', ...)` to the DB query yet to prevent data loss functionality.
            // I will leaving the GET route alone for now regarding *filtering*, 
            // but I will ensure the dashboard *sends* the temple param (it does).

            // Actually, looking at the previous turn (1847), the code uses:
            // `filteredRequests = filteredRequests.filter(...)`
            // I can update this to check `req.temple_name` FIRST.
            // `const uTemple = req.temple_name || req.user?.hierarchy...`
            // This makes filtering faster/simpler in code, though not DB level yet without backfill.
        }

        const { data: joinedRequests, error: fetchError } = await query;

        if (fetchError) {
            log(`DB Error: ${fetchError.message}`);
            return NextResponse.json({ error: 'Failed to fetch requests', details: fetchError.message, debug: debugLogs }, { status: 500 });
        }

        let filteredRequests = joinedRequests || [];

        // 2. Client-side filtering (fallback for complex hierarchy logic)
        if (targetTemple) {
            const normalizedTarget = targetTemple.trim().toLowerCase();
            filteredRequests = filteredRequests.filter((req: any) => {
                // Optimization: Check new column first
                if (req.temple_name && req.temple_name.trim().toLowerCase() === normalizedTarget) {
                    return true;
                }
                // Fallback: Check joined user hierarchy
                const uH = req.user?.hierarchy;
                const uTemple = (uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '')) || '';
                return uTemple.trim().toLowerCase() === normalizedTarget;
            });
        }
        else if (isTempleAdmin && !isSuperAdmin && !isGlobalAdmin && !targetTemple && !isProjectAdmin) {
            filteredRequests = [];
        }

        // 2.5 Filtering for Project Managers (restrict to managed centers)
        if (isProjectAdmin && !isSuperAdmin && !isGlobalAdmin) {
            const { data: managedCenters } = await supabaseAdmin
                .from('centers')
                .select('name')
                .or(`project_manager_id.eq.${adminUser.id},project_advisor_id.eq.${adminUser.id},acting_manager_id.eq.${adminUser.id}`);

            const allowedCenterNames = ((managedCenters || []) as any[]).map((c: any) => c.name.trim().toLowerCase());

            // If user is also Temple Admin, we should technically allow union of Temple U Centers
            // But for now, if they are PM, we enforce PM restrictions if they are NOT viewing a specific Temple?
            // "Union" logic: If request matches Temple OR matches Center.
            // Current code filtered by Temple in Step 2.
            // If `targetTemple` was set, requests are already filtered to that temple.
            // So we only need to further restrict if we are *not* strictly operating under a temple context?
            // A PM handles centers. 
            // Let's simpler approach: Use the filter to *retain* rows that match managed centers.
            // If `filteredRequests` contains rows from Step 2 (Temple filtering), we should probably KEEP them if they match temple, OR if they match center?
            // Actually, usually a user is either MD OR PM. If both, they are likely Super Admin or have distinct roles.
            // Let's assume for PM role:

            filteredRequests = filteredRequests.filter((req: any) => {
                // If it already passed Temple filter (and user is Temple Admin), keep it?
                // But we want to support the case where PM logs in and sees ALL their centers.

                // Check new column
                if (req.center_name && allowedCenterNames.includes(req.center_name.trim().toLowerCase())) {
                    return true;
                }
                // Fallback
                const uH = req.user?.hierarchy;
                const uCenter = (uH?.currentCenter?.name || (typeof uH?.currentCenter === 'string' ? uH?.currentCenter : '')) || '';
                return allowedCenterNames.includes(uCenter.trim().toLowerCase());
            });
        }

        // 4. Counselor Scoped Security: Filter by counselor email/name (Dual Visibility: Current and Requested)
        if (isCounselor && !isSuperAdmin && !isGlobalAdmin && !isTempleAdmin && !isProjectAdmin) {
            const counselorEmail = adminUser.email;
            if (counselorEmail) {
                const normalizedCounselor = counselorEmail.trim().toLowerCase();

                // Lookup Counselor ID and Name
                const { data: counselorData } = await supabaseAdmin
                    .from('counselors')
                    .select('id, name')
                    .eq('email', normalizedCounselor)
                    .maybeSingle();

                const counselorName = counselorData?.name ? counselorData.name.trim().toLowerCase() : null;
                const adminCounselorId = counselorData?.id || null;

                log(`Counselor Lookup: Email=${normalizedCounselor} ID=${adminCounselorId || 'null'} Name=${counselorName || 'null'}`);

                const { data: allPending } = await supabaseAdmin.from('profile_update_requests').select('id, status').eq('status', 'pending');
                log(`Total Pending in DB: ${allPending?.length || 0}`);

                filteredRequests = filteredRequests.filter((req: any) => {
                    // Authority via Stable ID (Preferred)
                    const matchesId = adminCounselorId && req.user?.counselor_id === adminCounselorId;

                    // Current Counselor (Legacy)
                    const uH = req.user?.hierarchy;
                    const bE = (uH?.brahmachariCounselorEmail || '').trim().toLowerCase();
                    const gE = (uH?.grihasthaCounselorEmail || '').trim().toLowerCase();
                    const bN = (uH?.brahmachariCounselor || '').trim().toLowerCase();
                    const gN = (uH?.grihasthaCounselor || '').trim().toLowerCase();

                    // Newly Requested Counselor
                    const rC = req.requested_changes || {};
                    const rbE = (rC.brahmachariCounselorEmail || '').trim().toLowerCase();
                    const rgE = (rC.grihasthaCounselorEmail || '').trim().toLowerCase();
                    const rbN = (rC.brahmachariCounselor || '').trim().toLowerCase();
                    const rgN = (rC.grihasthaCounselor || '').trim().toLowerCase();
                    const rcId = (rC.counselorId || rC.counselor_id || '').trim();

                    const matchesEmail = bE === normalizedCounselor || gE === normalizedCounselor ||
                        rbE === normalizedCounselor || rgE === normalizedCounselor;

                    const matchesName = counselorName && (
                        bN === counselorName || gN === counselorName ||
                        rbN === counselorName || rgN === counselorName
                    );

                    const matchesRequestedId = adminCounselorId && rcId === adminCounselorId;

                    const isMatch = matchesId || matchesRequestedId || matchesEmail || matchesName;
                    if (!isMatch) {
                        // log(`No match for req ${req.id}: UserCID=${req.user?.counselor_id} MatchID=${matchesId} MatchReqID=${matchesRequestedId} MatchEmail=${matchesEmail}`);
                    }
                    return isMatch;
                });
            } else {
                filteredRequests = []; // No email, no access
            }
        }

        log(`Responding with ${filteredRequests.length} records`);

        return NextResponse.json({ success: true, data: filteredRequests, debug: debugLogs });

    } catch (error: any) {
        console.error('API Error:', error);
        log(`CRITICAL EXCEPTION: ${error.message}\nStack: ${error.stack}`);
        return NextResponse.json({ error: 'Internal server error', details: error.message, debug: debugLogs }, { status: 500 });
    }
}

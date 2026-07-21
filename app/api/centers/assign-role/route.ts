import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Authenticate Requester
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user: requesterUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !requesterUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Requester Profile & Permissions
        const { data: requesterProfile, error: profileError } = await supabase
            .from('users')
            .select('role, hierarchy')
            .eq('id', requesterUser.id)
            .single();

        if (profileError || !requesterProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
        }

        const requesterRoles = Array.isArray(requesterProfile.role) ? requesterProfile.role : [requesterProfile.role];
        // Allow Roles: 14 (PA), 15 (PM), 16 (AM) or Super Admin (8)
        const isAuthorized = requesterRoles.some((r: any) => [8, 14, 15, 16].includes(Number(r)));

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        const isSuperAdmin = requesterRoles.some((r: any) => Number(r) === 8);

        // 3. Parse Request
        const body = await request.json();
        const { userId, roles } = body; // Changed from roleId to roles (array)

        if (!userId || !Array.isArray(roles)) {
            console.error('API Error: Invalid payload', { userId, roles, type: typeof roles });
            return NextResponse.json({
                error: `Missing userId (${userId}) or invalid roles array (${JSON.stringify(roles)})`
            }, { status: 400 });
        }

        // 4. Validate Target Roles
        // PMs can only assign/revoke specific roles: 1 (Student/Devotee), 17, 22-29
        const MANAGEABLE_ROLES = [1, 17, 22, 23, 24, 25, 26, 27, 28, 29];

        // Ensure all requested roles are within the manageable set
        const invalidRoles = roles.filter(r => !MANAGEABLE_ROLES.includes(Number(r)));
        if (invalidRoles.length > 0) {
            return NextResponse.json({ error: `Invalid role assignment. Allowed roles: ${MANAGEABLE_ROLES.join(', ')}` }, { status: 400 });
        }

        // 5. Verify Scope (Center Match)
        if (!isSuperAdmin) {
            // Fetch validation data: Requester's Centers and Target's Center
            const [requesterCentersResult, targetUserResult] = await Promise.all([
                supabase
                    .from('centers')
                    .select('name')
                    .or(`project_manager_id.eq.${requesterUser.id},project_advisor_id.eq.${requesterUser.id},acting_manager_id.eq.${requesterUser.id}`),
                supabase
                    .from('users')
                    .select('hierarchy, current_center')
                    .eq('id', userId)
                    .single()
            ]);

            const managedCenters = ((requesterCentersResult.data || []) as any[]).map((c: any) => c.name?.trim().toLowerCase());
            const targetUser = targetUserResult.data;

            if (!targetUser) {
                return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
            }

            const tH = targetUser.hierarchy || {};
            const targetCenterName = targetUser.current_center || tH.currentCenter?.name || (typeof tH.currentCenter === 'string' ? tH.currentCenter : null);
            const normalizedTargetCenter = (targetCenterName || '').trim().toLowerCase();

            // Check if ANY of the requester's managed centers match the target's center
            const isManaged = managedCenters.includes(normalizedTargetCenter);

            console.log('API: Scope Check:', {
                requesterId: requesterUser.id,
                managedCenters,
                targetCenter: normalizedTargetCenter,
                isManaged
            });

            let isAuthorized = isManaged;
            if (!isAuthorized && managedCenters.length === 0) {
                const rH = requesterProfile.hierarchy || {};
                const rCenter = rH.currentCenter?.name || (typeof rH.currentCenter === 'string' ? rH.currentCenter : null);
                isAuthorized = (rCenter || '').trim().toLowerCase() === normalizedTargetCenter;
                console.log('API: Fallback Scope Check (Hierarchy):', { rCenter, isAuthorized });
            }

            if (!isAuthorized) {
                console.error('API: Authorization Failed. User does not manage target center.');
                return NextResponse.json({ error: 'You do not manage the center this user belongs to.' }, { status: 403 });
            }
        }

        // 6. Perform Update
        const { data: currentTarget, error: fetchError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        let currentRoles = currentTarget.role || [];
        if (!Array.isArray(currentRoles)) currentRoles = [currentRoles];
        const currentRolesNumbers = currentRoles.map((r: any) => Number(r));

        // Filter out existing manageable roles from the user's current roles
        // We will replace them with the new 'roles' array
        const preservedRoles = currentRolesNumbers.filter((r: number) => !MANAGEABLE_ROLES.includes(r));

        // Combine preserved roles with new manageable roles
        const newRolesSet = new Set([...preservedRoles, ...roles.map((r: any) => Number(r))]);
        const updatedRoles = Array.from(newRolesSet);

        const { error: updateError } = await supabase
            .from('users')
            .update({ role: updatedRoles, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) {
            throw new Error('Failed to update roles in database');
        }

        // 7. Sync with Centers Table
        // We need to update the centers table to reflect these role changes (e.g. set internal_manager_id)
        // Re-fetch target user to get center info (needed for both Super Admin and PMs)
        const { data: syncTargetUser } = await supabase
            .from('users')
            .select('hierarchy, current_center')
            .eq('id', userId)
            .single();

        // Logic to find center ID
        // If Super Admin, we rely on targetUser's center. 
        // If PM, we've already validated they manage this center, so targetUser's center is correct.
        const targetCenterName = (syncTargetUser?.current_center || syncTargetUser?.hierarchy?.currentCenter?.name || syncTargetUser?.hierarchy?.currentCenter || '').trim();

        const oldManageableRoles = currentRolesNumbers.filter((r: number) => MANAGEABLE_ROLES.includes(r));
        const newManageableRoles = roles.map((r: any) => Number(r)).filter((r: number) => MANAGEABLE_ROLES.includes(r));

        const addedRoles = newManageableRoles.filter((r: number) => !oldManageableRoles.includes(r));
        const removedRoles = oldManageableRoles.filter((r: number) => !newManageableRoles.includes(r));

        console.log('API: Target Center Name:', targetCenterName);
        console.log('API: Added Roles:', addedRoles, 'Removed Roles:', removedRoles);

        if (targetCenterName) {
            const roleToColumnMap: Record<number, string> = {
                22: 'internal_manager_id',
                23: 'preaching_coordinator_id',
                24: 'morning_program_in_charge_id',
                25: 'mentor_id',
                26: 'frontliner_id',
                27: 'accountant_id',
                28: 'kitchen_head_id',
                29: 'study_in_charge_id',
                17: 'oc_id'
            };

            const { data: syncTargetUser } = await supabase
                .from('users')
                .select('hierarchy, current_center, name')
                .eq('id', userId)
                .single();

            // We need the center ID to update it. We found the center name earlier.
            // Let's fetch the ID.
            const { data: centerData, error: centerError } = await supabase
                .from('centers')
                .select('id')
                .ilike('name', (syncTargetUser?.current_center || syncTargetUser?.hierarchy?.currentCenter?.name || syncTargetUser?.hierarchy?.currentCenter || '').trim())
                .single();

            if (centerData && !centerError) {
                const centerId = centerData.id;
                const updates: any = {};

                // Handle Removed Roles (Set to NULL)
                for (const role of removedRoles) {
                    const col = roleToColumnMap[role];
                    if (col) {
                        const nameCol = col.replace('_id', '_name');
                        // Only nullify if THIS user is currently the one assigned
                        // We will execute a query: UPDATE centers SET col = NULL, nameCol = NULL WHERE id = centerId AND col = userId
                        await supabase
                            .from('centers')
                            .update({ [col]: null, [nameCol]: null })
                            .eq('id', centerId)
                            .eq(col, userId);
                    }
                }

                // Handle Added Roles (Set to UserId)
                // Also need to revoke from OLD user if someone else held it
                for (const role of addedRoles) {
                    const col = roleToColumnMap[role];
                    if (col) {
                        // 1. Find if anyone else has this role in this center
                        const { data: existingHolder } = await supabase
                            .from('centers')
                            .select(col)
                            .eq('id', centerId)
                            .single();

                        const oldUserId = existingHolder ? (existingHolder as any)[col] : null;

                        if (oldUserId && oldUserId !== userId) {
                            // Revoke role from old user
                            const { data: oldUser } = await supabase.from('users').select('role').eq('id', oldUserId).single();
                            if (oldUser) {
                                let oldUserRoles = oldUser.role || [];
                                if (!Array.isArray(oldUserRoles)) oldUserRoles = [oldUserRoles];
                                const oldUserRolesNum = oldUserRoles.map((r: any) => Number(r));
                                const filteredRoles = oldUserRolesNum.filter((r: number) => r !== role);

                                await supabase
                                    .from('users')
                                    .update({ role: filteredRoles, updated_at: new Date().toISOString() })
                                    .eq('id', oldUserId);
                            }
                        }

                        // 2. Assign to new user in centers table
                        updates[col] = userId;
                        // Also update the name column
                        const nameCol = col.replace('_id', '_name');
                        updates[nameCol] = syncTargetUser?.name || ''; // Use the name from the fetched user profile
                    }
                }

                if (Object.keys(updates).length > 0) {
                    console.log('API: Updating center', centerId, 'with updates:', updates);
                    const { error: updateError } = await supabase
                        .from('centers')
                        .update(updates)
                        .eq('id', centerId);

                    if (updateError) console.error('API: Center update failed:', updateError);
                } else {
                    console.log('API: No center updates required.');
                }
            } else {
                console.log('API: Center not found for name:', targetCenterName);
            }
        } else {
            console.log('API: No target center name found for user:', userId);
        }

        return NextResponse.json({ success: true, message: 'Roles updated successfully' });

    } catch (error: any) {
        console.error('Error in center role assignment:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

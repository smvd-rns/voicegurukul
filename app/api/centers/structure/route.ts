import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

// Roles that support multiple holders
const MULTI_USER_ROLES = [23, 25, 26, 31, 32, 33]; // 23 = Preaching Coordinator, 25 = Mentor, 26 = Frontliner, 31-33 = Grihstha, Easy, Prerna

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // 1. Authenticate Requester
        const requesterUser = await getAuthUserFromRequest(request);
        if (!requesterUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // 2. Fetch Requester Profile & Permissions
        const { data: requesterProfile, error: profileError } = await supabase
            .from('users')
            .select('role, hierarchy, current_center')
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

        // 3. Parse Request
        const body = await request.json();
        // userIds: string[] is used for multi-user roles (25, 26)
        // userId: string is used for single-user roles
        const { centerId, roleValue, userId, userIds } = body;

        if (!centerId || !roleValue) {
            return NextResponse.json({ error: 'Missing required fields: centerId, roleValue' }, { status: 400 });
        }

        // 4. Verify Scope
        const isSuperAdmin = requesterRoles.some((r: any) => Number(r) === 8);
        if (!isSuperAdmin) {
            const { data: centerData } = await supabase
                .from('centers')
                .select('project_manager_id, project_advisor_id, acting_manager_id')
                .eq('id', centerId)
                .single();

            if (!centerData) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

            const managesCenter =
                centerData.project_manager_id === requesterUser.id ||
                centerData.project_advisor_id === requesterUser.id ||
                centerData.acting_manager_id === requesterUser.id;

            if (!managesCenter) {
                return NextResponse.json({ error: 'You do not manage this center.' }, { status: 403 });
            }
        }

        // 5. Map Role to Column
        const roleToColumnMap: Record<number, string> = {
            17: 'oc_id',
            22: 'internal_manager_id',
            23: 'preaching_coordinator_id',
            24: 'morning_program_in_charge_id',
            25: 'mentor_id',
            26: 'frontliner_id',
            27: 'accountant_id',
            28: 'kitchen_head_id',
            29: 'study_in_charge_id',
            31: 'grihstha_counselor_id',
            32: 'easy_incharge_id',
            33: 'prerna_incharge_id'
        };

        const targetCol = roleToColumnMap[Number(roleValue)];
        if (!targetCol) {
            return NextResponse.json({ error: 'Invalid role for structure assignment' }, { status: 400 });
        }

        const roleNum = Number(roleValue);
        const isMultiUser = MULTI_USER_ROLES.includes(roleNum);

        // =========================================================
        // MULTI-USER PATH (Mentor / Frontliner)
        // =========================================================
        if (isMultiUser) {
            // userIds is the complete new list of assigned userIds
            const newUserIds: string[] = Array.isArray(userIds) ? userIds : [];

            // A. Fetch current center data
            const { data: centerInfo } = await supabase
                .from('centers')
                .select('id, name, mentor_ids, mentor_names, frontliner_ids, frontliner_names, preaching_coordinator_ids, preaching_coordinator_names, grihstha_counselor_ids, grihstha_counselor_names, easy_incharge_ids, easy_incharge_names, prerna_incharge_ids, prerna_incharge_names')
                .eq('id', centerId)
                .single() as { data: any, error: any };



            const idsCol = targetCol.replace('_id', '_ids'); // mentor_ids / frontliner_ids
            const namesCol = targetCol.replace('_id', '_names'); // mentor_names / frontliner_names

            const currentIds: string[] = centerInfo?.[idsCol] || [];

            // B. Users to ADD (in new list but not in current)
            const toAdd = newUserIds.filter(id => !currentIds.includes(id));
            // C. Users to REMOVE (in current but not in new list)
            const toRemove = currentIds.filter(id => !newUserIds.includes(id));

            // D. Remove role from revoked users
            for (const uid of toRemove) {
                const { data: oldUser } = await supabase.from('users').select('role').eq('id', uid).single();
                if (oldUser) {
                    let oldRoles = Array.isArray(oldUser.role) ? oldUser.role : [oldUser.role];
                    const filtered = oldRoles.map((r: any) => Number(r)).filter((r: number) => r !== roleNum);
                    await supabase.from('users').update({ role: filtered, updated_at: new Date().toISOString() }).eq('id', uid);
                }
            }

            // E. Add role to new users
            const newUserNames: string[] = [];
            for (const uid of newUserIds) {
                const { data: newUser } = await supabase.from('users').select('role, name').eq('id', uid).single();
                if (newUser) {
                    newUserNames.push(newUser.name);
                    if (toAdd.includes(uid)) {
                        let newRoles = Array.isArray(newUser.role) ? newUser.role : [newUser.role];
                        const newRolesNum = newRoles.map((r: any) => Number(r));
                        if (!newRolesNum.includes(roleNum)) {
                            newRolesNum.push(roleNum);
                            await supabase.from('users').update({ role: newRolesNum, updated_at: new Date().toISOString() }).eq('id', uid);
                        }
                    }
                }
            }

            // F. Update center table with arrays
            const updates: any = {};
            updates[idsCol] = newUserIds.length > 0 ? newUserIds : [];
            updates[namesCol] = newUserNames.length > 0 ? newUserNames : [];
            // Also keep the legacy single-id column pointing at first user (backwards compat)
            updates[targetCol] = newUserIds[0] || null;
            updates[targetCol.replace('_id', '_name')] = newUserNames[0] || null;

            const { error: centerUpdateError } = await supabase.from('centers').update(updates).eq('id', centerId);
            if (centerUpdateError) throw new Error(`Failed to update center: ${centerUpdateError.message}`);

            return NextResponse.json({
                success: true,
                message: 'Multi-user structure updated successfully',
                updated: { role: roleValue, userIds: newUserIds, userNames: newUserNames }
            });
        }

        // =========================================================
        // SINGLE-USER PATH (all other roles)
        // =========================================================
        const targetNameCol = targetCol.replace('_id', '_name');

        const { data: centerInfo } = await supabase.from('centers')
            .select(`id, name, ${targetCol}`)
            .eq('id', centerId)
            .single() as { data: any, error: any };


        const currentHolderId = centerInfo?.[targetCol];

        console.log(`API: Structure Update - Role ${roleValue} at Center ${centerId}. Current: ${currentHolderId}, New: ${userId}`);

        // B. Remove role from previous holder
        if (currentHolderId && currentHolderId !== userId) {
            const { data: oldUser } = await supabase.from('users').select('role').eq('id', currentHolderId).single();
            if (oldUser) {
                let oldRoles = oldUser.role || [];
                if (!Array.isArray(oldRoles)) oldRoles = [oldRoles];
                const oldRolesNum = oldRoles.map((r: any) => Number(r));
                const newOldRoles = oldRolesNum.filter((r: number) => r !== Number(roleValue));
                if (newOldRoles.length !== oldRolesNum.length) {
                    await supabase.from('users').update({ role: newOldRoles, updated_at: new Date().toISOString() }).eq('id', currentHolderId);
                }
            }
        }

        // C. Assign new user
        let newUserName = null;
        if (userId) {
            const { data: newUser } = await supabase.from('users').select('role, name').eq('id', userId).single();
            if (!newUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
            newUserName = newUser.name;
            let newRoles = newUser.role || [];
            if (!Array.isArray(newRoles)) newRoles = [newRoles];
            const newRolesNum = newRoles.map((r: any) => Number(r));
            if (!newRolesNum.includes(Number(roleValue))) {
                newRolesNum.push(Number(roleValue));
                await supabase.from('users').update({ role: newRolesNum, updated_at: new Date().toISOString() }).eq('id', userId);
            }
        }

        // D. Update center table
        const updates: any = {};
        updates[targetCol] = userId || null;
        updates[targetNameCol] = newUserName || null;

        const { error: centerUpdateError } = await supabase.from('centers').update(updates).eq('id', centerId);
        if (centerUpdateError) throw new Error(`Failed to update center: ${centerUpdateError.message}`);

        return NextResponse.json({
            success: true,
            message: 'Structure updated successfully',
            updated: { role: roleValue, userId, userName: newUserName }
        });

    } catch (error: any) {
        console.error('Error in center structure update:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

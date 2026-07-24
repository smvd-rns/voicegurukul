import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        // 1. Auth Check (Super Admin or MD)

        const adminUser = await getAuthUserFromRequest(request);
        if (!adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient();

        // Check admin permissions and hierarchy for scoping in ONE call
        const { data: adminProfile, error: profileError } = await supabase
            .from('users')
            .select('role, hierarchy')
            .eq('id', adminUser.id)
            .single();

        if (profileError || !adminProfile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminRoles = adminProfile.role || [];
        const isSuperAdmin = Array.isArray(adminRoles)
            ? adminRoles.some((r: any) => r === 8 || r === 'super_admin')
            : (adminRoles === 8 || adminRoles === 'super_admin');

        const isManagingDirector = Array.isArray(adminRoles)
            ? adminRoles.some((r: any) => [11, 12, 13, 21].includes(Number(r)) || ['managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(String(r)))
            : ([11, 12, 13, 21].includes(Number(adminRoles)) || ['managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(String(adminRoles)));

        if (!isSuperAdmin && !isManagingDirector) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Process Request
        const body = await request.json();
        const { userId, roleId } = body;

        // MD Scoping Check: If not Super Admin, verify target user is in the same temple
        if (!isSuperAdmin && isManagingDirector) {
            const { data: targetUserCheck, error: targetError } = await supabase
                .from('users')
                .select('hierarchy')
                .eq('id', userId)
                .single();

            if (targetError || !targetUserCheck) {
                return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
            }

            const adminTemple = adminProfile.hierarchy?.currentTemple?.name || adminProfile.hierarchy?.currentTemple;
            const targetTemple = targetUserCheck.hierarchy?.currentTemple?.name || targetUserCheck.hierarchy?.currentTemple;

            const adminT = (typeof adminTemple === 'string' ? adminTemple : adminTemple?.name || '').trim().toLowerCase();
            const targetT = (typeof targetTemple === 'string' ? targetTemple : targetTemple?.name || '').trim().toLowerCase();

            if (!adminT || adminT !== targetT) {
                return NextResponse.json({ error: 'You can only manage users within your own temple.' }, { status: 403 });
            }
        }

        const allowedRoles = [1, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33];

        const { canAdminManageTarget, getRolePowerLevel } = await import('@/lib/utils/roles');

        // Verify target user's current roles and check hierarchy
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (fetchError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const targetRoles = targetUser.role || [];
        if (!canAdminManageTarget(adminRoles, targetRoles, adminUser.id, userId)) {
            return NextResponse.json({ error: 'You do not have permission to manage this user.' }, { status: 403 });
        }

        let currentRoles = targetRoles || [];
        if (!Array.isArray(currentRoles)) currentRoles = [currentRoles];

        console.log(`[Role Debug] User: ${userId}`);
        console.log(`[Role Debug] Current Roles in DB:`, currentRoles);

        // --- Handle role REMOVAL (roleId is null) ---
        if (roleId === null || roleId === undefined) {
            // Strip all manageable admin roles, keep spiritual roles (2, 20), fall back to [1]
            const spiritualRoles = [2, 20];
            const nonAdminRoles = currentRoles.filter((r: any) => spiritualRoles.includes(Number(r)));
            const newRoles = nonAdminRoles.length > 0 ? nonAdminRoles : [1];

            console.log(`[Role Debug] REMOVE mode — Final roles to write:`, newRoles);

            const { error: updateError } = await supabase
                .from('users')
                .update({ role: newRoles, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (updateError) {
                console.error('[Role Debug] Update DB Error (remove):', updateError);
                throw new Error('Failed to remove user role');
            }

            // Revoke all center allocations on role removal
            await supabase.from('user_centers').delete().eq('user_id', userId);

            return NextResponse.json({ success: true, message: 'Role removed successfully' });
        }

        // --- Handle role ASSIGNMENT ---
        // Verify roleId is allowed (1, 11-17, 21-30, 32-33)
        const requestedRole = Number(roleId);
        if (!allowedRoles.includes(requestedRole)) {
            return NextResponse.json({ error: 'Invalid role for this endpoint' }, { status: 400 });
        }

        // MD Hierarchical Check: Cannot assign a role higher than or equal to their own
        if (!isSuperAdmin) {
            const adminHighestPower = Math.min(...(Array.isArray(adminRoles) ? adminRoles : [adminRoles]).map(r => getRolePowerLevel(r)));
            const requestedPower = getRolePowerLevel(requestedRole as any);

            if (requestedPower <= adminHighestPower) {
                return NextResponse.json({ error: 'You do not have permission to assign this role.' }, { status: 403 });
            }
        }

        console.log(`[Role Debug] Allowed roles list to remove:`, allowedRoles);

        // Filter out existing admin roles and always filter out role 1 (it will be added back if it's the target)
        let newRoles = currentRoles.filter((r: any) => !allowedRoles.includes(Number(r)) && Number(r) !== 1);

        console.log(`[Role Debug] Filtered roles:`, newRoles);

        // Add new role if it's not Student, OR if it IS student but no other roles exist
        if (Number(roleId) !== 1) {
            newRoles.push(Number(roleId));
        }

        // Final sanitation: if no roles, or if we explicitly set role 1 and no spiritual roles exist
        if (newRoles.length === 0) {
            newRoles = [1];
        }

        console.log(`[Role Debug] Final roles to write:`, newRoles);

        const { error: updateError } = await supabase
            .from('users')
            .update({ role: newRoles, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) {
            console.error('[Role Debug] Update DB Error:', updateError);
            throw new Error('Failed to update user role');
        }

        // --- Role Handover: Remove this role from ALL other users who currently hold it ---
        // .contains() is not supported in the custom query builder — use raw SQL instead
        const { query: rawQuery } = await import('@/lib/db');
        const holdersRes = await rawQuery(
            `SELECT id, role FROM users WHERE id != $1 AND role::jsonb @> $2::jsonb`,
            [userId, JSON.stringify([requestedRole])]
        );
        const previousHolders = holdersRes.rows;

        if (previousHolders && previousHolders.length > 0) {
            console.log(`[Role Debug] Stripping role ${requestedRole} from ${previousHolders.length} previous holder(s)`);

            for (const holder of previousHolders) {
                const holderRoles: any[] = Array.isArray(holder.role) ? holder.role : [holder.role];
                const stripped = holderRoles.map(Number).filter((r: number) => r !== requestedRole);
                const updatedRoles = stripped.length > 0 ? stripped : [1];

                const { error: stripError } = await supabase
                    .from('users')
                    .update({ role: updatedRoles, updated_at: new Date().toISOString() })
                    .eq('id', holder.id);

                if (stripError) {
                    console.error(`[Role Debug] Failed to strip role from previous holder ${holder.id}:`, stripError);
                } else {
                    console.log(`[Role Debug] ✅ Stripped role ${requestedRole} from user ${holder.id} → new roles:`, updatedRoles);
                }
            }
        }

        // 4. Handle Center Allocation (New Logic)
        const targetRoleId = Number(roleId);
        const multiCenterRoles = [14, 15, 16, 17];

        if (multiCenterRoles.includes(targetRoleId)) {
            // Only proceed if the role allows multi-center
            if (body.centerIds && Array.isArray(body.centerIds)) {
                // Delete existing center mappings for this user
                const { error: deleteError } = await supabase
                    .from('user_centers')
                    .delete()
                    .eq('user_id', userId);

                if (deleteError) console.error('Error clearing old centers:', deleteError);

                if (body.centerIds.length > 0) {
                    const inserts = body.centerIds.map((cid: string) => ({
                        user_id: userId,
                        center_id: cid
                    }));

                    const { error: insertError } = await supabase
                        .from('user_centers')
                        .insert(inserts);

                    if (insertError) throw new Error('Failed to assign centers');
                }
            }
        } else {
            // If the new role DOES NOT support multi-centers (e.g. Student, MD, Director),
            // we must revoke any existing center allocations to prevent stale permissions.
            const { error: revokeError } = await supabase
                .from('user_centers')
                .delete()
                .eq('user_id', userId);

            if (revokeError) console.error('Error revoking centers for downgraded user:', revokeError);
        }

        return NextResponse.json({ success: true, message: 'Role assigned successfully' });

    } catch (error: any) {
        console.error('Error in assign-role route:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

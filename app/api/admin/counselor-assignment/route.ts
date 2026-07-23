import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { normalizeRoleFromFirestore } from '@/lib/utils/roles';

export async function POST(request: Request) {
    try {
        // 1. Auth Check (Super Admin only for now, or those with user management permissions)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Verify admin identity
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin permissions (simplified check - enhance as needed)
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, hierarchy')
            .eq('id', adminUser.id)
            .single();

        const adminRoles = adminProfile?.role || [];
        const hierarchy = adminProfile?.hierarchy || {};

        // Allow role 8 (Super Admin) and Role 11 (Managing Director)
        const isSuperAdmin = Array.isArray(adminRoles)
            ? adminRoles.some((r: any) => r === 8 || r === 'super_admin')
            : (adminRoles === 8 || adminRoles === 'super_admin');

        const isManagingDirector = Array.isArray(adminRoles)
            ? adminRoles.some((r: any) => r === 11 || r === 'managing_director' || r === 12 || r === 'director' || r === 13 || r === 'central_voice_manager')
            : (adminRoles === 11 || adminRoles === 'managing_director' || adminRoles === 12 || adminRoles === 13);

        const isAuthorized = isSuperAdmin || isManagingDirector;

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Process Request
        const body = await request.json();
        const { userId, action, roleType } = body;

        // Check target user in one go if scoping applies
        let targetUser = null;
        const requiredUserFields = 'id, name, email, phone, city, ashram, role, hierarchy, current_temple, parent_temple';

        if (isManagingDirector && !isSuperAdmin) {
            const { data: targetData, error: targetError } = await supabase
                .from('users')
                .select(requiredUserFields)
                .eq('id', userId)
                .single();

            if (targetError || !targetData) {
                return NextResponse.json({ error: 'User found' }, { status: 404 });
            }
            targetUser = targetData;

            const tH = targetUser.hierarchy || {};
            const targetTempleName = (targetUser.current_temple || tH.currentTemple?.name || tH.currentTemple || '').toString().trim();

            if (!targetTempleName) {
                return NextResponse.json({ error: 'Devotee must have a temple assigned in their profile.' }, { status: 400 });
            }

            // Verify if the admin is assigned to THIS specific devotee's temple
            // Using exact case matching as stored in the DB for the name filter
            const { data: templeCheck, error: templeError } = await supabase
                .from('temples')
                .select('id')
                .eq('name', targetTempleName)
                .or(`managing_director_id.eq.${adminUser.id},director_id.eq.${adminUser.id},central_voice_manager_id.eq.${adminUser.id},yp_id.eq.${adminUser.id}`)
                .maybeSingle();

            if (templeError || !templeCheck) {
                console.warn(`Permission Denied: Admin ${adminUser.id} trying to manage temple ${targetTempleName}`);
                return NextResponse.json({ error: 'You do not have permission to manage devotees in this temple.' }, { status: 403 });
            }
        } else {
            // Just fetch target user
            const { data, error: fetchError } = await supabase
                .from('users')
                .select(requiredUserFields)
                .eq('id', userId)
                .single();

            if (fetchError || !data) {
                return NextResponse.json({ error: 'User found' }, { status: 404 });
            }
            targetUser = data;
        }

        const { canAdminManageTarget } = await import('@/lib/utils/roles');

        // Privilege Check: Only Roles 8, 11, 12, 13 can assign/revoke counselor roles
        const canManageCouselors = isSuperAdmin || (Array.isArray(adminRoles)
            ? adminRoles.some((r: any) => [11, 12, 13].includes(Number(r)))
            : [11, 12, 13].includes(Number(adminRoles)));

        if (!canManageCouselors) {
            return NextResponse.json({ error: 'You do not have permission to manage spiritual authorities.' }, { status: 403 });
        }

        if (!canAdminManageTarget(adminRoles, targetUser.role || [], adminUser.id, userId)) {
            return NextResponse.json({ error: 'You do not have permission to manage this user.' }, { status: 403 });
        }

        if (action === 'assign') {
            if (!roleType) {
                return NextResponse.json({ error: 'Role type required for assignment' }, { status: 400 });
            }

            // 1. Validate Ashram (Crucial Step: Fail fast if invalid)
            const userAshram = targetUser.ashram || targetUser.hierarchy?.ashram;

            if (!userAshram) {
                return NextResponse.json({ error: 'User must have an Ashram assigned in their profile to be appointed as a Counselor/Care Giver.' }, { status: 400 });
            }

            // 2. Prepare Counselor Data
            const counselorData = {
                name: targetUser.name,
                email: targetUser.email,
                mobile: targetUser.phone || '',
                city: targetUser.city || targetUser.hierarchy?.city || 'Unknown',
                ashram: userAshram,
                role: roleType,
                is_verified: true,
                user_id: targetUser.id, // Store the actual user UUID for stable linkage
                current_temple: targetUser.current_temple || targetUser.hierarchy?.currentTemple?.name || targetUser.hierarchy?.currentTemple || '',
                parent_temple: targetUser.parent_temple || targetUser.hierarchy?.parentTemple?.name || targetUser.hierarchy?.parentTemple || ''
            };

            // 3. Upsert into Counselors Table FIRST
            // Search for existing by email to upsert
            const { data: existingCounselor } = await supabase
                .from('counselors')
                .select('id')
                .eq('email', targetUser.email)
                .maybeSingle();

            if (existingCounselor) {
                const { error: upsertError } = await supabase
                    .from('counselors')
                    .update(counselorData)
                    .eq('id', existingCounselor.id);

                if (upsertError) throw upsertError;
            } else {
                const { error: insertError } = await supabase
                    .from('counselors')
                    .insert(counselorData);

                if (insertError) throw insertError;
            }

            // 4. Update Users Table (Add 'counselor' role/2 OR 'care_giver') ONLY if step 3 succeeded
            let currentRoles = targetUser.role || [];
            if (!Array.isArray(currentRoles)) currentRoles = [currentRoles];

            // Standardize roles
            const counselorRoleVal = 2; // integer for 'counselor'
            const careGiverRoleVal = 20; // integer for 'care_giver'

            // Determine which role to add
            const roleToAdd = roleType === 'care_giver' ? careGiverRoleVal : counselorRoleVal;

            // Check if already has role
            // Mutual Exclusivity: Remove BOTH Counselor (2) and Care Giver (20) first
            // Also remove Student (1) as they are no longer just a student
            const newRoles = currentRoles.filter((r: any) => r !== counselorRoleVal && r !== careGiverRoleVal && r !== 1);

            // Add the new role
            newRoles.push(roleToAdd);

            // Check if roles actually changed to avoid unnecessary updates
            const isDifferent = JSON.stringify(newRoles.sort()) !== JSON.stringify(currentRoles.sort());

            if (isDifferent) {

                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        role: newRoles,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (updateError) {
                    // Ideally rollback counselor insert here, but omitting for simplicity/rare case
                    // Log critical error
                    console.error('CRITICAL: Counselor inserted but user role update failed for ID:', userId);
                    throw new Error('Failed to update user role');
                }
            }

            return NextResponse.json({ success: true, message: `Assigned ${roleType} role successfully` });

        } else if (action === 'revoke') {
            // A. Update Users Table (Remove 'counselor' role)
            let currentRoles = targetUser.role || [];
            if (!Array.isArray(currentRoles)) currentRoles = [currentRoles];

            const newRoles = currentRoles.filter((r: any) => r !== 2 && r !== 20 && r !== 'counselor' && r !== 'care_giver');

            // Ensure at least one role remains? (Usually 'student'/1)
            if (newRoles.length === 0) {
                newRoles.push(1); // 'student'
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ role: newRoles, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (updateError) {
                throw new Error('Failed to update user role');
            }

            // B. Delete from Counselors Table
            // Delete matches by email
            const { error: deleteError } = await supabase
                .from('counselors')
                .delete()
                .eq('email', targetUser.email);

            if (deleteError) {
                console.error('Error deleting from counselors table:', deleteError);
                // We don't block response here, but log it.
            }

            return NextResponse.json({ success: true, message: 'Role revoked successfully' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error in assign-counselor route:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

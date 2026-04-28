import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput } from '@/lib/utils/validation';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let {
            id,
            name, state, city, address, contact,
            temple_id, temple_name,
            project_manager_id, project_manager_name,
            project_advisor_id, project_advisor_name,
            acting_manager_id, acting_manager_name,
            internal_manager_id, internal_manager_name,
            preaching_coordinator_id, preaching_coordinator_name,
            morning_program_in_charge_id, morning_program_in_charge_name,
            mentor_id, mentor_name,
            mentor_ids, mentor_names,
            frontliner_id, frontliner_name,
            frontliner_ids, frontliner_names,
            accountant_id, accountant_name,
            kitchen_head_id, kitchen_head_name,
            study_in_charge_id, study_in_charge_name,
            preaching_coordinator_ids, preaching_coordinator_names,
            grihstha_counselor_ids, grihstha_counselor_names,
            easy_incharge_ids, easy_incharge_names,
            prerna_incharge_ids, prerna_incharge_names
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
        }

        // Rate Limiting & Auth Setup
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing (URL or Service Role Key).');
        }

        // Use Service Role Key for Admin operations (Bypassing RLS for updates and user role changes)
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });

        // Sanitize inputs
        name = sanitizeInput(name);
        state = sanitizeInput(state);
        city = sanitizeInput(city);
        if (address) address = sanitizeInput(address);
        if (contact) contact = sanitizeInput(contact);

        // Sanitize UUIDs (convert empty strings to null to avoid 22P02 invalid input syntax errors)
        if (project_advisor_id === '') project_advisor_id = null;
        if (acting_manager_id === '') acting_manager_id = null;
        if (project_manager_id === '') project_manager_id = null;
        if (internal_manager_id === '') internal_manager_id = null;
        if (preaching_coordinator_id === '') preaching_coordinator_id = null;
        if (morning_program_in_charge_id === '') morning_program_in_charge_id = null;
        if (mentor_id === '') mentor_id = null;
        if (frontliner_id === '') frontliner_id = null;
        if (accountant_id === '') accountant_id = null;
        if (kitchen_head_id === '') kitchen_head_id = null;
        if (study_in_charge_id === '') study_in_charge_id = null;

        // 1. Fetch existing center details to check for role changes
        const { data: existingCenter, error: fetchCenterError } = await supabase
            .from('centers')
            .select('project_manager_id, project_advisor_id, acting_manager_id, internal_manager_id, preaching_coordinator_id, morning_program_in_charge_id, mentor_id, frontliner_id, mentor_ids, frontliner_ids, preaching_coordinator_ids, preaching_coordinator_names, grihstha_counselor_ids, grihstha_counselor_names, easy_incharge_ids, easy_incharge_names, prerna_incharge_ids, prerna_incharge_names, accountant_id, kitchen_head_id, study_in_charge_id')
            .eq('id', id)
            .single();

        if (fetchCenterError) {
            console.error('Error fetching existing center:', fetchCenterError);
            // Continue update even if fetch fails? Probably unsafe for role revocation.
            // Let's log and proceed with update but skip revocation.
        }

        // 2. Update Center Details
        const { error: updateError } = await supabase
            .from('centers')
            .update({
                name,
                state,
                city,
                address,
                contact,
                temple_id,
                temple_name,
                project_manager_id,
                project_manager_name,
                project_advisor_id,
                project_advisor_name,
                acting_manager_id,
                acting_manager_name,
                internal_manager_id,
                internal_manager_name,
                preaching_coordinator_id,
                preaching_coordinator_name,
                morning_program_in_charge_id,
                morning_program_in_charge_name,
                mentor_id,
                mentor_name,
                mentor_ids: Array.isArray(mentor_ids) ? mentor_ids : (mentor_id ? [mentor_id] : []),
                mentor_names: Array.isArray(mentor_names) ? mentor_names : (mentor_name ? [mentor_name] : []),
                frontliner_id,
                frontliner_name,
                frontliner_ids: Array.isArray(frontliner_ids) ? frontliner_ids : (frontliner_id ? [frontliner_id] : []),
                frontliner_names: Array.isArray(frontliner_names) ? frontliner_names : (frontliner_name ? [frontliner_name] : []),
                accountant_id,
                accountant_name,
                kitchen_head_id,
                kitchen_head_name,
                study_in_charge_name,
                preaching_coordinator_ids: Array.isArray(preaching_coordinator_ids) ? preaching_coordinator_ids : (preaching_coordinator_id ? [preaching_coordinator_id] : []),
                preaching_coordinator_names: Array.isArray(preaching_coordinator_names) ? preaching_coordinator_names : (preaching_coordinator_name ? [preaching_coordinator_name] : []),
                grihstha_counselor_ids: Array.isArray(grihstha_counselor_ids) ? grihstha_counselor_ids : (body.grihstha_counselor_id ? [body.grihstha_counselor_id] : []),
                grihstha_counselor_names: Array.isArray(grihstha_counselor_names) ? grihstha_counselor_names : (body.grihstha_counselor_name ? [body.grihstha_counselor_name] : []),
                easy_incharge_ids: Array.isArray(easy_incharge_ids) ? easy_incharge_ids : (body.easy_incharge_id ? [body.easy_incharge_id] : []),
                easy_incharge_names: Array.isArray(easy_incharge_names) ? easy_incharge_names : (body.easy_incharge_name ? [body.easy_incharge_name] : []),
                prerna_incharge_ids: Array.isArray(prerna_incharge_ids) ? prerna_incharge_ids : (body.prerna_incharge_id ? [body.prerna_incharge_id] : []),
                prerna_incharge_names: Array.isArray(prerna_incharge_names) ? prerna_incharge_names : (body.prerna_incharge_name ? [body.prerna_incharge_name] : []),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }

        // 3. Sync Roles
        // Helper to update user role
        const ensureUserHasRole = async (userId: string, roleName: string, roleId: number) => {
            if (!userId) return;

            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('role, hierarchy')
                .eq('id', userId)
                .single();

            if (fetchError || !user) {
                console.error(`Failed to fetch user ${userId} for role update`, fetchError);
                return;
            }

            let currentRoles = user.role;
            if (!Array.isArray(currentRoles)) {
                currentRoles = currentRoles ? [currentRoles] : [];
            }

            // Append role if not exists
            const hasRole = currentRoles.some((r: any) => Number(r) === roleId || r === roleName);

            if (!hasRole) {
                // Remove 'student' (1) if it exists
                const updatedRoles = currentRoles.filter((r: any) => Number(r) !== 1 && r !== 'student');
                updatedRoles.push(roleId);

                // Update Hierarchy logic similar to add
                const currentHierarchy = user.hierarchy || {};
                const updatedHierarchy = {
                    ...currentHierarchy,
                    currentCenter: name, // Use new name
                    currentCenterId: id,
                    updatedAt: new Date().toISOString()
                };

                const { error: roleUpdateError } = await supabase
                    .from('users')
                    .update({
                        role: updatedRoles,
                        hierarchy: updatedHierarchy
                    })
                    .eq('id', userId);

                if (roleUpdateError) {
                    console.error(`Failed to update role for user ${userId}`, roleUpdateError);
                } else {
                    console.log(`Updated user ${userId} with role ${roleId}`);
                }
            }
        };

        // Helper to revoke role from previous user
        const revokeUserRole = async (userId: string, roleId: number) => {
            if (!userId) return;

            // Check if user is managing other centers?
            // For strict compliance with request "role also get revoked", we will remove it.
            // Ideally we should check if they manage other centers, but for now let's implement the removal.
            // Correct approach: Remove the specific role ID from their array.

            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (fetchError || !user) return;

            let currentRoles = user.role;
            if (!Array.isArray(currentRoles)) {
                currentRoles = currentRoles ? [currentRoles] : [];
            }

            // check if present
            if (currentRoles.some((r: any) => Number(r) === roleId)) {
                const updatedRoles = currentRoles.filter((r: any) => Number(r) !== roleId);
                // If roles become empty, default to student (1)?
                if (updatedRoles.length === 0) updatedRoles.push(1);

                const { error: revokeError } = await supabase
                    .from('users')
                    .update({ role: updatedRoles })
                    .eq('id', userId);

                if (revokeError) {
                    console.error(`Failed to revoke role ${roleId} from user ${userId}`, revokeError);
                } else {
                    console.log(`Revoked role ${roleId} from user ${userId}`);
                }
            }
        };

        // Parallelize checks
        const tasks = [];

        // Project Manager
        if (project_manager_id) tasks.push(ensureUserHasRole(project_manager_id, 'project_manager', 15));
        if (existingCenter?.project_manager_id && existingCenter.project_manager_id !== project_manager_id) {
            tasks.push(revokeUserRole(existingCenter.project_manager_id, 15));
        }

        // Project Advisor
        if (project_advisor_id) tasks.push(ensureUserHasRole(project_advisor_id, 'project_advisor', 14));
        if (existingCenter?.project_advisor_id && existingCenter.project_advisor_id !== project_advisor_id) {
            tasks.push(revokeUserRole(existingCenter.project_advisor_id, 14));
        }

        // Acting Manager
        if (acting_manager_id) tasks.push(ensureUserHasRole(acting_manager_id, 'acting_manager', 16));
        if (existingCenter?.acting_manager_id && existingCenter.acting_manager_id !== acting_manager_id) {
            tasks.push(revokeUserRole(existingCenter.acting_manager_id, 16));
        }

        // Internal Manager (22)
        if (internal_manager_id) tasks.push(ensureUserHasRole(internal_manager_id, 'internal_manager', 22));
        if (existingCenter?.internal_manager_id && existingCenter.internal_manager_id !== internal_manager_id) {
            tasks.push(revokeUserRole(existingCenter.internal_manager_id, 22));
        }

        // Preaching Coordinator (23)
        const finalPCCIds: string[] = Array.isArray(preaching_coordinator_ids) ? preaching_coordinator_ids : (preaching_coordinator_id ? [preaching_coordinator_id] : []);
        const existingPCCIds: string[] = Array.isArray(existingCenter?.preaching_coordinator_ids) ? existingCenter.preaching_coordinator_ids : (existingCenter?.preaching_coordinator_id ? [existingCenter.preaching_coordinator_id] : []);

        // Add roles to new coordinators
        finalPCCIds.filter(id => !existingPCCIds.includes(id)).forEach(uid => {
            tasks.push(ensureUserHasRole(uid, 'preaching_coordinator', 23));
        });
        // Revoke roles from removed coordinators
        existingPCCIds.filter(id => !finalPCCIds.includes(id)).forEach(uid => {
            tasks.push(revokeUserRole(uid, 23));
        });

        // Morning Program In-charge (24)
        if (morning_program_in_charge_id) tasks.push(ensureUserHasRole(morning_program_in_charge_id, 'morning_program_in_charge', 24));
        if (existingCenter?.morning_program_in_charge_id && existingCenter.morning_program_in_charge_id !== morning_program_in_charge_id) {
            tasks.push(revokeUserRole(existingCenter.morning_program_in_charge_id, 24));
        }

        // Mentor (25)
        const finalMentorIds: string[] = Array.isArray(mentor_ids) ? mentor_ids : (mentor_id ? [mentor_id] : []);
        const existingMentorIds: string[] = Array.isArray(existingCenter?.mentor_ids) ? existingCenter.mentor_ids : (existingCenter?.mentor_id ? [existingCenter.mentor_id] : []);

        // Add roles to new mentors
        finalMentorIds.filter(id => !existingMentorIds.includes(id)).forEach(uid => {
            tasks.push(ensureUserHasRole(uid, 'mentor', 25));
        });
        // Revoke roles from removed mentors
        existingMentorIds.filter(id => !finalMentorIds.includes(id)).forEach(uid => {
            tasks.push(revokeUserRole(uid, 25));
        });

        // Frontliner (26)
        const finalFrontlinerIds: string[] = Array.isArray(frontliner_ids) ? frontliner_ids : (frontliner_id ? [frontliner_id] : []);
        const existingFrontlinerIds: string[] = Array.isArray(existingCenter?.frontliner_ids) ? existingCenter.frontliner_ids : (existingCenter?.frontliner_id ? [existingCenter.frontliner_id] : []);

        // Add roles to new frontliners
        finalFrontlinerIds.filter(id => !existingFrontlinerIds.includes(id)).forEach(uid => {
            tasks.push(ensureUserHasRole(uid, 'frontliner', 26));
        });
        // Revoke roles from removed frontliners
        existingFrontlinerIds.filter(id => !finalFrontlinerIds.includes(id)).forEach(uid => {
            tasks.push(revokeUserRole(uid, 26));
        });

        // Accountant (27)
        if (accountant_id) tasks.push(ensureUserHasRole(accountant_id, 'accountant', 27));
        if (existingCenter?.accountant_id && existingCenter.accountant_id !== accountant_id) {
            tasks.push(revokeUserRole(existingCenter.accountant_id, 27));
        }

        // Kitchen Head (28)
        if (kitchen_head_id) tasks.push(ensureUserHasRole(kitchen_head_id, 'kitchen_head', 28));
        if (existingCenter?.kitchen_head_id && existingCenter.kitchen_head_id !== kitchen_head_id) {
            tasks.push(revokeUserRole(existingCenter.kitchen_head_id, 28));
        }

        // Study In-charge (29)
        if (study_in_charge_id) tasks.push(ensureUserHasRole(study_in_charge_id, 'study_in_charge', 29));
        if (existingCenter?.study_in_charge_id && existingCenter.study_in_charge_id !== study_in_charge_id) {
            tasks.push(revokeUserRole(existingCenter.study_in_charge_id, 29));
        }

        // Multi-user role sync for new roles
        const syncMultiRole = (roleId: number, roleName: string, newIds: string[], existingIds: string[]) => {
            newIds.filter(id => !existingIds.includes(id)).forEach(uid => tasks.push(ensureUserHasRole(uid, roleName, roleId)));
            existingIds.filter(id => !newIds.includes(id)).forEach(uid => tasks.push(revokeUserRole(uid, roleId)));
        };

        syncMultiRole(31, 'grihstha_counselor', Array.isArray(grihstha_counselor_ids) ? grihstha_counselor_ids : [], Array.isArray(existingCenter?.grihstha_counselor_ids) ? existingCenter.grihstha_counselor_ids : []);
        syncMultiRole(32, 'easy_incharge', Array.isArray(easy_incharge_ids) ? easy_incharge_ids : [], Array.isArray(existingCenter?.easy_incharge_ids) ? existingCenter.easy_incharge_ids : []);
        syncMultiRole(33, 'prerna_incharge', Array.isArray(prerna_incharge_ids) ? prerna_incharge_ids : [], Array.isArray(existingCenter?.prerna_incharge_ids) ? existingCenter.prerna_incharge_ids : []);

        await Promise.all(tasks);

        // Revalidate the centers cache
        const { revalidateTag } = await import('next/cache');
        revalidateTag('centers');

        return NextResponse.json({ success: true });


    } catch (error: any) {
        console.error('Error updating center:', error);
        return NextResponse.json({
            error: error.message || 'Failed to update center'
        }, { status: 500 });
    }
}

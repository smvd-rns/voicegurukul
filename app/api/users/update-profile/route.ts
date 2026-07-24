import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { sanitizeObject } from '@/lib/utils/sanitize';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Define Role 3 constant
const VOICE_MANAGER_ROLE = 3;

export async function POST(request: Request) {
    try {
        // Initialize Supabase Admin Client inside the handler

        const supabaseAdmin = createClient();

        // Authenticate the user making the request
        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let { userId, updates } = body;

        // Sanitize all updates to prevent injection attacks
        updates = sanitizeObject(updates);

        // Security Check: Prevent assignment of Role 8 (Super Admin)
        const SUPER_ADMIN_ROLE = 8;
        if (updates?.role) {
            const rolesToCheck = Array.isArray(updates.role) ? updates.role : [updates.role];
            if (rolesToCheck.some((r: any) => Number(r) === SUPER_ADMIN_ROLE)) {
                return NextResponse.json({ error: 'Role 8 (Super Admin) cannot be assigned via API' }, { status: 403 });
            }
        }

        // Security check: Ensure the authenticated user matches the userId being updated
        if (user.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized to update this profile' }, { status: 403 });
        }

        // Fetch current user data to check for role and center changes
        const { data: currentUser, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('role, hierarchy, center')
            .eq('id', userId)
            .single();

        if (fetchError || !currentUser) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        let updatedRoles = currentUser.role;

        // Check if Center is being changed
        const newCenter = updates.center;
        const currentCenter = currentUser.center || currentUser.hierarchy?.center;

        if (newCenter && newCenter !== currentCenter) {
            const hasVoiceManagerRole = Array.isArray(currentUser.role)
                ? currentUser.role.includes(VOICE_MANAGER_ROLE)
                : currentUser.role === VOICE_MANAGER_ROLE;

            if (hasVoiceManagerRole) {
                if (Array.isArray(currentUser.role)) {
                    updatedRoles = currentUser.role.filter((r: any) => r !== VOICE_MANAGER_ROLE);
                } else {
                    updatedRoles = [1]; // Default fallback to student
                }
                updates.role = updatedRoles;
            }
        }

        // Perform the update - Split logic for Flat Columns (Strictly to user_profile_details)
        const detailsUpdates: any = {
            user_id: userId,
            updated_at: new Date().toISOString()
        };
        const userUpdates: any = {};
        let hasDetailsUpdates = false;

        Object.keys(updates).forEach(key => {
            // Profile fields to be moved to user_profile_details (Flat Columns)
            if (
                key.startsWith('edu_') || 
                key.startsWith('work_') || 
                key.startsWith('language_') || 
                key.startsWith('skill_') || 
                key.startsWith('service_') || 
                key.startsWith('camp_') || 
                key.startsWith('spbook_')
            ) {
                detailsUpdates[key] = updates[key];
                hasDetailsUpdates = true;
                // NO LONGER updating users table for these legacy columns
            } else if (key === 'name') {
                detailsUpdates.user_name = updates[key];
                hasDetailsUpdates = true;
                userUpdates[key] = updates[key];
            } else {
                userUpdates[key] = updates[key];
            }
        });

        // 1. Update main users table
        const { data: updatedData, error: updateError } = await supabaseAdmin
            .from('users')
            .update(userUpdates)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        // 2. Update user_profile_details table (Flat Columns Upsert)
        if (hasDetailsUpdates) {
            const { error: detailsError } = await supabaseAdmin
                .from('user_profile_details')
                .upsert(detailsUpdates, { onConflict: 'user_id' });

            if (detailsError) {
                console.error('Error updating profile details:', detailsError);
                return NextResponse.json({ error: 'Failed to update profile details: ' + (detailsError.message || detailsError) }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, user: updatedData });

    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

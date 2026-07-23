import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export async function POST(request: Request) {
    try {
        // 1. Auth Check (Super Admin only)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if Super Admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        const adminRoles = adminProfile?.role || [];
        const isSuperAdmin = Array.isArray(adminRoles)
            ? adminRoles.some((r: any) => r === 8 || r === 'super_admin')
            : (adminRoles === 8 || adminRoles === 'super_admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden. Only Super Admins can manage Event Admins.' }, { status: 403 });
        }

        // 2. Process Request
        const body = await request.json();
        const { userId, action, allowedTemples = [], allowedCenters = [] } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
        }

        // Fetch target user
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', userId)
            .single();

        if (fetchError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (action === 'assign') {
            // A. Upsert Allocations
            const { error: upsertError } = await supabase
                .from('event_admin_allocations')
                .upsert({
                    user_id: userId,
                    allowed_temples: allowedTemples,
                    allowed_centers: allowedCenters,
                    assigned_by: adminUser.id,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (upsertError) {
                console.error('Error upserting allocations:', upsertError);
                throw new Error('Failed to save allocations');
            }

            // B. Add Role 30 to User if not present
            let currentRoles = targetUser.role || [];
            if (!Array.isArray(currentRoles)) currentRoles = [currentRoles];

            const eventAdminRoleVal = 30; // 'event_admin'
            if (!currentRoles.includes(eventAdminRoleVal) && !currentRoles.includes('event_admin')) {
                // Ensure no duplicates, remove string variant if numbers are used, etc.
                const newRoles = [...currentRoles.filter((r: any) => r !== 'event_admin'), eventAdminRoleVal];

                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        role: newRoles,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (updateError) {
                    throw new Error('Failed to update user role');
                }
            }

            return NextResponse.json({ success: true, message: 'Event Admin assigned successfully' });

        } else if (action === 'revoke') {
            // A. Remove Role 30 from User
            let currentRoles = targetUser.role || [];
            if (!Array.isArray(currentRoles)) currentRoles = [currentRoles];

            const newRoles = currentRoles.filter((r: any) => r !== 30 && r !== 'event_admin');

            // Ensure at least one role remains
            if (newRoles.length === 0) {
                newRoles.push(1); // 'student'
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ role: newRoles, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (updateError) {
                throw new Error('Failed to revoke role');
            }

            // B. Delete Allocations
            await supabase
                .from('event_admin_allocations')
                .delete()
                .eq('user_id', userId);

            return NextResponse.json({ success: true, message: 'Event Admin role revoked successfully' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error managing event admin:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

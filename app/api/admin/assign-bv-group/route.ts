import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, bvGroup } = await request.json();

        // Security Check: Ensure caller is a Project Manager/Advisor (roles 14, 15, 16)
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !currentUser) {
            return NextResponse.json({ error: 'Unauthorized to perform action' }, { status: 403 });
        }

        const roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const isAuthorized = roles.some((r: any) => [8, 10, 11, 12, 13, 14, 15, 16, 21, 'project_manager', 'project_advisor', 'acting_manager', 'super_admin', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(r));

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized to assign groups' }, { status: 403 });
        }

        // Validate group
        const validGroups = ['Yudhishthira', 'Bhima', 'Arjuna', 'Nakula', 'Sahadeva', 'Prerna', 'Non Residential Alumni', null];
        if (!validGroups.includes(bvGroup)) {
            return NextResponse.json({ error: 'Invalid VOICE group level' }, { status: 400 });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ bv_group: bvGroup })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating group:', updateError);
            return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Group assigned successfully' });

    } catch (error: any) {
        console.error('Group assigning error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

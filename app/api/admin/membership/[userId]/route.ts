import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;
        const body = await request.json();
        const { membershipId } = body;

        if (!membershipId) {
            return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Role 8
        const { data: currentUser, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !currentUser || !(Array.isArray(currentUser.role) ? currentUser.role.includes(8) : currentUser.role === 8)) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        // Update membership ID
        const { data, error } = await supabaseAdmin
            .from('membership_ids')
            .update({ membership_id: membershipId, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        // Also update donation_slug in users table for sync
        await supabaseAdmin
            .from('users')
            .update({ donation_slug: membershipId })
            .eq('id', userId);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

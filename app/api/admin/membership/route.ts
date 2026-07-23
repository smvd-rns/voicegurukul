import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const user = await getAuthUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Verify Role 8
        const { data: currentUser, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !currentUser || !(Array.isArray(currentUser.role) ? currentUser.role.includes(8) : currentUser.role === 8)) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        // Fetch all membership IDs with user details and pagination
        const { data, error, count } = await supabaseAdmin
            .from('membership_ids')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('API Error: membership_ids fetch failed:', error);
            throw error;
        }

        // Manually attach user details since raw SQL proxy doesn't parse Supabase relational select syntax
        if (data && data.length > 0) {
            const userIds = Array.from(new Set(data.map((m: any) => m.user_id).filter(Boolean)));
            if (userIds.length > 0) {
                const { data: usersData } = await supabaseAdmin
                    .from('users')
                    .select('id, name, email')
                    .in('id', userIds);

                if (usersData) {
                    const userMap = new Map((usersData as any[]).map((u: any) => [u.id, u]));
                    data.forEach((m: any) => {
                        const u = userMap.get(m.user_id);
                        m.users = u ? { name: u.name, email: u.email } : null;
                    });
                }
            }
        }

        return NextResponse.json({ success: true, data, count });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
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
            .select(`
                *,
                users:user_id (
                    name,
                    email
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('API Error: membership_ids fetch failed:', error);
            throw error;
        }

        console.log(`API Found ${count} membership records`);

        return NextResponse.json({ success: true, data, count });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

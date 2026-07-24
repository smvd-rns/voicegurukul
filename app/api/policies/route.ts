import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {

        const supabase = createClient();

        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !currentUser) {
            return NextResponse.json({ error: 'User data not found' }, { status: 404 });
        }

        const roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const numericRoles = roles.map((r: any) => typeof r === 'number' ? r : parseInt(r)).filter((r: number) => !isNaN(r));

        // Roles 8, 9, 10 see all policies
        const seesAll = (numericRoles as number[]).some((r: number) => [8, 9, 10].includes(r)) || roles.includes('super_admin');

        let query = supabase.from('policies')
            .select('id, title, description, applicable_date, file_name, file_url, file_id, file_type, target_roles')
            .order('applicable_date', { ascending: false });

        if (!seesAll) {
            if (numericRoles.length > 0) {
                // Return policies where target_roles overlaps with the user's numeric roles
                query = query.overlaps('target_roles', numericRoles);
            } else {
                // If user has no valid integer roles, and isn't superadmin, return empty
                return NextResponse.json({ success: true, data: [] });
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching policies:', error);
            return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Policies GET error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {

        const supabase = createClient();

        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Must be superadmin
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !currentUser) {
            return NextResponse.json({ error: 'User data not found' }, { status: 404 });
        }

        const roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const numericRoles = roles.map((r: any) => typeof r === 'number' ? r : parseInt(r)).filter((r: number) => !isNaN(r));
        const isSuperAdmin = numericRoles.includes(8) || roles.includes('super_admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Only Superadmins can create policies' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, applicable_date, file_name, file_url, file_id, file_type, target_roles } = body;

        if (!title || !applicable_date || !file_name || !file_url || !file_id || !target_roles) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('policies')
            .insert([{
                title,
                description,
                applicable_date,
                file_name,
                file_url,
                file_id,
                file_type,
                target_roles,
                created_by: user.id
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating policy:', error);
            return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Policies POST error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

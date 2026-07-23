import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!id) return NextResponse.json({ error: 'Policy ID is required' }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // Must be superadmin
        const { data: currentUser, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single();

        if (userError || !currentUser) return NextResponse.json({ error: 'User data not found' }, { status: 404 });

        const roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const numericRoles = roles.map((r: any) => typeof r === 'number' ? r : parseInt(r)).filter((r: number) => !isNaN(r));
        const isSuperAdmin = numericRoles.includes(8) || roles.includes('super_admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Only Superadmins can modify policies' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, applicable_date, target_roles } = body;

        const updateData: any = { updated_at: new Date().toISOString() };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (applicable_date !== undefined) updateData.applicable_date = applicable_date;
        if (target_roles !== undefined) updateData.target_roles = target_roles;

        const { data, error } = await supabase
            .from('policies')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating policy:', error);
            return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!id) return NextResponse.json({ error: 'Policy ID is required' }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // Must be superadmin
        const { data: currentUser, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single();

        if (userError || !currentUser) return NextResponse.json({ error: 'User data not found' }, { status: 404 });

        const roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const numericRoles = roles.map((r: any) => typeof r === 'number' ? r : parseInt(r)).filter((r: number) => !isNaN(r));
        const isSuperAdmin = numericRoles.includes(8) || roles.includes('super_admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Only Superadmins can delete policies' }, { status: 403 });
        }

        const { error } = await supabase
            .from('policies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting policy:', error);
            return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Policy deleted successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { roleHierarchy } from '@/lib/utils/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get user roles from database to verify permissions
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    const maxRole = Math.max(...userRoles.map((r: any) => roleHierarchy.get(r)));

    // Roles 8 (Super Admin), 9 (VP), 10 (President) allowed
    if (maxRole < 8) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users data for stats
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, role, current_temple, current_center, ashram');

    if (fetchError) {
        console.error('Error fetching users for stats:', fetchError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
    }

    const stats = {
        totalUsers: users.length,
        byRole: {} as Record<string, number>,
        byTemple: {} as Record<string, number>,
        byCenter: {} as Record<string, number>,
        byAshram: {} as Record<string, number>,
    };

    users.forEach((u: any) => {
        // Role breakdown (counting instances of roles)
        const roles = Array.isArray(u.role) ? u.role : [u.role];
        roles.forEach((r: any) => {
            const roleKey = typeof r === 'number' ? r.toString() : r;
            stats.byRole[roleKey] = (stats.byRole[roleKey] || 0) + 1;
        });

        // Temple breakdown
        const temple = u.current_temple || 'Unassigned';
        stats.byTemple[temple] = (stats.byTemple[temple] || 0) + 1;

        // Center breakdown
        const center = u.current_center || 'Unassigned';
        stats.byCenter[center] = (stats.byCenter[center] || 0) + 1;

        // Ashram breakdown
        const ashram = u.ashram || 'Unassigned';
        stats.byAshram[ashram] = (stats.byAshram[ashram] || 0) + 1;
    });

    return NextResponse.json(stats);
}

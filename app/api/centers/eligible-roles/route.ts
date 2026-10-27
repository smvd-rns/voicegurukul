import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. Authenticate Requester
        const user = await getAuthUserFromRequest(request);
        if (!user || !user.id) {
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        // 2. Authorize Requester (Leadership / Management roles only)
        const userRes = await dbQuery('SELECT role FROM users WHERE id = $1', [user.id]);
        const userProfile = userRes.rows[0];
        if (!userProfile) {
            return NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 });
        }

        const roles = Array.isArray(userProfile.role) ? userProfile.role : [userProfile.role];
        const numRoles = roles.map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
        const isAuthorized = numRoles.some((r: number) => [8, 9, 10, 11, 12, 13, 14, 15, 16, 21].includes(r)) ||
            roles.includes('super_admin') || roles.includes('managing_director') || roles.includes('project_manager');

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
        }

        // 3. Fetch eligible users to populate role dropdowns for center management
        const res = await dbQuery(`
            SELECT id, name, role, email 
            FROM users 
            ORDER BY name ASC NULLS LAST, email ASC
        `);

        return NextResponse.json(res.rows || []);
    } catch (error: any) {
        console.error('API Error in /api/centers/eligible-roles:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

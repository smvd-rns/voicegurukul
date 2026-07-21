import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {

        // Extract token from cookie or authorization header
        const cookieToken = (request as any).cookies?.get('session_token')?.value;
        const authHeader = request.headers.get('authorization');
        const token = cookieToken || (authHeader ? authHeader.replace('Bearer ', '') : null);

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // Fetch requesting admin profile from Droplet DB
        const adminRes = await dbQuery('SELECT role FROM users WHERE id = $1', [decoded.userId]);
        const adminProfile = adminRes.rows[0];

        if (!adminProfile) {
            return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
        }

        const roles = Array.isArray(adminProfile.role) ? adminProfile.role : [adminProfile.role];
        const roleNums = roles.map((r: any) => Number(r));
        const isSuperAdmin = roleNums.includes(8) || roles.includes('super_admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden. Only Super Admins can delete users.' }, { status: 403 });
        }

        const userIdToDelete = params.id;
        if (!userIdToDelete) {
             return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // 1. Delete associated profile details first (if any)
        await dbQuery('DELETE FROM user_profile_details WHERE user_id = $1', [userIdToDelete]);

        // 2. Delete user row from Droplet DB
        const delRes = await dbQuery('DELETE FROM users WHERE id = $1', [userIdToDelete]);

        if (delRes.rowCount === 0) {
             return NextResponse.json({ error: 'User not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error in delete user API:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

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

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
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

        const adminRes = await dbQuery('SELECT role FROM users WHERE id = $1', [decoded.userId]);
        const adminProfile = adminRes.rows[0];

        if (!adminProfile) {
            return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
        }

        const roles = Array.isArray(adminProfile.role) ? adminProfile.role : [adminProfile.role];
        const roleNums = roles.map((r: any) => Number(r));
        const isSuperAdmin = roleNums.includes(8) || roles.includes('super_admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden. Only Super Admins can update users.' }, { status: 403 });
        }

        const targetUserId = params.id;
        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const body = await request.json();
        const {
            name,
            email,
            phone,
            birthDate,
            verificationStatus,
            currentTemple,
            currentCenter,
            parentTemple,
            parentCenter,
            counselor,
            counselorId,
            initiationStatus,
            initiatedName,
            spiritualMasterName,
            rounds,
            introducedToKcIn
        } = body;

        const setClauses: string[] = ['updated_at = NOW()'];
        const values: any[] = [];
        let valIndex = 1;

        if (name !== undefined) {
            setClauses.push(`name = $${valIndex++}`);
            values.push(name);
        }
        if (email !== undefined) {
            setClauses.push(`email = $${valIndex++}`);
            values.push(email);
        }
        if (phone !== undefined) {
            setClauses.push(`phone = $${valIndex++}`);
            values.push(phone);
        }
        if (birthDate !== undefined) {
            setClauses.push(`birth_date = $${valIndex++}`);
            values.push(birthDate ? birthDate.split('T')[0] : null);
        }
        if (verificationStatus !== undefined) {
            setClauses.push(`verification_status = $${valIndex++}`);
            values.push(verificationStatus);
        }
        if (currentTemple !== undefined) {
            setClauses.push(`current_temple = $${valIndex++}`);
            values.push(currentTemple || null);
        }
        if (currentCenter !== undefined) {
            setClauses.push(`current_center = $${valIndex++}`);
            values.push(currentCenter || null);
            setClauses.push(`center = $${valIndex++}`);
            values.push(currentCenter || null);
        }
        if (parentTemple !== undefined) {
            setClauses.push(`parent_temple = $${valIndex++}`);
            values.push(parentTemple || null);
        }
        if (parentCenter !== undefined) {
            setClauses.push(`parent_center = $${valIndex++}`);
            values.push(parentCenter || null);
        }
        if (counselor !== undefined) {
            setClauses.push(`counselor = $${valIndex++}`);
            values.push(counselor || null);
        }
        if (counselorId !== undefined) {
            setClauses.push(`counselor_id = $${valIndex++}`);
            values.push(counselorId || null);
        }
        if (initiationStatus !== undefined) {
            setClauses.push(`initiation_status = $${valIndex++}`);
            values.push(initiationStatus || null);
        }
        if (initiatedName !== undefined) {
            setClauses.push(`initiated_name = $${valIndex++}`);
            values.push(initiatedName || null);
        }
        if (spiritualMasterName !== undefined) {
            setClauses.push(`spiritual_master_name = $${valIndex++}`);
            values.push(spiritualMasterName || null);
        }
        if (rounds !== undefined) {
            setClauses.push(`rounds = $${valIndex++}`);
            values.push(rounds ? Number(rounds) : null);
        }
        if (introducedToKcIn !== undefined) {
            setClauses.push(`introduced_to_kc_in = $${valIndex++}`);
            values.push(introducedToKcIn || null);
        }

        values.push(targetUserId);
        const queryText = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${valIndex} RETURNING *`;
        const updateRes = await dbQuery(queryText, values);

        if (updateRes.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: updateRes.rows[0] });
    } catch (error: any) {
        console.error('Error in patch user API:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

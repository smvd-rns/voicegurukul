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
        const isAuthorizedToDelete = isSuperAdmin ||
            roleNums.some((r: any) => [11, 12, 13].includes(Number(r))) ||
            roles.some((r: any) => ['managing_director', 'director', 'central_voice_manager'].includes(String(r).toLowerCase()));

        if (!isAuthorizedToDelete) {
            return NextResponse.json({ error: 'Forbidden. Only Managing Directors (Role 11, 12, 13) and Admins can delete users.' }, { status: 403 });
        }

        const userIdToDelete = params.id;
        if (!userIdToDelete) {
             return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Check target user to protect super admins from being deleted by non-super-admins
        const targetRes = await dbQuery('SELECT id, role FROM users WHERE id = $1', [userIdToDelete]);
        if (targetRes.rowCount === 0) {
            return NextResponse.json({ error: 'User not found or already deleted' }, { status: 404 });
        }
        const targetUser = targetRes.rows[0];
        const targetRoles = Array.isArray(targetUser.role) ? targetUser.role : [targetUser.role];
        const targetRoleNums = targetRoles.map((r: any) => Number(r));
        const targetIsSuperAdmin = targetRoleNums.includes(8) || targetRoles.includes('super_admin');

        if (targetIsSuperAdmin && !isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden. Super Admins cannot be deleted.' }, { status: 403 });
        }

        // Nullify foreign key references in centers and temples to avoid constraint violations
        await dbQuery(`
            UPDATE centers SET
                project_manager_id = CASE WHEN project_manager_id = $1 THEN NULL ELSE project_manager_id END,
                project_advisor_id = CASE WHEN project_advisor_id = $1 THEN NULL ELSE project_advisor_id END,
                acting_manager_id = CASE WHEN acting_manager_id = $1 THEN NULL ELSE acting_manager_id END
            WHERE project_manager_id = $1 OR project_advisor_id = $1 OR acting_manager_id = $1
        `, [userIdToDelete]).catch(() => {});

        await dbQuery(`
            UPDATE temples SET
                managing_director_id = CASE WHEN managing_director_id = $1 THEN NULL ELSE managing_director_id END,
                director_id = CASE WHEN director_id = $1 THEN NULL ELSE director_id END,
                central_voice_manager_id = CASE WHEN central_voice_manager_id = $1 THEN NULL ELSE central_voice_manager_id END
            WHERE managing_director_id = $1 OR director_id = $1 OR central_voice_manager_id = $1
        `, [userIdToDelete]).catch(() => {});

        // 1. Delete associated profile details & junction records first (if any)
        await dbQuery('DELETE FROM user_profile_details WHERE user_id = $1', [userIdToDelete]).catch(() => {});
        await dbQuery('DELETE FROM user_centers WHERE user_id = $1', [userIdToDelete]).catch(() => {});
        await dbQuery('DELETE FROM counselors WHERE user_id = $1', [userIdToDelete]).catch(() => {});
        await dbQuery('DELETE FROM profile_update_requests WHERE user_id = $1', [userIdToDelete]).catch(() => {});

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
            introducedToKcIn,
            otherCenter,
            otherTemple,
            otherCounselor,
            ashram
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
        if (otherCenter !== undefined) {
            setClauses.push(`other_center = $${valIndex++}`);
            values.push(otherCenter || null);
        }
        if (otherTemple !== undefined) {
            setClauses.push(`other_temple = $${valIndex++}`);
            values.push(otherTemple || null);
        }
        if (otherCounselor !== undefined) {
            setClauses.push(`other_counselor = $${valIndex++}`);
            values.push(otherCounselor || null);
        }
        if (ashram !== undefined) {
            setClauses.push(`ashram = $${valIndex++}`);
            values.push(ashram || null);
        }

        values.push(targetUserId);
        const queryText = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${valIndex} RETURNING *`;
        const updateRes = await dbQuery(queryText, values);

        if (updateRes.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Automatic Cascade: If counselor user's name or initiated name changed, cascade to counselors table and assigned devotees
        if (name !== undefined || initiatedName !== undefined) {
            const updatedUser = updateRes.rows[0];
            const newDisplayName = (updatedUser.initiated_name || updatedUser.name || '').trim();
            if (newDisplayName) {
                try {
                    const isCounselor = await dbQuery(
                        `SELECT id FROM counselors WHERE user_id = $1 OR email = $2 LIMIT 1`,
                        [targetUserId, updatedUser.email || '']
                    );
                    if (isCounselor.rowCount && isCounselor.rowCount > 0) {
                        // 1. Update counselors table
                        await dbQuery(
                            `UPDATE counselors SET name = $1, updated_at = NOW() WHERE user_id = $2 OR email = $3`,
                            [newDisplayName, targetUserId, updatedUser.email || '']
                        );
                        // 2. Cascade to devotees with this counselor assigned
                        await dbQuery(
                            `UPDATE users SET counselor = $1, updated_at = NOW() WHERE counselor_id = $2`,
                            [newDisplayName, targetUserId]
                        );
                        await dbQuery(`
                            UPDATE users
                            SET hierarchy = jsonb_set(
                                COALESCE(hierarchy, '{}'::jsonb),
                                '{counselor}',
                                to_jsonb($1::text)
                            ),
                            updated_at = NOW()
                            WHERE counselor_id = $2 OR hierarchy->>'counselorId' = $2
                        `, [newDisplayName, targetUserId]);
                        // 3. Cascade to camp_registrations
                        try {
                            await dbQuery(
                                `UPDATE camp_registrations SET counselor_name = $1 WHERE counselor_id = $2`,
                                [newDisplayName, targetUserId]
                            );
                        } catch (campErr) {
                            // ignore if counselor_id not on camp_registrations
                        }
                        console.log(`[Counselor Rename Cascade] Successfully updated counselor name to "${newDisplayName}" for user ${targetUserId}`);
                    }
                } catch (counselorErr) {
                    console.warn('[Counselor Rename Cascade] Notice:', counselorErr);
                }
            }
        }

        return NextResponse.json({ success: true, user: updateRes.rows[0] });
    } catch (error: any) {
        console.error('Error in patch user API:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { resolveApprovalAuthority } from '@/lib/utils/approval-authority';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Strict Security: Require an active authenticated user session
        const authUser = await getAuthUserFromRequest(req);
        if (!authUser?.id) {
            return NextResponse.json(
                { hasManager: false, manager: null, error: 'Unauthorized: Active login session required' },
                { status: 401 }
            );
        }

        const userId = authUser.id;

        // 2. Fetch the requesting user's registration details
        const userRes = await query(
            'SELECT id, name, email, phone, verification_status, current_center, current_temple, counselor, counselor_id, hierarchy FROM users WHERE id = $1 LIMIT 1',
            [userId]
        );

        const user = userRes.rows[0];
        if (!user) {
            return NextResponse.json(
                { hasManager: false, manager: null, error: 'User not found' },
                { status: 404 }
            );
        }

        // 3. Security: Only pending users have a legitimate reason to view reviewer contact details
        if (user.verification_status !== 'pending') {
            return NextResponse.json({
                hasManager: false,
                manager: null,
                message: 'Manager contact is only accessible during pending verification.',
            });
        }

        // 4. Resolve designated approval authority following strict order:
        // Acting Manager -> Project Manager -> Project Advisor -> Counselor -> Care Giver -> Central VOICE Manager -> Director -> Managing Director -> Super Admin
        const chosenManager = await resolveApprovalAuthority(user);

        return NextResponse.json({
            hasManager: !!chosenManager,
            manager: chosenManager ? {
                name: chosenManager.name,
                role: chosenManager.roleTitle,
                phone: chosenManager.phone || null,
            } : null,
            centerName: chosenManager?.centerName || user.current_center || null,
            templeName: chosenManager?.templeName || user.current_temple || null,
        });
    } catch (error: any) {
        console.error('Error in /api/auth/approval-manager:', error);
        return NextResponse.json(
            { hasManager: false, manager: null, error: 'Server error' },
            { status: 500 }
        );
    }
}

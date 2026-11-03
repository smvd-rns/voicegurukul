import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sendRegistrationNotification } from '@/lib/utils/email';
import { resolveApprovalAuthority } from '@/lib/utils/approval-authority';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const requester = await getAuthUserFromRequest(request);
        if (!requester || !requester.id) {
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://voicegurukul.com';
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Security check: Only the user themselves or an admin can trigger this notification
        if (requester.id !== userId) {
            const adminCheck = await dbQuery('SELECT role FROM users WHERE id = $1', [requester.id]);
            const roles = adminCheck.rows[0]?.role || [];
            const roleArr = Array.isArray(roles) ? roles : [roles];
            const isAdmin = roleArr.some((r: any) => [8, 9, 10, 11, 12, 13, 14, 15, 16].includes(Number(r)));
            if (!isAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }
        
        // Fetch the new user directly from Droplet DB
        const userRes = await dbQuery(
            'SELECT id, name, email, phone, hierarchy, current_center, current_temple, counselor, counselor_id FROM users WHERE id = $1',
            [userId]
        );
        const newUser = userRes.rows[0];

        if (!newUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Ensure hierarchy is parsed if returned as a JSON string from DB
        if (newUser.hierarchy && typeof newUser.hierarchy === 'string') {
            try {
                newUser.hierarchy = JSON.parse(newUser.hierarchy);
            } catch (e) {
                console.error('Failed to parse user hierarchy in new-registration email script', e);
                newUser.hierarchy = {};
            }
        }

        // Determine recipient based on strict tier hierarchy order:
        // 1. Acting Manager
        // 2. Project Manager
        // 3. Project Advisor
        // 4. Counselor
        // 5. Care Giver
        // 6. Central VOICE Manager
        // 7. Director
        // 8. Managing Director
        // 9. Super Admin
        // NOTE: Vice-President (9) and President (10) are intentionally excluded.
        const chosenManager = await resolveApprovalAuthority(newUser);

        // Generate 1-click approval notification for the single designated manager
        const secret = process.env.EMAIL_APPROVAL_SECRET || process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!secret) {
            console.error('Email approval secret not configured on server');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        const token = crypto.createHmac('sha256', secret).update(userId).digest('hex');
        const approveLink = `${baseUrl}/api/emails/approve?userId=${userId}&token=${token}`;

        let emailsSent = 0;
        if (chosenManager?.email) {
            console.log(`[Registration Alert] Notifying authority: ${chosenManager.name} (${chosenManager.roleTitle}) at ${chosenManager.email} for new user ${newUser.name || 'Devotee'}`);
            await sendRegistrationNotification(chosenManager.email, chosenManager.name || 'Manager', newUser, approveLink);
            emailsSent = 1;
        }

        return NextResponse.json({ 
            success: true, 
            emailsSent, 
            notifiedManager: chosenManager ? { name: chosenManager.name, role: chosenManager.roleTitle, email: chosenManager.email } : null 
        });
    } catch (error) {
        console.error('API /emails/new-registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

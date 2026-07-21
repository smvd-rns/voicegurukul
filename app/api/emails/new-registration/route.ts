import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { sendRegistrationNotification } from '@/lib/utils/email';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }
        
        // Fetch the new user directly from Droplet DB
        const userRes = await dbQuery('SELECT id, name, email, phone, hierarchy FROM users WHERE id = $1', [userId]);
        const newUser = userRes.rows[0];

        if (!newUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Determine recipients based on hierarchy
        const userCenterName = newUser.hierarchy?.currentCenter;
        const userTempleName = newUser.hierarchy?.currentTemple;
        
        let managerIdsToNotify: string[] = [];
        let notifyByRole8 = false;

        // 1. If Center is selected (and not None)
        if (userCenterName && userCenterName !== 'None' && userCenterName !== 'None/None') {
            try {
                const centerRes = await dbQuery('SELECT * FROM centers WHERE name = $1 LIMIT 1', [userCenterName]);
                const center = centerRes.rows[0];

                if (center) {
                    if (center.project_manager_id) managerIdsToNotify.push(center.project_manager_id);
                    if (center.acting_manager_id) managerIdsToNotify.push(center.acting_manager_id);
                }
            } catch (cErr) {
                console.warn('Center lookup notice:', cErr);
            }
        }

        // 2. If no IDs yet (either Center was None or Center had no managers), check if Temple is selected
        if (managerIdsToNotify.length === 0 && userTempleName && userTempleName !== 'None' && userTempleName !== 'None/None') {
            try {
                const templeRes = await dbQuery('SELECT central_voice_manager_id FROM temples WHERE name = $1 LIMIT 1', [userTempleName]);
                const temple = templeRes.rows[0];

                if (temple && temple.central_voice_manager_id) {
                    managerIdsToNotify.push(temple.central_voice_manager_id);
                }
            } catch (tErr) {
                console.warn('Temple lookup notice:', tErr);
            }
        }

        // 3. If still no IDs, notify Super Admins (Role 8)
        if (managerIdsToNotify.length === 0) {
            notifyByRole8 = true;
        }

        let notifyManagers: { id: string, name: string, email: string }[] = [];

        if (notifyByRole8) {
            try {
                // Query Super Admins (role array containing 8) from Droplet DB
                const res = await dbQuery("SELECT id, name, email FROM users WHERE role::text LIKE '%8%' AND email IS NOT NULL AND email != ''");
                notifyManagers = res.rows || [];
            } catch (err) {
                console.error('Failed to query super admins for registration mail:', err);
            }
        } else if (managerIdsToNotify.length > 0) {
            try {
                const mgrRes = await dbQuery('SELECT id, name, email FROM users WHERE id = ANY($1::uuid[]) AND email IS NOT NULL AND email != \'\'', [managerIdsToNotify]);
                notifyManagers = mgrRes.rows || [];
            } catch (mErr) {
                console.error('Failed to query manager emails for registration mail:', mErr);
            }
        }

        if (notifyManagers.length === 0) {
            return NextResponse.json({ success: true, emailsSent: 0, message: 'No recipients found for notification' });
        }


        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        
        // Simple secure token for 1-click approve
        const secret = process.env.EMAIL_APPROVAL_SECRET || 'fallback_secret_123';
        const token = crypto.createHmac('sha256', secret).update(userId).digest('hex');
        const approveLink = `${baseUrl}/api/emails/approve?userId=${userId}&token=${token}`;

        let emailsSent = 0;
        for (const manager of notifyManagers) {
             if (manager.email) {
                 await sendRegistrationNotification(manager.email, manager.name || 'Manager', newUser, approveLink);
                 emailsSent++;
             }
        }

        return NextResponse.json({ success: true, emailsSent });
    } catch (error) {
        console.error('API /emails/new-registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

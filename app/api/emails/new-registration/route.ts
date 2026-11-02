import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sendRegistrationNotification } from '@/lib/utils/email';
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
            const isAdmin = roleArr.some((r: any) => [8, 9, 10, 11, 12, 13].includes(Number(r)));
            if (!isAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }
        
        // Fetch the new user directly from Droplet DB
        const userRes = await dbQuery('SELECT id, name, email, phone, hierarchy, current_center, current_temple FROM users WHERE id = $1', [userId]);
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

        // Determine recipient based on strict tier hierarchy:
        // Priority 1: Acting Manager of the user's center
        // Priority 2: Project Manager of the user's center (if Acting Manager is not present)
        // Priority 3: Central VOICE Manager or Temple Admin of the user's temple
        // Priority 4: Super Admin (Single recipient fallback)
        // This ensures strictly ONE manager receives the alert and prevents wasting daily email quota.
        const userCenterName = newUser.current_center || newUser.hierarchy?.currentCenter;
        const userTempleName = newUser.current_temple || newUser.hierarchy?.currentTemple;
        
        let chosenManager: { id: string; name: string; email: string; roleTitle: string } | null = null;

        // 1. Priority 1 & 2: Check Center (Acting Manager -> Project Manager)
        if (userCenterName && userCenterName !== 'None' && userCenterName !== 'None/None') {
            try {
                const centerRes = await dbQuery(
                    `SELECT c.id, c.name, c.acting_manager_id, c.project_manager_id,
                            u_am.id AS am_id, u_am.name AS am_name, u_am.email AS am_email,
                            u_pm.id AS pm_id, u_pm.name AS pm_name, u_pm.email AS pm_email
                     FROM centers c
                     LEFT JOIN users u_am ON c.acting_manager_id::text = u_am.id::text
                     LEFT JOIN users u_pm ON c.project_manager_id::text = u_pm.id::text
                     WHERE LOWER(TRIM(c.name)) = LOWER(TRIM($1))
                     LIMIT 1`,
                    [userCenterName]
                );
                const center = centerRes.rows[0];

                if (center) {
                    // Priority 1: Acting Manager
                    if (center.am_email && center.am_email.trim() !== '') {
                        chosenManager = {
                            id: center.am_id || center.acting_manager_id,
                            name: center.am_name || 'Acting Manager',
                            email: center.am_email.trim(),
                            roleTitle: 'Acting Manager'
                        };
                    } 
                    // Priority 2: Project Manager (if Acting Manager not present / has no valid email)
                    else if (center.pm_email && center.pm_email.trim() !== '') {
                        chosenManager = {
                            id: center.pm_id || center.project_manager_id,
                            name: center.pm_name || 'Project Manager',
                            email: center.pm_email.trim(),
                            roleTitle: 'Project Manager'
                        };
                    }
                }
            } catch (cErr) {
                console.warn('Center lookup notice in new-registration:', cErr);
            }
        }

        // 2. Priority 3: Temple Level (if neither acting nor project manager present, or no center specified)
        if (!chosenManager && userTempleName && userTempleName !== 'None' && userTempleName !== 'None/None') {
            try {
                const templeRes = await dbQuery(
                    `SELECT t.id, t.name, t.central_voice_manager_id,
                            u_tm.id AS tm_id, u_tm.name AS tm_name, u_tm.email AS tm_email
                     FROM temples t
                     LEFT JOIN users u_tm ON t.central_voice_manager_id::text = u_tm.id::text
                     WHERE LOWER(TRIM(t.name)) = LOWER(TRIM($1))
                     LIMIT 1`,
                    [userTempleName]
                );
                const temple = templeRes.rows[0];

                if (temple?.tm_email && temple.tm_email.trim() !== '') {
                    chosenManager = {
                        id: temple.tm_id || temple.central_voice_manager_id,
                        name: temple.tm_name || 'Central VOICE Manager',
                        email: temple.tm_email.trim(),
                        roleTitle: 'Central VOICE Manager'
                    };
                } else {
                    // Fallback to Temple Admin assigned to this temple
                    const taRes = await dbQuery(
                        `SELECT id, name, email FROM users 
                         WHERE (role::text LIKE '%9%' OR role::text LIKE '%10%') 
                           AND (LOWER(TRIM(current_temple)) = LOWER(TRIM($1)) OR LOWER(TRIM(hierarchy->>'currentTemple')) = LOWER(TRIM($1)))
                           AND email IS NOT NULL AND email != '' 
                         ORDER BY created_at ASC LIMIT 1`,
                        [userTempleName]
                    );
                    if (taRes.rows[0]?.email) {
                        chosenManager = {
                            id: taRes.rows[0].id,
                            name: taRes.rows[0].name || 'Temple Admin',
                            email: taRes.rows[0].email.trim(),
                            roleTitle: 'Temple Admin'
                        };
                    }
                }
            } catch (tErr) {
                console.warn('Temple lookup notice in new-registration:', tErr);
            }
        }

        // 3. Priority 4: Super Admin fallback (Pick strictly ONE super admin to preserve email quota)
        if (!chosenManager) {
            try {
                const saPrimaryRes = await dbQuery(
                    "SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = 'smvd@voicepune.com' LIMIT 1"
                );
                if (saPrimaryRes.rows[0]?.email) {
                    chosenManager = {
                        id: saPrimaryRes.rows[0].id,
                        name: saPrimaryRes.rows[0].name || 'Super Admin',
                        email: saPrimaryRes.rows[0].email.trim(),
                        roleTitle: 'Super Admin'
                    };
                } else {
                    const saRes = await dbQuery(
                        "SELECT id, name, email FROM users WHERE role::text LIKE '%8%' AND email IS NOT NULL AND email != '' ORDER BY created_at ASC LIMIT 1"
                    );
                    if (saRes.rows[0]?.email) {
                        chosenManager = {
                            id: saRes.rows[0].id,
                            name: saRes.rows[0].name || 'Super Admin',
                            email: saRes.rows[0].email.trim(),
                            roleTitle: 'Super Admin'
                        };
                    } else {
                        chosenManager = {
                            id: 'superadmin',
                            name: 'Super Admin',
                            email: 'smvd@voicepune.com',
                            roleTitle: 'Super Admin'
                        };
                    }
                }
            } catch (saErr) {
                console.error('Super admin lookup error:', saErr);
                chosenManager = {
                    id: 'superadmin',
                    name: 'Super Admin',
                    email: 'smvd@voicepune.com',
                    roleTitle: 'Super Admin'
                };
            }
        }

        // NOTE: We DO NOT send an acknowledgement email to the devotee at this initial registration stage.
        // Sending a welcome/confirmation mail now and another welcome mail upon approval caused devotees
        // to receive 2 welcome emails and exhausted daily mail quotas. Devotees see the pending status
        // on the web interface, and receive strictly ONE official Welcome email once approved!

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
            console.log(`[Registration Alert] Notifying single authority: ${chosenManager.name} (${chosenManager.roleTitle}) at ${chosenManager.email} for new user ${newUser.name || 'Devotee'}`);
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

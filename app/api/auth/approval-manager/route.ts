import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

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

        // 2. Security: Strictly fetch the requesting user's OWN registered center from database.
        // Never allow arbitrary ?center= or ?userId= scraping from outside scripts.
        const userRes = await query(
            'SELECT id, verification_status, current_center, current_temple, hierarchy FROM users WHERE id = $1 LIMIT 1',
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

        let hierarchy = user.hierarchy;
        if (typeof hierarchy === 'string') {
            try {
                hierarchy = JSON.parse(hierarchy);
            } catch {
                hierarchy = {};
            }
        } else if (!hierarchy) {
            hierarchy = {};
        }

        const userCenter = user.current_center || hierarchy.currentCenter || hierarchy.center || null;
        const userTemple = user.current_temple || hierarchy.currentTemple || hierarchy.parentTemple || null;

        // 4. Look up Center details & Acting Manager for the user's assigned center only
        if (userCenter && userCenter !== 'None' && userCenter !== 'None/None' && userCenter !== 'Other') {
            try {
                const centerRes = await query(
                    `SELECT c.id, c.name, c.temple_name,
                            c.acting_manager_id, c.acting_manager_name,
                            u_am.name AS am_user_name, u_am.phone AS am_phone,
                            c.project_manager_id, c.project_manager_name,
                            u_pm.name AS pm_user_name, u_pm.phone AS pm_phone
                     FROM centers c
                     LEFT JOIN users u_am ON c.acting_manager_id::text = u_am.id::text
                     LEFT JOIN users u_pm ON c.project_manager_id::text = u_pm.id::text
                     WHERE LOWER(TRIM(c.name)) = LOWER(TRIM($1))
                     LIMIT 1`,
                    [userCenter]
                );

                const center = centerRes.rows[0];
                if (center) {
                    // Priority 1: Acting Manager
                    if (center.acting_manager_name || center.am_user_name) {
                        return NextResponse.json({
                            hasManager: true,
                            manager: {
                                name: center.acting_manager_name || center.am_user_name,
                                role: 'Acting Manager',
                                phone: center.am_phone || null,
                            },
                            centerName: center.name,
                            templeName: center.temple_name || userTemple || null,
                        });
                    }

                    // Priority 2: Project Manager
                    if (center.project_manager_name || center.pm_user_name) {
                        return NextResponse.json({
                            hasManager: true,
                            manager: {
                                name: center.project_manager_name || center.pm_user_name,
                                role: 'Project Manager',
                                phone: center.pm_phone || null,
                            },
                            centerName: center.name,
                            templeName: center.temple_name || userTemple || null,
                        });
                    }

                    return NextResponse.json({
                        hasManager: false,
                        manager: null,
                        centerName: center.name,
                        templeName: center.temple_name || userTemple || null,
                    });
                }
            } catch (cErr) {
                console.warn('Failed to fetch center in approval-manager API:', cErr);
            }
        }

        // 5. Look up Temple details if no center manager found
        if (userTemple && userTemple !== 'None' && userTemple !== 'None/None' && userTemple !== 'Other') {
            try {
                const templeRes = await query(
                    `SELECT t.id, t.name,
                            t.central_voice_manager_id, t.central_voice_manager_name,
                            u_cvm.name AS cvm_user_name, u_cvm.phone AS cvm_phone,
                            t.managing_director_id, t.managing_director_name,
                            u_md.name AS md_user_name, u_md.phone AS md_phone
                     FROM temples t
                     LEFT JOIN users u_cvm ON t.central_voice_manager_id::text = u_cvm.id::text
                     LEFT JOIN users u_md ON t.managing_director_id::text = u_md.id::text
                     WHERE LOWER(TRIM(t.name)) = LOWER(TRIM($1))
                     LIMIT 1`,
                    [userTemple]
                );

                const temple = templeRes.rows[0];
                if (temple) {
                    if (temple.central_voice_manager_name || temple.cvm_user_name) {
                        return NextResponse.json({
                            hasManager: true,
                            manager: {
                                name: temple.central_voice_manager_name || temple.cvm_user_name,
                                role: 'Central VOICE Manager',
                                phone: temple.cvm_phone || null,
                            },
                            centerName: null,
                            templeName: temple.name,
                        });
                    }

                    if (temple.managing_director_name || temple.md_user_name) {
                        return NextResponse.json({
                            hasManager: true,
                            manager: {
                                name: temple.managing_director_name || temple.md_user_name,
                                role: 'Managing Director',
                                phone: temple.md_phone || null,
                            },
                            centerName: null,
                            templeName: temple.name,
                        });
                    }
                }
            } catch (tErr) {
                console.warn('Failed to fetch temple in approval-manager API:', tErr);
            }
        }

        return NextResponse.json({
            hasManager: false,
            manager: null,
            centerName: userCenter || null,
            templeName: userTemple || null,
        });
    } catch (error: any) {
        console.error('Error in /api/auth/approval-manager:', error);
        return NextResponse.json(
            { hasManager: false, manager: null, error: 'Server error' },
            { status: 500 }
        );
    }
}

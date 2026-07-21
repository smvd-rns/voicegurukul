import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, id, ids, action } = body;

        if (!type || (!id && (!ids || ids.length === 0)) || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Robust ID handling: flatten any arrays and filter out falsy values
        const targetIds = [
            ...(Array.isArray(ids) ? ids : (ids ? [ids] : [])),
            ...(Array.isArray(id) ? id : (id ? [id] : []))
        ].filter(Boolean);

        if (targetIds.length === 0) {
            return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use Service Role Key to bypass RLS for admin actions
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Verify the requester is an admin (Role 8)
        // Verify the requester using custom JWT session token or Bearer token
        const { verifyToken } = require('@/lib/auth-server');
        const cookieToken = request.cookies.get('session_token')?.value;
        const authHeader = request.headers.get('authorization');
        const token = cookieToken || (authHeader ? authHeader.replace('Bearer ', '') : null);

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // Fetch user from Droplet DB
        const dbRes = await dbQuery('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
        const dbUser = dbRes.rows[0];

        if (!dbUser) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
        }

        const user = { id: dbUser.id, email: dbUser.email };
        const userData = { role: dbUser.role };

        // Check if role 8 (Super Admin) is present
        // Role can be number or array
        // Check if role 8 (Super Admin) or MD/Extended Roles are present
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        const allowedRoles = [8, 11, 12, 13, 14, 15, 16, 17, 2, 20];

        const isSuperAdmin = roles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');
        const isCounselor = roles.some((r: any) => [2, 20].includes(Number(r)) || ['counselor', 'care_giver'].includes(String(r)));
        const hasPermission = roles.some((r: any) => allowedRoles.includes(Number(r)));

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Perform Action
        const tableMap: Record<string, string> = {
            'center': 'centers',
            'city': 'cities',
            'counselor': 'counselors',
            'user': 'users'
        };
        const tableName = tableMap[type];

        if (!tableName) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        if (tableName === 'users') {
            const { reason } = body;

            // Counselor Scoping Check for Users
            if (isCounselor && !isSuperAdmin) {
                const adminEmail = user.email;
                if (!adminEmail) {
                    return NextResponse.json({ error: 'Unauthorized: Admin email missing' }, { status: 403 });
                }

                const normalizedAdminEmail = adminEmail.trim().toLowerCase();

                // Lookup Counselor ID and Name
                const { data: counselorData } = await supabase
                    .from('counselors')
                    .select('id, name')
                    .eq('email', normalizedAdminEmail)
                    .maybeSingle();

                const counselorName = counselorData?.name ? counselorData.name.trim().toLowerCase() : null;
                const adminCounselorId = counselorData?.id || null;

                // Fetch target users to verify counselor email/ID match
                const { data: targetUsers, error: targetError } = await supabase
                    .from('users')
                    .select('id, hierarchy, counselor_id, other_counselor')
                    .in('id', targetIds);

                if (targetError || !targetUsers) {
                    return NextResponse.json({ error: 'Failed to verify target users' }, { status: 500 });
                }

                // NEW: Fetch profile requests to check for requested counselors
                const { data: pReqs } = await supabase
                    .from('profile_update_requests')
                    .select('user_id, requested_changes')
                    .in('user_id', targetIds)
                    .eq('status', 'pending');

                const userToRequested = new Map<string, { emails: string[], names: string[] }>();
                if (pReqs) {
                    pReqs.forEach((r: any) => {
                        const rC = r.requested_changes || {};
                        const emails: string[] = [];
                        const names: string[] = [];
                        if (rC.brahmachariCounselorEmail) emails.push(rC.brahmachariCounselorEmail.trim().toLowerCase());
                        if (rC.grihasthaCounselorEmail) emails.push(rC.grihasthaCounselorEmail.trim().toLowerCase());
                        if (rC.brahmachariCounselor) names.push(rC.brahmachariCounselor.trim().toLowerCase());
                        if (rC.grihasthaCounselor) names.push(rC.grihasthaCounselor.trim().toLowerCase());
                        userToRequested.set(r.user_id, { emails, names });
                    });
                }

                const allMatch = (targetUsers as any[]).every((u: any) => {
                    const uH = u.hierarchy || {};
                    const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
                    const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
                    const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
                    const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();
                    const uE = (uH.counselorEmail || '').trim().toLowerCase();
                    const uN = (uH.counselor || '').trim().toLowerCase();

                    // Authority via Stable ID (Preferred)
                    if (adminCounselorId && u.counselor_id === adminCounselorId) return true;

                    // Authority via Current Counselor (Email or Name - Legacy & Unified)
                    if (bE === normalizedAdminEmail || gE === normalizedAdminEmail || uE === normalizedAdminEmail) return true;
                    if (counselorName && (bN === counselorName || gN === counselorName || uN === counselorName)) return true;

                    // Authority via "Other" Counselor Name match
                    if (uN === 'other' && (u.other_counselor || uH.otherCounselor)) {
                        const otherN = (u.other_counselor || uH.otherCounselor || '').trim().toLowerCase();
                        if (counselorName && otherN === counselorName) return true;
                    }

                    // Authority via Requested Counselor
                    const reqObj = userToRequested.get(u.id);
                    if (reqObj) {
                        if (reqObj.emails.includes(normalizedAdminEmail)) return true;
                        if (counselorName && reqObj.names.includes(counselorName)) return true;
                    }
                    return false;
                });

                if (!allMatch) {
                    return NextResponse.json({ error: 'Unauthorized: Some users are not assigned to you' }, { status: 403 });
                }
            }

            // Execute update via raw Droplet DB query
            const statusVal = action === 'approve' ? 'approved' : 'rejected';
            const reasonVal = action === 'reject' ? (reason || null) : null;
            const now = new Date().toISOString();

            await dbQuery(
                `UPDATE users SET verification_status = $1, rejection_reason = $2, reviewed_at = $3, reviewed_by = $4 WHERE id = ANY($5::uuid[])`,
                [statusVal, reasonVal, now, user.id, targetIds]
            );

            // Side Effects (Emails & Membership IDs)
            const { sendApprovalNotification, sendRejectionNotification } = await import('@/lib/utils/email');

            if (action === 'approve') {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                const { generateMembershipIdForUser } = await import('@/lib/utils/membership');

                for (const userId of targetIds) {
                    try {
                        const userRes = await dbQuery('SELECT email, name FROM users WHERE id = $1', [userId]);
                        const userDetails = userRes.rows[0];

                        if (userDetails?.email) {
                            await sendApprovalNotification(userDetails.email, userDetails.name || 'Devotee', `${baseUrl}/dashboard`);
                            try {
                                await generateMembershipIdForUser(supabase, userId);
                            } catch (genErr) {
                                console.error(`Failed to generate membership ID for ${userId} in verify-data:`, genErr);
                            }
                        }
                    } catch (sideEffectError) {
                        console.error(`Error in approval side effects for user ${userId}:`, sideEffectError);
                    }
                }
            } else if (action === 'reject') {
                for (const userId of targetIds) {
                    try {
                        const userRes = await dbQuery('SELECT email, name FROM users WHERE id = $1', [userId]);
                        const userDetails = userRes.rows[0];

                        if (userDetails?.email) {
                            await sendRejectionNotification(
                                userDetails.email,
                                userDetails.name || 'Devotee',
                                reason || 'Information provided was insufficient.'
                            );
                        }
                    } catch (sideEffectError) {
                        console.error(`Error sending rejection email for user ${userId}:`, sideEffectError);
                    }
                }
            }

        } else {
            // Non-user types (centers, cities, counselors) still require higher levels or super admin
            if (isCounselor && !isSuperAdmin) {
                return NextResponse.json({ error: 'Forbidden: Counselor can only verify students' }, { status: 403 });
            }

            if (action === 'approve') {
                const { error } = await supabase
                    .from(tableName)
                    .update({ is_verified: true })
                    .in('id', targetIds);

                if (error) throw error;
                
                if (tableName === 'centers') revalidateTag('centers');
                if (tableName === 'cities') revalidateTag('cities');
            } else if (action === 'reject') {
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in('id', targetIds);

                if (error) throw error;

                if (tableName === 'centers') revalidateTag('centers');
                if (tableName === 'cities') revalidateTag('cities');
            } else {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true, count: targetIds.length });
    } catch (error: any) {
        console.error('Admin verify error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}

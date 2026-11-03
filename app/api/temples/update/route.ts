import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const user = await getAuthUserFromRequest(request);
        if (!user || !user.id) {
            return NextResponse.json({ error: 'Unauthorized: Login required to update temples' }, { status: 401 });
        }

        const authenticatedClient = createClient();

        // Check permissions
        const { data: profile } = await authenticatedClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const roles = Array.isArray(profile?.role) ? profile.role : [profile?.role];
        const numRoles = roles.map((r: any) => Number(r)).filter((r: number) => !isNaN(r));
        const isAuthorized = numRoles.some((r: number) => [8, 9, 10, 11, 12, 13].includes(r)) ||
            roles.includes('super_admin') || roles.includes('managing_director');

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges to update temples' }, { status: 403 });
        }

        const body = await request.json();
        let {
            id, name, state, city, address, contact,
            managing_director_id, managing_director_name,
            director_id, director_name,
            central_voice_manager_id, central_voice_manager_name,
            yp_id, yp_name
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'Temple ID is required' }, { status: 400 });
        }

        // Basic Validation
        if (!name || !state || !city) {
            return NextResponse.json({ error: 'Name, State, and City are required' }, { status: 400 });
        }

        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');

        // 1. Fetch current temple state for role cleanup
        const { data: oldTemple } = await authenticatedClient
            .from('temples')
            .select('name, managing_director_id, director_id, central_voice_manager_id, yp_id')
            .eq('id', id)
            .single();

        // 2. Update Temple
        const { error: updateError } = await authenticatedClient
            .from('temples')
            .update({
                name: name.trim(),
                state: state.trim(),
                city: city.trim(),
                address: address?.trim() || null,
                contact: contact?.trim() || null,
                managing_director_id: managing_director_id || null,
                managing_director_name: managing_director_name || null,
                director_id: director_id || null,
                director_name: director_name || null,
                central_voice_manager_id: central_voice_manager_id || null,
                central_voice_manager_name: central_voice_manager_name || null,
                yp_id: yp_id || null,
                yp_name: yp_name || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 2b. Automatic Cascade: If temple name changed, update all centers, users, counselors, and registrations
        const oldTempleName = oldTemple?.name?.trim();
        const newTempleName = name?.trim();
        if (oldTempleName && newTempleName && oldTempleName !== newTempleName) {
            try {
                const { query: rawQuery } = await import('@/lib/db');

                // A. Cascade to centers table
                await rawQuery(
                    `UPDATE centers SET temple_name = $1, updated_at = NOW() WHERE temple_name = $2`,
                    [newTempleName, oldTempleName]
                );

                // B. Cascade to users current_temple & parent_temple
                await rawQuery(
                    `UPDATE users SET current_temple = $1, updated_at = NOW() WHERE current_temple = $2`,
                    [newTempleName, oldTempleName]
                );
                await rawQuery(
                    `UPDATE users SET parent_temple = $1, updated_at = NOW() WHERE parent_temple = $2`,
                    [newTempleName, oldTempleName]
                );

                // C. Cascade to users hierarchy JSONB fields (currentTemple, parentTemple, temple)
                await rawQuery(`
                    UPDATE users
                    SET hierarchy = jsonb_set(
                        jsonb_set(
                            jsonb_set(
                                COALESCE(hierarchy, '{}'::jsonb),
                                '{currentTemple}',
                                CASE WHEN hierarchy->>'currentTemple' = $2 THEN to_jsonb($1::text) ELSE COALESCE(hierarchy->'currentTemple', 'null'::jsonb) END
                            ),
                            '{parentTemple}',
                            CASE WHEN hierarchy->>'parentTemple' = $2 THEN to_jsonb($1::text) ELSE COALESCE(hierarchy->'parentTemple', 'null'::jsonb) END
                        ),
                        '{temple}',
                        CASE WHEN hierarchy->>'temple' = $2 THEN to_jsonb($1::text) ELSE COALESCE(hierarchy->'temple', 'null'::jsonb) END
                    ),
                    updated_at = NOW()
                    WHERE hierarchy->>'currentTemple' = $2 
                       OR hierarchy->>'parentTemple' = $2 
                       OR hierarchy->>'temple' = $2
                `, [newTempleName, oldTempleName]);

                // D. Cascade to counselors table
                try {
                    await rawQuery(
                        `UPDATE counselors SET current_temple = $1, updated_at = NOW() WHERE current_temple = $2`,
                        [newTempleName, oldTempleName]
                    );
                    await rawQuery(
                        `UPDATE counselors SET parent_temple = $1, updated_at = NOW() WHERE parent_temple = $2`,
                        [newTempleName, oldTempleName]
                    );
                } catch (counselorErr) {
                    console.warn('[Temple Rename Cascade] counselors update notice:', counselorErr);
                }

                // E. Cascade to camp_registrations table
                try {
                    await rawQuery(
                        `UPDATE camp_registrations SET current_temple = $1 WHERE current_temple = $2`,
                        [newTempleName, oldTempleName]
                    );
                    await rawQuery(
                        `UPDATE camp_registrations SET parent_temple = $1 WHERE parent_temple = $2`,
                        [newTempleName, oldTempleName]
                    );
                } catch (campErr) {
                    console.warn('[Temple Rename Cascade] camp_registrations update notice:', campErr);
                }

                console.log(`[Temple Rename Cascade] Successfully cascaded rename from "${oldTempleName}" to "${newTempleName}"`);
            } catch (cascadeErr) {
                console.error('[Temple Rename Cascade] Error cascading temple rename:', cascadeErr);
            }
        }

        // 3. Handle Role Changes (Grant & Revoke)
        const roleConfigs = [
            {
                role: 11,
                newId: managing_director_id,
                oldId: oldTemple?.managing_director_id,
                column: 'managing_director_id'
            },
            {
                role: 12,
                newId: director_id,
                oldId: oldTemple?.director_id,
                column: 'director_id'
            },
            {
                role: 13,
                newId: central_voice_manager_id,
                oldId: oldTemple?.central_voice_manager_id,
                column: 'central_voice_manager_id'
            },
            {
                role: 21,
                newId: yp_id,
                oldId: oldTemple?.yp_id,
                column: 'yp_id'
            }
        ];

        for (const config of roleConfigs) {
            // A. Grant role to new assignee
            if (config.newId && config.newId !== config.oldId) {
                try {
                    const { data: user } = await authenticatedClient
                        .from('users')
                        .select('role')
                        .eq('id', config.newId)
                        .single();

                    if (user) {
                        let currentRoles = Array.isArray(user.role) ? user.role : [user.role];
                        const roleNums = currentRoles.map(Number);
                        if (!roleNums.includes(config.role)) {
                            await authenticatedClient
                                .from('users')
                                .update({ role: [...roleNums, config.role], updated_at: new Date().toISOString() })
                                .eq('id', config.newId);
                        }
                    }
                } catch (err) {
                    console.error(`Error granting role ${config.role} to ${config.newId}:`, err);
                }
            }

            // B. Revoke role from old assignee if they no longer hold it for any temple
            if (config.oldId && config.oldId !== config.newId) {
                try {
                    // Use raw SQL COUNT since the custom query builder doesn't support { count: 'exact' }
                    const { query: rawQuery } = await import('@/lib/db');
                    const countRes = await rawQuery(
                        `SELECT COUNT(*) FROM temples WHERE ${config.column} = $1`,
                        [config.oldId]
                    );
                    const remainingCount = parseInt(countRes.rows[0]?.count ?? '0', 10);

                    console.log(`[Temple Update] ${config.column} old holder ${config.oldId} still in ${remainingCount} other temple(s)`);

                    // If count is 0, they no longer hold this role for any temple → revoke
                    if (remainingCount === 0) {
                        const { data: user } = await authenticatedClient
                            .from('users')
                            .select('role')
                            .eq('id', config.oldId)
                            .single();

                        if (user) {
                            const currentRoles = Array.isArray(user.role) ? user.role : [user.role];
                            const roleNums = currentRoles.map(Number);
                            if (roleNums.includes(config.role)) {
                                const newRoles = roleNums.filter((r: number) => r !== config.role);
                                await authenticatedClient
                                    .from('users')
                                    .update({ role: newRoles.length > 0 ? newRoles : [1], updated_at: new Date().toISOString() })
                                    .eq('id', config.oldId);
                                console.log(`[Temple Update] ✅ Revoked role ${config.role} from user ${config.oldId} → new roles:`, newRoles.length > 0 ? newRoles : [1]);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error revoking role ${config.role} from ${config.oldId}:`, err);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error updating temple:', error);
        return NextResponse.json({
            error: error.message || 'Failed to update temple'
        }, { status: 500 });
    }
}

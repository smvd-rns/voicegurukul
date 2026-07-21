import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
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

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const keyToUse = serviceRoleKey || supabaseAnonKey;

        const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
            const fetchHeaders = new Headers(init?.headers);
            if (serviceRoleKey) {
                fetchHeaders.set('apikey', serviceRoleKey);
                fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
            } else {
                if (accessToken) fetchHeaders.set('Authorization', `Bearer ${accessToken}`);
                fetchHeaders.set('apikey', supabaseAnonKey);
            }
            fetchHeaders.set('Content-Type', 'application/json');
            return fetch(input, { ...init, headers: fetchHeaders });
        };

        const authenticatedClient = createClient(supabaseUrl, keyToUse, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { fetch: customFetch },
        });

        // 1. Fetch current temple state for role cleanup
        const { data: oldTemple } = await authenticatedClient
            .from('temples')
            .select('managing_director_id, director_id, central_voice_manager_id, yp_id')
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
                        if (!currentRoles.includes(config.role)) {
                            await authenticatedClient
                                .from('users')
                                .update({ role: [...currentRoles, config.role] })
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
                    // Check if they hold this role for any OTHER temple
                    const { count } = await authenticatedClient
                        .from('temples')
                        .select('id', { count: 'exact', head: true })
                        .eq(config.column, config.oldId);

                    // If count is 0, they no longer hold this role for any temple
                    if (count === 0) {
                        const { data: user } = await authenticatedClient
                            .from('users')
                            .select('role')
                            .eq('id', config.oldId)
                            .single();

                        if (user) {
                            let currentRoles = Array.isArray(user.role) ? user.role : [user.role];
                            if (currentRoles.includes(config.role)) {
                                const newRoles = (currentRoles as any[]).filter((r: any) => r !== config.role);
                                await authenticatedClient
                                    .from('users')
                                    .update({ role: newRoles })
                                    .eq('id', config.oldId);
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

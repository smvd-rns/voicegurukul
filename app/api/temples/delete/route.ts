import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Temple ID is required' }, { status: 400 });
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

        // 1. Fetch temple data to get assignees before deletion
        const { data: temple, error: fetchError } = await authenticatedClient
            .from('temples')
            .select('managing_director_id, director_id, central_voice_manager_id')
            .eq('id', id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found", handle separately
            throw fetchError;
        }

        // 2. Delete the temple
        const { error: deleteError } = await authenticatedClient
            .from('temples')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // 3. Handle Role Revocation
        if (temple) {
            const roleConfigs = [
                { role: 11, id: temple.managing_director_id, column: 'managing_director_id' },
                { role: 12, id: temple.director_id, column: 'director_id' },
                { role: 13, id: temple.central_voice_manager_id, column: 'central_voice_manager_id' }
            ];

            for (const config of roleConfigs) {
                if (config.id) {
                    try {
                        // Check if they hold this role for any OTHER temple
                        const { count } = await authenticatedClient
                            .from('temples')
                            .select('id', { count: 'exact', head: true })
                            .eq(config.column, config.id);

                        // If count is 0, they no longer hold this role for any temple
                        if (count === 0) {
                            const { data: user } = await authenticatedClient
                                .from('users')
                                .select('role')
                                .eq('id', config.id)
                                .single();

                            if (user) {
                                let currentRoles = Array.isArray(user.role) ? user.role : [user.role];
                                if (currentRoles.includes(config.role)) {
                                    const newRoles = (currentRoles as any[]).filter((r: any) => r !== config.role);
                                    await authenticatedClient
                                        .from('users')
                                        .update({ role: newRoles })
                                        .eq('id', config.id);
                                }
                            }
                        }
                    } catch (err) {
                        console.error(`Error revoking role ${config.role} on delete:`, err);
                    }
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error deleting temple with role cleanup:', error);
        return NextResponse.json({
            error: error.message || 'Failed to delete temple'
        }, { status: 500 });
    }
}

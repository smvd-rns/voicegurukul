import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let {
            name, state, city, address, contact,
            managing_director_id, managing_director_name,
            director_id, director_name,
            central_voice_manager_id, central_voice_manager_name,
            yp_id, yp_name
        } = body;

        // Basic Validation
        if (!name || !state || !city) {
            return NextResponse.json({ error: 'Name, State, and City are required' }, { status: 400 });
        }

        // Rate Limiting
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const user = await getAuthUserFromRequest(request);
        const userId = user?.id || null;
        let isVerified = false;

        if (userId) {
                const cleanClient = createClient(supabaseUrl, supabaseAnonKey);
                // Fetch user role to determine verification status
                const { data: profile } = await cleanClient
                    .from('users')
                    .select('role')
                    .eq('id', userId)
                    .single();

                const roles = profile?.role;
                // User logic: if role is anything other than 1 or 'student', auto-verify
                // This covers: 2-13 (counselor, voice_manager, bc_voice_manager, city_admin, state_admin, zonal_admin, super_admin, and roles 9-13)
                const hasPrivilegedRole = Array.isArray(roles)
                    ? roles.some(r => r !== 1 && r !== 'student')
                    : (roles !== 1 && roles !== 'student');

                if (hasPrivilegedRole) {
                    isVerified = true;
                }
            }

        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rateLimit = await checkRateLimit(request, userId, {
            action: 'add_temple',
            limit: 20,
            windowMs: 60 * 60 * 1000,
            blockDurationMs: 6 * 60 * 60 * 1000
        });

        if (rateLimit.blocked) {
            return NextResponse.json({
                error: rateLimit.message,
                retryAfter: rateLimit.retryAfter
            }, { status: 429 });
        }

        // Sanitize logic (simplified)
        const sanitize = (str: string) => str ? str.trim() : '';
        const trimmedName = sanitize(name);
        const trimmedState = sanitize(state);
        const trimmedCity = sanitize(city);

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const keyToUse = serviceRoleKey || supabaseAnonKey;

        const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
            const fetchHeaders = new Headers(init?.headers);
            if (serviceRoleKey) {
                fetchHeaders.set('apikey', serviceRoleKey);
                fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
            } else {
                const token = request.headers.get('authorization')?.replace('Bearer ', '');
                if (token) fetchHeaders.set('Authorization', `Bearer ${token}`);
                fetchHeaders.set('apikey', supabaseAnonKey);
            }
            fetchHeaders.set('Content-Type', 'application/json');
            return fetch(input, { ...init, headers: fetchHeaders });
        };

        const authenticatedClient = createClient(supabaseUrl, keyToUse, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { fetch: customFetch },
        });

        // Check existing
        const { data: existing } = await authenticatedClient
            .from('temples')
            .select('id')
            .eq('state', trimmedState)
            .eq('city', trimmedCity)
            .eq('name', trimmedName)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ success: true, id: existing.id });
        }

        // Insert
        const { data: insertedData, error } = await authenticatedClient
            .from('temples')
            .insert({
                id: crypto.randomUUID(),
                name: trimmedName,
                state: trimmedState,
                city: trimmedCity,
                address: address?.trim() || null,
                contact: contact?.trim() || null,
                is_verified: isVerified,
                managing_director_id: managing_director_id || null,
                managing_director_name: managing_director_name || null,
                director_id: director_id || null,
                director_name: director_name || null,
                central_voice_manager_id: central_voice_manager_id || null,
                central_voice_manager_name: central_voice_manager_name || null,
                yp_id: yp_id || null,
                yp_name: yp_name || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') { // Duplicate
                const { data: existingTemple } = await authenticatedClient
                    .from('temples')
                    .select('id')
                    .eq('state', trimmedState)
                    .eq('city', trimmedCity)
                    .eq('name', trimmedName)
                    .single();
                return NextResponse.json({ success: true, id: existingTemple?.id });
            }
            throw error;
        }

        // Update user roles if assigned
        const rolesToUpdate = [
            { id: managing_director_id, role: 11 }, // Managing Director
            { id: director_id, role: 12 },          // Director
            { id: central_voice_manager_id, role: 13 }, // Central VOICE Manager
            { id: yp_id, role: 21 } // Youth Preacher
        ];

        for (const update of rolesToUpdate) {
            if (update.id) {
                try {
                    // Fetch current roles
                    const { data: user, error: userError } = await authenticatedClient
                        .from('users')
                        .select('role')
                        .eq('id', update.id)
                        .single();

                    if (user && !userError) {
                        let currentRoles = user.role;
                        let newRoles: any[] = [];

                        if (Array.isArray(currentRoles)) {
                            newRoles = [...currentRoles];
                        } else {
                            newRoles = [currentRoles];
                        }

                        // Add new role if not present
                        if (!newRoles.includes(update.role)) {
                            newRoles.push(update.role);

                            // Update user
                            await authenticatedClient
                                .from('users')
                                .update({ role: newRoles })
                                .eq('id', update.id);
                        }
                    }
                } catch (roleError) {
                    console.error(`Error updating role for user ${update.id}:`, roleError);
                    // Continue even if role update fails, as temple is created
                }
            }
        }

        return NextResponse.json({ success: true, id: insertedData?.id });

    } catch (error: any) {
        console.error('Error adding temple:', error);
        return NextResponse.json({
            error: error.message || 'Failed to add temple'
        }, { status: 500 });
    }
}

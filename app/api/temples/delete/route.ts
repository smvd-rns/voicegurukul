import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const user = await getAuthUserFromRequest(request);
        if (!user || !user.id) {
            return NextResponse.json({ error: 'Unauthorized: Login required to delete temples' }, { status: 401 });
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
        const isAuthorized = numRoles.some((r: number) => [8, 9, 10, 11].includes(r)) ||
            roles.includes('super_admin') || roles.includes('managing_director');

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges to delete temples' }, { status: 403 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Temple ID is required' }, { status: 400 });
        }

        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');

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

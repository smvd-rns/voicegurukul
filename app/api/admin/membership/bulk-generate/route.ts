import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {

        const supabaseAdmin = createClient();

        const user = await getAuthUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Role 8
        const { data: currentUser, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !currentUser || !(Array.isArray(currentUser.role) ? currentUser.role.includes(8) : currentUser.role === 8)) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        // Fetch users without membership IDs
        const { data: users, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('id, introduced_to_kc_in, parent_temple, other_parent_temple, other_temple, hierarchy')
            .not('introduced_to_kc_in', 'is', null)
            .not('parent_temple', 'is', null);

        if (fetchError) throw fetchError;

        // Fetch existing membership IDs to avoid duplicates
        const { data: existingIds } = await supabaseAdmin.from('membership_ids').select('user_id');
        const existingIdSet = new Set(existingIds?.map((m: any) => m.user_id) || []);

        const eligibleUsers = (users as any[]).filter((u: any) => !existingIdSet.has(u.id));
        
        const results = [];
        let successCount = 0;

        for (const u of eligibleUsers) {
            try {
                // Extract year robustly
                let year;
                const dateVal = u.introduced_to_kc_in;
                if (/^\d{4}$/.test(dateVal)) {
                    year = parseInt(dateVal);
                } else {
                    year = new Date(dateVal).getFullYear();
                }
                
                if (isNaN(year)) throw new Error('Invalid date');

                let templeName = u.parent_temple;
                if (templeName === 'Other') {
                    templeName = u.other_parent_temple || u.other_temple || u.hierarchy?.otherParentTemple || 'OTH';
                }
                
                const templeCode = templeName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');

                const { data: membershipId, error: rpcError } = await supabaseAdmin.rpc('generate_membership_id', {
                    p_user_id: u.id,
                    p_year: year,
                    p_temple_code: templeCode
                });

                if (rpcError) throw rpcError;
                
                // Sync donation_slug in users table
                await supabaseAdmin
                    .from('users')
                    .update({ donation_slug: membershipId })
                    .eq('id', u.id);

                successCount++;
                results.push({ userId: u.id, membershipId, status: 'success' });
            } catch (err: any) {
                results.push({ userId: u.id, error: err.message, status: 'error' });
            }
        }

        return NextResponse.json({ 
            success: true, 
            count: successCount, 
            totalProcessed: eligibleUsers.length,
            details: results 
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

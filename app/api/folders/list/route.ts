import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getActiveSadhanaSupabase } from '@/lib/supabase/sadhana';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sadhanaDbAdmin = getActiveSadhanaSupabase();
        if (!sadhanaDbAdmin) {
            return NextResponse.json({ error: 'Database initialization error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const parentId = searchParams.get('parentId');
        const activeTab = searchParams.get('activeTab') || 'global';

        let query = sadhanaDbAdmin.from('folders')
            .select('id, name, parent_id, user_id');

        if (parentId && parentId !== 'root') {
            query = query.eq('parent_id', parentId);
        } else {
            query = query.is('parent_id', null);
        }

        if (activeTab === 'my') {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) {
            console.error('Error listing folders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folders: data || [] });
    } catch (error: any) {
        console.error('Folder List Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

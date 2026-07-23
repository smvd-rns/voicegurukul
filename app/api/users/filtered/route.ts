import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();
        const { filterType, filterValue } = body;

        let query: any = supabaseAdmin.from('users').select('id');

        // Apply filters based on filterType
        if (filterType && filterValue) {
            switch (filterType) {
                case 'zone':
                    query = query.eq('zone', filterValue);
                    break;
                case 'state':
                    query = query.eq('state', filterValue);
                    break;
                case 'city':
                    query = query.eq('city', filterValue);
                    break;
                case 'center':
                    query = query.eq('center', filterValue);
                    break;
                case 'camp_dys':
                case 'camp_sankalpa':
                case 'camp_sphurti':
                case 'camp_utkarsh':
                case 'camp_faith_and_doubt':
                case 'camp_srcgd_workshop':
                case 'camp_nistha':
                case 'camp_ashray':
                    query = query.eq(filterType as any, true);
                    break;
            }
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        const userIds = (data || []).map((user: any) => user.id);

        return NextResponse.json({
            success: true,
            userIds,
            count: userIds.length,
        });
    } catch (error: any) {
        console.error('Error fetching filtered users:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch filtered users' },
            { status: 500 }
        );
    }
}

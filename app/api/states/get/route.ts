import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {

        const supabase = createClient();
        // Fallback: Fetch all cities (id, state) and unique them server-side. It's not optimal but works for <10k rows.

        const { data, error } = await supabase
            .from('cities')
            .select('state')
            .order('state');

        if (error) {
            throw error;
        }

        if (!data) {
            return NextResponse.json([]);
        }

        // Extract unique states
        const states = Array.from(new Set(((data || []) as any[]).map((item: any) => item.state))).sort();

        return NextResponse.json(states);

    } catch (error: any) {
        console.error('Error fetching states:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

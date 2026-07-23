import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Use service role key to ensure we can read all data
        const keyToUse = serviceRoleKey || supabaseAnonKey;

        if (!supabaseUrl || !keyToUse) {
            return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
        }

        // Custom, no-cache fetch
        const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
            return fetch(input, {
                ...init,
                cache: 'no-store',
            });
        };

        const supabase = createClient(supabaseUrl, keyToUse, {
            global: {
                fetch: customFetch,
            },
        });
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

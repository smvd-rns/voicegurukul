import { createClient } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results: any = { timestamp: Date.now() };

    try {
        const client = createClient();
        const { data, error } = await client.from('sadhana_reports').select('user_id, date').limit(10);
        results.mainDb = { data, error };
    } catch (e: any) {
        results.mainDb = { error: e.message };
    }

    return NextResponse.json(results);
}

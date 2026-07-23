import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const mainUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const mainKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sadhanaUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL;
    const sadhanaKey = process.env.NEXT_PUBLIC_SADHANA_DB_ANON_KEY;

    const mainClient = mainUrl && mainKey ? createClient(mainUrl, mainKey) : null;
    const sadhanaClient = sadhanaUrl && sadhanaKey ? createClient(sadhanaUrl, sadhanaKey) : null;

    const results: any = { timestamp: Date.now() };

    if (mainClient) {
        try {
            const { data, error } = await mainClient.from('sadhana_reports').select('user_id, date').limit(10);
            results.mainDb = { data, error };
        } catch (e: any) { results.mainDb = { error: e.message }; }
    }

    if (sadhanaClient) {
        try {
            const { data, error } = await sadhanaClient.from('sadhana_reports').select('user_id, date').limit(10);
            results.sadhanaDb = { data, error };
        } catch (e: any) { results.sadhanaDb = { error: e.message }; }
    }

    return NextResponse.json(results);
}

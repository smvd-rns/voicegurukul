import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const clean = (val: string | undefined) => val?.trim().replace(/^["']|["']$/g, '');

export async function GET() {
    const url = clean(process.env.NEXT_PUBLIC_SADHANA_DB_URL);
    const anon = clean(process.env.NEXT_PUBLIC_SADHANA_DB_ANON_KEY);
    const service = clean(process.env.SADHANA_DB_SERVICE_ROLE_KEY);

    const results: any = {
        timestamp: new Date().toISOString(),
        diagnostic: {
            url: url?.substring(0, 30),
            anonLength: anon?.length,
            serviceLength: service?.length,
            serviceStart: service?.substring(0, 10),
        },
        tests: {}
    };

    if (url) {
        // Test 1: Service Role
        if (service) {
            try {
                const client = createClient();
                const { error, data } = await client.from('sadhana_reports').select('id').limit(1);
                results.tests.serviceRole = { success: !error, error };
            } catch (e: any) { results.tests.serviceRole = { fatal: e.message }; }
        }

        // Test 2: Anon Key
        if (anon) {
            try {
                const client = createClient();
                const { error } = await client.from('sadhana_reports').select('id').limit(1);
                results.tests.anonKey = { success: !error, error };
            } catch (e: any) { results.tests.anonKey = { fatal: e.message }; }
        }
    }

    return NextResponse.json(results);
}

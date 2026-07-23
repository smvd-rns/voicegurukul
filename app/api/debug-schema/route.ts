import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data, error } = await supabase
            .from('counselors')
            .select('*')
            .limit(1);

        if (error) return NextResponse.json({ error }, { status: 500 });
        return NextResponse.json({
            columns: data?.[0] ? Object.keys(data[0]) : [],
            sample: data?.[0] || null
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

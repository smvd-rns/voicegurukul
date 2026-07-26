import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
const supabase = createClient();

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

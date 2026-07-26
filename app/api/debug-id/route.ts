import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
const supabase = createClient();

        const targetId = '96bbd399-f416-486b-ba9b-cd4ca611b7ea';

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', targetId)
            .maybeSingle();

        const { data: counselorData, error: counselorError } = await supabase
            .from('counselors')
            .select('id, email, name')
            .eq('id', targetId)
            .maybeSingle();

        return NextResponse.json({
            targetId,
            foundInUsers: !!userData,
            userData,
            foundInCounselors: !!counselorData,
            counselorData
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Check Counselors
        const { data: counselors } = await supabase.from('counselors').select('*');

        // 2. Check Pending Profile Requests
        const { data: requests } = await supabase
            .from('profile_update_requests')
            .select('*')
            .eq('status', 'pending');

        return NextResponse.json({
            counselors,
            requestsCount: requests?.length || 0,
            requests: requests?.slice(0, 5) // Sample
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}

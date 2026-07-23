import {  createClient  } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getBulkSadhanaReportsByRange } from '@/lib/supabase/sadhana';

export const dynamic = 'force-dynamic';

async function getAuthUser(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        return null;
    }

    return user;
}

export async function POST(request: Request) {
    try {
        const requester = await getAuthUser(request);
        if (!requester) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userIds, from, to } = body;

        if (!userIds || !Array.isArray(userIds) || !from || !to) {
            return NextResponse.json({ error: 'Missing required parameters (userIds, from, to)' }, { status: 400 });
        }

        // Safety limit to avoid super heavy queries
        if (userIds.length > 5000) {
            return NextResponse.json({ error: 'Too many users requested' }, { status: 400 });
        }

        const reports = await getBulkSadhanaReportsByRange(userIds, from, to);

        return NextResponse.json({ success: true, data: reports });

    } catch (error: any) {
        console.error('Sadhana Bulk History API POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

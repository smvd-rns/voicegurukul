import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sendRejectionNotification } from '@/lib/utils/email';

export async function POST(request: Request) {
    try {
        const requester = await getAuthUserFromRequest(request);
        if (!requester || !requester.id) {
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        const supabase = getAdminClient();
        const { data: requesterDb } = await supabase
            .from('users')
            .select('role')
            .eq('id', requester.id)
            .single();

        const roles: number[] = (Array.isArray(requesterDb?.role) ? requesterDb.role : [requesterDb?.role]).map((r: any) => Number(r));
        const isAuthorized = roles.some((r: number) => [2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 31].includes(r));
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Leadership or administrative role required' }, { status: 403 });
        }

        const { userId, rejectionReason } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }
        
        const { data: user, error } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', userId)
            .single();

        if (error || !user || !user.email) {
            return NextResponse.json({ error: 'User not found or no email' }, { status: 404 });
        }

        await sendRejectionNotification(user.email, user.name || 'Devotee', rejectionReason || 'Information provided was insufficient.');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API /emails/rejected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

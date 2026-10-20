import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sendRejectionNotification } from '@/lib/utils/email';

export async function POST(request: Request) {
    try {
        const requester = await getAuthUserFromRequest(request);
        if (!requester || !requester.id) {
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        const { userId, rejectionReason } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = getAdminClient();
        
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

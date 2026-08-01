import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendApprovalNotification } from '@/lib/utils/email';

export async function POST(request: Request) {
    try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = getAdminClient();
        
        const { data: user, error } = await supabase
            .from('users')
            .select('email, name, phone, hierarchy, current_center, current_temple, membership_id')
            .eq('id', userId)
            .single();

        if (error || !user || !user.email) {
            return NextResponse.json({ error: 'User not found or no email' }, { status: 404 });
        }

        const dashboardUrl = `${baseUrl}/dashboard`;

        await sendApprovalNotification(user.email, user.name || 'Devotee', dashboardUrl);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API /emails/approved error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

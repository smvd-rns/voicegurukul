import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(
    request: NextRequest,
    { params }: { params: { messageId: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const messageId = params.messageId;

        // Verify user ownership or super admin role
        const { data: message, error: fetchError } = await supabaseAdmin
            .from('messages')
            .select('sender_id')
            .eq('id', messageId)
            .single();

        if (fetchError || !message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
        const isSuperAdmin = userRoles.includes(8) || userRoles.includes('super_admin');

        if (message.sender_id !== user.id && !isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete message
        const { error: deleteError } = await supabaseAdmin
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (deleteError) {
            throw new Error(deleteError.message);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting broadcast message:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete message' },
            { status: 500 }
        );
    }
}

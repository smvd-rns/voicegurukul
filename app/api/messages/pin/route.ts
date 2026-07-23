import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const user = await getAuthUserFromRequest(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { messageId, pinned } = body;

        // Get current message
        const { data: message, error: fetchError } = await supabaseAdmin
            .from('messages')
            .select('pinned_by')
            .eq('id', messageId)
            .single();

        if (fetchError) {
            throw new Error(fetchError.message);
        }

        const currentPinnedBy = message.pinned_by || [];
        let newPinnedBy: string[];

        if (pinned) {
            // Add user to pinned_by if not already there
            newPinnedBy = currentPinnedBy.includes(user.id)
                ? currentPinnedBy
                : [...currentPinnedBy, user.id];
        } else {
            // Remove user from pinned_by
            newPinnedBy = currentPinnedBy.filter((id: string) => id !== user.id);
        }

        // Update message
        const { error: updateError } = await supabaseAdmin
            .from('messages')
            .update({ pinned_by: newPinnedBy })
            .eq('id', messageId);

        if (updateError) {
            throw new Error(updateError.message);
        }

        return NextResponse.json({ success: true, pinned });
    } catch (error: any) {
        console.error('Error toggling pin:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to toggle pin' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: { messageId: string } }
) {
    try {
        const supabaseAdmin = createClient();
        const user = await getAuthUserFromRequest(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const messageId = params.messageId;

        // Get the message
        const { data: message, error: msgError } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .eq('sender_id', user.id)
            .single();

        if (msgError || !message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        const recipientIds = message.recipient_ids || [];
        const readByIds = message.read_by || [];
        const unreadIds = recipientIds.filter((id: string) => !readByIds.includes(id));

        // Fetch user details for read users
        const { data: readUsers } = await supabaseAdmin
            .from('users')
            .select('id, name, zone, state, city, center')
            .in('id', readByIds);

        // Fetch user details for unread users
        const { data: unreadUsers } = await supabaseAdmin
            .from('users')
            .select('id, name, zone, state, city, center')
            .in('id', unreadIds);

        // Group users by hierarchy
        const groupByHierarchy = (users: any[]) => {
            const grouped: any = {};

            users.forEach((user) => {
                const state = user.state || 'Unknown State';
                const city = user.city || 'Unknown City';
                const center = user.center || 'Unknown Center';

                if (!grouped[state]) grouped[state] = {};
                if (!grouped[state][city]) grouped[state][city] = {};
                if (!grouped[state][city][center]) grouped[state][city][center] = [];

                grouped[state][city][center].push({
                    id: user.id,
                    name: user.name,
                });
            });

            return grouped;
        };

        return NextResponse.json({
            success: true,
            message: {
                id: message.id,
                subject: message.subject,
                content: message.content,
                priority: message.priority,
                category: message.category,
                createdAt: message.created_at,
            },
            stats: {
                totalRecipients: recipientIds.length,
                readCount: readByIds.length,
                unreadCount: unreadIds.length,
                readPercentage: recipientIds.length > 0
                    ? Math.round((readByIds.length / recipientIds.length) * 100)
                    : 0,
            },
            readUsers: {
                list: readUsers || [],
                grouped: groupByHierarchy(readUsers || []),
            },
            unreadUsers: {
                list: unreadUsers || [],
                grouped: groupByHierarchy(unreadUsers || []),
            },
        });
    } catch (error: any) {
        console.error('Error fetching message analytics:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}

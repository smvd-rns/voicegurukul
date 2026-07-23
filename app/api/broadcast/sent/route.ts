import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
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

        // Get user role
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        // Helper to get numeric role level
        const getRoleLevel = (role: any): number => {
            if (typeof role === 'number') return role;
            const roleMap: Record<string, number> = {
                'super_admin': 8,
                'zonal_admin': 7,
                'state_admin': 6,
                'city_admin': 5,
                'center_admin': 4,
                'bc_voice_manager': 4,
                'voice_manager': 3,
                'senior_counselor': 3,
                'counselor': 2,
                'student': 1
            };
            return roleMap[role] || 1;
        };

        const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
        const maxRoleLevel = Math.max(...userRoles.map(getRoleLevel));

        if (maxRoleLevel < 4) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // AUTO-DELETION LOGIC (Only for Strict Role 4 / Center Admin)
        // Policy: Messages older than 1 month (30 days) are deleted automatically for Role 4.
        // Role 8 (Super Admin) and users with higher privileges are exempt.
        if (maxRoleLevel === 4) {
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { error: deleteError } = await supabaseAdmin
                    .from('messages')
                    .delete()
                    .eq('sender_id', user.id)
                    .eq('is_broadcast', true)
                    .lt('created_at', thirtyDaysAgo.toISOString());

                if (deleteError) {
                    console.error('Error auto-deleting old messages for Role 4:', deleteError);
                    // We continue even if delete fails, not blocking the user from seeing current messages
                } else {
                    // Optional: Log success (e.g. console.log('Cleaned up old messages for user', user.id));
                }
            } catch (err) {
                console.error('Exception during auto-deletion:', err);
            }
        }

        // Fetch all broadcast messages sent by this user
        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select('id, subject, content, priority, category, created_at, recipient_ids, read_by')
            .eq('sender_id', user.id)
            .eq('is_broadcast', true)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        // Calculate stats for each message
        const messagesWithStats = messages.map((msg: any) => {
            const totalRecipients = msg.recipient_ids?.length || 0;
            const readCount = msg.read_by?.length || 0;
            const unreadCount = totalRecipients - readCount;
            const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

            return {
                id: msg.id,
                subject: msg.subject,
                content: msg.content,
                priority: msg.priority,
                category: msg.category,
                createdAt: msg.created_at,
                totalRecipients,
                readCount,
                unreadCount,
                readPercentage,
            };
        });

        return NextResponse.json({
            success: true,
            messages: messagesWithStats,
        });
    } catch (error: any) {
        console.error('Error fetching sent messages:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch sent messages' },
            { status: 500 }
        );
    }
}

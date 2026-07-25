import { createClient } from '@/lib/supabase/server-db';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Fetch all templates
export async function GET(request: Request) {
    try {
        const supabaseAdmin = createClient();
        const user = await getAuthUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Super Admin Role (8)
        const { data: currentUser, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !currentUser || !(Array.isArray(currentUser.role) ? currentUser.role.includes(8) : currentUser.role === 8)) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        const result = await pool.query('SELECT * FROM email_templates ORDER BY created_at ASC');
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Failed to get email templates:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// POST: Create or update email template
export async function POST(request: Request) {
    try {
        const supabaseAdmin = createClient();
        const user = await getAuthUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Super Admin Role (8)
        const { data: currentUser, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !currentUser || !(Array.isArray(currentUser.role) ? currentUser.role.includes(8) : currentUser.role === 8)) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        const body = await request.json();
        const { key, name, subject, body: emailBody, is_enabled, recipient_type, recipient_role } = body;

        if (!key || !name || !subject || !emailBody) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const queryText = `
            INSERT INTO email_templates (key, name, subject, body, is_enabled, recipient_type, recipient_role, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (key) DO UPDATE
            SET name = EXCLUDED.name,
                subject = EXCLUDED.subject,
                body = EXCLUDED.body,
                is_enabled = EXCLUDED.is_enabled,
                recipient_type = EXCLUDED.recipient_type,
                recipient_role = EXCLUDED.recipient_role,
                updated_at = NOW()
            RETURNING *;
        `;
        const values = [key, name, subject, emailBody, is_enabled !== false, recipient_type || 'devotee', recipient_role || null];
        const result = await pool.query(queryText, values);

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Failed to save email template:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Delete email template
export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = createClient();
        const user = await getAuthUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Super Admin Role (8)
        const { data: currentUser, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !currentUser || !(Array.isArray(currentUser.role) ? currentUser.role.includes(8) : currentUser.role === 8)) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Missing template key' }, { status: 400 });
        }

        // Protect system templates
        const systemKeys = ['registration_notification', 'profile_update_approval', 'welcome_approved'];
        if (systemKeys.includes(key)) {
            return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 400 });
        }

        await pool.query('DELETE FROM email_templates WHERE key = $1', [key]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete email template:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Helper to check if a user is a Super Admin (Role 8)
const isSuperAdmin = (roles: any[] | any): boolean => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.some(r => r === 8 || r === 'super_admin');
};

export async function GET(request: Request) {
    try {

        // 1. Verify Authentication & Role
        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check User's Role in 'users' table
        // We can use the service role client here to check the user's role if RLS blocks reading own role (unlikely but safe)
        // Or just use the authClient if RLS allows reading own profile.
        // Let's use service client to be sure we get the role.
        const adminClient = createClient();

        const { data: userProfile, error: profileError } = await adminClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            // Fallback: If user not found in public users table, they might not be fully set up
            return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
        }

        if (!isSuperAdmin(userProfile.role)) {
            return NextResponse.json({ error: 'Forbidden: Requires Super Admin privileges' }, { status: 403 });
        }

        // 2. Fetch Eligible Users (Roles 14, 15, 16)
        // We need to check if the 'role' column (likely jsonb or array) contains these values.
        // Since 'role' can be mixed types (int/string), we should filter carefully.
        // The most reliable way with supabase header filtering on jsonb/array is .contains or .or with contains.

        // However, if fetching ALL users isn't huge, we can fetch simpler columns and filter in JS if Supabase query is complex for mixed types.
        // But 'users' table can be large.
        // Let's try to filter by the specific integers we care about: 14, 15, 16.

        // Note: The `role` column is often an array or single value.
        // If it's a JSONB array of numbers: .contains('role', '[14]') works.
        // If it's a single number column: .eq('role', 14) (but schema says checking if array).
        // The `users` table usually has `role` as JSONB or similarly flexible column in this project.

        // 2. Fetch All Users
        const { data: users, error: fetchError } = await adminClient
            .from('users')
            .select('id, name, role, email')
            .order('name');

        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        // Return all registered and imported users for Super Admin selection
        return NextResponse.json(users || []);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

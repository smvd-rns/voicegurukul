import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

// Helper to check if a user is a Super Admin (Role 8)
const isSuperAdmin = (roles: any[] | any): boolean => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.some(r => r === 8 || r === 'super_admin');
};

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Supabase credentials missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // 1. Verify Authentication & Role
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await authClient.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check User's Role in 'users' table
        // We can use the service role client here to check the user's role if RLS blocks reading own role (unlikely but safe)
        // Or just use the authClient if RLS allows reading own profile.
        // Let's use service client to be sure we get the role.
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

        console.log('API: Fetching eligible roles...');
        // 2. Fetch Eligible Users (Roles 14, 15, 16)
        // We will fetch all users and filter in memory.
        const { data: users, error: fetchError } = await adminClient
            .from('users')
            .select('id, name, role, email')
            .order('name');

        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        console.log(`API: Fetched ${users?.length} users. Filtering...`);

        // Debug: Log all unique roles found to check for typos/mismatches
        const uniqueRoles = new Set();
        users?.forEach((u: any) => {
            const roles = Array.isArray(u.role) ? u.role : [u.role];
            roles.forEach((r: any) => uniqueRoles.add(r));
        });
        console.log('API: All unique roles in DB:', Array.from(uniqueRoles));

        // 3. Filter in memory
        // Include roles 8 (Super Admin) through 17 (OC), plus 21 (Youth Preacher)
        // This covers: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21
        const targetRoles = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21];

        // String mapping for these roles
        const targetRoleStrings = [
            'super_admin', 'vice_president', 'president', 'managing_director',
            'director', 'central_voice_manager', 'project_advisor', 'project_manager',
            'acting_manager', 'oc', 'youth_preacher',
            'zonal_admin', 'state_admin', 'city_admin', 'center_admin', 'bc_voice_manager' // encompassing 4-7 as well just in case
        ];

        const eligibleUsers = (users || []).filter((u: any) => {
            const uRoles = Array.isArray(u.role) ? u.role : [u.role];

            return uRoles.some((r: any) => {
                // Check numbers
                const num = Number(r);
                if (!isNaN(num) && targetRoles.includes(num)) return true;
                // Also allow roles 4-7 (Admins) if they want "all admin"
                if (!isNaN(num) && num >= 4 && num <= 17) return true;

                // Check strings
                if (typeof r === 'string') {
                    const lowerR = r.toLowerCase();
                    return targetRoleStrings.includes(lowerR) || targetRoleStrings.includes(r);
                }

                return false;
            });
        });

        console.log(`API: Returning ${eligibleUsers.length} eligible users.`);
        return NextResponse.json(eligibleUsers);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

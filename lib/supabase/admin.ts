import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase admin client (service role).
 * Reused across all API route invocations in the same server process
 * to avoid creating a new connection + memory allocation per request.
 */
import { verifyToken } from '@/lib/auth-server';
import { cookies } from 'next/headers';

/**
 * Singleton Supabase admin client (service role).
 * Reused across all API route invocations in the same server process
 * to avoid creating a new connection + memory allocation per request.
 */
let _adminClient: SupabaseClient | null = null;

const cleanEnvVar = (val: string | undefined) => {
    if (!val) return undefined;
    return val.trim().replace(/^["']|["']$/g, '');
};

export function getAdminClient(): SupabaseClient {
    if (_adminClient) return _adminClient;

    const supabaseUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const serviceRoleKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    return _adminClient;
}

/**
 * Verify a Bearer token or cookie and return the authenticated user.
 * Returns null if the token is missing or invalid.
 */
export async function getAuthUserFromRequest(request: Request) {
    let token = cookies().get('session_token')?.value;
    if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        }
    }

    if (!token || token === 'undefined') return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    return {
        id: decoded.userId,
        email: decoded.email,
        user_metadata: { name: decoded.name }
    };
}

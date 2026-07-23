import { supabase } from './config';
import { verifyToken } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export function getAdminClient(): any {
    return supabase;
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

export async function getAuthUserFromCookies() {
    const token = cookies().get('session_token')?.value;
    if (!token || token === 'undefined') return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    return {
        id: decoded.userId,
        email: decoded.email,
        user_metadata: { name: decoded.name }
    };
}

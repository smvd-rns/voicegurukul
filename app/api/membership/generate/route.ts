import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Retrieve token from cookie or Authorization header
        let token = cookies().get('session_token')?.value;
        if (!token) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '');
            }
        }

        if (!token || token === 'undefined') {
            return NextResponse.json({ error: 'Missing or invalid session token' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Invalid token or session expired' }, { status: 401 });
        }

        const userId = decoded.userId;

        // Fetch user data needed for ID generation from PostgreSQL database
        const dbRes = await query(
            'SELECT introduced_to_kc_in, parent_temple, other_parent_temple, other_temple, hierarchy FROM users WHERE id = $1',
            [userId]
        );
        const userData = dbRes.rows[0];

        if (!userData) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        const introducedToKcIn = userData.introduced_to_kc_in;
        const parentTemple = userData.parent_temple;

        if (!introducedToKcIn || !parentTemple) {
            return NextResponse.json({ 
                error: 'Missing required profile information. Please ensure "Introduced to KC on" and "Parent Temple" are filled in your profile.' 
            }, { status: 400 });
        }

        // 1. Extract year (expecting YYYY-MM-DD or similar)
        let year;
        try {
            if (/^\d{4}$/.test(introducedToKcIn)) {
                year = parseInt(introducedToKcIn);
            } else {
                year = new Date(introducedToKcIn).getFullYear();
            }
            if (isNaN(year)) throw new Error('Invalid date');
        } catch (e) {
            return NextResponse.json({ error: 'Invalid "Introduced to KC" date format' }, { status: 400 });
        }
        
        // 2. Extract temple code (3 letters)
        let templeName = parentTemple;
        if (templeName === 'Other') {
            const hierarchy = typeof userData.hierarchy === 'string' 
                ? JSON.parse(userData.hierarchy) 
                : (userData.hierarchy || {});
            templeName = userData.other_parent_temple || userData.other_temple || hierarchy.otherParentTemple || 'OTH';
        }

        if (!templeName || templeName.trim().length < 1) {
             return NextResponse.json({ error: 'Invalid Parent Temple name' }, { status: 400 });
        }

        // Clean name (remove special characters, take first 3)
        const templeCode = templeName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');

        // 3. Call the atomic PostgreSQL function directly
        let membershipId = '';
        try {
            const rpcRes = await query(
                'SELECT generate_membership_id($1, $2, $3) AS id',
                [userId, year, templeCode]
            );
            membershipId = rpcRes.rows[0]?.id;
        } catch (dbError: any) {
            console.error('Database RPC function error:', dbError);
            return NextResponse.json({ error: `Internal database error: ${dbError.message}` }, { status: 500 });
        }

        if (!membershipId) {
            return NextResponse.json({ error: 'Failed to generate membership ID' }, { status: 500 });
        }

        // Sync donation_slug in users table
        await query(
            'UPDATE users SET donation_slug = $1 WHERE id = $2',
            [membershipId, userId]
        );

        return NextResponse.json({ 
            success: true, 
            membershipId,
            message: 'Membership ID generated successfully!' 
        });

    } catch (error: any) {
        console.error('Membership generation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

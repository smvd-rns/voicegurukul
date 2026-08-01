import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Fetch all users (registered, imported, active) to populate role dropdowns
        const res = await dbQuery(`
            SELECT id, name, role, email 
            FROM users 
            ORDER BY name ASC NULLS LAST, email ASC
        `);

        return NextResponse.json(res.rows || []);
    } catch (error: any) {
        console.error('API Error in /api/centers/eligible-roles:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

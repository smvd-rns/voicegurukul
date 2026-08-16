import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { query } from '@/lib/db';
import { SPIRITUAL_MASTERS } from '@/lib/utils/spiritual-masters';

export const dynamic = 'force-dynamic';

// Helper to check if user is a Superadmin
async function checkSuperAdmin(request: Request) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || !user.id) return false;

    const dbClient = createClient();
    const { data: profile } = await dbClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role) return false;

    const roles = profile.role;
    const isSuperAdmin = Array.isArray(roles)
      ? roles.some((r) => String(r) === '8' || String(r) === 'super_admin')
      : String(roles) === '8' || String(roles) === 'super_admin';

    return isSuperAdmin;
  } catch (error) {
    console.error('Error checking superadmin:', error);
    return false;
  }
}

// GET all spiritual masters
export async function GET() {
  try {
    // Try querying the database
    const res = await query('SELECT * FROM spiritual_masters ORDER BY name ASC');
    
    // If table is empty or has no records, fallback to hardcoded list but do not raise error
    if (res.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: SPIRITUAL_MASTERS.map((name, index) => ({ id: `hardcoded-${index}`, name })),
        isFallback: true,
        message: 'No records in database. Displaying static list.'
      });
    }

    return NextResponse.json({
      success: true,
      data: res.rows,
      isFallback: false
    });
  } catch (error: any) {
    console.warn('Database spiritual_masters query failed, falling back to static list. Error:', error.message);
    
    // Graceful fallback to hardcoded list
    return NextResponse.json({
      success: true,
      data: SPIRITUAL_MASTERS.map((name, index) => ({ id: `hardcoded-${index}`, name })),
      isFallback: true,
      isTableMissing: error.code === '42P01' || error.message?.includes('does not exist'),
      message: 'Failed to read from database. Displaying static list.'
    });
  }
}

// POST a new spiritual master
export async function POST(request: Request) {
  try {
    const isAuthorized = await checkSuperAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Only Superadmins can manage spiritual masters.' }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Insert into DB
    const res = await query(
      'INSERT INTO spiritual_masters (name) VALUES ($1) RETURNING *',
      [trimmedName]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0]
    });
  } catch (error: any) {
    console.error('Error adding spiritual master:', error);
    
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Spiritual Master name already exists' }, { status: 409 });
    }
    
    return NextResponse.json({
      error: error.message || 'Failed to add spiritual master'
    }, { status: 500 });
  }
}

// DELETE a spiritual master
export async function DELETE(request: Request) {
  try {
    const isAuthorized = await checkSuperAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Only Superadmins can manage spiritual masters.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Spiritual Master ID is required' }, { status: 400 });
    }

    // Delete from DB
    const res = await query('DELETE FROM spiritual_masters WHERE id = $1 RETURNING *', [id]);
    
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Spiritual Master not found' }, { status: 444 });
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0]
    });
  } catch (error: any) {
    console.error('Error deleting spiritual master:', error);
    return NextResponse.json({
      error: error.message || 'Failed to delete spiritual master'
    }, { status: 500 });
  }
}

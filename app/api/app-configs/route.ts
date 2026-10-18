import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query('SELECT key, value, updated_at FROM app_configs');
    const configs: Record<string, any> = {};
    for (const row of res.rows) {
      const val = row.value;
      if (Array.isArray(val)) {
        if (val.length === 1 && (val[0] === 'true' || val[0] === 'enabled')) {
          configs[row.key] = true;
        } else if (val.length === 1 && (val[0] === 'false' || val[0] === 'disabled')) {
          configs[row.key] = false;
        } else {
          configs[row.key] = val;
        }
      } else {
        configs[row.key] = val;
      }
    }
    return NextResponse.json({ configs, error: null });
  } catch (err: any) {
    console.error('Error fetching app configs:', err);
    return NextResponse.json({ configs: {}, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const cookieToken = req.cookies.get('session_token')?.value;
    const authHeader = req.headers.get('authorization');
    const token = cookieToken || (authHeader ? authHeader.replace('Bearer ', '') : null);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const session = verifyToken(token);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Check super_admin role
    const userRes = await query('SELECT id, role FROM users WHERE id = $1', [session.userId]);
    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roles = Array.isArray(user.role) ? user.role : [user.role];
    const isSuperAdmin = roles.includes('super_admin') || roles.includes(8) || roles.includes('8');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required' }, { status: 403 });
    }

    // 3. Process key & value
    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    let arrayValue: string[];
    if (typeof value === 'boolean') {
      arrayValue = [value ? 'enabled' : 'disabled'];
    } else if (Array.isArray(value)) {
      arrayValue = value.map(String);
    } else {
      arrayValue = [String(value)];
    }

    // Delete existing entry to avoid duplicates
    await query('DELETE FROM app_configs WHERE key = $1', [key]);
    // Insert new entry
    await query(
      'INSERT INTO app_configs (key, value, updated_at) VALUES ($1, $2, now())',
      [key, arrayValue]
    );

    return NextResponse.json({
      success: true,
      key,
      value: typeof value === 'boolean' ? value : arrayValue,
      error: null,
    });
  } catch (err: any) {
    console.error('Error updating app config:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

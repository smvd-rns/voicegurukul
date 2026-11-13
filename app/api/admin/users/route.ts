import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user from cookie or Authorization header
    const cookieToken = req.cookies.get('session_token')?.value;
    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const session = verifyToken(token);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Check admin permissions
    const userRoleRes = await query('SELECT role FROM users WHERE id = $1', [session.userId]);
    if (userRoleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const rawRoles = userRoleRes.rows[0].role;
    const numericRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));

    const isSuperAdmin = numericRoles.includes(8) || (Array.isArray(rawRoles) && rawRoles.includes('super_admin'));
    const isHigherAdmin = isSuperAdmin || numericRoles.some((r: number) => [9, 10, 11, 12, 13, 14, 15, 16, 17, 21].includes(r));

    if (!isHigherAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 3. Parallel database queries directly on PostgreSQL (Zero network hops on Droplet)
    const [usersRes, templesRes, centersRes, counselorsRes] = await Promise.all([
      query(`
        SELECT 
          u.id, u.name, u.email, u.phone, u.role, u.profile_image, u.birth_date,
          u.verification_status, u.created_at, u.updated_at,
          u.state, u.city, u.center, u.center_id, u.current_center, u.parent_center, u.other_center,
          u.current_temple, u.parent_temple, u.other_temple,
          u.counselor, u.counselor_id, u.other_counselor,
          u.brahmachari_counselor, u.brahmachari_counselor_email,
          u.grihastha_counselor, u.grihastha_counselor_email,
          u.ashram, u.initiation_status, u.initiated_name, u.rounds,
          u.spiritual_master_name, u.aspiring_spiritual_master_name,
          u.introduced_to_kc_in, u.health_chronic_disease,
          u.hierarchy,
          d.camp_dys, d.camp_sankalpa, d.camp_sphurti, d.camp_utkarsh, d.camp_srcgd_workshop,
          d.camp_nishtha, d.camp_ftec, d.camp_ashraya, d.camp_mtec, d.camp_sharanagati, d.camp_idc,
          d.camp_bhakti_shastri, d.camp_positive_thinker, d.camp_self_manager, d.camp_proactive_leader
        FROM users u
        LEFT JOIN user_profile_details d ON d.user_id = u.id
        ORDER BY u.created_at DESC
      `),
      query(`
        SELECT id, name, state, city 
        FROM temples 
        ORDER BY state, city, name
      `),
      query(`
        SELECT id, name, state, city, temple_id, temple_name 
        FROM centers 
        ORDER BY state, city, name
      `),
      query(`
        SELECT id, name, email, mobile, city, ashram, role, is_verified, current_temple, parent_temple 
        FROM counselors 
        WHERE is_verified = true 
        ORDER BY name
      `),
    ]);

    return NextResponse.json({
      success: true,
      users: usersRes.rows,
      temples: templesRes.rows,
      centers: centersRes.rows,
      counselors: counselorsRes.rows,
      totalCount: usersRes.rows.length,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error: any) {
    console.error('[Admin Users API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


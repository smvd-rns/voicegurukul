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
    if (!session?.userId || !session?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Check user roles
    const userRoleRes = await query('SELECT role, email FROM users WHERE id = $1', [session.userId]);
    if (userRoleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const rawRoles = userRoleRes.rows[0].role;
    const userEmail = (userRoleRes.rows[0].email || session.email).trim().toLowerCase();
    const numericRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));

    const isSuperAdmin = numericRoles.includes(8) || (Array.isArray(rawRoles) && rawRoles.includes('super_admin'));
    const isCounselor = isSuperAdmin || numericRoles.some((r: number) => [2, 3, 4, 20, 31].includes(r));

    if (!isCounselor) {
      return NextResponse.json({ success: false, error: 'Forbidden: Counselor access required' }, { status: 403 });
    }

    // 3. Resolve counselor profile in counselors table
    const counselorRes = await query(
      `SELECT id, name, user_id, email, current_temple, parent_temple 
       FROM counselors 
       WHERE LOWER(email) = LOWER($1) OR user_id = $2
       LIMIT 1`,
      [userEmail, session.userId]
    );

    const counselorData = counselorRes.rows[0] || null;
    const counselorId = counselorData?.id || null;
    const counselorUserId = counselorData?.user_id || session.userId;
    const counselorName = counselorData?.name ? counselorData.name.trim() : null;

    // Date range params for sadhana reports
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';

    // 4. Query assigned students directly from PostgreSQL
    // Dual lookup matching ID, user_id, email, or counselor name
    const studentsRes = await query(
      `SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.profile_image, u.birth_date,
        u.verification_status, u.created_at, u.updated_at,
        u.counselor, u.counselor_id, u.other_counselor, u.counselor_email,
        u.current_temple, u.parent_temple, u.other_temple,
        u.current_center, u.parent_center, u.other_center, u.center,
        u.ashram, u.initiation_status, u.initiated_name, u.rounds,
        u.spiritual_master_name, u.aspiring_spiritual_master_name,
        u.introduced_to_kc_in, u.health_chronic_disease,
        u.relative_1_name, u.relative_1_relationship, u.relative_1_phone,
        u.relative_2_name, u.relative_2_relationship, u.relative_2_phone,
        u.relative_3_name, u.relative_3_relationship, u.relative_3_phone,
        u.hierarchy,
        d.camp_dys, d.camp_sankalpa, d.camp_sphurti, d.camp_utkarsh, d.camp_srcgd_workshop,
        d.camp_nishtha, d.camp_ftec, d.camp_ashraya, d.camp_mtec, d.camp_sharanagati, d.camp_idc,
        d.camp_bhakti_shastri, d.camp_positive_thinker, d.camp_self_manager, d.camp_proactive_leader
      FROM users u
      LEFT JOIN user_profile_details d ON d.user_id = u.id
      WHERE u.verification_status IN ('approved', 'pending')
        AND (
          ($1::text IS NOT NULL AND (u.counselor_id = $1 OR u.hierarchy->>'counselorId' = $1))
          OR ($2::text IS NOT NULL AND (u.counselor_id = $2 OR u.hierarchy->>'counselorId' = $2))
          OR ($3::text IS NOT NULL AND (
            LOWER(COALESCE(u.counselor_email, '')) = LOWER($3)
            OR LOWER(COALESCE(u.hierarchy->>'counselorEmail', '')) = LOWER($3)
            OR LOWER(COALESCE(u.hierarchy->>'brahmachariCounselorEmail', '')) = LOWER($3)
            OR LOWER(COALESCE(u.hierarchy->>'grihasthaCounselorEmail', '')) = LOWER($3)
          ))
          OR ($4::text IS NOT NULL AND (
            LOWER(COALESCE(u.counselor, '')) = LOWER($4)
            OR LOWER(COALESCE(u.other_counselor, '')) = LOWER($4)
            OR LOWER(COALESCE(u.hierarchy->>'counselor', '')) = LOWER($4)
            OR LOWER(COALESCE(u.hierarchy->>'otherCounselor', '')) = LOWER($4)
            OR LOWER(COALESCE(u.hierarchy->>'brahmachariCounselor', '')) = LOWER($4)
            OR LOWER(COALESCE(u.hierarchy->>'grihasthaCounselor', '')) = LOWER($4)
          ))
        )
      ORDER BY u.name ASC`,
      [counselorId, counselorUserId, userEmail, counselorName]
    );

    const approvedStudents: any[] = [];
    const pendingStudents: any[] = [];

    for (const row of studentsRes.rows) {
      if (row.verification_status === 'approved') {
        approvedStudents.push(row);
      } else if (row.verification_status === 'pending') {
        pendingStudents.push(row);
      }
    }

    // 5. Query pending profile update requests count for spiritual approval badge
    let pendingSpiritualCount = 0;
    try {
      const spiritualRes = await query(
        `SELECT COUNT(*)::int AS count 
         FROM profile_update_requests 
         WHERE status = 'pending'`,
        []
      );
      pendingSpiritualCount = spiritualRes.rows[0]?.count || 0;
    } catch (e) {
      // Table might not exist or be empty
    }

    // 6. Query sadhana reports for approved devotees if date range is provided
    let sadhanaReports: any[] = [];
    if (approvedStudents.length > 0 && fromDate && toDate) {
      const studentIds = approvedStudents.map((s: any) => s.id);
      try {
        const reportsRes = await query(
          `SELECT 
            id, user_id, date, body_percent, soul_percent, 
            japa, hearing, reading, book_name,
            wake_up, to_bed, day_sleep, study, daily_filling, submitted_at
          FROM sadhana_reports
          WHERE user_id = ANY($1::text[]) 
            AND date >= $2 AND date <= $3
          ORDER BY date DESC`,
          [studentIds, fromDate, toDate]
        );
        sadhanaReports = reportsRes.rows;
      } catch (e) {
        console.error('Error fetching sadhana reports in counselor dashboard:', e);
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        devotees: approvedStudents.length,
        pendingRegistrations: pendingStudents.length,
        pendingSpiritual: pendingSpiritualCount,
      },
      counselor: {
        id: counselorId,
        userId: counselorUserId,
        name: counselorName,
        email: userEmail,
      },
      approvedStudents,
      pendingStudents,
      reports: sadhanaReports,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    });

  } catch (error: any) {
    console.error('[Counselor Dashboard API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


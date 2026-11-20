import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getCenterAliases, isCenterMatch } from '@/lib/center-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedCenter = searchParams.get('center')?.trim() || '';
    const campFilter = searchParams.get('campId')?.trim() || '';

    // 2. Fetch user profile from database to determine roles
    const userRes = await query('SELECT id, role, email, name, hierarchy FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const rawRoles = userRes.rows[0].role;
    const numericRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));
    const stringRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
      .map((r: any) => String(r).toLowerCase().trim());

    const isSuperAdmin = numericRoles.includes(8) || stringRoles.includes('super_admin');
    const isManagingDirector = isSuperAdmin || numericRoles.some((r: number) => [1, 11].includes(r)) || stringRoles.includes('managing_director');

    // 3. Resolve centers the user is authorized to manage
    let authorizedCenters: { id: string; name: string; temple_name: string }[] = [];

    if (isSuperAdmin) {
      // Super Admin can access all centers
      const allCentersRes = await query('SELECT id, name, temple_name FROM centers ORDER BY name ASC');
      authorizedCenters = allCentersRes.rows;
    } else {
      // Check temples where user is Managing Director, Director, or Central VM
      const templesRes = await query(
        `SELECT name FROM temples 
         WHERE managing_director_id::text = $1 
            OR director_id::text = $1 
            OR central_voice_manager_id::text = $1 
            OR yp_id::text = $1`,
        [user.id]
      );
      const assignedTempleNames = templesRes.rows.map((t: any) => t.name?.trim()).filter(Boolean);

      // Check centers where user is directly assigned in leadership/management
      let centerQuery = `
        SELECT id, name, temple_name FROM centers 
        WHERE project_manager_id::text = $1
           OR project_advisor_id::text = $1
           OR acting_manager_id::text = $1
           OR internal_manager_id::text = $1
           OR oc_id::text = $1
           OR care_giver_id::text = $1
           OR youth_preacher_id::text = $1
           OR preaching_coordinator_id::text = $1
           OR morning_program_in_charge_id::text = $1
           OR accountant_id::text = $1
           OR kitchen_head_id::text = $1
           OR study_in_charge_id::text = $1
           OR event_admin_id::text = $1
           OR grihstha_counselor_id::text = $1
           OR easy_incharge_id::text = $1
           OR prerna_incharge_id::text = $1
      `;
      const queryParams: any[] = [user.id];

      if (assignedTempleNames.length > 0) {
        centerQuery += ` OR temple_name = ANY($2::text[])`;
        queryParams.push(assignedTempleNames);
      }

      centerQuery += ` ORDER BY name ASC`;
      const centersRes = await query(centerQuery, queryParams);
      authorizedCenters = centersRes.rows;
    }

    if (authorizedCenters.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden: You are not assigned as a Project Manager or leader for any center.',
        authorizedCenters: [],
      }, { status: 403 });
    }

    // 4. Determine target center
    let targetCenterName = requestedCenter;
    if (!targetCenterName) {
      targetCenterName = authorizedCenters[0].name;
    }

    // STRICT MULTI-TENANCY CHECK: Verify requester has authority for targetCenterName
    const isAuthorizedForCenter = isSuperAdmin || authorizedCenters.some(c =>
      isCenterMatch(c.name, targetCenterName) ||
      c.name.trim().toLowerCase() === targetCenterName.trim().toLowerCase()
    );

    if (!isAuthorizedForCenter) {
      return NextResponse.json({
        success: false,
        error: `Forbidden: You do not have permission to view registrations for "${targetCenterName}". You can only view your own assigned centers.`,
        authorizedCenters: authorizedCenters.map(c => ({ id: c.id, name: c.name, temple: c.temple_name })),
      }, { status: 403 });
    }

    // 5. Gather aliases for target center to ensure 100% match coverage
    const targetAliases = getCenterAliases(targetCenterName);
    if (!targetAliases.includes(targetCenterName)) {
      targetAliases.push(targetCenterName);
    }

    // 6. Query camp_registrations joined with camps for this center
    let sql = `
      SELECT 
        cr.id,
        cr.participant_name,
        cr.email,
        cr.whatsapp,
        cr.gender,
        cr.age,
        cr.current_center,
        cr.voice_name,
        cr.current_temple,
        cr.counselor_name,
        cr.camp_id,
        cr.camp_track,
        cr.accommodation,
        cr.passcode,
        cr.payment_status,
        cr.payment_method,
        cr.total_cost,
        cr.is_cancelled,
        cr.cancellation_reason,
        cr.cancelled_at,
        cr.poc_name,
        cr.poc_contact,
        cr.group_id,
        cr.created_at,
        c.title AS camp_title,
        c.slug AS camp_slug,
        c.start_date AS camp_start_date,
        c.end_date AS camp_end_date,
        c.venue AS camp_venue,
        c.status AS camp_status
      FROM camp_registrations cr
      JOIN camps c ON c.id = cr.camp_id
      WHERE (
        cr.current_center = ANY($1::text[])
        OR cr.voice_name = ANY($1::text[])
      )
    `;
    const params: any[] = [targetAliases];

    if (campFilter) {
      sql += ` AND cr.camp_id = $2`;
      params.push(campFilter);
    }

    sql += ` ORDER BY cr.created_at DESC`;

    const registrationsRes = await query(sql, params);
    const registrations = registrationsRes.rows;

    // 7. Query active camps so camp filter is populated even with 0 registrations
    const activeCampsRes = await query(`
      SELECT id, title, slug, start_date AS "startDate", end_date AS "endDate", venue, status
      FROM camps
      WHERE status IN ('active', 'published', 'upcoming')
      ORDER BY start_date ASC
    `);

    // 8. Query verified/approved devotees belonging to this center from users table
    const usersRes = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.birth_date,
        u.ashram,
        u.counselor,
        u.current_center,
        u.center,
        u.hierarchy
      FROM users u
      WHERE u.verification_status = 'approved'
        AND (
          u.current_center = ANY($1::text[])
          OR u.center = ANY($1::text[])
          OR u.hierarchy->>'currentCenter' = ANY($1::text[])
          OR u.hierarchy->>'center' = ANY($1::text[])
        )
      ORDER BY u.name ASC
    `, [targetAliases]);

    // Map registrations by email and phone for matching
    const regsByEmail = new Map<string, any>();
    const regsByPhone = new Map<string, any>();
    for (const r of registrations) {
      if (r.email) regsByEmail.set(r.email.trim().toLowerCase(), r);
      const p = String(r.whatsapp || '').replace(/[^0-9]/g, '').slice(-10);
      if (p) regsByPhone.set(p, r);
    }

    const mergedAttendees: any[] = [];
    const matchedRegIds = new Set<string>();

    for (const u of usersRes.rows) {
      const em = (u.email || '').trim().toLowerCase();
      const ph = String(u.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const reg = (em && regsByEmail.get(em)) || (ph && regsByPhone.get(ph)) || null;

      const calcAge = u.birth_date
        ? Math.floor((Date.now() - new Date(u.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;

      if (reg) {
        matchedRegIds.add(reg.id);
        mergedAttendees.push({
          ...reg,
          devotee_id: u.id,
          is_registered: true,
          gender: reg.gender || (u.ashram === 'Brahmachari' ? 'Male' : 'Devotee'),
          age: reg.age || calcAge,
          counselor_name: reg.counselor_name || u.counselor || u.hierarchy?.counselor,
        });
      } else {
        mergedAttendees.push({
          id: `unreg-${u.id}`,
          devotee_id: u.id,
          participant_name: u.name,
          email: u.email,
          whatsapp: u.phone,
          gender: u.ashram === 'Brahmachari' ? 'Male' : 'Devotee',
          age: calcAge,
          counselor_name: u.counselor || u.hierarchy?.counselor,
          current_center: u.current_center || u.center || u.hierarchy?.currentCenter || targetCenterName,
          voice_name: targetCenterName,
          camp_id: null,
          camp_title: null,
          payment_status: 'not_registered',
          is_registered: false,
          is_cancelled: false,
          total_cost: 0,
          created_at: null,
        });
      }
    }

    // Any registrations not matched to existing user record
    for (const r of registrations) {
      if (!matchedRegIds.has(r.id)) {
        mergedAttendees.push({
          ...r,
          devotee_id: r.id,
          is_registered: true,
        });
      }
    }

    // 9. Calculate stats
    const totalCenterDevotees = mergedAttendees.length;
    let registeredCount = 0;
    let unregisteredCount = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let totalAmount = 0;

    for (const a of mergedAttendees) {
      if (!a.is_registered) {
        unregisteredCount++;
      } else {
        registeredCount++;
        if (a.is_cancelled) {
          cancelledCount++;
        } else if (a.payment_status === 'completed') {
          confirmedCount++;
          totalAmount += Number(a.total_cost || 0);
        } else {
          // 'processing', 'pending', etc.
          pendingCount++;
        }
      }
    }

    // 10. Distinct Camps Map
    const distinctCampsMap = new Map<string, { id: string; title: string; slug: string; startDate: string; endDate: string }>();

    for (const c of activeCampsRes.rows) {
      distinctCampsMap.set(c.id, {
        id: c.id,
        title: c.title,
        slug: c.slug,
        startDate: c.startDate,
        endDate: c.endDate,
      });
    }

    for (const r of registrations) {
      if (r.camp_id && !distinctCampsMap.has(r.camp_id)) {
        distinctCampsMap.set(r.camp_id, {
          id: r.camp_id,
          title: r.camp_title,
          slug: r.camp_slug,
          startDate: r.camp_start_date,
          endDate: r.camp_end_date,
        });
      }
    }

    return NextResponse.json({
      success: true,
      currentCenter: targetCenterName,
      authorizedCenters: authorizedCenters.map(c => ({ id: c.id, name: c.name, temple: c.temple_name })),
      stats: {
        total: totalCenterDevotees,
        totalCenterDevotees,
        registered: registeredCount,
        unregistered: unregisteredCount,
        confirmed: confirmedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        totalAmount,
      },
      distinctCamps: Array.from(distinctCampsMap.values()),
      registrations: mergedAttendees,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    });

  } catch (error: any) {
    console.error('[Project Manager Camp Registrations API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

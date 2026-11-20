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

    // 7. Calculate real-time stats
    let totalCount = registrations.length;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let totalAmount = 0;

    const distinctCampsMap = new Map<string, { id: string; title: string; slug: string; startDate: string; endDate: string }>();

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

      if (r.is_cancelled) {
        cancelledCount++;
      } else if (r.payment_status === 'completed') {
        confirmedCount++;
        totalAmount += Number(r.total_cost || 0);
      } else {
        // 'processing', 'pending', etc.
        pendingCount++;
      }
    }

    return NextResponse.json({
      success: true,
      currentCenter: targetCenterName,
      authorizedCenters: authorizedCenters.map(c => ({ id: c.id, name: c.name, temple: c.temple_name })),
      stats: {
        total: totalCount,
        confirmed: confirmedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        totalAmount,
      },
      distinctCamps: Array.from(distinctCampsMap.values()),
      registrations,
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

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Auth & Admin Permission Check
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    const userRes = await query('SELECT role FROM users WHERE id = $1', [decoded.userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = Array.isArray(userRes.rows[0].role) 
      ? userRes.rows[0].role 
      : [userRes.rows[0].role];
    const roleNums = userRoles.map((r: any) => Number(r));

    // Super Admin (8), Temple Admin / Directors (11,12,13,21), Center Admins (14..33), etc.
    const isAuthorized = roleNums.some((r: number) => 
      [8, 11, 12, 13, 14, 15, 16, 17, 21].includes(r)
    ) || userRoles.some((r: any) => 
      ['super_admin', 'admin', 'managing_director', 'director'].includes(String(r))
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse time filter & pagination & search params
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get('period') || '7d';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    const search = searchParams.get('search')?.trim() || '';
    const typeFilter = searchParams.get('type') || 'all'; // 'all' | 'guest' | 'member'
    const deviceFilter = searchParams.get('device') || 'all'; // 'all' | 'mobile' | 'desktop' | 'tablet'
    const pathFilter = searchParams.get('path')?.trim() || '';

    let intervalClause = "NOW() - INTERVAL '7 days'";
    if (period === 'today') {
      intervalClause = "DATE_TRUNC('day', NOW())";
    } else if (period === '30d') {
      intervalClause = "NOW() - INTERVAL '30 days'";
    } else if (period === '90d') {
      intervalClause = "NOW() - INTERVAL '90 days'";
    } else if (period === 'all') {
      intervalClause = "'2020-01-01'::timestamp";
    }

    // 3. Overall KPI Stats (across the selected period)
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT visitor_id) AS total_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = false) AS guest_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = true) AS logged_in_visitors,
        COUNT(*) AS total_pageviews,
        COUNT(DISTINCT visitor_id) FILTER (WHERE page_path = '/donate' OR page_path LIKE '/donate/%') AS donate_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE page_path = '/camps' OR page_path LIKE '/camps/%') AS camp_visitors
      FROM site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause};
    `;
    const statsRes = await query(statsQuery);
    const stats = statsRes.rows[0] || {
      total_visitors: 0,
      guest_visitors: 0,
      logged_in_visitors: 0,
      total_pageviews: 0,
      donate_visitors: 0,
      camp_visitors: 0
    };

    // 4. Daily Trend
    const trendQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = false) AS guest_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = true) AS logged_in_visitors,
        COUNT(*) AS pageviews
      FROM site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC;
    `;
    const trendRes = await query(trendQuery);

    // 5. Top Visited Pages
    const pagesQuery = `
      SELECT 
        page_path,
        COUNT(*) AS views,
        COUNT(DISTINCT visitor_id) AS unique_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = false) AS guest_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_logged_in = true) AS logged_in_visitors
      FROM site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause}
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 15;
    `;
    const pagesRes = await query(pagesQuery);

    // 6. Device Breakdown
    const devicesQuery = `
      SELECT 
        COALESCE(device_type, 'desktop') AS device,
        COUNT(DISTINCT visitor_id) AS count
      FROM site_visits
      WHERE is_bot = false AND created_at >= ${intervalClause}
      GROUP BY device_type
      ORDER BY count DESC;
    `;
    const devicesRes = await query(devicesQuery);

    // 7. Filtered Live Activity Stream with Search & Type/Device Filters
    const whereClauses: string[] = ['is_bot = false'];
    const queryParams: any[] = [];
    let paramIdx = 1;

    // Time filter applies to stream as well
    whereClauses.push(`created_at >= ${intervalClause}`);

    if (search) {
      whereClauses.push(`(page_path ILIKE $${paramIdx} OR COALESCE(user_email, '') ILIKE $${paramIdx} OR COALESCE(referrer, '') ILIKE $${paramIdx})`);
      queryParams.push(`%${search}%`);
      paramIdx++;
    }

    if (typeFilter === 'guest') {
      whereClauses.push(`is_logged_in = false`);
    } else if (typeFilter === 'member') {
      whereClauses.push(`is_logged_in = true`);
    }

    if (deviceFilter && deviceFilter !== 'all') {
      whereClauses.push(`device_type = $${paramIdx}`);
      queryParams.push(deviceFilter);
      paramIdx++;
    }

    if (pathFilter) {
      whereClauses.push(`page_path = $${paramIdx}`);
      queryParams.push(pathFilter);
      paramIdx++;
    }

    const whereSql = whereClauses.join(' AND ');

    // Count filtered records and breakdown
    const countSql = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_logged_in = false) AS guest_count,
        COUNT(*) FILTER (WHERE is_logged_in = true) AS member_count
      FROM site_visits 
      WHERE ${whereSql};
    `;
    const countRes = await query(countSql, queryParams);
    const totalFiltered = parseInt(countRes.rows[0]?.total || '0', 10);
    const guestFiltered = parseInt(countRes.rows[0]?.guest_count || '0', 10);
    const memberFiltered = parseInt(countRes.rows[0]?.member_count || '0', 10);
    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    // Fetch the paginated rows
    const recentSql = `
      SELECT 
        id,
        created_at,
        visitor_id,
        page_path,
        page_title,
        is_logged_in,
        user_email,
        user_role,
        device_type,
        browser,
        os,
        referrer
      FROM site_visits
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    const recentRes = await query(recentSql, [...queryParams, limit, offset]);

    // 8. Disk Space Usage in PostgreSQL
    let tableSize = 'under 1 MB';
    try {
      const sizeRes = await query(
        "SELECT pg_size_pretty(pg_total_relation_size('site_visits')) as size;"
      );
      if (sizeRes.rows[0]?.size) {
        tableSize = sizeRes.rows[0].size;
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      period,
      tableSize,
      pagination: {
        page,
        limit,
        totalCount: totalFiltered,
        guestCount: guestFiltered,
        memberCount: memberFiltered,
        totalPages,
      },
      stats: {
        totalVisitors: Number(stats.total_visitors || 0),
        guestVisitors: Number(stats.guest_visitors || 0),
        loggedInVisitors: Number(stats.logged_in_visitors || 0),
        totalPageviews: Number(stats.total_pageviews || 0),
        donateVisitors: Number(stats.donate_visitors || 0),
        campVisitors: Number(stats.camp_visitors || 0),
      },
      trend: trendRes.rows.map(r => ({
        date: r.date,
        visitors: Number(r.visitors),
        guestVisitors: Number(r.guest_visitors),
        loggedInVisitors: Number(r.logged_in_visitors),
        pageviews: Number(r.pageviews),
      })),
      topPages: pagesRes.rows.map(r => ({
        path: r.page_path,
        views: Number(r.views),
        visitors: Number(r.unique_visitors),
        guestVisitors: Number(r.guest_visitors),
        loggedInVisitors: Number(r.logged_in_visitors),
      })),
      devices: devicesRes.rows.map(r => ({
        device: r.device,
        count: Number(r.count),
      })),
      recentVisits: recentRes.rows,
    });
  } catch (error: any) {
    console.error('[Admin Visitors API Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}

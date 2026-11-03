import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      table,
      method,
      selectCols,
      insertData,
      updateData,
      filters,
      orFilters,
      notFilters,
      orderByCol,
      orderAscending,
      limitNum,
      offsetNum,
      singleRow,
      rpcFunc,
      rpcParams,
      onConflictCols,
    } = body;

    // ─── 1. Method Validation ──────────────────────────────────
    const ALLOWED_METHODS = ['select', 'insert', 'update', 'delete', 'upsert', 'rpc'];
    if (!method || !ALLOWED_METHODS.includes(method)) {
      return NextResponse.json({ data: null, error: 'Invalid or unsupported database method' }, { status: 400 });
    }

    // ─── 2. Internal Server vs External Request Verification ───
    const internalSecret = req.headers.get('x-internal-secret');
    const isInternalServer = Boolean(
      internalSecret && process.env.JWT_SECRET && internalSecret === process.env.JWT_SECRET
    );

    // ─── 3. User Authentication for External Requests ──────────
    let session: any = null;
    let userRole: number[] = [];

    if (!isInternalServer) {
      const cookieToken = req.cookies.get('session_token')?.value;
      const authHeader = req.headers.get('Authorization');
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
      const token = cookieToken || bearerToken;

      if (token) {
        session = verifyToken(token);
        if (session?.userId) {
          try {
            const uRes = await query('SELECT role FROM users WHERE id = $1', [session.userId]);
            if (uRes.rows.length > 0 && Array.isArray(uRes.rows[0].role)) {
              userRole = uRes.rows[0].role;
            }
          } catch (e) {
            // Ignore db lookup error
          }
        }
      }
    }

    const numericRoles = (Array.isArray(userRole) ? userRole : [userRole])
      .map((r: any) => Number(r))
      .filter((r: number) => !isNaN(r));
    const isSuperAdmin = isInternalServer || numericRoles.includes(8) || (Array.isArray(userRole) && userRole.includes('super_admin' as any));
    const isHigherAdmin = isSuperAdmin || numericRoles.some((r: number) => [9, 10, 11, 12, 13, 14, 15, 16, 17, 21].includes(r));
    const isCounselor = isHigherAdmin || numericRoles.some((r: number) => [2, 3, 4, 20, 31].includes(r));

    // ─── 4. RPC Handling ───────────────────────────────────────
    if (method === 'rpc') {
      if (!rpcFunc || typeof rpcFunc !== 'string' || !/^[a-zA-Z0-9_]+$/.test(rpcFunc)) {
        return NextResponse.json({ data: null, error: 'Valid RPC function name is required' }, { status: 400 });
      }

      // RPC requires internal or authenticated session
      if (!isInternalServer && !session) {
        return NextResponse.json({ data: null, error: 'Unauthorized: Login required for RPC calls' }, { status: 401 });
      }

      const params: any[] = [];
      let paramCounter = 1;
      const keys = rpcParams ? Object.keys(rpcParams) : [];
      const parts = keys.map((key) => {
        if (!/^[a-zA-Z0-9_]+$/.test(key)) throw new Error('Invalid parameter key');
        params.push(rpcParams[key]);
        return `${key} => $${paramCounter++}`;
      });

      const sql = `SELECT ${rpcFunc}(${parts.join(', ')}) AS result`;
      const dbRes = await query(sql, params);
      const resultData = dbRes.rows.length > 0 ? dbRes.rows[0].result : null;
      return NextResponse.json({ data: resultData, error: null });
    }

    // ─── 5. Table Name Validation (Anti-SQLi) ───────────────────
    if (!table || typeof table !== 'string' || !/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ data: null, error: 'Invalid or missing table name' }, { status: 400 });
    }

    // ─── 6. Access Control & Authorization Policies ────────────
    if (!isInternalServer) {
      // Default-Deny Table Allowlist: Block access to internal/sensitive tables
      const ALLOWED_CLIENT_TABLES = new Set([
        'users', 'donations', 'sadhana_reports', 'user_profile_details',
        'camp_registrations', 'camp_refund_requests', 'camp_admin_allocations',
        'camp_audit_transactions', 'messages', 'temples', 'centers', 'cities',
        'states', 'spiritual_masters', 'policies', 'stories', 'app_configs',
        'camps', 'counselors', 'event_admin_allocations', 'user_centers',
        'membership_cards', 'membership_ids', 'platform_settings', 'profile_update_requests',
        'counselor_requests', 'voice_manager_requests', 'bc_voice_manager_requests',
        'event_responses', 'events', 'event_materials', 'rate_limits',
        'camp_kitchen_extra_meals',
        'donation_behalf_devotees'
      ]);

      if (!ALLOWED_CLIENT_TABLES.has(table)) {
        return NextResponse.json({ data: null, error: 'Forbidden: Table not accessible' }, { status: 403 });
      }

      // Rule A: Donations Table Protection
      if (table === 'donations') {
        if (method !== 'select') {
          return NextResponse.json({
            data: null,
            error: 'Forbidden: Direct mutation of donations is blocked. Payments must be processed through verified gateway endpoints.'
          }, { status: 403 });
        }

        if (!session) {
          return NextResponse.json({ data: null, error: 'Unauthorized: Login required to view donations' }, { status: 401 });
        }

        // Non-admins can only view donations linked to their own tag_user_id
        if (!isSuperAdmin && !isHigherAdmin) {
          const targetTagId = filters?.find((f: any) => f.col === 'tag_user_id')?.val;
          if (!targetTagId || targetTagId !== session.userId) {
            return NextResponse.json({ data: null, error: 'Forbidden: You can only view your own donations' }, { status: 403 });
          }
        }
      }

      // Rule A-2: Camp Registrations, Refunds & Allocations Protection
      const campFinancialTables = ['camp_registrations', 'camp_refund_requests', 'camp_admin_allocations', 'camp_audit_transactions'];
      if (campFinancialTables.includes(table)) {
        if (method !== 'select') {
          return NextResponse.json({
            data: null,
            error: 'Forbidden: Direct mutation of camp registrations and refund records is blocked. Please use official camp registration and approval endpoints.'
          }, { status: 403 });
        }

        // Only admins can query camp registrations, refund requests, allocations, and audit transactions via db-proxy
        if (['camp_registrations', 'camp_refund_requests', 'camp_admin_allocations', 'camp_audit_transactions'].includes(table)) {
          if (!isSuperAdmin && !isHigherAdmin) {
            return NextResponse.json({ data: null, error: 'Forbidden: Administrative privileges required' }, { status: 403 });
          }
        }
      }

      // Rule B: System Configuration Tables
      const adminOnlyTables = ['system_controls', 'email_settings', 'email_logs'];
      if (adminOnlyTables.includes(table)) {
        if (method !== 'select' && !isSuperAdmin) {
          return NextResponse.json({ data: null, error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }
        if (['email_settings', 'email_logs'].includes(table) && !isSuperAdmin) {
          return NextResponse.json({ data: null, error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }
      }

      // Rule C: Public Catalog Tables (Read-only for guests, Admin for mutations)
      const publicCatalogTables = ['temples', 'centers', 'cities', 'states', 'spiritual_masters', 'policies', 'stories', 'app_configs', 'camps'];
      if (publicCatalogTables.includes(table)) {
        if (method !== 'select' && !isSuperAdmin && !isHigherAdmin) {
          return NextResponse.json({ data: null, error: 'Forbidden: Only administrators can modify catalog data' }, { status: 403 });
        }
      }

      // Rule D: Sadhana Reports
      if (table === 'sadhana_reports') {
        if (!session) {
          return NextResponse.json({ data: null, error: 'Unauthorized: Login required' }, { status: 401 });
        }
        // Normal students can only view or write their own reports
        if (!isSuperAdmin && !isHigherAdmin && !isCounselor) {
          if (method === 'select') {
            const reportUserId = filters?.find((f: any) => f.col === 'user_id')?.val;
            if (!reportUserId || reportUserId !== session.userId) {
              return NextResponse.json({ data: null, error: 'Forbidden: You can only view your own sadhana reports' }, { status: 403 });
            }
          } else {
            const reportUserId = (insertData && (insertData.user_id || (Array.isArray(insertData) && insertData[0]?.user_id))) ||
                                 (updateData && updateData.user_id);
            if (reportUserId && reportUserId !== session.userId) {
              return NextResponse.json({ data: null, error: 'Forbidden: Cannot submit sadhana report for another user' }, { status: 403 });
            }
          }
        }
      }

      // Rule E: Messages
      if (table === 'messages') {
        if (!session) {
          return NextResponse.json({ data: null, error: 'Unauthorized: Login required' }, { status: 401 });
        }
        if (method === 'insert' && !isSuperAdmin && !isHigherAdmin) {
          if (insertData?.sender_id && insertData.sender_id !== session.userId) {
            return NextResponse.json({ data: null, error: 'Forbidden: Invalid sender_id' }, { status: 403 });
          }
        }
        if (method === 'select' && !isSuperAdmin && !isHigherAdmin) {
          const hasRecipientFilter = filters?.some((f: any) => 
            f.col === 'recipient_ids' && (
              (f.type === 'overlaps' && Array.isArray(f.val) && f.val.includes(session.userId)) ||
              (f.type === 'in' && Array.isArray(f.val) && f.val.includes(session.userId)) ||
              (f.val === session.userId)
            )
          );
          const hasSenderFilter = filters?.some((f: any) => f.col === 'sender_id' && f.val === session.userId);
          const hasOrScope = orFilters?.some((c: string) => typeof c === 'string' && c.includes(session.userId));
          
          if (!hasRecipientFilter && !hasSenderFilter && !hasOrScope) {
            return NextResponse.json({ data: null, error: 'Forbidden: You can only access messages sent to or by your account' }, { status: 403 });
          }
        }
      }

      // Rule F: Users Table Defense
      if (table === 'users') {
        if (method === 'delete' && !isSuperAdmin && !isHigherAdmin) {
          return NextResponse.json({ data: null, error: 'Forbidden: Only Super Admins can delete users' }, { status: 403 });
        }

        if (method === 'insert' && !isSuperAdmin && !isHigherAdmin) {
          return NextResponse.json({ data: null, error: 'Forbidden: Direct user insertion blocked. Use registration endpoint.' }, { status: 403 });
        }

        // Block password_hash injection/updates via db-proxy
        if (updateData && 'password_hash' in updateData) {
          delete updateData.password_hash;
        }
        if (insertData) {
          if (Array.isArray(insertData)) {
            insertData.forEach(r => { if (r) delete r.password_hash; });
          } else {
            delete insertData.password_hash;
          }
        }

        // Block role escalation: non-admins cannot change roles!
        if (updateData && 'role' in updateData && !isSuperAdmin && !isHigherAdmin) {
          delete updateData.role;
        }

        // Non-admins can only update their own profile
        if (method === 'update' && !isSuperAdmin && !isHigherAdmin) {
          const targetId = filters?.find((f: any) => f.col === 'id')?.val;
          if (!targetId || targetId !== session?.userId) {
            return NextResponse.json({ data: null, error: 'Forbidden: Cannot edit another user profile' }, { status: 403 });
          }
        }

        // Protect SELECT on users table from unauthorized data dumping
        if (method === 'select' && !isSuperAdmin && !isHigherAdmin) {
          const isDonationSlugQuery = filters?.some((f: any) => f.col === 'donation_slug' && f.val);
          const isAuthEmailCheck = !session && singleRow && selectCols === 'id' && filters?.some((f: any) => f.col === 'email');

          if (isDonationSlugQuery) {
            // Public / authenticated donation lookup allowed for active collector
          } else if (isAuthEmailCheck) {
            // Unauthenticated signup email existence check allowed
          } else if (session) {
            if (!isCounselor) {
              // Ordinary devotees can only select their own user profile record
              const targetId = filters?.find((f: any) => f.col === 'id')?.val;
              if (!targetId || targetId !== session.userId) {
                return NextResponse.json({ data: null, error: 'Forbidden: You can only query your own user profile' }, { status: 403 });
              }
            }
            // Counselors can query users assigned to them
          } else {
            return NextResponse.json({ data: null, error: 'Unauthorized: Login required to view user profiles' }, { status: 401 });
          }
        }
      }

      // Rule G: Organizational, Role Allocation & Platform Settings Tables
      const orgTables = ['counselors', 'event_admin_allocations', 'user_centers', 'membership_cards', 'platform_settings', 'donation_behalf_devotees'];
      if (orgTables.includes(table)) {
        if (method !== 'select' && !isSuperAdmin && !isHigherAdmin) {
          return NextResponse.json({ data: null, error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }
      }

      // Rule H: User Profile Details Protection
      if (table === 'user_profile_details') {
        if (!isSuperAdmin && !isHigherAdmin) {
          if (!session) {
            return NextResponse.json({ data: null, error: 'Unauthorized: Login required' }, { status: 401 });
          }

          if (method === 'select') {
            if (!isCounselor) {
              const targetUserId = filters?.find((f: any) => f.col === 'user_id')?.val;
              if (!targetUserId || targetUserId !== session.userId) {
                return NextResponse.json({ data: null, error: 'Forbidden: You can only access your own profile details' }, { status: 403 });
              }
            }
          } else {
            const targetUserId = (insertData && (insertData.user_id || (Array.isArray(insertData) && insertData[0]?.user_id))) ||
                                 (updateData && updateData.user_id) ||
                                 filters?.find((f: any) => f.col === 'user_id')?.val;
            if (!targetUserId || targetUserId !== session.userId) {
              return NextResponse.json({ data: null, error: 'Forbidden: Cannot edit another user profile details' }, { status: 403 });
            }
          }
        }
      }

      // Rule I: Request & Approval Ticket Tables
      const requestTicketTables = ['profile_update_requests', 'counselor_requests', 'voice_manager_requests', 'bc_voice_manager_requests'];
      if (requestTicketTables.includes(table)) {
        if (!session) {
          return NextResponse.json({ data: null, error: 'Unauthorized: Login required' }, { status: 401 });
        }
        if (method === 'insert' && !isSuperAdmin && !isHigherAdmin) {
          const reqUserId = insertData?.user_id || insertData?.requester_id;
          if (reqUserId && reqUserId !== session.userId) {
            return NextResponse.json({ data: null, error: 'Forbidden: Invalid request user ID' }, { status: 403 });
          }
        }
      }
    }

    // ─── 7. SQL Query Construction ─────────────────────────────
    let sql = '';
    const params: any[] = [];
    let paramCounter = 1;

    if (method === 'select') {
      let cols = selectCols || '*';
      if (typeof cols !== 'string' || !/^[a-zA-Z0-9_,\s*()]+$/.test(cols)) {
        cols = '*';
      }
      if (cols.includes('user_profile_details(') || cols.includes('(')) {
        cols = '*';
      }
      sql = `SELECT ${cols} FROM ${table}`;

    } else if (method === 'insert') {
      if (!insertData) {
        return NextResponse.json({ data: null, error: 'Insert data is missing' }, { status: 400 });
      }

      const isArray = Array.isArray(insertData);
      const rows = isArray ? insertData : [insertData];
      if (rows.length === 0) {
        return NextResponse.json({ data: [], error: null });
      }

      const columns = Object.keys(rows[0]);
      for (const col of columns) {
        if (!/^[a-zA-Z0-9_]+$/.test(col)) {
          return NextResponse.json({ data: null, error: `Invalid column name: ${col}` }, { status: 400 });
        }
      }

      const flatParams: any[] = [];
      let pIdx = 1;
      const valStrings = rows.map((row: any) => {
        const rowVals = columns.map(col => {
          flatParams.push(row[col]);
          return `$${pIdx++}`;
        });
        return `(${rowVals.join(', ')})`;
      });

      sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valStrings.join(', ')} RETURNING *`;
      params.push(...flatParams);
      paramCounter = pIdx;

    } else if (method === 'update') {
      if (!updateData || typeof updateData !== 'object') {
        return NextResponse.json({ data: null, error: 'Update data is missing' }, { status: 400 });
      }

      const updateCols = Object.keys(updateData);
      for (const col of updateCols) {
        if (!/^[a-zA-Z0-9_]+$/.test(col)) {
          return NextResponse.json({ data: null, error: `Invalid column name: ${col}` }, { status: 400 });
        }
      }

      const setClauses = updateCols.map((col) => {
        params.push(updateData[col]);
        return `${col} = $${paramCounter++}`;
      });

      if (setClauses.length === 0) {
        return NextResponse.json({ data: null, error: 'No columns to update' }, { status: 400 });
      }

      sql = `UPDATE ${table} SET ${setClauses.join(', ')}`;

    } else if (method === 'delete') {
      sql = `DELETE FROM ${table}`;

    } else if (method === 'upsert') {
      if (!insertData) {
        return NextResponse.json({ data: null, error: 'Upsert data is missing' }, { status: 400 });
      }

      const isArray = Array.isArray(insertData);
      const rows = isArray ? insertData : [insertData];
      if (rows.length === 0) {
        return NextResponse.json({ data: [], error: null });
      }

      const columns = Object.keys(rows[0]);
      for (const col of columns) {
        if (!/^[a-zA-Z0-9_]+$/.test(col)) {
          return NextResponse.json({ data: null, error: `Invalid column name: ${col}` }, { status: 400 });
        }
      }

      const flatParams: any[] = [];
      let pIdx = 1;
      const valStrings = rows.map((row: any) => {
        const rowVals = columns.map(col => {
          flatParams.push(row[col]);
          return `$${pIdx++}`;
        });
        return `(${rowVals.join(', ')})`;
      });

      let conflictTarget = onConflictCols || 'id';
      if (!onConflictCols) {
        if (table === 'event_admin_allocations') {
          conflictTarget = 'user_id';
        } else if (table === 'event_responses') {
          conflictTarget = 'event_id, user_id';
        }
      }

      const conflictColsArr = conflictTarget.split(',').map((c: string) => c.trim());
      for (const c of conflictColsArr) {
        if (!/^[a-zA-Z0-9_]+$/.test(c)) {
          return NextResponse.json({ data: null, error: `Invalid conflict column: ${c}` }, { status: 400 });
        }
      }

      const updateCols = columns.filter(col => !conflictColsArr.includes(col));
      const updateSet = updateCols.map(col => `${col} = EXCLUDED.${col}`).join(', ');

      sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valStrings.join(', ')}`;
      if (updateSet) {
        sql += ` ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSet}`;
      } else {
        sql += ` ON CONFLICT (${conflictTarget}) DO NOTHING`;
      }

      sql += ` RETURNING *`;
      params.push(...flatParams);
      paramCounter = pIdx;
    }

    // ─── 8. Append Filters (Parameterized) ─────────────────────
    const whereClauses: string[] = [];
    const parseCol = (c: string) => {
      if (typeof c !== 'string') return '';
      const clean = c.trim();
      if (!/^[a-zA-Z0-9_]+((->|->>)[a-zA-Z0-9_]+)*$/.test(clean)) return '';
      return clean.replace(/->>([a-zA-Z0-9_]+)/g, "->>'$1'").replace(/->([a-zA-Z0-9_]+)/g, "->'$1'");
    };

    if (filters && Array.isArray(filters)) {
      filters.forEach((f: any) => {
        const col = parseCol(f.col);
        if (!col) return;

        if (f.type === 'eq') {
          params.push(f.val);
          whereClauses.push(`${col} = $${paramCounter++}`);
        } else if (f.type === 'in') {
          params.push(f.val);
          whereClauses.push(`${col} = ANY($${paramCounter++})`);
        } else if (f.type === 'lt') {
          params.push(f.val);
          whereClauses.push(`${col} < $${paramCounter++}`);
        } else if (f.type === 'lte') {
          params.push(f.val);
          whereClauses.push(`${col} <= $${paramCounter++}`);
        } else if (f.type === 'gt') {
          params.push(f.val);
          whereClauses.push(`${col} > $${paramCounter++}`);
        } else if (f.type === 'gte') {
          params.push(f.val);
          whereClauses.push(`${col} >= $${paramCounter++}`);
        } else if (f.type === 'ilike') {
          params.push(f.val);
          whereClauses.push(`${col} ILIKE $${paramCounter++}`);
        } else if (f.type === 'is') {
          if (f.val === null || f.val === 'null') {
            whereClauses.push(`${col} IS NULL`);
          } else {
            whereClauses.push(`${col} IS ${String(f.val).toUpperCase()}`);
          }
        } else if (f.type === 'overlaps') {
          params.push(f.val);
          whereClauses.push(`${col} && $${paramCounter++}`);
        }
      });
    }

    if (notFilters && Array.isArray(notFilters)) {
      notFilters.forEach((f: any) => {
        const col = parseCol(f.col);
        if (!col) return;

        if (f.val === null || f.val === 'null') {
          whereClauses.push(`${col} IS NOT NULL`);
        } else {
          params.push(f.val);
          whereClauses.push(`${col} != $${paramCounter++}`);
        }
      });
    }

    if (orFilters && Array.isArray(orFilters)) {
      orFilters.forEach((clause: string) => {
        const parts = clause.split(',');
        const partsClauses = parts.map(part => {
          const subParts = part.split('.');
          const col = parseCol(subParts[0]);
          if (!col) return '1=0';
          const op = subParts[1];
          const val = subParts.slice(2).join('.');

          if (op === 'eq') {
            params.push(val);
            return `${col} = $${paramCounter++}`;
          } else if (op === 'in') {
            const cleanVal = val.replace(/^\(|\)$/g, '').split(',');
            params.push(cleanVal);
            return `${col} = ANY($${paramCounter++})`;
          }
          return '1=0';
        });
        whereClauses.push(`(${partsClauses.join(' OR ')})`);
      });
    }

    // Role-based filter for external queries on donations
    if (!isInternalServer && table === 'donations' && !isSuperAdmin && session) {
      params.push(session.userId);
      const userTagParam = paramCounter++;
      params.push(session.email);
      const userEmailParam = paramCounter++;
      whereClauses.push(`(tag_user_id = $${userTagParam} OR donor_email = $${userEmailParam})`);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // ─── 9. Append ORDER BY, LIMIT, OFFSET ──────────────────────
    if (orderByCol && typeof orderByCol === 'string' && /^[a-zA-Z0-9_]+$/.test(orderByCol)) {
      const asc = typeof orderAscending === 'boolean' ? orderAscending : true;
      sql += ` ORDER BY ${orderByCol} ${asc ? 'ASC' : 'DESC'}`;
    }

    if (limitNum !== null && limitNum !== undefined && Number.isInteger(Number(limitNum))) {
      sql += ` LIMIT ${Number(limitNum)}`;
    }

    if (offsetNum !== null && offsetNum !== undefined && Number.isInteger(Number(offsetNum))) {
      sql += ` OFFSET ${Number(offsetNum)}`;
    }

    if (method === 'update') {
      sql += ` RETURNING *`;
    }

    // ─── 10. Execute Query ─────────────────────────────────────
    const dbRes = await query(sql, params);
    let resultData = dbRes.rows;

    // Attach user_profile_details when fetching from users table
    if (table === 'users' && resultData.length > 0) {
      const userIds = resultData.map((row: any) => String(row.id)).filter(Boolean);
      if (userIds.length > 0) {
        try {
          const profileRes = await query(
            'SELECT * FROM user_profile_details WHERE user_id::text = ANY($1::text[])',
            [userIds]
          );
          const profileMap = new Map<string, any[]>();
          for (const p of profileRes.rows) {
            const uId = String(p.user_id);
            const list = profileMap.get(uId) || [];
            list.push(p);
            profileMap.set(uId, list);
          }
          for (const row of resultData) {
            row.user_profile_details = profileMap.get(String(row.id)) || [];
          }
        } catch (e) {
          console.error('Error batch attaching profile details:', e);
          for (const row of resultData) {
            row.user_profile_details = [];
          }
        }
      }
    }

    // CRITICAL SECURITY: Never leak password_hash to external callers!
    if (table === 'users' && resultData) {
      if (Array.isArray(resultData)) {
        resultData.forEach((row: any) => {
          if (row && 'password_hash' in row) {
            delete row.password_hash;
          }
        });
      } else if (typeof resultData === 'object' && resultData !== null) {
        if ('password_hash' in resultData) {
          delete (resultData as any).password_hash;
        }
      }
    }

    // CRITICAL SECURITY: Never leak secret IDT passcodes or private promo codes to non-super-admin callers!
    if (table === 'camps' && !isSuperAdmin && !isHigherAdmin && resultData) {
      const sanitizeCamp = (row: any) => {
        if (!row) return;
        if (row.payment_config && typeof row.payment_config === 'object') {
          // Deep clone to prevent mutating original object reference
          row.payment_config = { ...row.payment_config };
          delete row.payment_config.idt_passcodes;
          if (Array.isArray(row.payment_config.center_idt_codes)) {
            // Strip the secret passcode string, keep center_name for authorized center listing
            row.payment_config.center_idt_codes = row.payment_config.center_idt_codes.map((c: any) => ({
              center_name: c?.center_name
            }));
          }
        }
        if (row.special_waivers && typeof row.special_waivers === 'object') {
          row.special_waivers = { ...row.special_waivers };
          // Do not leak secret coupons list to client browser; validation is done via validateCampCouponAction
          delete row.special_waivers.coupons;
        }
      };

      if (Array.isArray(resultData)) {
        resultData.forEach(sanitizeCamp);
      } else if (typeof resultData === 'object') {
        sanitizeCamp(resultData);
      }
    }

    if (singleRow) {
      resultData = resultData.length > 0 ? resultData[0] : null;
    }

    return NextResponse.json({
      data: resultData,
      error: null,
      count: Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0)
    });

  } catch (error: any) {
    console.error('[DB Proxy Error]', error);
    return NextResponse.json({ data: null, error: error.message || 'Database error occurred' }, { status: 500 });
  }
}

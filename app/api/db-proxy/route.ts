import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    let sql = '';
    const params: any[] = [];
    let paramCounter = 1;

    // Handle RPC separately
    if (method === 'rpc') {
      if (!rpcFunc) {
        return NextResponse.json({ data: null, error: 'RPC function name is required' }, { status: 400 });
      }

      const keys = rpcParams ? Object.keys(rpcParams) : [];
      const parts = keys.map((key) => {
        params.push(rpcParams[key]);
        return `${key} => $${paramCounter++}`;
      });

      sql = `SELECT ${rpcFunc}(${parts.join(', ')}) AS result`;
      const dbRes = await query(sql, params);
      const resultData = dbRes.rows.length > 0 ? dbRes.rows[0].result : null;
      return NextResponse.json({ data: resultData, error: null });
    }

    if (!table) {
      return NextResponse.json({ data: null, error: 'Table name is required' }, { status: 400 });
    }

    // 1. Generate base statement
    if (method === 'select') {
      let cols = selectCols || '*';
      // Clean Supabase syntax like `*, user_profile_details(*)` into PostgreSQL column selection
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
      if (!updateData) {
        return NextResponse.json({ data: null, error: 'Update data is missing' }, { status: 400 });
      }

      const setClauses = Object.keys(updateData).map((col) => {
        params.push(updateData[col]);
        return `${col} = $${paramCounter++}`;
      });

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

    // 2. Append WHERE filters
    const whereClauses: string[] = [];
    // Helper to format JSON accessors correctly (e.g. hierarchy->>name to hierarchy->>'name')
    const parseCol = (c: string) => c.replace(/->>([a-zA-Z0-9_]+)/g, "->>'$1'").replace(/->([a-zA-Z0-9_]+)/g, "->'$1'");

    // AND filters (including comparison operators lt/gt/ilike/is/overlaps)
    if (filters && filters.length > 0) {
      filters.forEach((f: any) => {
        const col = parseCol(f.col);
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

    // NOT filters
    if (notFilters && notFilters.length > 0) {
      notFilters.forEach((f: any) => {
        const col = parseCol(f.col);
        if (f.val === null || f.val === 'null') {
          whereClauses.push(`${col} IS NOT NULL`);
        } else {
          params.push(f.val);
          whereClauses.push(`${col} != $${paramCounter++}`);
        }
      });
    }

    // OR filters
    if (orFilters && orFilters.length > 0) {
      orFilters.forEach((clause: string) => {
        const parts = clause.split(',');
        const partsClauses = parts.map(part => {
          const subParts = part.split('.');
          const col = parseCol(subParts[0]);
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
          return 'TRUE';
        });
        whereClauses.push(`(${partsClauses.join(' OR ')})`);
      });
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // 3. Append ORDER BY
    if (orderByCol) {
      const asc = typeof orderAscending === 'boolean' ? orderAscending : true;
      sql += ` ORDER BY ${orderByCol} ${asc ? 'ASC' : 'DESC'}`;
    }

    // 4. Append LIMIT
    if (limitNum !== null && limitNum !== undefined) {
      sql += ` LIMIT ${limitNum}`;
    }

    // Append OFFSET for ranges
    if (offsetNum !== null && offsetNum !== undefined) {
      sql += ` OFFSET ${offsetNum}`;
    }

    if (method === 'update') {
      sql += ` RETURNING *`;
    }

    // 5. Execute query
    const dbRes = await query(sql, params);
    let resultData = dbRes.rows;

    // Attach user_profile_details when fetching from users table
    if (table === 'users' && resultData.length > 0) {
      for (const row of resultData) {
        try {
          const profileRes = await query('SELECT * FROM user_profile_details WHERE user_id = $1', [row.id]);
          row.user_profile_details = profileRes.rows;
        } catch (e) {
          row.user_profile_details = [];
        }
      }
    }

    if (singleRow) {
      resultData = resultData.length > 0 ? resultData[0] : null;
    }

    return NextResponse.json({ data: resultData, error: null, count: Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0) });

  } catch (error: any) {
    console.error('[DB Proxy Error]', error);
    return NextResponse.json({ data: null, error: error.message || 'Database error occurred' }, { status: 500 });
  }
}

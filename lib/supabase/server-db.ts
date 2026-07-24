import { query } from '@/lib/db';

class ServerPgQueryBuilder {
    private table: string;
    private method: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    private selectCols: string = '*';
    private insertData: any = null;
    private updateData: any = null;
    private filters: Array<{ col: string; val: any; isNullCheck?: boolean; isInCheck?: boolean; isNotNullCheck?: boolean; isNotInCheck?: boolean; isOverlapsCheck?: boolean; isRaw?: boolean; op?: string }> = [];
    private orderByCol: string | null = null;
    private orderAscending: boolean = true;
    private limitNum: number | null = null;
    private isSingle: boolean = false;
    private onConflictCols: string | null = null;

    constructor(table: string) {
        this.table = table;
    }

    select(cols: string = '*', options?: any) {
        if (this.method !== 'insert' && this.method !== 'update' && this.method !== 'delete') {
            this.method = 'select';
        }
        this.selectCols = cols;
        return this;
    }

    insert(data: any) {
        this.method = 'insert';
        this.insertData = data;
        return this;
    }

    upsert(data: any, options?: any) {
        this.method = 'upsert';
        this.insertData = data;
        if (options?.onConflict) {
            this.onConflictCols = options.onConflict;
        }
        return this;
    }

    update(data: any) {
        this.method = 'update';
        this.updateData = data;
        return this;
    }

    delete() {
        this.method = 'delete';
        return this;
    }

    eq(col: string, val: any) {
        this.filters.push({ col, val, op: '=' });
        return this;
    }

    neq(col: string, val: any) {
        this.filters.push({ col, val, op: '!=' });
        return this;
    }

    gt(col: string, val: any) {
        this.filters.push({ col, val, op: '>' });
        return this;
    }

    gte(col: string, val: any) {
        this.filters.push({ col, val, op: '>=' });
        return this;
    }

    lt(col: string, val: any) {
        this.filters.push({ col, val, op: '<' });
        return this;
    }

    lte(col: string, val: any) {
        this.filters.push({ col, val, op: '<=' });
        return this;
    }

    ilike(col: string, val: any) {
        this.filters.push({ col, val, op: 'ILIKE' });
        return this;
    }

    range(from: number, to: number) {
        this.limitNum = to - from + 1;
        return this;
    }

    is(col: string, val: any) {
        this.filters.push({ col, val, isNullCheck: true });
        return this;
    }

    in(col: string, vals: any[]) {
        this.filters.push({ col, val: vals, isInCheck: true });
        return this;
    }

    overlaps(col: string, vals: any[]) {
        this.filters.push({ col, val: vals, isOverlapsCheck: true });
        return this;
    }

    not(col: string, op: string, val: any) {
        if (op === 'is' && val === null) {
            this.filters.push({ col, val: null, isNotNullCheck: true });
        } else if (op === 'eq') {
            this.filters.push({ col, val, op: '!=' });
        } else if (op === 'in') {
            this.filters.push({ col, val, isNotInCheck: true });
        } else {
            this.filters.push({ col, val, op: '!=' });
        }
        return this;
    }

    or(clause: string) {
        const parts = clause.split(',');
        const orSqlParts: string[] = [];
        for (const part of parts) {
            const match = part.trim().match(/^([a-zA-Z0-9_]+)\.([a-z]+)\.(.+)$/);
            if (match) {
                const [, col, op, val] = match;
                if (op === 'eq') {
                    orSqlParts.push(`${col} = '${val.replace(/'/g, "''")}'`);
                } else if (op === 'is') {
                    orSqlParts.push(`${col} IS ${val}`);
                }
            }
        }
        if (orSqlParts.length > 0) {
            this.filters.push({ col: 'raw_or', val: `(${orSqlParts.join(' OR ')})`, isRaw: true } as any);
        }
        return this;
    }

    order(col: string, options?: any) {
        this.orderByCol = col;
        this.orderAscending = options?.ascending !== false;
        return this;
    }

    limit(num: number) {
        this.limitNum = num;
        return this;
    }

    single() {
        this.isSingle = true;
        return this;
    }

    maybeSingle() {
        this.isSingle = true;
        return this;
    }

    async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
        try {
            let sql = '';
            const params: any[] = [];
            let paramIdx = 1;

            if (this.method === 'select') {
                let cols = this.selectCols || '*';
                if (cols.includes('(')) cols = '*';
                sql = `SELECT ${cols} FROM ${this.table}`;
                
                if (this.filters.length > 0) {
                    const whereClauses = this.filters.map((f: any) => {
                        if (f.isRaw) return f.val;
                        if (f.isNotNullCheck) return `${f.col} IS NOT NULL`;
                        if (f.isOverlapsCheck) {
                            params.push(f.val);
                            return `${f.col} && $${paramIdx++}`;
                        }
                        if (f.isNotInCheck) {
                            if (!Array.isArray(f.val) || f.val.length === 0) return `1 = 1`;
                            const inPlaceholders = f.val.map((v: any) => {
                                params.push(v);
                                return `$${paramIdx++}`;
                            });
                            return `${f.col} NOT IN (${inPlaceholders.join(', ')})`;
                        }
                        if (f.isInCheck) {
                            if (!Array.isArray(f.val) || f.val.length === 0) return `1 = 0`;
                            const inPlaceholders = f.val.map((v: any) => {
                                params.push(v);
                                return `$${paramIdx++}`;
                            });
                            return `${f.col} IN (${inPlaceholders.join(', ')})`;
                        }
                        if (f.val === null) return `${f.col} IS NULL`;
                        params.push(f.val);
                        const op = f.op || '=';
                        return `${f.col} ${op} $${paramIdx++}`;
                    });
                    sql += ` WHERE ${whereClauses.join(' AND ')}`;
                }

                if (this.orderByCol) {
                    sql += ` ORDER BY ${this.orderByCol} ${this.orderAscending ? 'ASC' : 'DESC'}`;
                }

                if (this.limitNum) {
                    params.push(this.limitNum);
                    sql += ` LIMIT $${paramIdx++}`;
                } else if (this.isSingle) {
                    sql += ` LIMIT 1`;
                }

            } else if (this.method === 'insert' || this.method === 'upsert') {
                const isArray = Array.isArray(this.insertData);
                let rows = isArray ? this.insertData : [this.insertData];
                if (rows.length === 0) {
                    const res = { data: isArray ? [] : null, error: null };
                    if (onfulfilled) return onfulfilled(res);
                    return res;
                }

                const columns = Object.keys(rows[0]);
                const valStrings = [];
                for (const row of rows) {
                    const rowVals = [];
                    for (const col of columns) {
                        let val = row[col];
                        if (val !== null && typeof val === 'object') {
                            val = JSON.stringify(val);
                        }
                        params.push(val);
                        rowVals.push(`$${paramIdx++}`);
                    }
                    valStrings.push(`(${rowVals.join(', ')})`);
                }

                sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${valStrings.join(', ')}`;
                if (this.method === 'upsert') {
                    const conflictCol = this.onConflictCols || columns[0];
                    const updateCols = columns.filter(c => c !== conflictCol).map(c => `${c} = EXCLUDED.${c}`).join(', ');
                    if (updateCols) {
                        sql += ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateCols}`;
                    } else {
                        sql += ` ON CONFLICT (${conflictCol}) DO NOTHING`;
                    }
                }
                sql += ` RETURNING *`;

            } else if (this.method === 'update') {
                const setClauses = [];
                for (const col of Object.keys(this.updateData)) {
                    params.push(this.updateData[col]);
                    setClauses.push(`${col} = $${paramIdx++}`);
                }
                sql = `UPDATE ${this.table} SET ${setClauses.join(', ')}`;

                if (this.filters.length > 0) {
                    const whereClauses = this.filters.map(f => {
                        if (f.isInCheck) {
                            if (!Array.isArray(f.val) || f.val.length === 0) return `1 = 0`;
                            const inPlaceholders = f.val.map(v => {
                                params.push(v);
                                return `$${paramIdx++}`;
                            });
                            return `${f.col} IN (${inPlaceholders.join(', ')})`;
                        }
                        if (f.val === null) return `${f.col} IS NULL`;
                        params.push(f.val);
                        return `${f.col} = $${paramIdx++}`;
                    });
                    sql += ` WHERE ${whereClauses.join(' AND ')}`;
                }
                sql += ` RETURNING *`;
            } else if (this.method === 'delete') {
                sql = `DELETE FROM ${this.table}`;
                if (this.filters.length > 0) {
                    const whereClauses = this.filters.map(f => {
                        params.push(f.val);
                        return `${f.col} = $${paramIdx++}`;
                    });
                    sql += ` WHERE ${whereClauses.join(' AND ')}`;
                }
                sql += ` RETURNING *`;
            }

            const dbRes = await query(sql, params);
            let resultData = dbRes.rows;

            if (this.method === 'insert' && !Array.isArray(this.insertData)) {
                resultData = dbRes.rows[0] || null;
            } else if (this.isSingle) {
                resultData = dbRes.rows[0] || null;
            }

            const res = { data: resultData, error: null };
            if (onfulfilled) return onfulfilled(res);
            return res;
        } catch (error) {
            console.error(`[ServerPgQueryBuilder Error]`, error);
            const res = { data: null, error };
            if (onfulfilled) return onfulfilled(res);
            return res;
        }
    }
}

export const createClient = (url?: string, key?: string, options?: any) => {
    return {
        from: (table: string) => new ServerPgQueryBuilder(table),
        rpc: async (func: string, params?: any) => {
            const keys = params ? Object.keys(params) : [];
            const sqlParams: any[] = [];
            let pIdx = 1;
            const parts = keys.map((k) => {
                sqlParams.push(params[k]);
                return `${k} => $${pIdx++}`;
            });
            const sql = `SELECT ${func}(${parts.join(', ')}) AS result`;
            const dbRes = await query(sql, sqlParams);
            return { data: dbRes.rows.length > 0 ? dbRes.rows[0].result : null, error: null };
        },
        auth: {
            getUser: async (token?: string): Promise<{ data: { user: any }; error: any }> => {
                return { data: { user: { id: 'admin' } }, error: null };
            }
        }
    };
};

export const supabase = createClient();


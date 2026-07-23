import pg from 'pg';
import crypto from 'crypto';
const { Pool } = pg;

let pool = null;

class PgSupabaseMock {
    constructor(pool) {
        this.pool = pool;
    }

    from(table) {
        return new PgQueryBuilder(this.pool, table);
    }
}

class PgQueryBuilder {
    constructor(pool, table) {
        this.pool = pool;
        this.table = table;
        this.method = 'select';
        this.selectCols = '*';
        this.insertData = null;
        this.updateData = null;
        this.filters = [];
        this.orderByCol = null;
        this.orderAscending = true;
        this.limitNum = null;
        this.isSingle = false;
    }

    select(cols = '*') {
        if (this.method !== 'insert' && this.method !== 'update' && this.method !== 'delete') {
            this.method = 'select';
        }
        this.selectCols = cols;
        return this;
    }

    insert(data) {
        this.method = 'insert';
        this.insertData = data;
        return this;
    }

    update(data) {
        this.method = 'update';
        this.updateData = data;
        return this;
    }

    eq(col, val) {
        this.filters.push({ col, val });
        return this;
    }

    is(col, val) {
        this.filters.push({ col, val });
        return this;
    }

    in(col, vals) {
        this.filters.push({ col, val: vals, isInCheck: true });
        return this;
    }

    order(col, options) {
        this.orderByCol = col;
        this.orderAscending = options?.ascending !== false;
        return this;
    }

    limit(num) {
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

    async then(onfulfilled, onrejected) {
        try {
            let sql = '';
            const params = [];
            let paramIdx = 1;

            if (this.method === 'select') {
                let cols = this.selectCols;
                if (cols === '*') cols = '*';
                sql = `SELECT ${cols} FROM ${this.table}`;
                
                if (this.filters.length > 0) {
                    const whereClauses = this.filters.map(f => {
                        if (f.isInCheck) {
                            if (!Array.isArray(f.val) || f.val.length === 0) {
                                return `1 = 0`;
                            }
                            const inPlaceholders = f.val.map(v => {
                                params.push(v);
                                return `$${paramIdx++}`;
                            });
                            return `${f.col} IN (${inPlaceholders.join(', ')})`;
                        }
                        if (f.val === null) {
                            return `${f.col} IS NULL`;
                        }
                        params.push(f.val);
                        return `${f.col} = $${paramIdx++}`;
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

            } else if (this.method === 'insert') {
                const isArray = Array.isArray(this.insertData);
                let rows = isArray ? this.insertData : [this.insertData];
                if (rows.length === 0) {
                    const res = { data: isArray ? [] : null, error: null };
                    if (onfulfilled) return onfulfilled(res);
                    return res;
                }

                // Auto-generate UUID if 'id' column is missing or null
                rows = rows.map(r => ({
                    ...r,
                    id: r.id || crypto.randomUUID()
                }));

                const columns = Object.keys(rows[0]);
                const valStrings = [];
                for (const row of rows) {
                    const rowVals = [];
                    for (const col of columns) {
                        params.push(row[col]);
                        rowVals.push(`$${paramIdx++}`);
                    }
                    valStrings.push(`(${rowVals.join(', ')})`);
                }

                sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${valStrings.join(', ')} RETURNING *`;

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
                            if (!Array.isArray(f.val) || f.val.length === 0) {
                                return `1 = 0`;
                            }
                            const inPlaceholders = f.val.map(v => {
                                params.push(v);
                                return `$${paramIdx++}`;
                            });
                            return `${f.col} IN (${inPlaceholders.join(', ')})`;
                        }
                        if (f.val === null) {
                            return `${f.col} IS NULL`;
                        }
                        params.push(f.val);
                        return `${f.col} = $${paramIdx++}`;
                    });
                    sql += ` WHERE ${whereClauses.join(' AND ')}`;
                }
                sql += ` RETURNING *`;
            }

            const dbRes = await this.pool.query(sql, params);
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
            console.error(`[PgSupabaseMock Error] SQL:`, error);
            const res = { data: null, error };
            if (onfulfilled) return onfulfilled(res);
            return res;
        }
    }
}

export function createClient(url, key) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
        if (!pool) {
            pool = new Pool({ connectionString });
        }
        return new PgSupabaseMock(pool);
    }
    
    // Fallback to real Supabase (using a lazy resolver proxy to avoid sync import issues if client isn't loaded)
    let realClient = null;
    const getRealClient = async () => {
        if (realClient) return realClient;
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        realClient = createSupabaseClient(url, key);
        return realClient;
    };
    
    return {
        from: (table) => {
            return {
                select: (cols) => {
                    const chain = {
                        eq: (col, val) => { chain.promise = getRealClient().then(c => c.from(table).select(cols).eq(col, val)); return chain; },
                        single: () => { chain.promise = getRealClient().then(c => c.from(table).select(cols).single()); return chain; },
                        then: (resolve, reject) => chain.promise ? chain.promise.then(resolve, reject) : getRealClient().then(c => c.from(table).select(cols)).then(resolve, reject)
                    };
                    return chain;
                },
                insert: (data) => {
                    const chain = {
                        select: () => {
                            const innerChain = {
                                single: () => { innerChain.promise = getRealClient().then(c => c.from(table).insert(data).select().single()); return innerChain; },
                                then: (resolve, reject) => innerChain.promise ? innerChain.promise.then(resolve, reject) : getRealClient().then(c => c.from(table).insert(data).select()).then(resolve, reject)
                            };
                            return innerChain;
                        },
                        then: (resolve, reject) => getRealClient().then(c => c.from(table).insert(data)).then(resolve, reject)
                    };
                    return chain;
                },
                update: (data) => {
                    const chain = {
                        eq: (col, val) => { chain.promise = getRealClient().then(c => c.from(table).update(data).eq(col, val)); return chain; },
                        then: (resolve, reject) => chain.promise.then(resolve, reject)
                    };
                    return chain;
                }
            };
        }
    };
}

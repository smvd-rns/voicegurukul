import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    max: 20, // Max clients in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  // Prevent hot-reloading from creating duplicate pools in development
  if (!(global as any)._pgPool) {
    (global as any)._pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  pool = (global as any)._pgPool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

export default pool;

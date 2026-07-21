// Mock Supabase Client compatibility shim that proxies all queries to /api/db-proxy
// and auth operations to /api/auth/* routes.

class QueryBuilder {
  private table: string;
  private method: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectCols: string = '*';
  private insertData: any = null;
  private updateData: any = null;
  private filters: Array<{ type: 'eq' | 'in' | 'lt' | 'gt' | 'ilike' | 'is' | 'overlaps'; col: string; val: any }> = [];
  private orFilters: string[] = [];
  private notFilters: Array<{ col: string; op: string; val: any }> = [];
  private orderByCol: string | null = null;
  private orderAscending: boolean = true;
  private limitNum: number | null = null;
  private offsetNum: number | null = null;
  private singleRow: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = '*', options?: any) {
    this.method = 'select';
    this.selectCols = cols;
    return this;
  }

  insert(data: any) {
    this.method = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.method = 'update';
    this.updateData = data;
    return this;
  }

  delete(options?: any) {
    this.method = 'delete';
    return this;
  }

  upsert(data: any, options?: any) {
    this.method = 'upsert';
    this.insertData = data;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  in(col: string, val: any[]) {
    this.filters.push({ type: 'in', col, val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ type: 'lt', col, val });
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push({ type: 'gt', col, val });
    return this;
  }

  ilike(col: string, val: any) {
    this.filters.push({ type: 'ilike', col, val });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push({ type: 'is', col, val });
    return this;
  }

  overlaps(col: string, val: any) {
    this.filters.push({ type: 'overlaps', col, val });
    return this;
  }

  not(col: string, op: string, val: any) {
    this.notFilters.push({ col, op, val });
    return this;
  }

  or(clause: string) {
    this.orFilters.push(clause);
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

  range(from: number, to: number) {
    this.offsetNum = from;
    this.limitNum = to - from + 1;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  maybeSingle() {
    this.singleRow = true;
    return this;
  }

  // Makes the builder thenable (awaitable)
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') : '';
      const res = await fetch(`${baseUrl}/api/db-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          method: this.method,
          selectCols: this.selectCols,
          insertData: this.insertData,
          updateData: this.updateData,
          filters: this.filters,
          orFilters: this.orFilters,
          notFilters: this.notFilters,
          orderByCol: this.orderByCol,
          orderAscending: this.orderAscending,
          limitNum: this.limitNum,
          offsetNum: this.offsetNum,
          singleRow: this.singleRow,
        }),
      });
      
      const json = await res.json();
      if (!res.ok) {
        return onfulfilled 
          ? onfulfilled({ data: null, error: json.error || `Proxy error: ${res.statusText}` })
          : { data: null, error: json.error || `Proxy error: ${res.statusText}` };
      }

      if (onfulfilled) return onfulfilled(json);
      return json;
    } catch (err) {
      if (onfulfilled) return onfulfilled({ data: null, error: err });
      if (onrejected) return onrejected(err);
      return { data: null, error: err };
    }
  }
}

const authSubscribers: Array<(event: string, session: any) => void> = [];

export const supabase = {
  from: (table: string) => {
    return new QueryBuilder(table);
  },
  rpc: async (func: string, params?: any) => {
    try {
      const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') : '';
      const res = await fetch(`${baseUrl}/api/db-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'rpc',
          rpcFunc: func,
          rpcParams: params,
        }),
      });
      if (!res.ok) {
        throw new Error(`RPC proxy error: ${res.statusText}`);
      }
      return await res.json();
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
  auth: {
    getSession: async () => {
      try {
        const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') : '';
        const res = await fetch(`${baseUrl}/api/auth/session`);
        if (!res.ok) return { data: { session: null }, error: null };
        const data = await res.json();
        return { data: { session: data.session }, error: null };
      } catch (err) {
        return { data: { session: null }, error: err };
      }
    },
    getUser: async (token?: string) => {
      if (token) {
        try {
          const payloadBase64 = token.split('.')[1];
          const payloadJson = typeof window === 'undefined' 
            ? Buffer.from(payloadBase64, 'base64').toString('utf8')
            : atob(payloadBase64);
          const decoded = JSON.parse(payloadJson);
          return { 
            data: { 
              user: { 
                id: decoded.userId, 
                email: decoded.email, 
                user_metadata: { name: decoded.name } 
              } 
            }, 
            error: null 
          };
        } catch (e: any) {
          return { data: { user: null }, error: e };
        }
      }
      const { data, error = null } = await supabase.auth.getSession();
      return { data: { user: data?.session?.user || null }, error };
    },
    setSession: async ({ access_token, refresh_token }: any) => {
      return { data: { session: { access_token } }, error: null };
    },
    updateUser: async ({ password }: any) => {
      try {
        const res = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: new Error(data.error || 'Update password failed') };
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: new Error(data.error || 'Login failed') };
        
        authSubscribers.forEach(cb => cb('SIGNED_IN', data.session));
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signUp: async ({ email, password, options }: any) => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, data: options?.data }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: new Error(data.error || 'Sign up failed') };
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        authSubscribers.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
    signInWithOAuth: async ({ provider, options }: any) => {
      if (provider === 'google') {
        const clientId = '975011285696-l77icaiao221q7bfbfm0mtcrd3s0s2b4.apps.googleusercontent.com';
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '');
        const redirectUri = encodeURIComponent(`${siteUrl}/api/auth/google`);
        
        let nextPath = '/';
        if (options?.redirectTo) {
          try {
            const urlObj = new URL(options.redirectTo);
            nextPath = urlObj.searchParams.get('next') || '/';
          } catch {
            nextPath = options.redirectTo;
          }
        }
        
        const state = encodeURIComponent(nextPath);

        if (typeof window !== 'undefined') {
          window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&access_type=offline&prompt=consent&state=${state}`;
        }
        return { data: { provider: 'google', url: '' }, error: null };
      }
      return { data: null, error: new Error('Unsupported OAuth Provider') };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      authSubscribers.push(callback);
      supabase.auth.getSession().then(({ data }) => {
        callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session);
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authSubscribers.indexOf(callback);
              if (idx !== -1) authSubscribers.splice(idx, 1);
            }
          }
        }
      };
    }
  }
};

export const createClient = (url: string, key: string, options?: any) => {
  return supabase;
};

export type SupabaseClient = any;
export type User = any;

export default supabase;

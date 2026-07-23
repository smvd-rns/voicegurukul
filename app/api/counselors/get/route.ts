import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const ashram = searchParams.get('ashram') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const keyToUse = serviceRoleKey || supabaseAnonKey;

    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const fetchHeaders = new Headers(init?.headers);

      if (serviceRoleKey) {
        fetchHeaders.set('apikey', serviceRoleKey);
        fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
      } else {
        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');
        if (accessToken) {
          fetchHeaders.set('Authorization', `Bearer ${accessToken}`);
        }
        fetchHeaders.set('apikey', supabaseAnonKey);
      }

      fetchHeaders.set('Content-Type', 'application/json');

      return fetch(input, {
        ...init,
        headers: fetchHeaders,
      });
    };

    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    // Check if user is authenticated to decide whether to show sensitive details
    // Note: In Next.js API routes, we can check the auth cookie or header
    const authHeader = request.headers.get('authorization');
    let isAuthenticated = false;

    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user && !error) {
        isAuthenticated = true;
      }
    }

    // Select fields based on auth status
    // Public: Hide PII (email, mobile)
    // Auth: Show everything (admins might need it, or logged in users)
    // For now, we'll hide PII for everyone except maybe if we add role checks later.
    // But to be safe for public registration page, we MUST hide email/mobile.
    const selectFields = isAuthenticated
      ? 'id, name, mobile, email, city, ashram, user_id'
      : 'id, name, city, ashram, user_id'; // Exclude mobile and email for public

    let query = supabase
      .from('counselors')
      .select(selectFields)
      .eq('is_verified', true) // Only show verified counselors to be safe (RLS also enforces this for anon)
      .order('name', { ascending: true });

    // If ashram filter provided, filter by ashram
    if (ashram.trim()) {
      query = query.eq('ashram', ashram.trim());
    }

    // If search term provided, filter by name or city
    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching counselors:', error);
      throw new Error(error.message || 'Failed to fetch counselors');
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in counselors GET route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch counselors' },
      { status: 500 }
    );
  }
}

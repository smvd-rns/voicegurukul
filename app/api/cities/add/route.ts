import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { validateCityInput, sanitizeInput } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { state, cityName } = body;

    // Validate inputs
    const validation = validateCityInput(state, cityName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Rate Limiting
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    // Create a temporary client to get the user ID from the token
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    let userId = null;

    if (accessToken) {
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      const { data: { user } } = await tempClient.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = await checkRateLimit(request, userId, {
      action: 'add_city',
      limit: 20, // Max 20 cities
      windowMs: 60 * 60 * 1000, // 1 hour window
      blockDurationMs: 6 * 60 * 60 * 1000 // 6 hours block
    });

    if (rateLimit.blocked) {
      return NextResponse.json({
        error: rateLimit.message,
        retryAfter: rateLimit.retryAfter
      }, { status: 429 });
    }

    // Sanitize inputs
    state = sanitizeInput(state);
    cityName = sanitizeInput(cityName);



    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use Service Role Key if available (Restricted RLS), otherwise fallback to Anon Key (Public RLS)
    const keyToUse = serviceRoleKey || supabaseAnonKey;

    // Custom fetch
    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const fetchHeaders = new Headers(init?.headers);

      if (serviceRoleKey) {
        fetchHeaders.set('apikey', serviceRoleKey);
        fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
      } else {
        // Pass the user's auth token if using Anon Key
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

    const authenticatedClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    const trimmedState = state.trim();
    const trimmedCityName = cityName.trim();

    // Check if city already exists
    const { data: existing, error: checkError } = await authenticatedClient
      .from('cities')
      .select('id')
      .eq('state', trimmedState)
      .eq('name', trimmedCityName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code !== '42501' && !checkError.message?.includes('permission denied')) {
        console.warn('Error checking if city exists:', checkError);
      }
    }

    if (existing) {
      // Revalidate the cities cache
      const { revalidateTag } = await import('next/cache');
      revalidateTag('cities');

      return NextResponse.json({ success: true });
    }


    // Insert new city
    const { error } = await authenticatedClient
      .from('cities')
      .insert({
        name: trimmedCityName,
        state: trimmedState,
      });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation (duplicate), return success
        return NextResponse.json({ success: true });
      }

      console.error('Supabase insert error:', error);

      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new Error('Cities table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY in .env.local.');
      }

      throw new Error(error.message || `Failed to insert city: ${error.code || 'Unknown error'}`);
    }

    // Revalidate the cities cache
    const { revalidateTag } = await import('next/cache');
    revalidateTag('cities');

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error adding city to Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to add city';
    const errorString = error.message?.toLowerCase() || '';
    let status = 500;

    if (errorString.includes('permission denied') || errorString.includes('row-level security')) {
      status = 403;
      errorMessage = 'Permission denied. Unable to add city.';
    } else if (errorString.includes('not initialized')) {
      status = 500;
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status });
  }
}

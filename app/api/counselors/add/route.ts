import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { sanitizeInput, validateCounselorInput } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { name, mobile, email, city, ashram } = body;

    // Validate that city is provided
    if (!city || !city.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }

    // Validate inputs using validation utility
    const validation = validateCounselorInput(name, mobile, email);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid counselor information' }, { status: 400 });
    }

    // Rate Limiting
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    // Create a temporary client to get the user ID from the token
    const user = await getAuthUserFromRequest(request);
    const userId = user?.id || null;

    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = await checkRateLimit(request, userId, {
      action: 'add_counselor',
      limit: 20, // Max 20 counselors
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
    name = sanitizeInput(name);
    mobile = sanitizeInput(mobile);
    email = sanitizeInput(email);
    city = sanitizeInput(city).trim();
    ashram = ashram ? sanitizeInput(ashram).trim() : null;



    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use Service Role Key if available (Restricted RLS), otherwise fallback to Anon Key (Public RLS)
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

    const authenticatedClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check if counselor already exists by email (primary check)
    const { data: existingByEmail, error: checkEmailError } = await authenticatedClient
      .from('counselors')
      .select('id, name, email, mobile, city, ashram')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (checkEmailError && checkEmailError.code !== 'PGRST116') {
      // Ignore permission denied errors for duplicate checks - we'll let the unique constraint handle it
      if (checkEmailError.code !== '42501' && !checkEmailError.message?.includes('permission denied')) {
        console.warn('Error checking for existing counselor:', checkEmailError);
      }
    }

    if (existingByEmail) {
      // Counselor already exists with this email
      return NextResponse.json({
        error: `A counselor with this email (${trimmedEmail}) already exists. Please use a different email or select the existing counselor.`,
        duplicate: true,
        existingCounselor: {
          id: existingByEmail.id,
          name: existingByEmail.name,
          email: existingByEmail.email,
          mobile: existingByEmail.mobile,
          city: existingByEmail.city,
          ashram: existingByEmail.ashram
        }
      }, { status: 409 }); // 409 Conflict
    }

    // Also check by name and mobile combination to catch potential duplicates
    const { data: existingByNameMobile, error: checkNameMobileError } = await authenticatedClient
      .from('counselors')
      .select('id, name, email, mobile, city, ashram')
      .eq('name', trimmedName)
      .eq('mobile', trimmedMobile)
      .maybeSingle();

    if (checkNameMobileError && checkNameMobileError.code !== 'PGRST116') {
      // If this check fails, continue anyway (email check is primary)
      console.warn('Error checking counselor by name/mobile:', checkNameMobileError);
    }

    if (existingByNameMobile && existingByNameMobile.email !== trimmedEmail) {
      // Same name and mobile but different email - potential duplicate
      return NextResponse.json({
        error: `A counselor with the same name (${trimmedName}) and mobile number (${trimmedMobile}) already exists with email ${existingByNameMobile.email}. Please verify this is not a duplicate.`,
        duplicate: true,
        existingCounselor: {
          id: existingByNameMobile.id,
          name: existingByNameMobile.name,
          email: existingByNameMobile.email,
          mobile: existingByNameMobile.mobile,
          city: existingByNameMobile.city,
          ashram: existingByNameMobile.ashram
        }
      }, { status: 409 }); // 409 Conflict
    }

    // Insert new counselor
    const insertData: any = {
      name: trimmedName,
      mobile: trimmedMobile,
      email: trimmedEmail,
      city: city,
    };
    if (ashram) {
      insertData.ashram = ashram;
    }

    const { data: insertedData, error } = await authenticatedClient
      .from('counselors')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation (duplicate email) - race condition
        const { data: existingCounselor } = await authenticatedClient
          .from('counselors')
          .select('id, name, email, mobile, city, ashram')
          .eq('email', trimmedEmail)
          .single();
        return NextResponse.json({
          error: `A counselor with this email (${trimmedEmail}) already exists. Please use a different email or select the existing counselor.`,
          duplicate: true,
          existingCounselor: existingCounselor ? {
            id: existingCounselor.id,
            name: existingCounselor.name,
            email: existingCounselor.email,
            mobile: existingCounselor.mobile,
            city: existingCounselor.city,
            ashram: existingCounselor.ashram
          } : null
        }, { status: 409 }); // 409 Conflict
      }

      console.error('Supabase insert error:', error);

      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new Error('Counselors table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY.');
      }

      throw new Error(error.message || `Failed to insert counselor: ${error.code || 'Unknown error'}`);
    }

    return NextResponse.json({ success: true, id: insertedData?.id });
  } catch (error: any) {
    console.error('Error adding counselor to Supabase:', error);

    let errorMessage = error.message || 'Failed to add counselor';
    let status = 500;
    const errorString = error.message?.toLowerCase() || '';

    if (errorString.includes('permission denied') || errorString.includes('row-level security')) {
      status = 403;
      errorMessage = 'Permission denied. Unable to add counselor.';
    } else if (errorString.includes('relation') && errorString.includes('does not exist')) {
      errorMessage = 'Counselors table does not exist. Please run the Supabase schema SQL file.';
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status });
  }
}

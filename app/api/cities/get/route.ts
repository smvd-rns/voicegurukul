import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

// Define types locally since we're bypassing the helper
interface CitiesData {
  [state: string]: string[];
}

export async function GET(request: Request) {
  try {
    const { getCachedCities } = await import('@/lib/cache/cities');
    const citiesData = await getCachedCities();

    return NextResponse.json(citiesData);

  } catch (error: any) {
    console.error('Error getting cities from Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to get cities';
    let status = 500;

    if (error.message?.includes('relation "cities" does not exist')) {
      errorMessage = 'Cities table does not exist. Please run the Supabase schema SQL file first.';
    } else if (error.message?.includes('not initialized')) {
      errorMessage = 'Supabase is not initialized. Please check your environment variables.';
    } else if (error.message?.includes('Permission denied')) {
      status = 403;
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}

import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

export const dynamic = 'force-dynamic';

// Define types locally since we're bypassing the helper
interface CenterData {
  id: string;
  name: string;
  state: string;
  city: string;
  address?: string;
  contact?: string;
}

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const city = searchParams.get('city');

    const { getCachedCenters } = await import('@/lib/cache/centers');

    
    // Get all centers from cache (or fetch if stale)
    const centersData = await getCachedCenters();

    // If no filters, return the whole grouped object
    if (!state && !city) {
      return NextResponse.json(centersData);
    }

    // If filtering by state
    if (state && !city) {
      const stateData = centersData[state] || {};
      return NextResponse.json({ [state]: stateData });
    }

    // If filtering by both state and city
    if (state && city) {
      const cityData = (centersData[state] && centersData[state][city]) ? centersData[state][city] : [];
      return NextResponse.json({ [state]: { [city]: cityData } });
    }

    return NextResponse.json(centersData);

  } catch (error: any) {
    console.error('Error getting centers from Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to get centers';
    let status = 500;

    if (error.message?.includes('relation "centers" does not exist')) {
      errorMessage = 'Centers table does not exist. Please run the Supabase schema SQL file first.';
    } else if (error.message?.includes('not initialized')) {
      errorMessage = 'Supabase is not initialized. Please check your environment variables.';
    } else if (error.message?.includes('Permission denied')) {
      status = 403;
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}

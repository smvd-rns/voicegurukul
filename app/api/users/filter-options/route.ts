import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';

// Initialize Supabase client with service role key

export async function GET() {
    try {
        const supabaseAdmin = createClient();

        // Get unique values for filters
        const [statesData, citiesData, centersData] = await Promise.all([
            supabaseAdmin.from('users').select('state').not('state', 'is', null),
            supabaseAdmin.from('users').select('city').not('city', 'is', null),
            supabaseAdmin.from('users').select('center').not('center', 'is', null),
        ]);

        // Extract unique values
        const states = [...new Set(statesData.data?.map((u: any) => u.state).filter(Boolean))].sort();
        const cities = [...new Set(citiesData.data?.map((u: any) => u.city).filter(Boolean))].sort();
        const centers = [...new Set(centersData.data?.map((u: any) => u.center).filter(Boolean))].sort();

        return NextResponse.json({
            success: true,
            filters: {
                states,
                cities,
                centers,
                camps: [
                    { value: 'camp_dys', label: 'DYS' },
                    { value: 'camp_sankalpa', label: 'Sankalpa' },
                    { value: 'camp_sphurti', label: 'Sphurti' },
                    { value: 'camp_utkarsh', label: 'Utkarsh' },
                    { value: 'camp_faith_and_doubt', label: 'Faith and Doubt' },
                    { value: 'camp_srcgd_workshop', label: 'SRCGD Workshop' },
                    { value: 'camp_nistha', label: 'Nistha' },
                    { value: 'camp_ashray', label: 'Ashray' },
                    { value: 'royal', label: 'Royal Field' },
                ],
            },
        });
    } catch (error: any) {
        console.error('Error fetching filter options:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch filter options' },
            { status: 500 }
        );
    }
}

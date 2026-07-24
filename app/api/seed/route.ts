import { NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {

        const supabase = createClient();

        // Read all-cities.json
        const filePath = path.join(process.cwd(), 'public', 'all-cities.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const citiesData = JSON.parse(fileContent);

        const states = Object.keys(citiesData);
        const results = {
            totalStates: states.length,
            citiesProcessed: 0,
            citiesAdded: 0,
            errors: [] as string[]
        };

        // Process each state
        for (const state of states) {
            const cityList = citiesData[state];
            const trimmedState = state.trim();

            // Process cities for this state
            for (const cityName of cityList) {
                results.citiesProcessed++;
                const trimmedCity = cityName.trim();

                // Check if exists (case-insensitive)
                const { data: existing } = await supabase
                    .from('cities')
                    .select('id')
                    .eq('state', trimmedState)
                    .ilike('name', trimmedCity) // Case insensitive check
                    .maybeSingle();

                if (!existing) {
                    // Insert with Title Case used from the JSON (assuming JSON is safe/correct casing. 
                    // If we want to enforce Title Case, we can assume the JSON is already good or format it)
                    // For now, we use the JSON value as it looks formatted "Port Blair", "New Delhi" etc.

                    const { error } = await supabase
                        .from('cities')
                        .insert({
                            state: trimmedState,
                            name: trimmedCity
                        });

                    if (error) {
                        results.errors.push(`Failed to add ${trimmedCity}, ${trimmedState}: ${error.message}`);
                    } else {
                        results.citiesAdded++;
                    }
                }
            }
        }

        return NextResponse.json({
            message: 'Migration completed',
            stats: results
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

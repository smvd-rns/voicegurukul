import { createClient } from '@supabase/supabase-js';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SADHANA_DB_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SADHANA_DB_SERVICE_ROLE_KEY!;

const activeSupabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    const userId = 'ec09780b-6421-4b7f-a4a2-455c223218e5'; // From user logs
    const date = '2026-02-20';

    // 1. Check if report for specifically today exists
    const { data: todayReport } = await activeSupabase
        .from('sadhana_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

    console.log('--- TODAY REPORT ---');
    console.log(todayReport);

    // 2. Run the week boundary logic
    const parts = date.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const dayVal = parseInt(parts[2], 10);

    const inputDate = new Date(year, month, dayVal, 12, 0, 0);
    const dayOfWeek = inputDate.getDay();
    const diff = inputDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const startOfWeek = new Date(year, month, diff, 0, 0, 0, 0);
    const endOfWeek = new Date(year, month, diff + 6, 23, 59, 59, 999);

    const formatDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    const startDateStr = formatDateStr(startOfWeek);
    const endDateStr = formatDateStr(endOfWeek);

    console.log('--- RANGE ---');
    console.log(`Searching from ${startDateStr} to ${endDateStr}`);

    // 3. Query the range
    const { data: rangeData, error } = await (activeSupabase
        .from('sadhana_reports')
        .select('*')
        .eq('user_id', userId) as any)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

    console.log('--- RANGE DATA ---');
    if (error) console.error(error);
    console.log(`Found ${rangeData?.length || 0} rows`);
    console.log(rangeData);
}

debug();

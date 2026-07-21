import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SADHANA_DB_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SADHANA_DB_SERVICE_ROLE_KEY!;

const activeSupabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await activeSupabase
        .from('sadhana_reports')
        .select('date')
        .eq('user_id', 'ec09780b-6421-4b7f-a4a2-455c223218e5');

    if (data) {
        console.log(data.map((d: any) => ({ d: d.date, l: d.date.length })));
    }
}

check();

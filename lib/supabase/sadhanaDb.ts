import { supabase } from './config';

export const sadhanaDb = supabase;

export function getSadhanaAdminClient(): any {
    return supabase;
}

export default sadhanaDb;


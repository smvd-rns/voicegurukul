import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase/config';

/**
 * Fetches and groups centers from self-hosted DB proxy with caching.
 * Revalidate this cache using revalidateTag('centers')
 */
export const getCachedCenters = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .order('name');

    if (error) throw error;

    const centers = data || [];
    const centersData: { [state: string]: { [city: string]: any[] } } = {};

    centers.forEach((center: any) => {
      if (!centersData[center.state]) {
        centersData[center.state] = {};
      }
      if (!centersData[center.state][center.city]) {
        centersData[center.state][center.city] = [];
      }
      centersData[center.state][center.city].push(center);
    });

    return centersData;
  },
  ['centers-list'],
  {
    revalidate: 3600, // Fallback 1 hour
    tags: ['centers']
  }
);

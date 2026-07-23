import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase/config';

/**
 * Fetches and groups cities from self-hosted DB proxy with caching.
 * Revalidate this cache using revalidateTag('cities')
 */
export const getCachedCities = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('name, state')
      .order('state')
      .order('name');

    if (error) throw error;

    const citiesData: { [state: string]: string[] } = {};

    if (data) {
      data.forEach((city: any) => {
        if (!citiesData[city.state]) {
          citiesData[city.state] = [];
        }
        if (!citiesData[city.state].includes(city.name)) {
          citiesData[city.state].push(city.name);
        }
      });
    }

    return citiesData;
  },
  ['cities-list'],
  {
    revalidate: 3600,
    tags: ['cities']
  }
);

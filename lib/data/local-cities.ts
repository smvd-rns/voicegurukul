// Utility functions to manage cities in Supabase database
// These functions call API routes which interact with Supabase
import { supabase } from '@/lib/supabase/config';

export interface CityData {
  name: string;
  state: string;
}

export interface CitiesData {
  [state: string]: string[]; // State name -> array of city names
}

// Get cities from Supabase via API
export const getCitiesFromLocal = async (): Promise<CitiesData> => {
  try {
    const response = await fetch('/api/cities/get', { cache: 'no-store' });
    if (!response.ok) {
      // If file doesn't exist, return empty object
      return {};
    }
    const data = await response.json();
    return data as CitiesData;
  } catch (error) {
    console.error('Error loading cities from local file:', error);
    return {};
  }
};

// Get cities for a specific state from Supabase
export const getCitiesByStateFromLocal = async (state: string): Promise<string[]> => {
  const citiesData = await getCitiesFromLocal();
  return citiesData[state] || [];
};

// Add a city to Supabase (admin only - server-side)
export const addCityToLocal = async (state: string, cityName: string): Promise<boolean> => {
  try {
    // Get the current session token to authenticate the API request
    let authHeader = '';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    }

    const { getDeviceHeaders } = await import('@/lib/utils/device');
    const deviceHeaders = getDeviceHeaders();

    // This will be handled by an API route since we can't write to public files from client
    const response = await fetch('/api/cities/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
        ...deviceHeaders, // Include device ID
      } as HeadersInit,
      body: JSON.stringify({ state, cityName }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error adding city to local file:', error);
    return false;
  }
};

// Delete a city from Supabase (admin only - server-side)
export const deleteCityFromLocal = async (state: string, cityName: string): Promise<boolean> => {
  try {
    // Get the current session token to authenticate the API request
    let authHeader = '';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    }

    const response = await fetch('/api/cities/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({ state, cityName }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting city from local file:', error);
    return false;
  }
};

// Update a city name in Supabase (admin only - server-side)
export const updateCityInLocal = async (
  state: string,
  oldCityName: string,
  newCityName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    let authHeader = '';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    }

    const response = await fetch('/api/cities/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({ state, oldCityName, newCityName }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update city' };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error updating city:', error);
    return { success: false, error: error.message || 'Failed to update city' };
  }
};

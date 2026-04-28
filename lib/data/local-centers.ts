// Utility functions to manage centers in Supabase database
// These functions call API routes which interact with Supabase
import { supabase } from '@/lib/supabase/config';

export interface CenterData {
  id: string;
  name: string;
  state: string;
  city: string;
  address?: string;
  contact?: string;
  temple_id?: string;
  temple_name?: string;
  project_manager_id?: string;
  project_manager_name?: string;
  project_advisor_id?: string;
  project_advisor_name?: string;
  acting_manager_id?: string;
  acting_manager_name?: string;
  internal_manager_id?: string;
  internal_manager_name?: string;
  preaching_coordinator_id?: string;
  preaching_coordinator_name?: string;
  preaching_coordinator_ids?: string[];
  preaching_coordinator_names?: string[];
  morning_program_in_charge_id?: string;
  morning_program_in_charge_name?: string;
  mentor_id?: string;
  mentor_name?: string;
  mentor_ids?: string[];
  mentor_names?: string[];
  frontliner_id?: string;
  frontliner_name?: string;
  frontliner_ids?: string[];
  frontliner_names?: string[];
  accountant_id?: string;
  accountant_name?: string;
  kitchen_head_id?: string;
  kitchen_head_name?: string;
  study_in_charge_id?: string;
  study_in_charge_name?: string;
  grihstha_counselor_id?: string;
  grihstha_counselor_name?: string;
  grihstha_counselor_ids?: string[];
  grihstha_counselor_names?: string[];
  easy_incharge_id?: string;
  easy_incharge_name?: string;
  easy_incharge_ids?: string[];
  easy_incharge_names?: string[];
  prerna_incharge_id?: string;
  prerna_incharge_name?: string;
  prerna_incharge_ids?: string[];
  prerna_incharge_names?: string[];
  oc_id?: string;
  oc_name?: string;
}

export interface CentersData {
  [state: string]: {
    [city: string]: CenterData[]; // State -> City -> Centers array
  };
}

// Get centers from Supabase via API
export const getCentersFromLocal = async (): Promise<CentersData> => {
  try {
    const response = await fetch('/api/centers/get', { cache: 'no-store' });
    if (!response.ok) {
      // If file doesn't exist, return empty object
      return {};
    }
    const data = await response.json();
    return data as CentersData;
  } catch (error) {
    console.error('Error loading centers from local file:', error);
    return {};
  }
};

// Get centers for a specific state and city from Supabase
export const getCentersByLocationFromLocal = async (state?: string, city?: string): Promise<CenterData[]> => {
  try {
    // Call API route with query parameters
    let url = '/api/centers/get';
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (city) params.append('city', city);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }

    const centersData: CentersData = await response.json();

    // Convert to array format (flatten the nested structure)
    const allCenters: CenterData[] = [];
    Object.values(centersData).forEach(stateData => {
      Object.values(stateData).forEach(cityCenters => {
        allCenters.push(...cityCenters);
      });
    });

    return allCenters;
  } catch (error) {
    console.error('Error loading centers from Supabase:', error);
    return [];
  }
};

// Add a center to local JSON file (any authenticated user can add)
export const addCenterToLocal = async (center: Omit<CenterData, 'id'>): Promise<boolean> => {
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

    const response = await fetch('/api/centers/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
        ...deviceHeaders, // Include device ID
      } as HeadersInit,
      body: JSON.stringify(center),
    });
    return response.ok;
  } catch (error) {
    console.error('Error adding center to local file:', error);
    return false;
  }
};

// Delete a center from local JSON file (admin only - server-side)
export const deleteCenterFromLocal = async (centerId: string): Promise<boolean> => {
  try {
    // Get the current session token to authenticate the API request
    let authHeader = '';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    }

    const response = await fetch('/api/centers/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({ centerId }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting center from Supabase:', error);
    return false;
  }
};

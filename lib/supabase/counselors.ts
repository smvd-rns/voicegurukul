import { supabase } from './config';
import { User } from '@/types';
import { normalizeRoleFromFirestore } from '@/lib/utils/roles';

/**
 * Get all users who have a specific counselor email assigned to them
 * This queries Supabase users table directly by counselor email columns
 */
export const getUsersByCounselorEmail = async (counselorEmail: string): Promise<User[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const lowerEmail = counselorEmail.toLowerCase();

    // 1. First, find if this email belongs to a counselor in the counselors table to get their name
    const { data: counselorData } = await supabase
      .from('counselors')
      .select('name')
      .ilike('email', lowerEmail)
      .maybeSingle();

    const counselorName = counselorData?.name;

    // 2. Query users where email matches OR name matches (if we found it)
    let orFilter = `brahmachari_counselor_email.eq.${lowerEmail},grihastha_counselor_email.eq.${lowerEmail}`;

    if (counselorName) {
      // Escape single quotes for .or() filter if necessary, but ilike is safer
      // Using .eq for name since it's from the verified counselors table
      orFilter += `,brahmachari_counselor.eq."${counselorName}",grihastha_counselor.eq."${counselorName}"`;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(orFilter);

    if (error) {
      console.error('Error fetching users by counselor email/name:', error);
      throw new Error('Failed to fetch users by counselor email');
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      // Build hierarchy from separate columns (preferred) or JSONB (fallback)
      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        hierarchy: hierarchy,
        // Map camp completion fields
        campDys: user.camp_dys,
        campSankalpa: user.camp_sankalpa,
        campSphurti: user.camp_sphurti,
        campUtkarsh: user.camp_utkarsh,
        campSrcgdWorkshop: user.camp_srcgd_workshop,
        campNishtha: user.camp_nishtha || user.camp_nistha,
        campFtec: user.camp_ftec,
        campAshraya: user.camp_ashraya || user.camp_ashray,
        campMtec: user.camp_mtec,
        campSharanagati: user.camp_sharanagati,
        campIdc: user.camp_idc,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by counselor email:', error);
    throw error;
  }
};

export interface CounselorData {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  city?: string;
  ashram?: string;
  role?: string;
  is_verified?: boolean;
  temple_id?: string;
  user_id?: string;
  current_temple?: string;
  parent_temple?: string;
}

// Get all verified counselors from Supabase
export const getCounselorsFromSupabase = async (): Promise<CounselorData[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .eq('is_verified', true)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error getting counselors from Supabase:', error);
    throw new Error(error.message || 'Failed to get counselors');
  }
};

// Get counselors by location (City/State proxy)
export const getCounselorsByLocationFromSupabase = async (
  city?: string
): Promise<CounselorData[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    let query = supabase
      .from('counselors')
      .select('id, name, city, ashram, role')
      .eq('is_verified', true);

    if (city) {
      query = query.eq('city', city);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error getting counselors by location from Supabase:', error);
    throw new Error(error.message || 'Failed to get counselors by location');
  }
};

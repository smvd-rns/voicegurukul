import { supabase } from './config';
import { User, UserRole } from '@/types';
import { roleToNumber } from '@/lib/utils/roles';
import { transformUserProfile } from './user-transform';
import { enrichHierarchyData } from './hierarchy-helpers';

export const attachUserProfileDetails = async (users: any[]) => {
  if (!users || users.length === 0 || !supabase) return users;
  const userIds = Array.from(new Set(users.map((u: any) => u.id).filter(Boolean)));
  if (userIds.length === 0) return users;

  try {
    const { data: detailsData } = await supabase
      .from('user_profile_details')
      .select('*')
      .in('user_id', userIds);

    if (detailsData && detailsData.length > 0) {
      const detailsMap = new Map();
      detailsData.forEach((d: any) => detailsMap.set(d.user_id, d));
      users.forEach((u: any) => {
        const details = detailsMap.get(u.id);
        if (details) {
          u.user_profile_details = [details];
        }
      });
    }
  } catch (e) {
    console.error('Error attaching user profile details:', e);
  }
  return users;
};

export const getUsersByRole = async (role: UserRole) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const roleNumber = roleToNumber(role);
    const roleNumberArray = Array.isArray(roleNumber) ? roleNumber : [roleNumber];

    const { data, error } = await (supabase
      .from('users')
      .select('*') as any)
      .contains('role', roleNumberArray);

    if (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }

    if (data && data.length > 0) {
      await attachUserProfileDetails(data);
    }

    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
};

export const getUsersByHierarchy = async (hierarchy: any) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    let query = supabase.from('users').select('*');

    if (hierarchy.state) query = query.eq('state', hierarchy.state);
    if (hierarchy.city) query = query.eq('city', hierarchy.city);
    if (hierarchy.center) query = query.eq('center', hierarchy.center);
    if (hierarchy.counselor) query = query.eq('counselor', hierarchy.counselor);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users by hierarchy:', error);
      return [];
    }

    if (data && data.length > 0) {
      await attachUserProfileDetails(data);
    }

    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by hierarchy:', error);
    return [];
  }
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    let enrichedHierarchy = updates.hierarchy;
    if (enrichedHierarchy) {
      enrichedHierarchy = await enrichHierarchyData(enrichedHierarchy);
    }

    const dbUpdates: any = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    // Profile Details split logic - Flat Columns (Strictly to user_profile_details)
    const detailsUpdates: any = {
      user_id: userId,
      updated_at: new Date().toISOString()
    };
    let hasDetailsUpdates = false;

    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.name !== undefined) {
      dbUpdates.name = updates.name;
      detailsUpdates.user_name = updates.name;
      hasDetailsUpdates = true;
    }
    if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.profileImage !== undefined) dbUpdates.profile_image = updates.profileImage;
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
    if (updates.pushTokens !== undefined) dbUpdates.push_tokens = updates.pushTokens;

    // Map education array to flat columns
    if (updates.education !== undefined) {
      for (let i = 1; i <= 5; i++) {
        const edu = updates.education[i - 1];
        detailsUpdates[`edu_${i}_institution`] = edu?.institution || null;
        detailsUpdates[`edu_${i}_degree_branch`] = edu?.degreeBranch || null;
        detailsUpdates[`edu_${i}_start_year`] = edu?.startYear || null;
        detailsUpdates[`edu_${i}_end_year`] = edu?.endYear || null;
      }
      hasDetailsUpdates = true;
    }

    // Map work experience array to flat columns
    if (updates.workExperience !== undefined) {
      for (let i = 1; i <= 5; i++) {
        const work = updates.workExperience[i - 1];
        detailsUpdates[`work_${i}_company`] = work?.company || null;
        detailsUpdates[`work_${i}_position`] = work?.position || null;
        detailsUpdates[`work_${i}_location`] = work?.location || null;
        detailsUpdates[`work_${i}_start_date`] = work?.startDate || null;
        detailsUpdates[`work_${i}_end_date`] = work?.endDate || null;
        detailsUpdates[`work_${i}_current`] = work?.current || false;
      }
      hasDetailsUpdates = true;
    }

    // Map languages array to flat columns
    if (updates.languages !== undefined) {
      for (let i = 1; i <= 5; i++) {
        detailsUpdates[`language_${i}`] = updates.languages[i - 1]?.name || null;
      }
      hasDetailsUpdates = true;
    }

    // Map skills array to flat columns
    if (updates.skills !== undefined) {
      for (let i = 1; i <= 5; i++) {
        detailsUpdates[`skill_${i}`] = updates.skills[i - 1]?.name || null;
      }
      hasDetailsUpdates = true;
    }

    // Map services array to flat columns
    if (updates.services !== undefined) {
      for (let i = 1; i <= 5; i++) {
        detailsUpdates[`service_${i}`] = updates.services[i - 1]?.name || null;
      }
      hasDetailsUpdates = true;
    }

    // Map camps and spbooks direct fields
    Object.keys(updates).forEach(key => {
      if (key.startsWith('camp') || key.startsWith('spbook')) {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        detailsUpdates[dbKey] = (updates as any)[key];
        hasDetailsUpdates = true;
      }
    });

    if (updates.otherCounselor !== undefined) dbUpdates.other_counselor = updates.otherCounselor;
    if (updates.otherTemple !== undefined) dbUpdates.other_temple = updates.otherTemple;
    if (updates.otherCenter !== undefined) dbUpdates.other_center = updates.otherCenter;

    if (enrichedHierarchy) {
      dbUpdates.current_temple = enrichedHierarchy.currentTemple || null;
      dbUpdates.state = enrichedHierarchy.state || null;
      dbUpdates.city = enrichedHierarchy.city || null;
      dbUpdates.center = enrichedHierarchy.center || null;
      dbUpdates.current_center = enrichedHierarchy.currentCenter || enrichedHierarchy.center || null;
      dbUpdates.center_id = enrichedHierarchy.centerId || null;
      dbUpdates.initiation_status = enrichedHierarchy.initiationStatus || null;
      dbUpdates.initiated_name = enrichedHierarchy.initiatedName || null;
      dbUpdates.spiritual_master_name = enrichedHierarchy.spiritualMasterName || null;
      dbUpdates.aspiring_spiritual_master_name = enrichedHierarchy.aspiringSpiritualMasterName || null;
      dbUpdates.chanting_since = enrichedHierarchy.chantingSince || null;
      dbUpdates.rounds = enrichedHierarchy.rounds ? parseInt(enrichedHierarchy.rounds.toString()) || null : null;
      dbUpdates.ashram = enrichedHierarchy.ashram || null;
      dbUpdates.royal_member = enrichedHierarchy.royalMember || null;
      dbUpdates.introduced_to_kc_in = enrichedHierarchy.introducedToKcIn || null;
      dbUpdates.parent_temple = enrichedHierarchy.parentTemple || null;
      dbUpdates.other_parent_temple = enrichedHierarchy.otherParentTemple || null;
      dbUpdates.parent_center = enrichedHierarchy.parentCenter || null;
      dbUpdates.other_parent_center = enrichedHierarchy.otherParentCenter || null;
      
      if (enrichedHierarchy.counselor) {
        dbUpdates.counselor = enrichedHierarchy.counselor;
        dbUpdates.counselor_id = enrichedHierarchy.counselorId || null;
      }
    }

    if (updates.role !== undefined) {
      const rolesArray = Array.isArray(updates.role) ? updates.role : [updates.role];
      dbUpdates.role = roleToNumber(rolesArray);
    }

    if (enrichedHierarchy !== undefined) {
      dbUpdates.hierarchy = enrichedHierarchy;
    }

    // OAuth and some edge cases create auth.users without a public.users row.
    // UPDATE with no matching row succeeds with 0 rows affected, so we must insert when missing.
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingUser) {
      if (!dbUpdates.email || !dbUpdates.name) {
        throw new Error('Cannot create profile: email and name are required for new accounts.');
      }
      const insertRow = {
        ...dbUpdates,
        hierarchy: enrichedHierarchy ?? {},
        created_at: new Date().toISOString(),
      };
      const { error: insertError } = await supabase.from('users').insert(insertRow);
      if (insertError) throw insertError;
    } else {
      const { error: userError } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId);

      if (userError) throw userError;
    }

    if (hasDetailsUpdates) {
      const { error: detailsError } = await supabase
        .from('user_profile_details')
        .upsert(detailsUpdates);

      if (detailsError) console.error('Error updating details:', detailsError);
    }

    } catch (error: any) {
    console.error('Error updating user:', error);
    const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    throw new Error(errMsg || 'Failed to update user');
  }
};

export const getUsersByCenterNames = async (centerNames: string[]) => {
  if (!supabase || !centerNames.length) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').in('center', centerNames);
    if (error) throw error;
    if (data && data.length > 0) await attachUserProfileDetails(data);
    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by center names:', error);
    return [];
  }
};

export const getUsersByCenterIds = async (centerIds: string[]) => {
  if (!supabase || !centerIds.length) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').in('center_id', centerIds);
    if (error) throw error;
    if (data && data.length > 0) await attachUserProfileDetails(data);
    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by center IDs:', error);
    return [];
  }
};

export const getUsersByZone = async (zone: string) => {
  if (!supabase || !zone) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').eq('assigned_zone', zone);
    if (error) throw error;
    if (data && data.length > 0) await attachUserProfileDetails(data);
    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by zone:', error);
    return [];
  }
};

export const getUsersByState = async (state: string) => {
  if (!supabase || !state) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').eq('state', state);
    if (error) throw error;
    if (data && data.length > 0) await attachUserProfileDetails(data);
    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by state:', error);
    return [];
  }
};

export const getUsersByCity = async (city: string) => {
  if (!supabase || !city) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').eq('city', city);
    if (error) throw error;
    if (data && data.length > 0) await attachUserProfileDetails(data);
    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching users by city:', error);
    return [];
  }
};

export const getPendingUsers = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').eq('verification_status', 'pending');
    if (error) throw error;
    if (data && data.length > 0) await attachUserProfileDetails(data);
    return (data || []).map((user: any) => transformUserProfile(user));
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return [];
  }
};

export const getUsersForDropdown = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users for dropdown:', error);
    return [];
  }
};

import { supabase } from './config';
import { User, UserRole } from '@/types';
import { roleToNumber } from '@/lib/utils/roles';
import { transformUserProfile } from './user-transform';
import { enrichHierarchyData } from './hierarchy-helpers';

export const signUp = async (
  email: string,
  password: string,
  name: string,
  role: UserRole | UserRole[],
  hierarchy: any,
  profileImage?: string
) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password length (Supabase requires at least 6 characters)
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists in DB BEFORE attempting signup (since registration API inserts on success)
    const { data: dbUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (dbUser) {
      throw new Error('This email is already registered. Please sign in instead.');
    }

    // Sign up with Supabase Auth (simulated API)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
        },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    if (authError) {
      console.error('Supabase signup error:', authError);
      // Provide more user-friendly error messages
      if (authError.message.includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      } else if (authError.message.includes('password')) {
        throw new Error('Password does not meet requirements. Please use a stronger password.');
      } else if (authError.message.includes('email')) {
        throw new Error('Invalid email address. Please check and try again.');
      }
      throw new Error(authError.message || 'Failed to create account');
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    // Ensure role is always an array
    const rolesArray = Array.isArray(role) ? role : [role];

    // Convert roles to numbers for database storage
    const roleNumbers = roleToNumber(rolesArray);

    // Ensure hierarchy is a proper object (not null/undefined)
    let hierarchyData = hierarchy && typeof hierarchy === 'object' ? hierarchy : {};

    console.log('Original hierarchy data before enrichment:', JSON.stringify(hierarchyData, null, 2));

    // Enrich hierarchy data with missing counselor emails and center_id from database
    hierarchyData = await enrichHierarchyData(hierarchyData);

    console.log('Enriched hierarchy data after enrichment:', JSON.stringify(hierarchyData, null, 2));
    console.log('User ID:', authData.user.id);

    // Extract hierarchy fields for separate columns
    const state = hierarchyData?.state || null;
    const city = hierarchyData?.city || null;
    const center = hierarchyData?.center || null;
    const centerId = hierarchyData?.centerId || null; // Center ID for accurate matching
    const phone = hierarchyData?.phone || hierarchyData?.mobile || null;
    const currentTemple = hierarchyData?.current_temple || hierarchyData?.temple || null;

    // Extract spiritual fields for separate columns
    const initiationStatus = hierarchyData?.initiationStatus || null;
    const initiatedName = hierarchyData?.initiatedName || null;
    const spiritualMasterName = hierarchyData?.spiritualMasterName || null;
    const aspiringSpiritualMasterName = hierarchyData?.aspiringSpiritualMasterName || null;
    const chantingSince = hierarchyData?.chantingSince || null;
    const rounds = hierarchyData?.rounds ? parseInt(hierarchyData.rounds) || null : null;
    const ashram = hierarchyData?.ashram || null;
    const royalMember = hierarchyData?.royalMember || null;
    const brahmachariCounselor = hierarchyData?.brahmachariCounselor || null;
    const brahmachariCounselorEmail = hierarchyData?.brahmachariCounselorEmail || null;
    const grihasthaCounselor = hierarchyData?.grihasthaCounselor || null;
    const grihasthaCounselorEmail = hierarchyData?.grihasthaCounselorEmail || null;

    // Update user record in users table (since registration API has already inserted basic row)
    const { data: updatedData, error: dbError } = await supabase
      .from('users')
      .update({
        role: roleNumbers, // Save as array of numbers
        verification_status: 'unverified', // Default to unverified, allows access to complete-profile
        profile_image: profileImage || null, // Google Drive photo link
        state: state,
        city: city,
        center: center,
        center_id: centerId, // Store center ID for accurate matching
        phone: phone,
        current_temple: currentTemple,
        // Spiritual information columns
        initiation_status: initiationStatus,
        initiated_name: initiatedName,
        spiritual_master_name: spiritualMasterName,
        aspiring_spiritual_master_name: aspiringSpiritualMasterName,
        chanting_since: chantingSince || null,
        rounds: rounds,
        ashram: ashram,
        royal_member: royalMember,
        brahmachari_counselor: brahmachariCounselor,
        brahmachari_counselor_email: brahmachariCounselorEmail,
        grihastha_counselor: grihasthaCounselor,
        grihastha_counselor_email: grihasthaCounselorEmail,
        hierarchy: hierarchyData, // Keep for backward compatibility
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id)
      .select('id, profile_image, state, city, center, initiation_status, ashram, brahmachari_counselor, grihastha_counselor');

    console.log('User update result:', { updatedData, dbError });

    if (dbError) {
      console.error('Database update error:', dbError);
      throw new Error(dbError.message || 'Failed to update user profile');
    }

    // Automatically sync counselor record if user is counselor (2) or care_giver (20)
    const roleNumbersArray = Array.isArray(roleNumbers) ? roleNumbers : [roleNumbers];
    const isCounselor = roleNumbersArray.includes(2);
    const isCareGiver = roleNumbersArray.includes(20);

    if (isCounselor || isCareGiver) {
      // NOTE: We do not include the non-existent 'role' column in counselors table
      const counselorData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: phone || '',
        city: city || 'Unknown',
        ashram: ashram || 'Brahmachari', // default/fallback to satisfy constraint
        is_verified: true,
        user_id: authData.user.id,
        current_temple: currentTemple || '',
      };

      const { data: existingCounselor } = await supabase
        .from('counselors')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existingCounselor) {
        const { error: counselorUpdateError } = await supabase
          .from('counselors')
          .update(counselorData)
          .eq('id', existingCounselor.id);
        if (counselorUpdateError) {
          console.warn('Could not update counselor record during signup:', counselorUpdateError);
        }
      } else {
        const { error: counselorInsertError } = await supabase
          .from('counselors')
          .insert(counselorData);
        if (counselorInsertError) {
          console.warn('Could not create counselor record during signup:', counselorInsertError);
        }
      }
    }

    // Create empty user_profile_details record with user_name
    const { error: detailsError } = await supabase
      .from('user_profile_details')
      .insert({ 
        user_id: authData.user.id,
        user_name: name.trim()
      });
    
    if (detailsError) {
        console.warn('Could not create profile details record:', detailsError);
        // We don't throw here as the main user record is created
    }

    return authData.user;
  } catch (error: any) {
    console.error('Signup error:', error);
    throw new Error(error.message || 'Failed to sign up. Please try again.');
  }
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
};

export const logout = async () => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to logout');
  }
};

export const getCurrentUser = async () => {
  if (!supabase) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// transformUserProfile is now imported from user-transform.ts and re-exported here if needed
export { transformUserProfile };

export const getUserData = async (userId: string): Promise<User | null> => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result

    if (error || !data) {
      if (error) console.error('Error fetching user data:', error);
      return null;
    }

    const { data: detailsData } = await supabase
      .from('user_profile_details')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (detailsData) {
      data.user_profile_details = [detailsData];
    }

    if (!data) {
      return null; // User not found
    }

    return transformUserProfile(data);

  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

// Reset password (forgot password)
export const resetPassword = async (email: string) => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send password reset email');
    }

    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

// Sign in with Google OAuth (Native custom OAuth on Droplet)
export const signInWithGoogle = async (nextPath?: string) => {
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '280450471879-qck9d7rl11gi8f4g3i6fptsqejhd137i.apps.googleusercontent.com';
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '');
    const redirectUri = `${siteUrl}/api/auth/google`;

    const state = nextPath ? encodeURIComponent(nextPath) : '/';

    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `state=${state}&` +
      `prompt=select_account`;

    return { data: { url: googleOAuthUrl }, error: null };
  } catch (error: any) {
    console.error('Sign in with Google error:', error);
    throw error;
  }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) {
    return {
      data: {
        subscription: {
          unsubscribe: () => { },
        },
      },
    };
  }

  // Supabase's onAuthStateChange returns { data: { subscription: ... } }
  const result = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  // Return the result directly (it already has the correct structure)
  return result;
};

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

    // Sign up with Supabase Auth
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

    // Create user record in users table
    const { data: insertedData, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: roleNumbers, // Save as array of numbers
        verification_status: 'unverified', // Default to unverified, allows access to complete-profile
        profile_image: profileImage || null, // Google Drive photo link
        state: state,
        city: city,
        center: center,
        center_id: centerId, // Store center ID for accurate matching
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, profile_image, state, city, center, initiation_status, ashram, brahmachari_counselor, grihastha_counselor');

    console.log('User creation result:', { insertedData, dbError });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // If user creation fails, the auth user will remain but without a profile
      // You may want to clean this up manually or via a server-side function
      if (dbError.code === '23505') {
        throw new Error('User already exists. Please sign in instead.');
      }
      throw new Error(dbError.message || 'Failed to create user profile');
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
      .select('*, user_profile_details(*)')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result

    if (error) {
      console.error('Error fetching user data:', error);
      return null;
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
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    // Check if user exists in the users table first
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // Database error, but continue anyway
        console.warn('Error checking user existence:', checkError);
      } else if (!existingUser) {
        // User doesn't exist in our database
        throw new Error('No account found with this email address. Please check your email or register for a new account.');
      }
    } catch (checkError: any) {
      // If it's our custom error about user not found, throw it
      if (checkError.message?.includes('No account found')) {
        throw checkError;
      }
      // Otherwise, re-throw the error
      throw checkError;
    }

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : undefined;

    const { error } = await (supabase.auth as any).resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      // Provide user-friendly error messages
      if (error.message?.toLowerCase().includes('user not found') ||
        error.message?.toLowerCase().includes('no user found')) {
        throw new Error('No account found with this email address. Please check your email or register for a new account.');
      }
      throw new Error(error.message || 'Failed to send password reset email');
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

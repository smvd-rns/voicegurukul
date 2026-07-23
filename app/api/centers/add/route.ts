import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { validateCenterInput, sanitizeInput } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let {
      name, state, city, address, contact, temple_id, temple_name,
      project_manager_id, project_manager_name,
      project_advisor_id, project_advisor_name,
      acting_manager_id, acting_manager_name,
      internal_manager_id, internal_manager_name,
      preaching_coordinator_id, preaching_coordinator_name,
      morning_program_in_charge_id, morning_program_in_charge_name,
      mentor_id, mentor_name,
      mentor_ids, mentor_names,
      frontliner_id, frontliner_name,
      frontliner_ids, frontliner_names,
      accountant_id, accountant_name,
      kitchen_head_id, kitchen_head_name,
      study_in_charge_id, study_in_charge_name,
      preaching_coordinator_ids, preaching_coordinator_names,
      grihstha_counselor_ids, grihstha_counselor_names,
      easy_incharge_ids, easy_incharge_names,
      prerna_incharge_ids, prerna_incharge_names
    } = body;

    const validation = validateCenterInput(name, state, city, address, contact);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Rate Limiting
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const user = await getAuthUserFromRequest(request);
    const userId = user?.id || null;
    let isVerified = false;

    if (userId) {
        const cleanClient = createClient(supabaseUrl, supabaseAnonKey);
        // Fetch user role to determine verification status and temple scoping for MD
        const { data: profile } = await cleanClient
          .from('users')
          .select('role, hierarchy')
          .eq('id', userId)
          .single();

        const roles = profile?.role;
        const hierarchy = profile?.hierarchy;

        // User logic: if role is anything other than 1 or 'student', auto-verify
        const hasPrivilegedRole = Array.isArray(roles)
          ? roles.some(r => r !== 1 && r !== 'student')
          : (roles !== 1 && roles !== 'student');

        if (hasPrivilegedRole) {
          isVerified = true;
        }

        // MD Logic (Role 11): Enforce Temple ID
        const isManagingDirector = Array.isArray(roles)
          ? roles.some(r => [11, 12, 13].includes(Number(r))) || roles.includes('managing_director') || roles.includes('director') || roles.includes('central_voice_manager')
          : [11, 12, 13].includes(Number(roles)) || roles === 'managing_director' || roles === 'director' || roles === 'central_voice_manager';

        // Block Roles 14-17 from adding centers
        const restrictedRoles = [14, 15, 16, 17, 'project_advisor', 'project_manager', 'acting_manager', 'oc'];
        const isRestricted = Array.isArray(roles)
          ? roles.some(r => restrictedRoles.includes(r))
          : restrictedRoles.includes(roles);

        // Allowed roles that override restriction (in case of multiple roles)
        const allowedRoles = [8, 11, 12, 13, 'super_admin', 'managing_director', 'director', 'central_voice_manager'];
        const hasAllowedRole = Array.isArray(roles)
          ? roles.some(r => allowedRoles.includes(r))
          : allowedRoles.includes(roles);

        if (isRestricted && !hasAllowedRole) {
          return NextResponse.json({ error: 'You do not have permission to add new centers.' }, { status: 403 });
        }

        if (isManagingDirector) {
          // Check current temple from hierarchy
          // Assuming hierarchy.currentTemple.id or hierarchy.currentTemple (if string)
          // Adjust based on your actual data structure. If it's stored as name, fetch ID or use name.
          // Based on previous files, hierarchy seems to store names primarily, but centers table needs ID?
          // Let's rely on what was sent if it matches the name, or if we can derive it.
          // Actually, safe bet: If MD, ensure the requested temple_id matches their assigned temple.

          // For now, let's assume hierarchy has `currentTempleId` or we lookup by `currentTemple` name if needed.
          // If the user input `temple_id` is provided, we should verify it belongs to them.
          // IF hierarchy only has names, we might have to relax strict ID check or lookup.
          // Let's try to constrain by name if ID isn't available in profile.

          const mdTempleName = hierarchy?.currentTemple?.name || hierarchy?.currentTemple; // Handle object or string
          if (mdTempleName && temple_name && mdTempleName !== temple_name) {
            return NextResponse.json({ error: 'You can only add centers to your assigned temple.' }, { status: 403 });
          }
        }
      }

    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = await checkRateLimit(request, userId, {
      action: 'add_center',
      limit: 20, // Max 20 centers
      windowMs: 60 * 60 * 1000, // 1 hour window
      blockDurationMs: 6 * 60 * 60 * 1000 // 6 hours block
    });

    if (rateLimit.blocked) {
      return NextResponse.json({
        error: rateLimit.message,
        retryAfter: rateLimit.retryAfter
      }, { status: 429 });
    }

    // Sanitize inputs
    name = sanitizeInput(name);
    state = sanitizeInput(state);
    city = sanitizeInput(city);
    if (address) address = sanitizeInput(address);
    if (contact) contact = sanitizeInput(contact);



    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use Service Role Key if available (Restricted RLS), otherwise fallback to Anon Key (Public RLS)
    const keyToUse = serviceRoleKey || supabaseAnonKey;

    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const fetchHeaders = new Headers(init?.headers);

      if (serviceRoleKey) {
        fetchHeaders.set('apikey', serviceRoleKey);
        fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
      } else {
        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');
        if (accessToken) {
          fetchHeaders.set('Authorization', `Bearer ${accessToken}`);
        }
        fetchHeaders.set('apikey', supabaseAnonKey);
      }

      fetchHeaders.set('Content-Type', 'application/json');

      return fetch(input, {
        ...init,
        headers: fetchHeaders,
      });
    };

    const authenticatedClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    const trimmedName = name.trim();
    const trimmedState = state.trim();
    const trimmedCity = city.trim();

    // Check if center already exists
    const { data: existing, error: checkError } = await authenticatedClient
      .from('centers')
      .select('id')
      .eq('state', trimmedState)
      .eq('city', trimmedCity)
      .eq('name', trimmedName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code !== '42501' && !checkError.message?.includes('permission denied')) {
        console.warn('Error checking if center exists:', checkError);
      }
    }

    if (existing) {
      // Center already exists, return success
      return NextResponse.json({ success: true, id: existing.id });
    }

    // Insert new center
    const { data: insertedData, error } = await authenticatedClient
      .from('centers')
      .insert({
        name: trimmedName,
        state: trimmedState,
        city: trimmedCity,
        address: address?.trim() || null,
        contact: contact?.trim() || null,
        is_verified: isVerified,
        temple_id: temple_id || null,
        temple_name: temple_name || null,
        project_manager_id: project_manager_id || null,
        project_manager_name: project_manager_name || null,
        project_advisor_id: project_advisor_id || null,
        project_advisor_name: project_advisor_name || null,
        acting_manager_id: acting_manager_id || null,
        acting_manager_name: acting_manager_name || null,
        internal_manager_id: internal_manager_id || null,
        internal_manager_name: internal_manager_name || null,
        preaching_coordinator_id: preaching_coordinator_id || null,
        preaching_coordinator_name: preaching_coordinator_name || null,
        morning_program_in_charge_id: morning_program_in_charge_id || null,
        morning_program_in_charge_name: morning_program_in_charge_name || null,
        mentor_id: mentor_id || null,
        mentor_name: mentor_name || null,
        mentor_ids: Array.isArray(mentor_ids) ? mentor_ids : (mentor_id ? [mentor_id] : []),
        mentor_names: Array.isArray(mentor_names) ? mentor_names : (mentor_name ? [mentor_name] : []),
        frontliner_id: frontliner_id || null,
        frontliner_name: frontliner_name || null,
        frontliner_ids: Array.isArray(frontliner_ids) ? frontliner_ids : (frontliner_id ? [frontliner_id] : []),
        frontliner_names: Array.isArray(frontliner_names) ? frontliner_names : (frontliner_name ? [frontliner_name] : []),
        accountant_id: accountant_id || null,
        accountant_name: accountant_name || null,
        kitchen_head_id: kitchen_head_id || null,
        kitchen_head_name: kitchen_head_name || null,
        study_in_charge_id: study_in_charge_id || null,
        study_in_charge_name: study_in_charge_name || null,
        preaching_coordinator_ids: Array.isArray(preaching_coordinator_ids) ? preaching_coordinator_ids : (preaching_coordinator_id ? [preaching_coordinator_id] : []),
        preaching_coordinator_names: Array.isArray(preaching_coordinator_names) ? preaching_coordinator_names : (preaching_coordinator_name ? [preaching_coordinator_name] : []),
        grihstha_counselor_ids: Array.isArray(grihstha_counselor_ids) ? grihstha_counselor_ids : (body.grihstha_counselor_id ? [body.grihstha_counselor_id] : []),
        grihstha_counselor_names: Array.isArray(grihstha_counselor_names) ? grihstha_counselor_names : (body.grihstha_counselor_name ? [body.grihstha_counselor_name] : []),
        easy_incharge_ids: Array.isArray(easy_incharge_ids) ? easy_incharge_ids : (body.easy_incharge_id ? [body.easy_incharge_id] : []),
        easy_incharge_names: Array.isArray(easy_incharge_names) ? easy_incharge_names : (body.easy_incharge_name ? [body.easy_incharge_name] : []),
        prerna_incharge_ids: Array.isArray(prerna_incharge_ids) ? prerna_incharge_ids : (body.prerna_incharge_id ? [body.prerna_incharge_id] : []),
        prerna_incharge_names: Array.isArray(prerna_incharge_names) ? prerna_incharge_names : (body.prerna_incharge_name ? [body.prerna_incharge_name] : []),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existingCenter } = await authenticatedClient
          .from('centers')
          .select('id')
          .eq('state', trimmedState)
          .eq('city', trimmedCity)
          .eq('name', trimmedName)
          .single();
        // Revalidate the centers cache
        const { revalidateTag } = await import('next/cache');
        revalidateTag('centers');

        return NextResponse.json({ success: true, id: existingCenter?.id });
      }

      console.error('Supabase insert error:', error);

      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new Error('Centers table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY.');
      }

      throw new Error(error.message || `Failed to insert center: ${error.code || 'Unknown error'}`);
    }

    const newCenterId = insertedData?.id;

    // 2. Sync Roles & Hierarchy for new assignees
    if (newCenterId && serviceRoleKey) {
      // We use a separate admin client to ensure we can update other users' profiles
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const updateUserRoleAndHierarchy = async (targetUserId: string, roleId: number, roleName: string) => {
        if (!targetUserId) return;

        try {
          const { data: user, error: fetchError } = await adminClient
            .from('users')
            .select('role, hierarchy')
            .eq('id', targetUserId)
            .single();

          if (fetchError || !user) {
            console.error(`Failed to fetch user ${targetUserId} for role update`, fetchError);
            return;
          }

          let currentRoles = user.role;
          if (!Array.isArray(currentRoles)) {
            currentRoles = currentRoles ? [currentRoles] : [];
          }

          // Append role if not exists
          const hasRole = currentRoles.some((r: any) => Number(r) === roleId || r === roleName);
          let updatedRoles = currentRoles;

          if (!hasRole) {
            // Remove 'student' (1) if it exists when assigning a higher role
            updatedRoles = currentRoles.filter((r: any) => Number(r) !== 1 && r !== 'student');
            updatedRoles.push(roleId);
          }

          // Update Hierarchy
          const currentHierarchy = user.hierarchy || {};
          const updatedHierarchy = {
            ...currentHierarchy,
            currentCenter: trimmedName,
            currentCenterId: newCenterId,
            currentTemple: temple_name || currentHierarchy.currentTemple, // Keep existing if not provided
            currentTempleId: temple_id || currentHierarchy.currentTempleId,
            updatedAt: new Date().toISOString()
          };

          const { error: updateError } = await adminClient
            .from('users')
            .update({
              role: updatedRoles,
              hierarchy: updatedHierarchy
            })
            .eq('id', targetUserId);

          if (updateError) {
            console.error(`Failed to update user ${targetUserId}`, updateError);
          } else {
            console.log(`Updated user ${targetUserId}: Role ${roleId}, Center ${trimmedName}`);
          }
        } catch (err) {
          console.error(`Error updating user ${targetUserId}:`, err);
        }
      };

      // Execute updates in parallel
      await Promise.all([
        updateUserRoleAndHierarchy(project_manager_id, 15, 'project_manager'),
        updateUserRoleAndHierarchy(project_advisor_id, 14, 'project_advisor'),
        updateUserRoleAndHierarchy(acting_manager_id, 16, 'acting_manager'),
        updateUserRoleAndHierarchy(internal_manager_id, 22, 'internal_manager'),
        // Preaching Coordinator (23) sync
        ...(Array.isArray(preaching_coordinator_ids) ? preaching_coordinator_ids : (preaching_coordinator_id ? [preaching_coordinator_id] : [])).map((uid: string) => updateUserRoleAndHierarchy(uid, 23, 'preaching_coordinator')),
        updateUserRoleAndHierarchy(morning_program_in_charge_id, 24, 'morning_program_in_charge'),
        // Multi-user role sync for Mentor (25)
        ...(Array.isArray(mentor_ids) ? mentor_ids : (mentor_id ? [mentor_id] : [])).map((uid: string) => updateUserRoleAndHierarchy(uid, 25, 'mentor')),
        // Multi-user role sync for Frontliner (26)
        ...(Array.isArray(frontliner_ids) ? frontliner_ids : (frontliner_id ? [frontliner_id] : [])).map((uid: string) => updateUserRoleAndHierarchy(uid, 26, 'frontliner')),
        updateUserRoleAndHierarchy(accountant_id, 27, 'accountant'),
        updateUserRoleAndHierarchy(kitchen_head_id, 28, 'kitchen_head'),
        updateUserRoleAndHierarchy(study_in_charge_id, 29, 'study_in_charge'),
        // Multi-user role sync for new roles
        ...(Array.isArray(grihstha_counselor_ids) ? grihstha_counselor_ids : []).map((uid: string) => updateUserRoleAndHierarchy(uid, 31, 'grihstha_counselor')),
        ...(Array.isArray(easy_incharge_ids) ? easy_incharge_ids : []).map((uid: string) => updateUserRoleAndHierarchy(uid, 32, 'easy_incharge')),
        ...(Array.isArray(prerna_incharge_ids) ? prerna_incharge_ids : []).map((uid: string) => updateUserRoleAndHierarchy(uid, 33, 'prerna_incharge'))
      ]);
    }

    // Revalidate the centers cache
    revalidateTag('centers');

    return NextResponse.json({ success: true, id: newCenterId });

  } catch (error: any) {
    console.error('Error adding center to Supabase:', error);

    let errorMessage = error.message || 'Failed to add center';
    let status = 500;
    const errorString = error.message?.toLowerCase() || '';

    if (errorString.includes('permission denied') || errorString.includes('row-level security')) {
      status = 403;
      errorMessage = 'Permission denied. Unable to add center.';
    } else if (errorString.includes('not initialized')) {
      status = 500;
    } else if (errorString.includes('relation') && errorString.includes('does not exist')) {
      errorMessage = 'Centers table does not exist. Please run the Supabase schema SQL file.';
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status });
  }
}

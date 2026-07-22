'use server';

import { getActiveSadhanaSupabase, getAdminSadhanaSupabase } from '@/lib/supabase/sadhana';
import { ManagedEvent, ManagedEventResponse, ManagedEventAttachment } from '@/types';
import { sendPushNotification } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Create a new event in the second Supabase
 */
export async function createEvent(eventData: Omit<ManagedEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    // 1. Insert the main event
    const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
            type: eventData.type || 'event',
            created_by: eventData.createdBy,
            title: eventData.title,
            event_date: eventData.type === 'event' ? eventData.eventDate : null,
            message: eventData.message,
            attachments: JSON.stringify(eventData.attachments || []),
            target_ashrams: eventData.targetAshrams,
            target_roles: eventData.targetRoles,
            target_temples: eventData.targetTemples,
            target_centers: eventData.targetCenters,
            target_camps: eventData.targetCamps,
            target_voice_groups: eventData.targetVoiceGroups,
            target_user_ids: eventData.targetUserIds,
            excluded_user_ids: eventData.excludedUserIds,
            reached_count: eventData.reachedCount || 0,
            is_important: eventData.isImportant || false,
            is_pinned: eventData.isPinned || false,
            rsvp_deadline: eventData.rsvpDeadline,
            auto_reminder_enabled: eventData.autoReminderEnabled || false,
            reminder_date_time: eventData.reminderDateTime,
            reminder_target: eventData.reminderTarget || [],
            reminder_sent_at: null
        })
        .select()
        .single();

    if (eventError) {
        console.error('Error creating event:', eventError);
        throw eventError;
    }

    // 2. Track materials in event_materials table
    const materialsToTrack = (eventData.attachments || [])
        .filter(att => !!att.fileId)
        .map(att => ({
            event_id: event.id,
            file_id: att.fileId,
            file_name: att.name,
            file_url: att.url,
            mime_type: att.mimeType || null
        }));

    if (materialsToTrack.length > 0) {
        const { error: materialsError } = await supabase
            .from('event_materials')
            .insert(materialsToTrack);

        if (materialsError) {
            console.error('Error tracking materials:', materialsError);
            // We don't throw here to avoid failing the whole broadcast if just tracking fails
            // but in a production app you might want to consider the atomicity requirements.
        }
    }

    // Trigger push notifications in background so it does not block the Server Action response
    setTimeout(() => {
        triggerPushNotificationsForEvent(event.id, eventData).catch(err => {
            console.error('Push notification background error:', err);
        });
    }, 0);
 
    return event;
}

/**
 * Fetch all approved users with their profile details (including camp completion)
 * Uses admin client to bypass RLS — needed because the frontend client's RLS only allows
 * reading one's own user_profile_details row.
 */
export async function getAllApprovedUsersForMatching(scopeOrCondition?: string): Promise<any[]> {
    const { getAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = getAdminClient();
    if (!adminSupabase) return [];

    let allFetchedUsers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        let pageQuery = adminSupabase
            .from('users')
            .select('*, user_profile_details(*)')
            .eq('verification_status', 'approved')
            .range(from, from + pageSize - 1);

        if (scopeOrCondition) {
            pageQuery = pageQuery.or(scopeOrCondition);
        }

        const { data: batch, error: batchError } = await pageQuery;

        if (batchError) {
            console.error('[getAllApprovedUsersForMatching] Error:', batchError);
            break;
        }
        if (!batch || batch.length === 0) {
            hasMore = false;
        } else {
            allFetchedUsers = [...allFetchedUsers, ...batch];
            if (batch.length < pageSize) hasMore = false;
            else from += pageSize;
        }
    }

    return allFetchedUsers;
}

/**
 * Fetch all responses for a specific event
 */
export async function getEventResponses(eventId: string) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('event_responses')
        .select('*')
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching event responses:', error);
        return [];
    }

    return (data || []).map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id,
        status: r.status,
        reason: r.reason,
        guestCount: r.guest_count,
        isBulk: r.is_bulk,
        bulkAddedBy: r.bulk_added_by,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at)
    }));
}

/**
 * Identify targeted users and send push notifications
 */
async function triggerPushNotificationsForEvent(eventId: string, eventData: Omit<ManagedEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const { getAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) return;

        let allFetchedUsers: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: batch, error: batchError } = await supabaseAdmin
                .from('users')
                .select('*, user_profile_details(*)')
                .eq('verification_status', 'approved')
                .not('push_tokens', 'is', null)
                .neq('push_tokens', '{}')
                .range(from, from + pageSize - 1);

            if (batchError) throw batchError;
            if (!batch || batch.length === 0) {
                hasMore = false;
            } else {
                allFetchedUsers = [...allFetchedUsers, ...batch];
                if (batch.length < pageSize) hasMore = false;
                else from += pageSize;
            }
        }
        const users = allFetchedUsers;

        if (!users || users.length === 0) return;

        // Filter users in JS for more complex criteria
        const targetedUsers = users.filter((user: any) => {
            // 0. Ashram Check
            const userAshram = String(user.ashram || user.hierarchy?.ashram || '').trim().toLowerCase();
            const matchesAshram = !eventData.targetAshrams?.length || 
                eventData.targetAshrams.some((a: string) => String(a).trim().toLowerCase() === userAshram);
            if (!matchesAshram) return false;

            // 1. Check Roles
            let parsedRoles: any[] = [];
            try {
                if (typeof user.role === 'string' && user.role.startsWith('[')) {
                    parsedRoles = JSON.parse(user.role);
                } else if (Array.isArray(user.role)) {
                    parsedRoles = user.role;
                } else {
                    parsedRoles = [user.role];
                }
            } catch {
                parsedRoles = [user.role];
            }
            const uRoles = parsedRoles.map(String);
            const matchesRole = !eventData.targetRoles?.length ||
                eventData.targetRoles.some(r => uRoles.includes(String(r)));

            if (!matchesRole) return false;

            // 2. Check Temples
            const matchesTemple = !eventData.targetTemples?.length ||
                eventData.targetTemples.some(t =>
                    [user.current_temple, user.parent_temple, user.hierarchy?.temple, user.hierarchy?.currentTemple]
                        .some(loc => String(loc).trim().toLowerCase() === String(t).trim().toLowerCase())
                );

            if (!matchesTemple) return false;

            // 3. Check Centers
            const matchesCenter = !eventData.targetCenters?.length ||
                eventData.targetCenters.some(c =>
                    [user.center, user.current_center, user.parent_center, user.hierarchy?.center, user.hierarchy?.currentCenter]
                        .some(loc => String(loc).trim().toLowerCase() === String(c).trim().toLowerCase())
                );

            if (!matchesCenter) return false;

            // 3b. Camp checks
            const matchesCamps = !eventData.targetCamps?.length || eventData.targetCamps.some((c: string) => {
                // Map camelCase ID (e.g. 'campDys') to snake_case DB column (e.g. 'camp_dys')
                const snakeCaseField = c.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                const variations = [c, snakeCaseField];
                if (c === 'campNishtha') variations.push('camp_nistha', 'campNistha');
                if (c === 'campAshraya') variations.push('camp_ashray', 'campAshray');
                
                const profileData = (user as any).user_profile_details;
                const profile = Array.isArray(profileData) ? profileData[0] : profileData;
                const hierarchy = (user as any).hierarchy || {};
                
                return variations.some(v => 
                    (user as any)[v] === true || 
                    (profile && profile[v] === true) ||
                    hierarchy[v] === true ||
                    hierarchy[v] === 'true'
                );
            });

            if (!matchesCamps) return false;

            // 3c. Voice Group checks
            const userVoiceGroup = String(user.bv_group || '').trim().toLowerCase();
            const matchesVoiceGroup = !(eventData.targetVoiceGroups?.length ?? 0) ||
                eventData.targetVoiceGroups!.some((g: string) => String(g).trim().toLowerCase() === userVoiceGroup);

            if (!matchesVoiceGroup) return false;

            // 4. Check Targeted User IDs (Explicit whitelist)
            if ((eventData.targetUserIds?.length ?? 0) > 0) {
                if (!eventData.targetUserIds!.includes(user.id)) return false;
            }

            // 5. Check Excluded
            if (eventData.excludedUserIds?.includes(user.id)) return false;

            return true;
        });

        const allTokens = targetedUsers.flatMap((u: any) => u.push_tokens || []);
        if (allTokens.length === 0) return;

        // deduplicate tokens
        const uniqueTokens = [...new Set(allTokens)];

        await sendPushNotification(
            uniqueTokens,
            `New Announcement: ${eventData.title}`,
            eventData.message ? eventData.message.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'Open the app to see the details.',
            {
                url: `/dashboard/events`,
                eventId: eventId
            }
        );
    } catch (error) {
        console.error('Error triggering push notifications:', error);
    }
}

/**
 * Fetch events for a specific user based on targeting filters
 * Since user data is in the first Supabase, we pass the user's properties to filter here
 */
export async function getEventsForUser(userParams: {
    userId?: string;
    ashram?: string;
    role?: string;
    temple?: string;
    center?: string;
    completedCamps?: string[];
    isSuperAdmin?: boolean; // New parameter to bypass creator restriction
    allLocations?: string[]; // Multiple possible location tokens (Centers/Temples)
    isManagementView?: boolean; // Explicit flag for the History/Management tab
    voiceGroup?: string;
}) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    // 1. Fetch all events
    let query = supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

    // 1b. Isolation: If it's the "Management Hub" view,
    // we MUST restrict to events the current user created, unless they are a Super Admin.
    const isTargetingEmpty = !userParams.ashram && !userParams.role && !userParams.temple && !userParams.center && (!userParams.completedCamps || !userParams.completedCamps.length);
    const shouldIsolate = userParams.isManagementView === true || isTargetingEmpty;

    if (shouldIsolate && userParams.isSuperAdmin !== true && userParams.userId) {
        query = query.eq('created_by', userParams.userId);
    }

    const { data: eventsData, error: eventsError } = await query;

    if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
    }

    // 1c. Fetch creator names (for Management Hub / Admin view)
    let creatorNamesMap = new Map<string, string>();
    if (eventsData && eventsData.length > 0) {
        const creatorIds = Array.from(new Set(eventsData.map((e: any) => e.created_by)));
        try {
            const { getAdminClient } = await import('@/lib/supabase/admin');
            const supabaseAdmin = getAdminClient();
            if (supabaseAdmin) {
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('id, name')
                    .in('id', creatorIds);
                if (userData) {
                    userData.forEach((u: any) => creatorNamesMap.set(u.id, u.name));
                }
            }
        } catch (err) {
            console.error('Error fetching creator names:', err);
        }
    }

    // 2. Fetch user responses if userId is provided
    let responsesMap = new Map<string, any>();
    let comingCountsMap = new Map<string, number>();
    let guestCountsMap = new Map<string, number>();
    let seenCountsMap = new Map<string, number>();
    let understoodCountsMap = new Map<string, number>();

    if (userParams.userId) {
        const { data: respData } = await supabase
            .from('event_responses')
            .select('event_id, id, user_id, status, reason, is_bulk, bulk_added_by, created_at, updated_at, is_pinned, is_important_dismissed, guest_count')
            .eq('user_id', userParams.userId);

        if (respData) {
            respData.forEach((r: any) => responsesMap.set(r.event_id, {
                ...r,
                guestCount: r.guest_count
            }));
        }
    }

    // 2b. Admin Stats
    const shouldCalculateStats = userParams.isManagementView === true || isTargetingEmpty;
    if (shouldCalculateStats) {
        const { data: comingStats } = await supabase
            .from('event_responses')
            .select('event_id')
            .eq('status', 'coming');

        if (comingStats) {
            comingStats.forEach((r: any) => {
                comingCountsMap.set(r.event_id, (comingCountsMap.get(r.event_id) || 0) + 1);
            });
        }

        const { data: guestStats } = await supabase
            .from('event_responses')
            .select('event_id, guest_count')
            .gt('guest_count', 0);

        if (guestStats) {
            guestStats.forEach((r: any) => {
                guestCountsMap.set(r.event_id, (guestCountsMap.get(r.event_id) || 0) + Number(r.guest_count || 0));
            });
        }

        const { data: seenStats } = await supabase
            .from('event_responses')
            .select('event_id')
            .eq('status', 'seen');

        if (seenStats) {
            seenStats.forEach((r: any) => {
                seenCountsMap.set(r.event_id, (seenCountsMap.get(r.event_id) || 0) + 1);
            });
        }

        const { data: understoodStats } = await supabase
            .from('event_responses')
            .select('event_id')
            .eq('status', 'understood');

        if (understoodStats) {
            understoodStats.forEach((r: any) => {
                understoodCountsMap.set(r.event_id, (understoodCountsMap.get(r.event_id) || 0) + 1);
            });
        }
    }

    const filtered = (eventsData || []).filter((event: any) => {
        // If we are in Management View, we show what we fetched (already SQL isolated)
        if (userParams.isManagementView || isTargetingEmpty) return true;

        // Otherwise, filter for the regular User Inbox (Audience View)
        const userAshram = String(userParams.ashram || '').trim().toLowerCase();
        const matchesAshram = !event.target_ashrams?.length || 
            event.target_ashrams.some((a: string) => String(a).trim().toLowerCase() === userAshram);
        const matchesRole = !event.target_roles?.length || event.target_roles.includes(userParams.role);

        // Robust Location Checking (Temples)
        const userTemples = [userParams.temple, ...(userParams.allLocations || [])].filter(Boolean);
        const matchesTemple = !event.target_temples?.length ||
            event.target_temples.some((t: string) =>
                userTemples.some(ut => String(ut).trim().toLowerCase() === String(t).trim().toLowerCase())
            );

        // Robust Location Checking (Centers)
        const userCenters = [userParams.center, ...(userParams.allLocations || [])].filter(Boolean);
        const matchesCenter = !event.target_centers?.length ||
            event.target_centers.some((c: string) =>
                userCenters.some(uc => String(uc).trim().toLowerCase() === String(c).trim().toLowerCase())
            );

        const matchesCamps = !event.target_camps?.length ||
            event.target_camps.some((camp: string) => userParams.completedCamps?.includes(camp));

        const userVoiceGroup = String((userParams as any).voiceGroup || '').trim().toLowerCase();
        const matchesVoiceGroup = !event.target_voice_groups?.length ||
            event.target_voice_groups.some((g: string) => String(g).trim().toLowerCase() === userVoiceGroup);

        const isExplicitlyTargeted = !event.target_user_ids?.length || event.target_user_ids.includes(userParams.userId);
        const isExcluded = event.excluded_user_ids?.includes(userParams.userId);

        return matchesAshram && matchesRole && matchesTemple && matchesCenter && matchesCamps && matchesVoiceGroup && isExplicitlyTargeted && !isExcluded;
    });

    return filtered.map((event: any) => {
        const managed = mapDbEventToManagedEvent(event, creatorNamesMap.get(event.created_by));
        const userResp = responsesMap.get(event.id);

        if (userResp) {
            managed.userResponse = {
                id: userResp.id,
                eventId: userResp.event_id,
                userId: userResp.user_id,
                status: userResp.status,
                reason: userResp.reason,
                isBulk: userResp.is_bulk,
                bulkAddedBy: userResp.bulk_added_by,
                createdAt: new Date(userResp.created_at),
                updatedAt: new Date(userResp.updated_at)
            };
            // PERSONAL PIN OVERRIDE: If the user has a response, their pin status WINS
            managed.isPinned = userResp.is_pinned;
            managed.isImportantDismissed = userResp.is_important_dismissed || false;
            managed.userResponse.guestCount = userResp.guestCount || 0;
        } else {
            // Default to Global Admin Pin if no personal interaction yet
            managed.isPinned = event.is_pinned || false;
            managed.isImportantDismissed = false;
        }

        // Attach aggregate stats for admin
        if (shouldCalculateStats) {
            managed.comingCount = comingCountsMap.get(event.id) || 0;
            managed.guestCount = guestCountsMap.get(event.id) || 0;
            managed.totalGuestCount = (managed.comingCount || 0) + (managed.guestCount || 0);
            managed.seenCount = seenCountsMap.get(event.id) || 0;
            managed.understoodCount = understoodCountsMap.get(event.id) || 0;
        }
        return managed;
    });
}

/**
 * Submit or update an event response (attendance/seen)
 */
export async function submitEventResponse(response: {
    eventId: string;
    userId: string;
    status: 'coming' | 'not_coming' | 'seen' | 'understood';
    reason?: string;
    isBulk?: boolean;
    isPinned?: boolean;
    isImportantDismissed?: boolean;
    guestCount?: number;
}) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    if (response.status === 'coming' || response.status === 'not_coming') {
        const { data: eventData } = await supabase
            .from('events')
            .select('rsvp_deadline')
            .eq('id', response.eventId)
            .single();

        if (eventData?.rsvp_deadline) {
            const deadline = new Date(eventData.rsvp_deadline);
            if (new Date() > deadline) {
                throw new Error('Time to respond to this event is over.');
            }
        }
    }

    const { error } = await supabase
        .from('event_responses')
        .upsert({
            event_id: response.eventId,
            user_id: response.userId,
            status: response.status,
            reason: response.reason,
            is_bulk: response.isBulk || false,
            is_pinned: response.isPinned,
            is_important_dismissed: response.isImportantDismissed,
            guest_count: response.guestCount || 0,
            updated_at: new Date().toISOString()
        }, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error submitting response:', error);
        throw error;
    }
}

/**
 * Toggle personal pin for an event
 */
export async function toggleEventPin(eventId: string, userId: string, isPinned: boolean) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    const { error } = await supabase
        .from('event_responses')
        .upsert({
            event_id: eventId,
            user_id: userId,
            is_pinned: isPinned,
            status: 'seen' // Ensure there is a status if it's the first interaction
        }, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error toggling pin:', error);
        throw error;
    }
}

/**
 * Toggle personal importance dismissal for an event
 */
export async function toggleEventImportance(eventId: string, userId: string, dismissed: boolean) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    const { error } = await supabase
        .from('event_responses')
        .upsert({
            event_id: eventId,
            user_id: userId,
            is_important_dismissed: dismissed,
            status: 'seen' 
        }, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error toggling importance dismissal:', error);
        throw error;
    }
}


/**
 * Bulk submit responses (for Project Managers)
 */
export async function bulkSubmitResponses(eventId: string, userIds: string[], pmId: string, status: 'coming' | 'not_coming') {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    const responses = userIds.map(userId => ({
        event_id: eventId,
        user_id: userId,
        status: status,
        is_bulk: true,
        bulk_added_by: pmId,
        updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
        .from('event_responses')
        .upsert(responses, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error bulk submitting responses:', error);
        throw error;
    }
    return data;
}

/**
 * Fetch a single event by ID
 */
export async function getEventById(eventId: string) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return null;

    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (error || !event) {
        console.error('Error fetching event by ID:', error);
        return null;
    }

    return mapDbEventToManagedEvent(event);
}

/**
 * Get statistics for an event (reach, views, attendance)
 */
export async function getEventStats(eventId: string) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('event_responses')
        .select('status, user_id, guest_count')
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching event stats:', error);
        return null;
    }

    const stats = {
        totalSeen: data.filter((r: any) => r.status === 'seen').length,
        totalComing: data.filter((r: any) => r.status === 'coming').length,
        totalNotComing: data.filter((r: any) => r.status === 'not_coming').length,
        totalUnderstood: data.filter((r: any) => r.status === 'understood').length,
        totalGuests: data.reduce((sum: any, r: any) => sum + (r.guest_count || 0), 0),
        totalResponses: data.length
    };

    return stats;
}

/**
 * Get recent responses across all events (Global Log)
 */
export async function getRecentResponses(limit: number = 20, currentUserId?: string, isSuperAdmin?: boolean) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    let query = supabase
        .from('event_responses')
        .select(`
            *,
            events!inner (
                title,
                created_by
            )
        `)
        .order('updated_at', { ascending: false })
        .limit(limit);

    // If not a Super Admin, only show responses to events the current user created
    if (!isSuperAdmin && currentUserId) {
        query = query.eq('events.created_by', currentUserId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching global logs:', error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        eventTitle: r.events?.title || 'Unknown Event',
        userId: r.user_id,
        status: r.status,
        reason: r.reason,
        guestCount: r.guest_count,
        isBulk: r.is_bulk,
        bulkAddedBy: r.bulk_added_by,
        updatedAt: new Date(r.updated_at)
    }));
}

/**
 * Fetch targeted users for a specific event with optional center/temple filtering
 * Optimized to only fetch relevant users
 */
export async function getEventTargetedUsers(eventId: string, filters?: { temple?: string, center?: string }) {
    const supabaseClient = getActiveSadhanaSupabase();
    if (!supabaseClient) return [];

    // 1. Fetch Event Targeting Data
    const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (eventError || !event) return [];

    // 2. Build User Query for main database using Admin Client to bypass RLS
    // and ensure we see the exact same audience that received the notification
    const { getAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = getAdminClient();
    if (!adminSupabase) return [];

    let allFetchedUsers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: batch, error: batchError } = await adminSupabase
            .from('users')
            .select('*, user_profile_details(*)') // Join with profile details for camp info
            .eq('verification_status', 'approved')
            .range(from, from + pageSize - 1);

        if (batchError) throw batchError;
        if (!batch || batch.length === 0) {
            hasMore = false;
        } else {
            allFetchedUsers = [...allFetchedUsers, ...batch];
            if (batch.length < pageSize) hasMore = false;
            else from += pageSize;
        }
    }
    const users = allFetchedUsers;
    if (!users) {
        console.error('[getEventTargetedUsers] Error fetching users');
        return [];
    }

    // 3. Final JS filtering for complex hierarchy/role logic that SQL can't do easily
    return users.filter(user => {
        // 1. Ashram Check (Sync with AdminEventCompose hierarchy check)
        const userAshram = String(user.ashram || user.hierarchy?.ashram || '').trim().toLowerCase();
        const matchesAshram = !event.target_ashrams?.length || 
            event.target_ashrams.some((a: string) => String(a).trim().toLowerCase() === userAshram);
        
        if (!matchesAshram) return false;

        let parsedRoles: any[] = [];
        try {
            if (typeof user.role === 'string' && user.role.startsWith('[')) {
                parsedRoles = JSON.parse(user.role);
            } else if (Array.isArray(user.role)) {
                parsedRoles = user.role;
            } else {
                parsedRoles = [user.role];
            }
        } catch {
            parsedRoles = [user.role];
        }
        const userRoles = parsedRoles.map(String);
        const matchesRole = !event.target_roles?.length || event.target_roles.some((r: any) => userRoles.includes(String(r)));
        
        if (!matchesRole) return false;

        // Detailed Location Checks (Sync with Notification filtering logic)
        const userLocations = [
            user.current_temple, 
            user.parent_temple, 
            user.hierarchy?.temple, 
            user.hierarchy?.currentTemple
        ].map(l => String(l || '').trim().toLowerCase());

        const matchesTemple = !event.target_temples?.length || 
            event.target_temples.some((t: string) => userLocations.includes(String(t).trim().toLowerCase()));
        
        if (!matchesTemple) return false;

        const userCenters = [
            user.center,
            user.current_center,
            user.parent_center,
            user.hierarchy?.center,
            user.hierarchy?.currentCenter
        ].map(l => String(l || '').trim().toLowerCase());

        const matchesCenter = !event.target_centers?.length || 
            event.target_centers.some((c: string) => userCenters.includes(String(c).trim().toLowerCase()));

        if (!matchesCenter) return false;

        // 4. Camp checks
        const matchesCamps = !event.target_camps?.length || event.target_camps.some((c: string) => {
            // Map camelCase ID (e.g. 'campDys') to snake_case DB column (e.g. 'camp_dys')
            const snakeCaseField = c.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            const variations = [c, snakeCaseField];
            if (c === 'campNishtha') variations.push('camp_nistha', 'campNistha');
            if (c === 'campAshraya') variations.push('camp_ashray', 'campAshray');
            
            const profileData = (user as any).user_profile_details;
            const profile = Array.isArray(profileData) ? profileData[0] : profileData;
            const hierarchy = (user as any).hierarchy || {};
            
            return variations.some(v => 
                (user as any)[v] === true || 
                (profile && profile[v] === true) ||
                hierarchy[v] === true ||
                hierarchy[v] === 'true'
            );
        });

        if (!matchesCamps) return false;

        // 4b. Voice Group checks
        const userVoiceGroup = String(user.bv_group || '').trim().toLowerCase();
        const matchesVoiceGroup = !event.target_voice_groups?.length ||
            event.target_voice_groups.some((g: string) => String(g).trim().toLowerCase() === userVoiceGroup);

        if (!matchesVoiceGroup) return false;

        // 5. Explicit Targeting
        if (event.target_user_ids?.length > 0) {
            if (!event.target_user_ids.includes(user.id)) return false;
        }

        // 6. Exclusions
        const isExcluded = event.excluded_user_ids?.includes(user.id);

        // Administrative isolation filters (if applied from Dashboard UI)
        if (filters?.temple && filters.temple !== 'all') {
            if (!userLocations.includes(filters.temple.trim().toLowerCase())) return false;
        }
        if (filters?.center && filters.center !== 'all') {
            if (!userCenters.includes(filters.center.trim().toLowerCase())) return false;
        }

        return matchesAshram && matchesRole && matchesTemple && matchesCenter && matchesCamps && !isExcluded;
    });
}

export async function updateEventDeadline(eventId: string, rsvpDeadline: Date | null, userId: string) {
    console.log(`[updateEventDeadline] Starting update for event ${eventId} by user ${userId}`);
    try {
        const sadhanaSupabase = getActiveSadhanaSupabase(); // anon (for reading)
        if (!sadhanaSupabase) throw new Error('Sadhana Supabase not initialized');

        // 1. Fetch the event to check ownership
        console.log('[updateEventDeadline] Fetching event ownership...');
        const { data: event, error: fetchError } = await sadhanaSupabase
            .from('events')
            .select('created_by, id')
            .eq('id', eventId)
            .single();

        if (fetchError) {
            console.error('[updateEventDeadline] Error fetching event:', fetchError);
            throw new Error(`Event not found: ${fetchError.message}`);
        }
        if (!event) throw new Error('Event not found');
        console.log('[updateEventDeadline] Found event creator:', event.created_by);

        // 2. Check permissions — use the MAIN DB admin client (users are NOT in sadhana DB)
        const isCreator = event.created_by === userId;
        let isSuperAdmin = false;

        if (!isCreator) {
            console.log('[updateEventDeadline] User is not creator, checking super_admin role in main DB...');
            try {
                const { getAdminClient } = await import('@/lib/supabase/admin');
                const mainAdmin = getAdminClient();
                const { data: userData, error: userError } = await mainAdmin
                    .from('users')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (userError) {
                    console.error('[updateEventDeadline] Error fetching user role from main DB:', userError);
                }

                const userRole = Array.isArray(userData?.role) ? userData.role : [userData?.role];
                isSuperAdmin = userRole.some((r: any) => String(r) === '8' || String(r) === 'super_admin');
                console.log('[updateEventDeadline] User isSuperAdmin:', isSuperAdmin);
            } catch (err) {
                console.error('[updateEventDeadline] Failed to check admin role:', err);
            }
        } else {
            console.log('[updateEventDeadline] User is the event creator.');
        }

        if (!isCreator && !isSuperAdmin) {
            console.warn('[updateEventDeadline] Unauthorized update attempt by user:', userId);
            throw new Error('Not authorized to update this event deadline');
        }

        // 3. Perform the update — use service role to bypass RLS
        console.log('[updateEventDeadline] Getting admin Sadhana client...');
        const adminSadhana = getAdminSadhanaSupabase();
        if (!adminSadhana) throw new Error('Sadhana admin client not available');

        const deadline = rsvpDeadline ? rsvpDeadline.toISOString() : null;

        console.log(`[updateEventDeadline] Updating event ${eventId} with deadline: ${deadline}`);

        const { data: updateData, error: updateError } = await adminSadhana
            .from('events')
            .update({ rsvp_deadline: deadline })
            .eq('id', eventId)
            .select();

        if (updateError) {
            console.error('[updateEventDeadline] Supabase UPDATE error:', updateError);
            throw updateError;
        }

        revalidatePath('/dashboard/events');
        return { success: true };
    } catch (error: any) {
        console.error('[updateEventDeadline] FATAL ERROR:', error);
        throw new Error(error.message || 'An internal error occurred while updating the deadline');
    }
}

// Utility to map DB format to app ManagedEvent type
function mapDbEventToManagedEvent(dbEvent: any, creatorName?: string): ManagedEvent {
    return {
        id: dbEvent.id,
        type: dbEvent.type || 'event',
        createdAt: new Date(dbEvent.created_at),
        createdBy: dbEvent.created_by,
        createdByName: creatorName,
        title: dbEvent.title,
        eventDate: dbEvent.event_date ? new Date(dbEvent.event_date) : undefined,
        message: dbEvent.message,
        attachments: (() => {
            if (!dbEvent.attachments) return [];
            if (typeof dbEvent.attachments === 'string') {
                try {
                    return JSON.parse(dbEvent.attachments) as ManagedEventAttachment[];
                } catch {
                    return [];
                }
            }
            return dbEvent.attachments as ManagedEventAttachment[];
        })(),
        targetAshrams: dbEvent.target_ashrams || [],
        targetRoles: dbEvent.target_roles || [],
        targetTemples: dbEvent.target_temples || [],
        targetCenters: dbEvent.target_centers || [],
        targetCamps: dbEvent.target_camps || [],
        targetVoiceGroups: dbEvent.target_voice_groups || [],
        targetUserIds: dbEvent.target_user_ids || [],
        excludedUserIds: dbEvent.excluded_user_ids || [],
        reachedCount: dbEvent.reached_count || 0,
        isImportant: dbEvent.is_important || false,
        isPinned: dbEvent.is_pinned || false,
        rsvpDeadline: dbEvent.rsvp_deadline ? new Date(dbEvent.rsvp_deadline) : undefined,
        autoReminderEnabled: dbEvent.auto_reminder_enabled || false,
        reminderDateTime: dbEvent.reminder_date_time ? new Date(dbEvent.reminder_date_time) : undefined,
        reminderTarget: dbEvent.reminder_target || [],
        reminderSentAt: dbEvent.reminder_sent_at ? new Date(dbEvent.reminder_sent_at) : undefined,
        updatedAt: new Date(dbEvent.updated_at)
    };
}

'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getEventsForUser } from '@/lib/actions/events';
import { showMessageNotification } from '@/lib/utils/notifications';
import { useRouter } from 'next/navigation';

export function useEventNotifications() {
    const { userData } = useAuth();
    const router = useRouter();
    const lastEventCountRef = useRef<number>(0);
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        if (!userData?.id) return;

        const checkForNewEvents = async () => {
            try {
                // Fetch events targeted at this user
                const events = await getEventsForUser({
                    userId: userData.id,
                    ashram: userData.hierarchy?.ashram,
                    // Pass the first role as a string, or the primary role if it's an array
                    role: Array.isArray(userData.role) ? String(userData.role[0]) : String(userData.role),
                    temple: userData.hierarchy?.currentTemple || userData.hierarchy?.parentTemple,
                    center: userData.hierarchy?.currentCenter || userData.hierarchy?.parentCenter,
                    completedCamps: Object.entries({
                        camp_dys: userData.campDys,
                        camp_sankalpa: userData.campSankalpa,
                        camp_sphurti: userData.campSphurti,
                        camp_utkarsh: userData.campUtkarsh,
                        camp_srcgd_workshop: userData.campSrcgdWorkshop,
                        camp_nishtha: userData.campNishtha,
                        camp_ftec: userData.campFtec,
                        camp_ashraya: userData.campAshraya,
                        camp_mtec: userData.campMtec,
                        camp_sharanagati: userData.campSharanagati,
                        camp_idc: userData.campIdc,
                        royal_member: userData.hierarchy?.royalMember === 'yes' || userData.hierarchy?.royalMember === true
                    })
                        .filter(([_, value]) => value === true)
                        .map(([key]) => key)
                });

                // An event is unread if there's no userResponse or the status isn't 'seen'
                const unreadEvents = events.filter((event: any) =>
                    !event.userResponse || event.userResponse.status !== 'seen'
                );

                const currentUnreadCount = unreadEvents.length;

                // Skip notification on initial load to prevent spam
                if (isInitialLoadRef.current) {
                    lastEventCountRef.current = currentUnreadCount;
                    isInitialLoadRef.current = false;
                    return;
                }

                // Check if there are new unread events
                if (currentUnreadCount > lastEventCountRef.current) {
                    const newEventsCount = currentUnreadCount - lastEventCountRef.current;
                    const latestEvent = unreadEvents[0]; // Most recent unread event (they are sorted descending by default)

                    if (newEventsCount === 1 && latestEvent) {
                        showMessageNotification(
                            `New Announcement: ${latestEvent.title}`,
                            'Click to view the details.',
                            () => {
                                router.push('/dashboard/events');
                            }
                        );
                    } else if (newEventsCount > 1) {
                        showMessageNotification(
                            'New Announcements',
                            `You have ${newEventsCount} new announcements`,
                            () => {
                                router.push('/dashboard/events');
                            }
                        );
                    }
                }

                lastEventCountRef.current = currentUnreadCount;
            } catch (error) {
                console.error('Error checking for new events:', error);
            }
        };

        // Check immediately
        checkForNewEvents();

        // Then check every 15 seconds
        const interval = setInterval(checkForNewEvents, 15000);

        return () => clearInterval(interval);
    }, [userData, router]);
}

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Plus, Calendar, Users, BarChart3, ChevronRight, MessageSquare, Paperclip, Check, X, Info } from 'lucide-react';
import { getEventsForUser, getEventStats, submitEventResponse, getRecentResponses, toggleEventPin, toggleEventImportance } from '@/lib/actions/events';
import { ManagedEvent, ManagedEventResponse } from '@/types';
import EventCard from '@/components/events/EventCard';
import EventLogsTable from '@/components/events/EventLogsTable';
import AdminEventCompose from '@/components/events/AdminEventCompose';
import AdminEventHistory from '@/components/events/AdminEventHistory';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/config';
import EventListItem from '@/components/events/EventListItem';
import EventDetailView from '@/components/events/EventDetailView';
import { Search, Pin, Clock, ChevronLeft } from 'lucide-react';

function EventsPageContent() {
    const { userData } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const tabParam = searchParams?.get('tab');
    const urlEventId = searchParams?.get('eventId');
    
    const [events, setEvents] = useState<ManagedEvent[]>([]);
    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId);
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(!!urlEventId);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days'>('all');

    const [activeTab, setActiveTab] = useState<'manage' | 'audience'>(tabParam === 'manage' ? 'manage' : 'audience');

    useEffect(() => {
        if (tabParam === 'manage' || tabParam === 'audience') {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const unreadCount = events.filter(e => !e.userResponse).length;

    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const isAdmin = userRoles.some(role =>
        ['super_admin', 'zonal_admin', 'state_admin', 'city_admin', 'center_admin', 'bc_voice_manager', 'project_manager', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher', 'project_advisor', 'acting_manager', 'event_admin'].includes(String(role)) ||
        (typeof role === 'number' && ((role >= 4 && role <= 8) || (role >= 11 && role <= 16) || role === 21 || role === 30))
    );
    const isSuperAdmin = userRoles.some(role => role === 'super_admin' || role === 8);

    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const logs = await getRecentResponses(30, userData?.id, isSuperAdmin);

            // Map user names from main Supabase
            const userIds = Array.from(new Set((logs as any[]).map((l: any) => l.userId)));
            if (userIds.length > 0) {
                const { data: users } = await supabase!
                    .from('users')
                    .select('id, name, email')
                    .in('id', userIds);

                const userMap = new Map(((users || []) as any[]).map((u: any) => [u.id, u]));
                const detailedLogs = (logs as any[]).map((log: any) => ({
                    ...log,
                    userName: userMap.get(log.userId)?.name,
                    userEmail: userMap.get(log.userId)?.email
                }));
                setGlobalLogs(detailedLogs);
            } else {
                setGlobalLogs([]);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    }, [userData?.id, isSuperAdmin]);

    const fetchEvents = useCallback(async () => {
        if (!userData) return;
        
        // Block unapproved users from seeing events
        if (userData.verificationStatus && userData.verificationStatus !== 'approved' && !isSuperAdmin) {
            setLoading(false);
            setEvents([]);
            return;
        }

        setLoading(true);
        setEvents([]); // Clear old events to prevent UI flash when switching tabs
        try {
            // Prepare all possible location tokens for the backend to check
            const allLocations = [
                userData.hierarchy?.center,
                userData.hierarchy?.currentCenter,
                userData.hierarchy?.parentCenter,
                userData.hierarchy?.temple,
                userData.hierarchy?.currentTemple,
                userData.hierarchy?.parentTemple,
                userData.currentCenter,
                userData.parentCenter,
                userData.currentTemple,
                userData.parentTemple
            ].filter(Boolean) as string[];

            const userParams = {
                userId: userData.id,
                ashram: (activeTab === 'audience' || !isAdmin) ? userData.hierarchy?.ashram : undefined,
                role: (activeTab === 'audience' || !isAdmin) ? String(Array.isArray(userData.role) ? userData.role[0] : userData.role) : undefined,
                temple: (activeTab === 'audience' || !isAdmin) ? (userData.hierarchy?.temple || userData.currentTemple) : undefined,
                center: (activeTab === 'audience' || !isAdmin) ? (userData.hierarchy?.center || userData.currentCenter) : undefined,
                voiceGroup: (activeTab === 'audience' || !isAdmin) ? userData.bv_group : undefined,
                completedCamps: (activeTab === 'audience' || !isAdmin) ? Object.entries(userData)
                    .filter(([key, val]) => key.startsWith('camp') && val === true)
                    .map(([key]) => key) : [],
                isSuperAdmin: isSuperAdmin,
                allLocations: (activeTab === 'audience' || !isAdmin) ? allLocations : [],
                isManagementView: activeTab === 'manage'
            };

            const data = await getEventsForUser(userParams);

            // Sorting logic: Personal Pinned > Important > Date
            const sortedData = [...data].sort((a, b) => {
                // 1. Pins
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;

                // 2. Important (if not personally dismissed)
                const aImp = a.isImportant && !a.isImportantDismissed;
                const bImp = b.isImportant && !b.isImportantDismissed;
                if (aImp && !bImp) return -1;
                if (!aImp && bImp) return 1;

                // 3. Date (Event Date for events, Creation Date for announcements)
                const aDate = a.eventDate ? new Date(a.eventDate).getTime() : new Date(a.createdAt).getTime();
                const bDate = b.eventDate ? new Date(b.eventDate).getTime() : new Date(b.createdAt).getTime();
                return bDate - aDate;
            });

            setEvents(sortedData);

            if (isAdmin) fetchLogs();
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    }, [userData, isAdmin, activeTab, isSuperAdmin, fetchLogs]);

    useEffect(() => {
        fetchEvents();
    }, [userData, isAdmin, activeTab, fetchEvents]);

    // Handle initial event selection from URL or default to first unread
    useEffect(() => {
        if (!loading && events.length > 0) {
            if (urlEventId && events.some(e => e.id === urlEventId)) {
                setSelectedEventId(urlEventId);
                setIsMobileDetailOpen(true);
            } else if (!selectedEventId) {
                // If no event selected and no valid URL param, we could auto-select the first one on desktop
                // But let's stay conservative for now
            }
        }
    }, [loading, events, urlEventId, selectedEventId]);

    // Update URL when selection changes
    const handleEventSelect = (eventId: string) => {
        setSelectedEventId(eventId);
        setIsMobileDetailOpen(true);
        
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('eventId', eventId);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: 'manage' | 'audience') => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('tab', tab);
        // Reset event selection when switching views to prevent context confusion
        params.delete('eventId');
        setSelectedEventId(null);
        setIsMobileDetailOpen(false);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Keep mobile detail state in sync with URL for physical back button support
    useEffect(() => {
        if (!urlEventId) {
            setIsMobileDetailOpen(false);
            setSelectedEventId(null);
        } else {
            setSelectedEventId(urlEventId);
            setIsMobileDetailOpen(true);
        }
    }, [urlEventId]);

    // Handle marking events as 'seen' only when selected
    useEffect(() => {
        const markSelectedAsSeen = async () => {
            if (!userData || !selectedEventId) return;

            const selectedEventObj = events.find(e => e.id === selectedEventId);
            if (!selectedEventObj || selectedEventObj.userResponse) return; // Already has a response or seen

            try {
                // Update local state IMMEDIATELY for instant UI feedback
                setEvents(prev => prev.map(e =>
                    e.id === selectedEventId
                        ? {
                            ...e,
                            userResponse: {
                                id: 'temp-' + Date.now(),
                                eventId: e.id,
                                userId: userData.id,
                                status: 'seen' as const,
                                isBulk: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        }
                        : e
                ));

                await submitEventResponse({
                    eventId: selectedEventId,
                    userId: userData.id,
                    status: 'seen',
                    isBulk: false
                });
            } catch (error) {
                console.error('Error marking event as seen:', error);
            }
        };

        markSelectedAsSeen();
    }, [selectedEventId, userData, events]);

    const handlePinToggle = async (eventId: string, pinned: boolean) => {
        if (!userData) return;
        try {
            await toggleEventPin(eventId, userData.id, pinned);
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isPinned: pinned } : e));
            toast.success(pinned ? 'Announcement Pinned' : 'Announcement Unpinned');
        } catch (error) {
            console.error('Error toggling pin:', error);
            toast.error('Failed to update pin');
        }
    };

    const handleImportanceToggle = async (eventId: string, dismissed: boolean) => {
        if (!userData) return;
        try {
            await toggleEventImportance(eventId, userData.id, dismissed);
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isImportantDismissed: dismissed } : e));
            toast.success(dismissed ? 'Importance Removed' : 'Importance Restored');
        } catch (error) {
            console.error('Error toggling importance:', error);
            toast.error('Failed to update importance');
        }
    };

    const [showHistory, setShowHistory] = useState(true);
    const [showComposer, setShowComposer] = useState(false);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.message?.toLowerCase().includes(searchQuery.toLowerCase());

        if (dateFilter === 'all') return matchesSearch;

        const eventDate = event.eventDate ? new Date(event.eventDate) : new Date(event.createdAt);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dateFilter === '7days') return matchesSearch && diffDays <= 7;
        if (dateFilter === '30days') return matchesSearch && diffDays <= 30;

        return matchesSearch;
    });

    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <div className="flex flex-col animate-in slide-in-from-left-4 duration-500">
            {/* Tab Switcher for Admins */}
            {isAdmin && (
                <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 mb-8">
                    <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-gray-100 shadow-sm inline-flex items-center gap-1">
                        <button
                            onClick={() => handleTabChange('audience')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'audience'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Audience View
                        </button>
                        <button
                            onClick={() => handleTabChange('manage')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'manage'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Management Hub
                        </button>
                    </div>
                </div>
            )}

            {(isAdmin && activeTab === 'manage') ? (
                <div className="px-4 sm:px-6 space-y-12 max-w-[1600px] mx-auto w-full">
                    {/* Management Controls */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-4 px-2 sm:px-6">
                            <div className="flex flex-col">
                                <h1 className="text-3xl font-black tracking-tight text-gray-900">Management Hub</h1>
                                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Announcements & Communications</p>
                            </div>
                            <button
                                onClick={() => setShowComposer(!showComposer)}
                                className={`px-6 py-3 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-100 flex items-center gap-2 ${showComposer
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                    }`}
                            >
                                {showComposer ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                {showComposer ? 'Close Composer' : 'Create New'}
                            </button>
                        </div>

                        {showComposer && (
                            <div className="animate-in slide-in-from-top-4 duration-500">
                                <AdminEventCompose onSuccess={() => {
                                    fetchEvents();
                                    setShowComposer(false);
                                }} />
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3 px-2 sm:px-6">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-purple-600 rounded-lg shadow-md shadow-purple-100">
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-gray-900">Announcement History</h2>
                            </div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="px-4 sm:px-6 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                            >
                                {showHistory ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center space-y-4 min-h-[300px] bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
                                <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Loading Records...</p>
                            </div>
                        ) : showHistory && (
                            <AdminEventHistory
                                events={events}
                                onRefresh={fetchEvents}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col animate-in slide-in-from-left-4 duration-500">
                    {/* Header for Audience View */}
                    <div className={`px-4 sm:px-6 mb-6 ${isMobileDetailOpen ? 'hidden md:block' : 'block'}`}>
                        <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                            <div className="relative z-10 space-y-1">
                                <div className="flex items-center gap-2 mb-1 px-3 py-0.5 bg-orange-600 rounded-lg w-fit shadow-md shadow-orange-100">
                                    <Calendar className="h-3.5 w-3.5 text-white" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Community Hub</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900">
                                    Communications & <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Announcements</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Split Pane Interface */}
                    <div className="flex bg-white rounded-[2rem] shadow-2xl border border-gray-100 mx-4 sm:mx-6 mb-6 min-h-0 items-start">
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                <p className="text-gray-400 font-bold">Retrieving events...</p>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center min-h-[400px]">
                                <div className="mx-auto w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                                    <Calendar className="h-12 w-12 text-orange-200" />
                                </div>
                                <h3 className="text-lg font-black text-gray-800">No new events</h3>
                                <p className="text-gray-400 mt-2 font-medium text-xs">Check back soon for upcoming programs.</p>
                            </div>
                        ) : (
                            <>
                                {/* Sidebar */}
                                <div className={`w-full md:w-[280px] lg:w-[320px] flex flex-col border-r border-gray-100 sticky top-4 self-start max-h-[calc(100vh-2rem)] ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-none">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-[10px]">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Inbox ({events.length})
                                            </div>
                                            {unreadCount > 0 && (
                                                <div className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[9px] font-black animate-pulse shadow-lg shadow-blue-200">
                                                    {unreadCount} UNREAD
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-3">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search Announcements..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-900/10 focus:border-gray-900 rounded-2xl text-[12px] font-bold text-gray-900 placeholder:text-gray-400 transition-all outline-none focus:ring-4 focus:ring-gray-900/5"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {['all', '7days', '30days'].map((id) => (
                                                <button
                                                    key={id}
                                                    onClick={() => setDateFilter(id as any)}
                                                    className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${dateFilter === id
                                                        ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                        }`}
                                                >
                                                    {id === 'all' ? 'All' : id === '7days' ? 'Recent' : 'Month'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {filteredEvents.map(event => (
                                            <EventListItem
                                                key={event.id}
                                                event={event}
                                                isActive={selectedEventId === event.id}
                                                onClick={() => handleEventSelect(event.id)}
                                                onPinToggle={(pinned) => handlePinToggle(event.id, pinned)}
                                                onImportanceToggle={(dismissed) => handleImportanceToggle(event.id, dismissed)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className={`flex-1 flex flex-col min-w-0 bg-white ${!isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                                    <div className="md:hidden p-3 border-b-2 border-gray-50 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center gap-3 shadow-sm">
                                        <button 
                                            onClick={() => {
                                                setIsMobileDetailOpen(false);
                                                setSelectedEventId(null);
                                                const params = new URLSearchParams(searchParams?.toString() || '');
                                                params.delete('eventId');
                                                router.push(`${pathname}?${params.toString()}`);
                                            }} 
                                            className="p-2.5 bg-gray-50 text-gray-900 rounded-xl active:scale-95 transition-all border border-gray-100 shadow-sm"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 leading-none">Announcements</span>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 mt-1">Return to Inbox</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {selectedEvent ? (
                                            <EventDetailView event={selectedEvent} onResponseUpdate={fetchEvents} />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-300 min-h-[400px]">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <MessageSquare className="h-10 w-10" />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-widest">Select an announcement to view details</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EventsPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
        }>
            <EventsPageContent />
        </Suspense>
    );
}

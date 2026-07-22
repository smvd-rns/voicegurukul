'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ManagedEvent, ManagedEventResponse } from '@/types';
import {
    BarChart3,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Search,
    Filter,
    Building,
    MapPin,
    ArrowLeft,
    Users,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    User as UserIcon
} from 'lucide-react';
import { getEventById, getEventStats, getEventTargetedUsers } from '@/lib/actions/events';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';

export default function EventTrackingPage() {
    const { id } = useParams();
    const router = useRouter();
    const { userData } = useAuth();

    const [event, setEvent] = useState<ManagedEvent | null>(null);
    const [responses, setResponses] = useState<ManagedEventResponse[]>([]);
    const [reachedUsers, setReachedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'coming' | 'not_coming' | 'seen' | 'understood' | 'no_reply'>('all');
    const [filterTemple, setFilterTemple] = useState('all');
    const [filterCenter, setFilterCenter] = useState('all');
    const [showHierarchy, setShowHierarchy] = useState(true);

    const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role].filter(Boolean);
    const isPM = userRoles.some(r => ['project_manager', 15].includes(r as any));
    const isSuperAdmin = userRoles.some(r => r === 'super_admin' || r === 8 || r === 'event_admin' || r === 30);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Fetch Event
            const eventData = await getEventById(id as string);
            if (!eventData) {
                toast.error('Event not found');
                router.push('/dashboard/events?tab=manage');
                return;
            }

            // Security Check: Only creators or Super Admins can view this report
            if (!isSuperAdmin && eventData.createdBy !== userData?.id) {
                toast.error('Unauthorized access to this report');
                router.push('/dashboard/events?tab=manage');
                return;
            }

            setEvent(eventData);

            // 2. Fetch responses from Sadhana DB
            const { getActiveSadhanaSupabase } = await import('@/lib/supabase/sadhana');
            const sadhanaSupabase = getActiveSadhanaSupabase();
            if (!sadhanaSupabase) return;

            const { data: respData } = await sadhanaSupabase
                .from('event_responses')
                .select('*')
                .eq('event_id', id);

            const mappedResponses: ManagedEventResponse[] = ((respData || []) as any[]).map((r: any) => ({
                id: r.id,
                eventId: r.event_id,
                userId: r.user_id,
                status: r.status,
                reason: r.reason,
                guestCount: r.guest_count,
                isBulk: r.is_bulk,
                bulkAddedBy: r.bulk_added_by,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));
            setResponses(mappedResponses);

            // 3. Fetch reached users using the centralized secure action
            const reached = await getEventTargetedUsers(id as string);
            setReachedUsers(reached);
        } catch (error) {
            console.error('Error fetching tracking data:', error);
            toast.error('Failed to load tracking data');
        } finally {
            setLoading(false);
        }
    }, [id, router, isSuperAdmin, userData?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setFilterCenter('all');
    }, [filterTemple]);

    const templeOptions = useMemo(() => {
        const temples = new Set(reachedUsers.map(u => u.current_temple || u.parent_temple || u.hierarchy?.temple || u.hierarchy?.currentTemple).filter(Boolean));
        return ['all', ...Array.from(temples)];
    }, [reachedUsers]);

    const centerOptions = useMemo(() => {
        const filteredUsers = filterTemple === 'all'
            ? reachedUsers
            : reachedUsers.filter(u => (u.current_temple || u.parent_temple || u.hierarchy?.temple || u.hierarchy?.currentTemple) === filterTemple);

        const centers = new Set(filteredUsers.map(u => u.center || u.current_center || u.hierarchy?.center || u.hierarchy?.currentCenter).filter(Boolean));
        return ['all', ...Array.from(centers)];
    }, [reachedUsers, filterTemple]);

    const filteredReached = useMemo(() => {
        return reachedUsers.filter(user => {
            const response = responses.find(r => r.userId === user.id);
            const nameMatch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
            const emailMatch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
            const matchesSearch = !searchTerm || nameMatch || emailMatch;

            const userTemple = user.current_temple || user.parent_temple || user.hierarchy?.temple || user.hierarchy?.currentTemple;
            const userCenter = user.center || user.current_center || user.hierarchy?.center || user.hierarchy?.currentCenter;

            let matchesStatus = true;
            if (filterStatus === 'coming') matchesStatus = response?.status === 'coming';
            else if (filterStatus === 'not_coming') matchesStatus = response?.status === 'not_coming';
            else if (filterStatus === 'seen') matchesStatus = response?.status === 'seen';
            else if (filterStatus === 'understood') matchesStatus = response?.status === 'understood';
            else if (filterStatus === 'no_reply') matchesStatus = !response;

            const matchesTemple = filterTemple === 'all' || userTemple === filterTemple;
            const matchesCenter = filterCenter === 'all' || userCenter === filterCenter;

            return matchesSearch && matchesStatus && matchesTemple && matchesCenter;
        });
    }, [reachedUsers, responses, searchTerm, filterStatus, filterTemple, filterCenter]);
 
     const centerBreakdown = useMemo(() => {
         const groupings: Record<string, { 
             center: string, 
             temple: string, 
             total: number, 
             positive: number,
             seen: number
         }> = {};
 
         reachedUsers.forEach(user => {
             const center = user.center || user.current_center || user.hierarchy?.center || user.hierarchy?.currentCenter || 'Unknown Center';
             const temple = user.current_temple || user.parent_temple || user.hierarchy?.temple || user.hierarchy?.currentTemple || 'Unknown Temple';
             const response = responses.find(r => r.userId === user.id);
 
             if (!groupings[center]) {
                 groupings[center] = { center, temple, total: 0, positive: 0, seen: 0 };
             }
 
             groupings[center].total++;
             if (event?.type === 'announcement') {
                 if (response?.status === 'understood') groupings[center].positive++;
             } else {
                 if (response?.status === 'coming') groupings[center].positive++;
             }
             if (response?.status === 'seen') groupings[center].seen++;
         });
 
         return Object.values(groupings).sort((a, b) => b.total - a.total);
     }, [reachedUsers, responses, event?.type]);

    if (loading && !event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Loading Tracking Intelligence...</p>
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col animate-in fade-in duration-500">
            {/* High Contrast Header */}
            <div className="bg-slate-900 border-b border-white/5 py-6 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/events?tab=manage')}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-orange-600 text-[9px] font-black text-white uppercase tracking-widest rounded-md">Live Tracking</span>
                                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">ID: {event.id.slice(0, 8)}</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">{event.title}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Total Reach</span>
                            <span className="text-2xl font-black text-white">{reachedUsers.length}</span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                            <BarChart3 className="h-6 w-6 text-orange-500" />
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                {/* Stats Section - High Visibility Blocks */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {event.type === 'announcement' ? (
                        <>
                            {[
                                { label: 'Understood', value: responses.filter(r => r.status === 'understood').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                { label: 'Seen Only', value: responses.filter(r => r.status === 'seen').length, icon: Eye, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
                                { label: 'Pending', value: Math.max(0, reachedUsers.length - responses.length), icon: Clock, color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200' }
                            ].map((s, i) => (
                                <div key={i} className={`${s.bg} ${s.border} border-2 p-4 md:p-6 rounded-[1.5rem] shadow-sm flex items-center justify-between transition-transform hover:-translate-y-0.5`}>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${s.color} mb-1 opacity-80`}>{s.label}</p>
                                        <h3 className="text-2xl md:text-3xl font-black text-slate-900">{s.value}</h3>
                                    </div>
                                    <div className={`p-2 bg-white rounded-xl shadow-sm ${s.color}`}>
                                        <s.icon className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        [
                            (() => {
                                const comingResponses = responses.filter(r => r.status === 'coming');
                                const userCount = comingResponses.length;
                                const guestCount = comingResponses.reduce((sum, r) => sum + Number(r.guestCount || 0), 0);
                                return { 
                                    label: 'Coming', 
                                    value: userCount + guestCount, 
                                    subValue: guestCount > 0 ? `${userCount} Users + ${guestCount} Guests` : undefined,
                                    icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' 
                                };
                            })(),
                            { label: 'Not Coming', value: responses.filter(r => r.status === 'not_coming').length, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
                            { label: 'Seen Only', value: responses.filter(r => r.status === 'seen').length, icon: Eye, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
                            { label: 'Pending', value: Math.max(0, reachedUsers.length - responses.length), icon: Clock, color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200' }
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} ${s.border} border-2 p-4 md:p-6 rounded-[1.5rem] shadow-sm flex items-center justify-between transition-transform hover:-translate-y-0.5`}>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${s.color} mb-1 opacity-80`}>{s.label}</p>
                                    <div className="flex flex-col">
                                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{s.value}</h3>
                                        {(s as any).subValue && <p className={`text-[9px] font-bold mt-1 ${s.color} opacity-80 leading-none`}>{(s as any).subValue}</p>}
                                    </div>
                                </div>
                                <div className={`p-2 bg-white rounded-xl shadow-sm ${s.color}`}>
                                    <s.icon className="h-5 w-5 md:h-6 md:w-6" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
 
                 {/* Center-wise Breakdown - Hierarchy Insights */}
                 <div className="bg-white border-2 border-indigo-100 rounded-[2rem] shadow-xl shadow-indigo-50/50 overflow-hidden">
                     <button 
                         onClick={() => setShowHierarchy(!showHierarchy)}
                         className="w-full p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 flex items-center justify-between hover:from-indigo-800 hover:to-slate-800 transition-all group/header"
                     >
                         <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-white/10 rounded-lg group-hover/header:bg-white/20 transition-colors">
                                 <Building className="h-4 w-4 text-indigo-400" />
                             </div>
                             <h2 className="text-xs font-black text-white uppercase tracking-widest">Hierarchy Insights</h2>
                         </div>
                         <div className="flex items-center gap-4">
                             <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full">{centerBreakdown.length} Centers Tracked</span>
                             {showHierarchy ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                         </div>
                     </button>
 
                     {showHierarchy && (
                         <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-top-2 duration-300">
                             {centerBreakdown.map((item, idx) => {
                             const percentage = Math.round((item.positive / item.total) * 100) || 0;
                             return (
                                 <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-50 transition-all group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100/50 transition-colors" />
                                     
                                     <div className="relative flex justify-between items-start mb-4">
                                         <div className="flex-1 min-w-0 pr-2">
                                             <h4 className="text-xs font-black text-slate-900 truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.center}</h4>
                                             <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{item.temple}</p>
                                         </div>
                                         <div className="text-right shrink-0">
                                             <div className="text-xs font-black text-slate-900">{item.positive} <span className="text-slate-300">/ {item.total}</span></div>
                                             <div className={`text-[9px] font-black mt-0.5 ${percentage > 70 ? 'text-emerald-500' : percentage > 30 ? 'text-orange-500' : 'text-slate-400'}`}>
                                                 {percentage}% {event?.type === 'announcement' ? 'Understood' : 'Coming'}
                                             </div>
                                         </div>
                                     </div>
 
                                     <div className="relative">
                                         <div className="flex justify-between text-[8px] font-extrabold text-slate-300 uppercase tracking-widest mb-1.5">
                                             <span>Engagement</span>
                                             <span>{percentage}%</span>
                                         </div>
                                         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                             <div 
                                                 className={`h-full rounded-full transition-all duration-1000 ${
                                                     percentage > 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 
                                                     percentage > 30 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 
                                                     'bg-slate-300'
                                                 }`}
                                                 style={{ width: `${percentage}%` }}
                                             />
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                     )}
                 </div>

                {/* Filters Row - Distinct Segment */}
                <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-[2] relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs md:text-sm font-bold focus:bg-white focus:border-orange-500 transition-all outline-none"
                                />
                            </div>
                            <div className="flex-[3] flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex gap-2">
                                    {(event.type === 'announcement' ? ['all', 'understood', 'seen', 'no_reply'] : ['all', 'coming', 'not_coming', 'seen', 'no_reply']).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStatus(s as any)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shrink-0 border-2 ${filterStatus === s
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            {s === 'understood' ? 'Understood' : s.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-50">
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 ml-1">
                                    <Building className="h-3 w-3 text-orange-500" />
                                    Temple Filter
                                </label>
                                <select
                                    value={filterTemple}
                                    onChange={(e) => setFilterTemple(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black focus:border-orange-500 transition-all outline-none appearance-none cursor-pointer"
                                >
                                    {templeOptions.map(t => (
                                        <option key={t} value={t}>{t === 'all' ? 'All Temples' : t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 ml-1">
                                    <MapPin className="h-3 w-3 text-orange-500" />
                                    Center Filter
                                </label>
                                <select
                                    value={filterCenter}
                                    onChange={(e) => setFilterCenter(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black focus:border-orange-500 transition-all outline-none appearance-none cursor-pointer"
                                >
                                    {centerOptions.map(c => (
                                        <option key={c} value={c}>{c === 'all' ? 'All Centers' : c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audience List Container */}
                <div className="bg-white border-2 border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 text-white rounded-xl">
                                <Users className="h-4 w-4" />
                            </div>
                            <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">Audience Intelligence</h2>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full">
                            {filteredReached.length} Match Results
                        </span>
                    </div>

                    {/* Content Area */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Geography</th>
                                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Status</th>
                                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Activity Notes</th>
                                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Sync</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredReached.length === 0 ? (
                                    <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No users satisfy current filter criteria</td></tr>
                                ) : filteredReached.map(user => {
                                    const response = responses.find(r => r.userId === user.id);
                                    return (
                                        <tr key={user.id} className="group transition-all hover:bg-slate-50/30">
                                            <td className="p-4 md:p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                                        <UserIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 text-sm md:text-base leading-tight">{user.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold lowercase truncate max-w-[150px] md:max-w-none">{user.email}</div>
                                                        {/* Mobile Geography Info */}
                                                        <div className="lg:hidden mt-1.5 flex flex-wrap gap-2">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-tight">{user.current_temple || user.hierarchy?.temple || '-'}</span>
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-tight">{user.center || user.hierarchy?.center || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-6 hidden lg:table-cell">
                                                <div className="text-[11px] font-black text-slate-700 tracking-tight">
                                                    {user.current_temple || user.parent_temple || user.hierarchy?.temple || user.hierarchy?.currentTemple || '-'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                    {user.center || user.current_center || user.hierarchy?.center || user.hierarchy?.currentCenter || '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-6">
                                                {response ? (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border-2 ${response.status === 'coming' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                                            response.status === 'not_coming' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                                                response.status === 'understood' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                                                    'bg-sky-50 border-sky-100 text-sky-700'
                                                            }`}>
                                                            {response.status === 'coming' && <CheckCircle className="h-3 w-3" />}
                                                            {response.status === 'not_coming' && <XCircle className="h-3 w-3" />}
                                                            {response.status === 'understood' && <CheckCircle2 className="h-3 w-3" />}
                                                            {response.status === 'seen' && <Eye className="h-3 w-3" />}
                                                            {response.status === 'understood' ? 'Understood' : response.status.replace('_', ' ')}
                                                        </span>
                                                        {response.status === 'coming' && Number(response.guestCount || 0) > 0 && (
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-widest mt-0.5 ml-1">
                                                                +{response.guestCount} Guest{Number(response.guestCount || 0) > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        {response.isBulk && (
                                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1 mt-0.5">PM Verified</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-slate-50 border-2 border-slate-100 text-slate-300">
                                                        <Clock className="h-3 w-3" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 md:p-6 hidden md:table-cell">
                                                {response?.reason ? (
                                                    <div className="max-w-[200px]">
                                                        <p className="text-[11px] font-bold text-rose-600 bg-rose-50/50 p-2 rounded-xl border border-rose-100 italic leading-snug">
                                                            &quot;{response.reason}&quot;
                                                        </p>
                                                    </div>
                                                ) : response?.status === 'not_coming' ? (
                                                    <span className="text-[10px] text-slate-300 font-bold italic">No reason provided</span>
                                                ) : (
                                                    <span className="text-slate-200">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 md:p-6 text-right">
                                                {response ? (
                                                    <div>
                                                        <div className="text-[11px] font-black text-slate-900 capitalize">
                                                            {new Date(response.updatedAt || response.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="text-[9px] font-bold text-slate-400">
                                                            {new Date(response.updatedAt || response.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

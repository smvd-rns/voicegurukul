'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ManagedEvent, ManagedEventResponse, User } from '@/types';
import { X, Users, Check, X as CloseIcon, Info, Eye, Search, Filter, CheckCircle2, BarChart3, TrendingUp, CheckCircle, XCircle, Clock, MapPin, Building } from 'lucide-react';
import { getEventStats, bulkSubmitResponses, getEventTargetedUsers } from '@/lib/actions/events';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/config';

interface EventStatsModalProps {
    isOpen: boolean;
    event: ManagedEvent;
    onClose: () => void;
}

export default function EventStatsModal({ isOpen, event, onClose }: EventStatsModalProps) {
    const { userData } = useAuth();
    const [responses, setResponses] = useState<ManagedEventResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [reachedUsers, setReachedUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'coming' | 'not_coming' | 'seen' | 'understood' | 'no_reply'>('all');
    const [filterTemple, setFilterTemple] = useState('all');
    const [filterCenter, setFilterCenter] = useState('all');

    // PM Bulk selection
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

    // Reset center filter when temple changes
    useEffect(() => {
        setFilterCenter('all');
    }, [filterTemple]);

    const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role].filter(Boolean);
    const isPM = userRoles.some(r => ['project_manager', 15].includes(r as any));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch responses from Sadhana DB
            const { getActiveSadhanaSupabase } = await import('@/lib/supabase/sadhana');
            const sadhanaSupabase = getActiveSadhanaSupabase();
            if (!sadhanaSupabase) return;

            const { data: respData } = await sadhanaSupabase
                .from('event_responses')
                .select('*')
                .eq('event_id', event.id);

            const mappedResponses: ManagedEventResponse[] = (respData || []).map((r: any) => ({
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

            // 2. Fetch the exact list of targeted users using the centralized server action
            // This ensures verification_status and target_user_ids are perfectly respected
            const reached = await getEventTargetedUsers(event.id);
            setReachedUsers(reached);

            // 3. Stats
            setStats(await getEventStats(event.id));

        } catch (error) {
            console.error('Error fetching event stats:', error);
            toast.error('Failed to load tracking data');
        } finally {
            setLoading(false);
        }
    }, [event.id]);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

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

    const handleBulkSubmit = async (status: 'coming' | 'not_coming') => {
        if (selectedUserIds.length === 0 || !userData) return;
        setIsBulkSubmitting(true);
        try {
            await bulkSubmitResponses(event.id, selectedUserIds, userData.id, status);
            toast.success(`Updated attendance for ${selectedUserIds.length} users!`);
            fetchData();
            setSelectedUserIds([]);
        } catch (error) {
            toast.error('Bulk update failed');
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 md:p-5 bg-gray-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-orange-600 rounded-lg">
                            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold">{event.title} - Tracking</h2>
                            <p className="text-gray-400 text-[10px] md:text-xs font-medium">Reached {reachedUsers.length} total users</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        <CloseIcon className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                </div>

                {/* Micro Summary Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 py-3 md:px-6 md:py-3.5 bg-gray-50 border-b border-gray-100">
                    {event.type === 'announcement' ? (
                        <>
                            {/* Understood */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-emerald-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">Understood</span>
                                    <span className="text-base font-black text-gray-900 leading-none">{responses.filter(r => r.status === 'understood').length}</span>
                                </div>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>

                            {/* Seen */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-sky-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-sky-600 uppercase tracking-tight">Seen Only</span>
                                    <span className="text-base font-black text-gray-900 leading-none">{responses.filter(r => r.status === 'seen').length}</span>
                                </div>
                                <Eye className="h-4 w-4 text-sky-500" />
                            </div>

                            {/* No Response */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight">Pending</span>
                                    <span className="text-base font-black text-gray-900 leading-none">{Math.max(0, (event.reachedCount || reachedUsers.length) - responses.length)}</span>
                                </div>
                                <Clock className="h-4 w-4 text-slate-400" />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Coming */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-emerald-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">Coming</span>
                                    {(() => {
                                        const comingResponses = responses.filter(r => r.status === 'coming');
                                        const userCount = comingResponses.length;
                                        const guestCount = comingResponses.reduce((sum, r) => sum + (r.guestCount || 0), 0);
                                        return (
                                            <>
                                                <span className="text-base font-black text-gray-900 leading-none">{userCount + guestCount}</span>
                                                {guestCount > 0 && (
                                                    <span className="text-[8px] font-bold text-emerald-600 opacity-80 mt-0.5 leading-none">
                                                        ({userCount} Users + {guestCount} Guests)
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />
                            </div>

                            {/* Not Coming */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-rose-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-rose-600 uppercase tracking-tight">Not Coming</span>
                                    <span className="text-base font-black text-gray-900 leading-none">{responses.filter(r => r.status === 'not_coming').length}</span>
                                </div>
                                <XCircle className="h-4 w-4 text-rose-500" />
                            </div>

                            {/* Seen */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-sky-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-sky-600 uppercase tracking-tight">Seen</span>
                                    <span className="text-base font-black text-gray-900 leading-none">{responses.filter(r => r.status === 'seen').length}</span>
                                </div>
                                <Eye className="h-4 w-4 text-sky-500" />
                            </div>

                            {/* No Response */}
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight">Pending</span>
                                    <span className="text-base font-black text-gray-900 leading-none">{Math.max(0, (event.reachedCount || reachedUsers.length) - responses.length)}</span>
                                </div>
                                <Clock className="h-4 w-4 text-slate-400" />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-5">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search reached users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                                <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                                <div className="flex gap-1.5">
                                    {(event.type === 'announcement' ? ['all', 'understood', 'seen', 'no_reply'] : ['all', 'coming', 'not_coming', 'seen', 'no_reply']).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStatus(s as any)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shrink-0 ${filterStatus === s ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            {s === 'understood' ? 'Understood' : s.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-gray-50">
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 ml-1">
                                    <Building className="h-3 w-3 text-orange-500" />
                                    Temple
                                </label>
                                <select
                                    value={filterTemple}
                                    onChange={(e) => setFilterTemple(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 hover:bg-white transition-all outline-none appearance-none cursor-pointer"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8em' }}
                                >
                                    {templeOptions.map(t => (
                                        <option key={t} value={t}>{t === 'all' ? 'All Temples' : t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 ml-1">
                                    <MapPin className="h-3 w-3 text-orange-500" />
                                    Center
                                </label>
                                <select
                                    value={filterCenter}
                                    onChange={(e) => setFilterCenter(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 hover:bg-white transition-all outline-none appearance-none cursor-pointer"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8em' }}
                                >
                                    {centerOptions.map(c => (
                                        <option key={c} value={c}>{c === 'all' ? 'All Centers' : c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions (PM) */}
                    {isPM && selectedUserIds.length > 0 && (
                        <div className="bg-orange-600 text-white p-3 rounded-xl mb-4 flex items-center justify-between animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
                                <span className="font-bold text-xs md:text-sm">{selectedUserIds.length} users selected</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkSubmit('coming')}
                                    disabled={isBulkSubmitting}
                                    className="px-3 py-1.5 bg-white text-orange-600 rounded-lg font-bold text-[10px] md:text-xs hover:bg-gray-50 transition-all uppercase tracking-tight"
                                >
                                    Confirm Coming
                                </button>
                                <button
                                    onClick={() => handleBulkSubmit('not_coming')}
                                    disabled={isBulkSubmitting}
                                    className="px-3 py-1.5 bg-orange-800 text-white rounded-lg font-bold text-[10px] md:text-xs hover:bg-orange-900 transition-all uppercase tracking-tight"
                                >
                                    Mark Not Coming
                                </button>
                                <button onClick={() => setSelectedUserIds([])} className="p-1.5 hover:bg-orange-700 rounded-lg">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    {isPM && <th className="p-3 w-8">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedUserIds(filteredReached.map(u => u.id));
                                                else setSelectedUserIds([]);
                                            }}
                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                                        />
                                    </th>}
                                    <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">User</th>
                                    <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Location</th>
                                    <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Reason / Note</th>
                                    <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium text-xs">Loading tracking data...</td></tr>
                                ) : filteredReached.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium text-xs">No users found</td></tr>
                                ) : filteredReached.map(user => {
                                    const response = responses.find(r => r.userId === user.id);
                                    const isSelected = selectedUserIds.includes(user.id);

                                    return (
                                        <tr key={user.id} className={`group transition-colors ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50/50'}`}>
                                            {isPM && <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (isSelected) setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                                        else setSelectedUserIds([...selectedUserIds, user.id]);
                                                    }}
                                                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                                                />
                                            </td>}
                                            <td className="px-3 py-2">
                                                <div className="font-bold text-gray-900 text-xs md:text-sm leading-tight">{user.name}</div>
                                                <div className="text-[9px] text-gray-400 font-medium truncate max-w-[120px] md:max-w-none">{user.email}</div>
                                                <div className="md:hidden mt-0.5 text-[8px] text-gray-400 flex flex-wrap gap-x-2">
                                                    <span>{user.current_temple || user.hierarchy?.temple || '-'}</span>
                                                    <span>•</span>
                                                    <span>{user.center || user.hierarchy?.center || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 hidden md:table-cell">
                                                <div className="text-[10px] font-bold text-gray-700">
                                                    {user.current_temple || user.parent_temple || user.hierarchy?.temple || user.hierarchy?.currentTemple || '-'}
                                                </div>
                                                <div className="text-[9px] text-gray-400 font-medium">
                                                    {user.center || user.current_center || user.hierarchy?.center || user.hierarchy?.currentCenter || '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                {response ? (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${response.status === 'coming' || response.status === 'understood' ? 'bg-emerald-100 text-emerald-700' :
                                                            response.status === 'not_coming' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {response.status === 'understood' ? 'Understood' : response.status.replace('_', ' ')}
                                                        </span>
                                                        {response.status === 'coming' && (response.guestCount || 0) > 0 && (
                                                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest mt-0.5">
                                                                +{response.guestCount} Guest{(response.guestCount || 0) > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-gray-100 text-gray-400">
                                                        No Response
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] font-medium text-gray-600 hidden md:table-cell">
                                                {response?.reason ? (
                                                    <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 line-clamp-1">
                                                        {response.reason}
                                                    </span>
                                                ) : response?.status === 'not_coming' ? (
                                                    <span className="text-gray-400 italic text-[9px]">No reason</span>
                                                ) : '-'}
                                                {response?.isBulk && <div className="mt-0.5 text-[7px] font-black text-gray-400 uppercase tracking-tighter">BULK</div>}
                                            </td>
                                            <td className="px-3 py-2 text-[9px] text-gray-400 text-right font-medium">
                                                {response ? new Date(response.updatedAt || response.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-3 md:p-4 px-5 md:px-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-1.5 md:py-2 bg-white text-gray-900 border border-gray-200 rounded-lg text-xs md:text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { ManagedEvent } from '@/types';
import { format } from 'date-fns';
import { Mail, Users, CheckCircle, Clock, ChevronDown, Search, ArrowUpDown, ChevronLeft, ChevronRight, Filter, Edit2, Calendar, X, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { updateEventDeadline } from '@/lib/actions/events';
import { toast } from 'react-hot-toast';

interface AdminEventHistoryProps {
    events: ManagedEvent[];
    onRefresh?: () => void;
}

type SortKey = 'createdAt' | 'title' | 'reachedCount' | 'comingCount';

export default function AdminEventHistory({ events, onRefresh }: AdminEventHistoryProps) {
    const router = useRouter();
    const { userData } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'createdAt',
        direction: 'desc'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Editing State
    const [editingEvent, setEditingEvent] = useState<ManagedEvent | null>(null);
    const [newDeadlineDate, setNewDeadlineDate] = useState('');
    const [newDeadlineTime, setNewDeadlineTime] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const isSuperAdmin = useMemo(() => {
        const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
        return roles.some(r => (r as any) === '8' || String(r) === 'super_admin');
    }, [userData?.role]);

    const handleOpenEdit = (e: React.MouseEvent, event: ManagedEvent) => {
        e.stopPropagation();
        setEditingEvent(event);
        if (event.rsvpDeadline) {
            const dateObj = new Date(event.rsvpDeadline);
            setNewDeadlineDate(format(dateObj, 'yyyy-MM-dd'));
            setNewDeadlineTime(format(dateObj, 'HH:mm'));
        } else {
            setNewDeadlineDate('');
            setNewDeadlineTime('');
        }
    };

    const handleUpdateDeadline = async () => {
        if (!editingEvent || !userData) return;
        setIsUpdating(true);
        try {
            let deadline: Date | null = null;
            if (newDeadlineTime) {
                // If time is provided, we MUST have a date. Default to today if none selected.
                const dateStr = newDeadlineDate || new Date().toISOString().split('T')[0];
                deadline = new Date(`${dateStr}T${newDeadlineTime}`);
            }
            await updateEventDeadline(editingEvent.id, deadline, userData.id);
            toast.success('RSVP Deadline updated successfully');
            setEditingEvent(null);
            onRefresh?.();
        } catch (error: any) {
            console.error('Update failed:', error);
            toast.error(error.message || 'Failed to update deadline');
        } finally {
            setIsUpdating(false);
        }
    };

    // 1. Filtering Logic
    const filteredEvents = useMemo(() => {
        return events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.createdByName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [events, searchTerm]);

    // 2. Sorting Logic
    const sortedEvents = useMemo(() => {
        const items = [...filteredEvents];
        items.sort((a, b) => {
            const aValue = a[sortConfig.key] ?? 0;
            const bValue = b[sortConfig.key] ?? 0;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [filteredEvents, sortConfig]);

    // 3. Pagination Logic
    const paginatedEvents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedEvents.slice(start, start + pageSize);
    }, [sortedEvents, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedEvents.length / pageSize);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
        setCurrentPage(1); // Reset to first page on sort
    };

    const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
        return (
            <div className="flex flex-col -space-y-1">
                <ChevronDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180 text-purple-600' : 'text-gray-300'}`} />
                <ChevronDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'desc' ? 'text-purple-600' : 'text-gray-300'}`} />
            </div>
        );
    };

    return (
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-gray-200/50 border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Toolbar: Search & Summary */}
            <div className="px-4 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/10 gap-4">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Clock className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-gray-900 tracking-tight leading-none mb-1">Announcement History</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                            {sortedEvents.length} {sortedEvents.length === 1 ? 'broadcast' : 'broadcasts'} found
                            {searchTerm && <span className="text-purple-600 ml-1">• matching &quot;{searchTerm}&quot;</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-50 rounded-xl text-[11px] font-bold text-gray-700 transition-all placeholder:text-gray-300 placeholder:italic"
                        />
                    </div>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer outline-none"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[300px] custom-scrollbar-horizontal">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-gray-50/30 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-gray-100 group transition-colors"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center gap-2">
                                    Date & Time
                                    <SortIndicator columnKey="createdAt" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-gray-100 group transition-colors"
                                onClick={() => handleSort('title')}
                            >
                                <div className="flex items-center gap-2">
                                    Subject
                                    <SortIndicator columnKey="title" />
                                </div>
                            </th>
                            <th className="px-6 py-4 hidden md:table-cell">Author</th>
                            <th className="px-6 py-4">RSVP Deadline</th>
                            <th
                                className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 group transition-colors"
                                onClick={() => handleSort('reachedCount')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Audience
                                    <SortIndicator columnKey="reachedCount" />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedEvents.map((event) => (
                            <tr
                                key={event.id}
                                onClick={() => router.push(`/dashboard/events/tracking/${event.id}`)}
                                className="group hover:bg-purple-50/30 transition-all cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-50 text-gray-400 rounded-md group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                                            <Clock className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-black leading-none mb-1">{format(new Date(event.createdAt), 'MMM d, yyyy')}</div>
                                            <div className="text-[9px] font-bold text-black leading-none">{format(new Date(event.createdAt), 'hh:mm a')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 max-w-md">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${event.type === 'announcement'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                {event.type}
                                            </span>
                                            <span className="text-xs font-black text-gray-700 group-hover:text-purple-700 transition-colors uppercase tracking-tight line-clamp-1">{event.title}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black group-hover:bg-purple-600 transition-colors">
                                            {(event.createdByName || event.title).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-gray-900 leading-none mb-0.5">{event.createdByName || 'Admin'}</div>
                                            <div className="text-[9px] font-bold text-gray-400 lowercase leading-none">broadcast</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded ${event.rsvpDeadline && new Date() > new Date(event.rsvpDeadline) ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                                            <Clock className="h-3 w-3" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black ${event.rsvpDeadline ? 'text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                                                {event.rsvpDeadline ? format(new Date(event.rsvpDeadline), 'MMM d, hh:mm a') : 'No Deadline'}
                                            </span>
                                            {event.rsvpDeadline && new Date() > new Date(event.rsvpDeadline) && (
                                                <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter animate-pulse">Expired</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${
                                        event.type === 'event' 
                                            ? 'bg-blue-50 text-blue-700 border-blue-100/50' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                                    }`}>
                                        {event.type === 'event' ? <Users className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                        <span className={`${event.type === 'event' ? 'text-blue-900' : 'text-emerald-900'} font-black`}>
                                            {event.type === 'event' ? (
                                                <>
                                                    {event.comingCount || 0}
                                                    {(event.guestCount || 0) > 0 && (
                                                        <span className="text-[8px] ml-0.5 opacity-60">+{event.guestCount}</span>
                                                    )}
                                                </>
                                            ) : (event.understoodCount || 0)}
                                        </span>
                                        <span className={`${event.type === 'event' ? 'text-blue-300' : 'text-emerald-300'} mx-0.5`}>/</span>
                                        <span className="font-bold opacity-70">{event.reachedCount || 0}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black border border-emerald-100">
                                            <CheckCircle className="h-3 w-3" />
                                            Sent
                                        </div>
                                        {(event.createdBy === userData?.id || isSuperAdmin) && (
                                            <button
                                                onClick={(e) => handleOpenEdit(e, event)}
                                                className="p-1.5 bg-white border border-gray-100 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all shadow-sm"
                                                title="Edit RSVP Deadline"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Deadline Modal */}
            {editingEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setEditingEvent(null)}>
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Edit RSVP Deadline</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Extension & Grace Period</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingEvent(null)}
                                className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                <p className="text-[11px] font-black text-purple-900 uppercase tracking-tight mb-1">{editingEvent.title}</p>
                                <p className="text-[10px] text-black font-bold leading-tight">Current Deadline: {editingEvent.rsvpDeadline ? format(editingEvent.rsvpDeadline, 'MMM d, h:mm a') : 'No deadline set'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">New Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                        <input
                                            type="date"
                                            value={newDeadlineDate}
                                            onChange={(e) => setNewDeadlineDate(e.target.value)}
                                            className="w-full pl-9 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-purple-600 outline-none transition-all font-bold text-xs text-black"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">New Time</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                        <input
                                            type="time"
                                            value={newDeadlineTime}
                                            onChange={(e) => setNewDeadlineTime(e.target.value)}
                                            className="w-full pl-9 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-purple-600 outline-none transition-all font-bold text-xs text-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="flex gap-3">
                                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg h-fit">
                                        <RefreshCw className="h-3 w-3" />
                                    </div>
                                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                                        Changing the deadline will instantly lock or unlock RSVPs for all targeted users.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setEditingEvent(null)}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateDeadline}
                                disabled={isUpdating}
                                className="flex-[2] py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-gray-200"
                            >
                                {isUpdating ? (
                                    <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-3.5 w-3.5" />
                                        Update Deadline
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {sortedEvents.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Showing <span className="text-gray-900 font-black">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-gray-900 font-black">{Math.min(currentPage * pageSize, sortedEvents.length)}</span> of <span className="text-gray-900 font-black">{sortedEvents.length}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-purple-600 hover:border-purple-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-100 transition-all font-black active:scale-90"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple pagination windows logic
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all active:scale-90 ${currentPage === pageNum
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-purple-600 hover:border-purple-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-100 transition-all font-black active:scale-90"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {sortedEvents.length === 0 && (
                <div className="p-24 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 relative group">
                        <Search className="h-8 w-8 text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-purple-500/5 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                    </div>
                    <p className="text-gray-900 font-black text-lg tracking-tight mb-2">No results found</p>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                        Try adjusting your search terms or filters
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-6 text-[10px] font-black text-purple-600 uppercase tracking-widest hover:text-purple-700 underline underline-offset-4 active:scale-95 transition-all"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByHierarchy } from '@/lib/supabase/users';
import { User } from '@/types';
import { Users, Mail, Phone, Search, ArrowLeft, UserCheck, X, Trash2, Radio, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/roles';
import MultiSelect from '@/components/ui/MultiSelect';
import { supabase } from '@/lib/supabase/config';

export default function EventAdminAssignmentPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [allocations, setAllocations] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Assignment State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [targetTemples, setTargetTemples] = useState<string[]>([]);
    const [targetCenters, setTargetCenters] = useState<string[]>([]);

    // Meta (for MultiSelect)
    const [temples, setTemples] = useState<any[]>([]);
    const [centers, setCenters] = useState<any[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: async () => { },
        type: 'info'
    });

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const loadUsersAndFilters = useCallback(async () => {
        setLoading(true);
        setLoadingFilters(true);
        try {
            // Fetch users
            const fetchedUsers = await getUsersByHierarchy({});
            setUsers(fetchedUsers);

            // Fetch allocations
            if (supabase) {
                const { data: allocData } = await supabase.from('event_admin_allocations').select('*');
                if (allocData) {
                    const allocMap: Record<string, any> = {};
                    ((allocData || []) as any[]).forEach((item: any) => {
                        allocMap[item.user_id] = item;
                    });
                    setAllocations(allocMap);
                }

                // Fetch temples and centers for dropdowns
                const [{ data: templeData }, { data: centerData }] = await Promise.all([
                    supabase.from('temples').select('id, name').order('name'),
                    supabase.from('centers').select('id, name, temple_name').order('name')
                ]);

                setTemples(((templeData || []) as any[]).map((t: any) => ({ id: t.name, name: t.name })));
                setCenters(((centerData || []) as any[]).map((c: any) => ({ id: c.name, name: c.name, temple_name: c.temple_name })));
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load data', 'error');
        } finally {
            setLoadingFilters(false);
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (userData) {
            // Only Super Admins should access this tool
            const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);

            if (!isSuperAdmin) {
                router.push('/dashboard');
                return;
            }
            loadUsersAndFilters();
        }
    }, [userData, router, loadUsersAndFilters]);

    const handleAssignClick = async () => {
        try {
            if (!supabase) return;
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/admin/event-admin-assignment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({
                    userId: selectedUser?.id,
                    action: 'assign',
                    allowedTemples: targetTemples,
                    allowedCenters: targetCenters
                })
            });

            const result = await response.json();
            if (response.ok) {
                setShowAssignModal(false);
                setSelectedUser(null);
                setTargetTemples([]);
                setTargetCenters([]);
                showToast(`Role assigned successfully`, 'success');
                await loadUsersAndFilters();
            } else {
                showToast('Error: ' + result.error, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to assign role', 'error');
        }
    };

    const handleRevokeClick = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Revoke Role',
            message: 'Are you sure you want to revoke the Event Admin role and all its allocations?',
            type: 'danger',
            action: async () => {
                try {
                    if (!supabase) return;
                    const { data: { session } } = await supabase.auth.getSession();

                    const response = await fetch('/api/admin/event-admin-assignment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token || ''}`
                        },
                        body: JSON.stringify({
                            userId: selectedUser?.id,
                            action: 'revoke'
                        })
                    });

                    if (response.ok) {
                        setShowAssignModal(false);
                        setSelectedUser(null);
                        setTargetTemples([]);
                        setTargetCenters([]);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        showToast('Role revoked successfully', 'success');
                        await loadUsersAndFilters();
                    } else {
                        const err = await response.json();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        showToast('Error: ' + err.error, 'error');
                    }
                } catch (e) {
                    console.error(e);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    showToast('Failed to revoke role', 'error');
                }
            }
        });
    };

    const openAssignModal = (user: User) => {
        const alloc = allocations[user.id];
        setTargetTemples(alloc?.allowed_temples || []);
        setTargetCenters(alloc?.allowed_centers || []);
        setSelectedUser(user);
        setShowAssignModal(true);
    };

    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();

        return (
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.phone?.toLowerCase().includes(query) ||
            user.hierarchy?.city?.toLowerCase().includes(query)
        );
    });

    // Pagination Logic
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Filter centers based on selected temples for the modal
    const filteredCenterOptions = centers.filter(center => {
        if (targetTemples.length === 0) return true;
        return targetTemples.some(selectedTemple =>
            String(selectedTemple).trim().toLowerCase() === String(center.temple_name).trim().toLowerCase()
        );
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4 font-sans">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in ${toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'}`}>
                    {toast.type === 'success' ? (
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm"><UserCheck className="w-5 h-5" /></div>
                    ) : (
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm"><X className="w-5 h-5" /></div>
                    )}
                    <div>
                        <p className="font-bold text-sm tracking-wide">{toast.type === 'success' ? 'SUCCESS' : 'ERROR'}</p>
                        <p className="text-sm opacity-95">{toast.message}</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/50">
                    <div>
                        <button
                            onClick={() => router.push('/dashboard/admin')}
                            className="flex items-center text-purple-600 hover:text-purple-800 mb-3 transition-colors font-medium text-sm group"
                        >
                            <span className="bg-purple-100 p-1.5 rounded-lg mr-2 group-hover:bg-purple-200 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </span>
                            Back to Admin Dashboard
                        </button>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent tracking-tight">
                            Event Admin Management
                        </h1>
                        <p className="text-gray-600 mt-2 text-lg">Control broadcast permissions across Temples and Centers.</p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-[350px]">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-purple-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-4 py-4 text-gray-700 border-2 border-purple-100 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-400 bg-white/90 backdrop-blur transition-all placeholder:text-gray-400 font-medium shadow-sm hover:border-purple-200"
                        />
                    </div>
                </div>

                {/* Users Table Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-purple-50">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80">
                                    <th className="px-8 py-5 text-left text-xs font-black text-indigo-900 uppercase tracking-widest w-1/3">Devotee Profile</th>
                                    <th className="px-8 py-5 text-left text-xs font-black text-indigo-900 uppercase tracking-widest hidden md:table-cell w-1/4">Contact Details</th>
                                    <th className="px-8 py-5 text-left text-xs font-black text-indigo-900 uppercase tracking-widest min-w-[250px] w-1/4">Broadcast Scope</th>
                                    <th className="px-8 py-5 text-right text-xs font-black text-indigo-900 uppercase tracking-widest w-1/6">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/80">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-purple-600 font-medium">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                                <p>Fetching devotee profiles...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3 text-gray-500">
                                                <Search className="h-10 w-10 text-gray-300" />
                                                <p className="text-lg font-medium text-gray-600">No devotees found matching your criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map(user => {
                                        const alloc = allocations[user.id];
                                        const isEventAdmin = (Array.isArray(user.role) ? user.role : [user.role]).some(r => r === 30 || r === 'event_admin');

                                        return (
                                            <tr key={user.id} className={`group hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-300 ${isEventAdmin ? 'bg-indigo-50/30' : 'bg-white'}`}>
                                                <td className="px-8 py-5 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-inner ${isEventAdmin ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'}`}>
                                                            {user.name?.[0]?.toUpperCase() || <Users className="w-6 h-6" />}
                                                        </div>
                                                        <div className="ml-5">
                                                            <div className="text-base font-bold text-gray-900 flex items-center gap-3">
                                                                {user.name}
                                                                {isEventAdmin && (
                                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
                                                                        Event Admin
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-500 md:hidden mt-0.5">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 whitespace-nowrap hidden md:table-cell">
                                                    <div className="space-y-1.5">
                                                        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                            <div className="p-1.5 bg-gray-50 rounded-lg"><Mail className="w-3.5 h-3.5 text-gray-500" /></div>
                                                            {user.email || 'N/A'}
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                                            <div className="p-1.5 bg-gray-50 rounded-lg"><Phone className="w-3.5 h-3.5 text-gray-500" /></div>
                                                            {user.phone || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 min-w-[250px]">
                                                    {isEventAdmin && alloc ? (
                                                        <div className="text-sm space-y-2">
                                                            {alloc.allowed_temples?.length > 0 && (
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-bold text-indigo-900 text-xs uppercase tracking-wider py-0.5 shrink-0">Temples:</span>
                                                                    <span className="text-gray-700 font-medium leading-relaxed">{alloc.allowed_temples.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {alloc.allowed_centers?.length > 0 && (
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-bold text-purple-900 text-xs uppercase tracking-wider py-0.5 shrink-0">Centers:</span>
                                                                    <span className="text-gray-700 font-medium leading-relaxed">{alloc.allowed_centers.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {(!alloc.allowed_temples?.length && !alloc.allowed_centers?.length) && (
                                                                <span className="text-gray-400 italic bg-gray-50 px-3 py-1 rounded-full text-xs font-medium border border-gray-100">No active locations</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 block w-max">- Unassigned -</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => openAssignModal(user)}
                                                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm
                                                            ${isEventAdmin
                                                                ? 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md'
                                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <Radio className={`w-4 h-4 ${isEventAdmin ? 'text-indigo-500' : 'text-gray-400'}`} />
                                                        {isEventAdmin ? 'Edit Access' : 'Grant Role'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Enhanced Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-8 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-purple-100 shadow-xl shadow-purple-900/5">
                        <div className="text-sm font-medium text-gray-500 ml-4 hidden sm:block">
                            Showing <span className="text-indigo-700 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-indigo-700 font-bold">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-indigo-700 font-bold">{filteredUsers.length}</span> devotees
                        </div>

                        <div className="flex items-center space-x-2 mx-auto sm:mx-0 mr-4">
                            {/* First Page */}
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-2.5 bg-white text-gray-600 rounded-xl border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                title="First Page"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>

                            {/* Previous Page */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Prev</span>
                            </button>

                            {/* Page Indicator */}
                            <div className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-purple-100 min-w-[100px]">
                                <span className="text-sm font-bold text-indigo-700">
                                    {currentPage} <span className="text-gray-400 font-medium mx-1">/</span> {totalPages}
                                </span>
                            </div>

                            {/* Next Page */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            >
                                <span className="hidden sm:inline">Next</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Last Page */}
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-2.5 bg-white text-gray-600 rounded-xl border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                title="Last Page"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal */}
                {showAssignModal && selectedUser && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white transform scale-100 transition-all max-h-[90vh] flex flex-col">

                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex justify-between items-center shrink-0 border-b border-indigo-700/50">
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Event Admin Scope</h3>
                                    <p className="text-indigo-100 text-sm font-medium mt-1">Configure broadcast reach</p>
                                </div>
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="text-indigo-100 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-gray-50/50">
                                <div className="flex items-center gap-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center shadow-inner text-indigo-700 font-black text-xl border border-indigo-50">
                                        {selectedUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">{selectedUser.name}</h4>
                                        <p className="text-sm text-gray-500 font-medium">{selectedUser.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                            Allowed Temples
                                        </label>
                                        <MultiSelect
                                            options={temples}
                                            selectedValues={targetTemples}
                                            onChange={setTargetTemples}
                                            placeholder="Search & Select Temples"
                                            valueProperty="id"
                                            disabled={loadingFilters}
                                        />
                                        <p className="text-[11px] text-gray-500 font-medium ml-3 cursor-default">Leave blank to inherit no specific temples.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-purple-900 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
                                            Allowed Centers
                                        </label>
                                        <MultiSelect
                                            options={filteredCenterOptions}
                                            selectedValues={targetCenters}
                                            onChange={setTargetCenters}
                                            placeholder={targetTemples.length > 0 ? "Centers bounded to selected Temples" : "Search & Select Centers"}
                                            valueProperty="id"
                                            disabled={loadingFilters}
                                        />
                                        <p className="text-[11px] text-gray-500 font-medium ml-3 cursor-default">These centers will be explicitly available to the admin.</p>
                                    </div>
                                </div>

                                {(Array.isArray(selectedUser.role) ? selectedUser.role : [selectedUser.role]).some(r => r === 30 || r === 'event_admin') && (
                                    <div className="pt-6 mt-6 border-t border-gray-200">
                                        <button
                                            onClick={handleRevokeClick}
                                            className="w-full py-4 px-4 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl transition-all border border-red-100 hover:border-red-600 flex items-center justify-center gap-2 group shadow-sm hover:shadow-red-200"
                                        >
                                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            Terminate Event Admin Privileges
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="px-8 py-5 bg-white border-t border-gray-100 flex gap-4 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 py-3.5 px-6 bg-white text-gray-700 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all font-bold text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignClick}
                                    className="flex-1 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold text-sm shadow-xl shadow-indigo-900/20 transform hover:-translate-y-0.5"
                                >
                                    Confirm Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 transform scale-100 transition-all">
                            <div className="flex justify-center mb-4">
                                <div className={`p-3 rounded-full ${confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {confirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">{confirmModal.title}</h3>
                            <p className="text-gray-500 text-center mb-6">{confirmModal.message}</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmModal.action}
                                    className={`flex-1 py-2.5 text-white font-medium rounded-lg shadow-md transition-colors ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

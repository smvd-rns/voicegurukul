'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByHierarchy } from '@/lib/supabase/users';
import { User } from '@/types';
import { Users, Mail, Phone, Search, ArrowLeft, UserCheck, X, Trash2 } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/roles';

export default function CounselorAssignmentPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Bulk Selection State
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Counselor Assignment State
    const [showAssignCounselorModal, setShowAssignCounselorModal] = useState(false);
    const [selectedUserForCounselor, setSelectedUserForCounselor] = useState<User | null>(null);
    const [counselorAssignmentType, setCounselorAssignmentType] = useState<'counselor' | 'care_giver'>('counselor');

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

    // Bulk Selection Handlers
    const toggleSelectAll = () => {
        if (selectedUserIds.size === paginatedUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
        }
    };

    const toggleSelectOne = (userId: string) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleBulkAssignClick = (roleType: 'counselor' | 'care_giver') => {
        if (selectedUserIds.size === 0) return;

        setConfirmModal({
            isOpen: true,
            title: `Assign ${roleType === 'counselor' ? 'Counselor' : 'Care Giver'} Role`,
            message: `Are you sure you want to assign the ${roleType === 'counselor' ? 'Counselor' : 'Care Giver'} role to ${selectedUserIds.size} selected user${selectedUserIds.size > 1 ? 's' : ''}?`,
            type: 'info',
            action: async () => {
                await handleBulkAssign(roleType);
            }
        });
    };

    const handleBulkAssign = async (roleType: 'counselor' | 'care_giver') => {
        setBulkProcessing(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        try {
            const { supabase } = await import('@/lib/supabase/config');
            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            const ids = Array.from(selectedUserIds);
            let successCount = 0;
            let errorCount = 0;

            for (const userId of ids) {
                try {
                    const response = await fetch('/api/admin/counselor-assignment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token || ''}`
                        },
                        body: JSON.stringify({
                            userId,
                            action: 'assign',
                            roleType
                        })
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (e) {
                    errorCount++;
                }
            }

            setSelectedUserIds(new Set());
            showToast(`Assigned ${successCount} users. ${errorCount > 0 ? `${errorCount} failed.` : ''}`, errorCount > 0 ? 'error' : 'success');
            await loadUsers(); // Reload data without full page refresh
        } catch (e) {
            console.error(e);
            showToast('Failed to process bulk assignment', 'error');
        } finally {
            setBulkProcessing(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load users function
    const loadUsers = async () => {
        setLoading(true);
        const fetchedUsers = await getUsersByHierarchy({});
        setUsers(fetchedUsers);
        setLoading(false);
    };

    const handleRevokeClick = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Revoke Role',
            message: 'Are you sure you want to revoke this role? This will remove the user from the Counselors table.',
            type: 'danger',
            action: async () => {
                try {
                    const { supabase } = await import('@/lib/supabase/config');
                    const { data: { session } } = await supabase!.auth.getSession();

                    const response = await fetch('/api/admin/counselor-assignment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token || ''}`
                        },
                        body: JSON.stringify({
                            userId: selectedUserForCounselor?.id,
                            action: 'revoke'
                        })
                    });

                    if (response.ok) {
                        setShowAssignCounselorModal(false);
                        setSelectedUserForCounselor(null);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        showToast('Role revoked successfully', 'success');
                        await loadUsers(); // Reload data without full page refresh
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

    const handleAssignClick = async () => {
        try {
            const { supabase } = await import('@/lib/supabase/config');
            const { data: { session } } = await supabase!.auth.getSession();

            const response = await fetch('/api/admin/counselor-assignment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({
                    userId: selectedUserForCounselor?.id,
                    action: 'assign',
                    roleType: counselorAssignmentType
                })
            });

            const result = await response.json();
            if (response.ok) {
                setShowAssignCounselorModal(false);
                setSelectedUserForCounselor(null);
                showToast(`Role assigned successfully`, 'success');
                await loadUsers(); // Reload data without full page refresh
            } else {
                showToast('Error: ' + result.error, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to assign role', 'error');
        }
    };

    useEffect(() => {
        if (userData) {
            // Only Super Admins should access this dedicated admin tool
            const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);

            if (!isSuperAdmin) {
                router.push('/dashboard');
                return;
            }
            loadUsers();
        }
    }, [userData, router]);

    const filteredUsers = users
        .filter(user => {
            // Search query filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = (
                    user.name?.toLowerCase().includes(query) ||
                    user.email?.toLowerCase().includes(query) ||
                    user.phone?.toLowerCase().includes(query) ||
                    user.hierarchy?.city?.toLowerCase().includes(query)
                );
                if (!matchesSearch) return false;
            }

            // Role filter
            if (roleFilter !== 'all') {
                const userRoles = Array.isArray(user.role) ? user.role : [user.role];
                if (roleFilter === 'counselor') {
                    return userRoles.some(r => r === 'counselor' || r === 2);
                } else if (roleFilter === 'care_giver') {
                    return userRoles.some(r => r === 'care_giver' || r === 20);
                } else if (roleFilter === 'student') {
                    return userRoles.some(r => r === 'student' || r === 1);
                }
            }

            return true;
        })
        .sort((a, b) => {
            const nameA = a.name?.toLowerCase() || '';
            const nameB = b.name?.toLowerCase() || '';
            if (sortOrder === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });

    // Pagination Logic
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage, roleFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-8 px-4">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success' ? (
                        <div className="bg-white/20 p-1 rounded-full"><UserCheck className="w-5 h-5" /></div>
                    ) : (
                        <div className="bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></div>
                    )}
                    <div>
                        <p className="font-bold text-sm">{toast.type === 'success' ? 'Success' : 'Error'}</p>
                        <p className="text-sm opacity-90">{toast.message}</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => router.push('/dashboard/admin')}
                            className="flex items-center text-orange-700 hover:text-orange-900 mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">Counselor Management</h1>
                        <p className="text-gray-600">Assign Counselor and Care Giver roles to users</p>
                    </div>
                </div>

                {/* Filters, Search & Sort */}
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                    {/* Search */}
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, email, or city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 backdrop-blur text-sm"
                        />
                    </div>
                    
                    {/* Role Filter */}
                    <div className="w-full lg:w-48">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 backdrop-blur text-gray-700 font-medium cursor-pointer text-sm"
                        >
                            <option value="all">All Roles</option>
                            <option value="counselor">Counselors</option>
                            <option value="care_giver">Care Givers</option>
                            <option value="student">Students</option>
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div className="w-full lg:w-48">
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                            className="block w-full px-3 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 backdrop-blur text-gray-700 font-medium cursor-pointer text-sm"
                        >
                            <option value="asc">Name: A to Z</option>
                            <option value="desc">Name: Z to A</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedUserIds.size > 0 && (
                    <div className="mb-4 flex items-center gap-4 bg-orange-50 p-4 rounded-xl border border-orange-200 animate-in fade-in slide-in-from-top-2">
                        <span className="font-medium text-orange-800">{selectedUserIds.size} users selected</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkAssignClick('counselor')}
                                disabled={bulkProcessing}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                                {bulkProcessing ? 'Processing...' : 'Assign as Counselor'}
                            </button>
                            <button
                                onClick={() => handleBulkAssignClick('care_giver')}
                                disabled={bulkProcessing}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                                {bulkProcessing ? 'Processing...' : 'Assign as Care Giver'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-orange-100">
                            <thead className="bg-orange-50/50">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                                            checked={paginatedUsers.length > 0 && selectedUserIds.size === paginatedUsers.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-orange-800 uppercase tracking-wider hidden md:table-cell">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">Current Roles</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">No users found</td></tr>
                                ) : (
                                    paginatedUsers.map(user => (
                                        <tr key={user.id} className={`hover:bg-orange-50/30 transition-colors ${selectedUserIds.has(user.id) ? 'bg-orange-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                                                    checked={selectedUserIds.has(user.id)}
                                                    onChange={() => toggleSelectOne(user.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                                                        {user.name?.[0]?.toUpperCase() || <Users className="w-5 h-5" />}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500 md:hidden">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                                <div className="text-sm text-gray-900 flex items-center gap-2"><Mail className="w-3 h-3 text-gray-400" /> {user.email}</div>
                                                {user.phone && <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5"><Phone className="w-3 h-3 text-gray-400" /> {user.phone}</div>}
                                                {user.hierarchy?.city && <div className="text-xs text-gray-400 mt-1">{user.hierarchy.city}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(Array.isArray(user.role) ? user.role : [user.role]).map((r, i) => (
                                                        <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${(r === 'counselor' || r === 2)
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-gray-50 text-gray-600 border-gray-200'
                                                            }`}>
                                                            {getRoleDisplayName(r)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserForCounselor(user);
                                                        setCounselorAssignmentType('counselor');
                                                        setShowAssignCounselorModal(true);
                                                    }}
                                                    className="px-3 py-1.5 text-sm font-medium bg-white text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    Manage Role
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {filteredUsers.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-orange-100 shadow-sm animate-fade-in">
                        <div className="flex items-center space-x-2 text-sm text-gray-700 font-medium">
                            <span>Show</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700 font-semibold shadow-sm cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>entries</span>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-white text-orange-700 rounded-lg border border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50 transition-all shadow-sm font-medium flex items-center gap-2"
                                >
                                    Previous
                                </button>
                                <span className="text-gray-700 font-medium bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                                    Page <span className="text-orange-600 font-bold">{currentPage}</span> of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-white text-orange-700 rounded-lg border border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50 transition-all shadow-sm font-medium flex items-center gap-2"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal */}
                {showAssignCounselorModal && selectedUserForCounselor && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-orange-100 animate-fade-in transform scale-100 transition-all">
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">Assign Role</h3>
                                <button
                                    onClick={() => {
                                        setShowAssignCounselorModal(false);
                                        setSelectedUserForCounselor(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4 mb-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-600 font-bold border border-orange-200">
                                        {selectedUserForCounselor.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{selectedUserForCounselor.name}</h4>
                                        <p className="text-xs text-gray-500">{selectedUserForCounselor.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700">Select Role</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCounselorAssignmentType('counselor')}
                                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${counselorAssignmentType === 'counselor'
                                                ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                                                : 'border-gray-200 hover:border-orange-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <UserCheck className="h-6 w-6 mb-2" />
                                            <span className="font-medium text-sm">Counselor</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCounselorAssignmentType('care_giver')}
                                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${counselorAssignmentType === 'care_giver'
                                                ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                                                : 'border-gray-200 hover:border-orange-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Users className="h-6 w-6 mb-2" />
                                            <span className="font-medium text-sm">Care Giver</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md border border-blue-100 flex gap-2">
                                    <div className="mt-0.5 text-blue-500"><UserCheck className="w-3 h-3" /></div>
                                    <span>
                                        This will add the user to the <strong>Counselors</strong> table and assign the <strong>Level 2</strong> permission.
                                    </span>
                                </div>

                                {(Array.isArray(selectedUserForCounselor.role) ? selectedUserForCounselor.role : [selectedUserForCounselor.role]).some(r => r === 'counselor' || r === 2) && (
                                    <div className="border-t border-gray-100 pt-3 mt-2">
                                        <button
                                            onClick={handleRevokeClick}
                                            className="w-full py-2.5 px-3 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center justify-center gap-2 font-medium"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Revoke Access
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowAssignCounselorModal(false);
                                            setSelectedUserForCounselor(null);
                                        }}
                                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAssignClick}
                                        className="flex-1 py-2.5 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-md"
                                    >
                                        Confirm
                                    </button>
                                </div>
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

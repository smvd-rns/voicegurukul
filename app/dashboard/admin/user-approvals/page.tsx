'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPendingUsers, updateUser } from '@/lib/supabase/users';
import { getTemplesFromSupabase } from '@/lib/supabase/temples';
import { getCentersFromSupabase, CenterData } from '@/lib/supabase/centers';
import { getCounselorsFromSupabase, CounselorData } from '@/lib/supabase/counselors';
import { User, TempleData } from '@/types';
import {
  CheckCircle, XCircle, Search, Loader2, Shield, Pencil, Eye,
  Landmark, Building2, Users, Filter, AlertTriangle
} from 'lucide-react';
import { getRoleHierarchyNumber } from '@/lib/utils/roles';
import { supabase } from '@/lib/supabase/config';
import EditUserProfileModal from '../users/EditUserProfileModal';
import UserDetailsModal from '../users/UserDetailsModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { toast } from 'react-hot-toast';

type ApprovalFilterType = 'all' | 'other_none' | 'other_center' | 'other_temple' | 'other_counselor';

export default function UserApprovalsPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
    const [rejectionReason, setRejectionReason] = useState('');
    const [confirmApprove, setConfirmApprove] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

    // Location & Dropdown Filters
    const [selectedTemple, setSelectedTemple] = useState('');
    const [selectedCenter, setSelectedCenter] = useState('');
    const [selectedCounselor, setSelectedCounselor] = useState('');
    const [filterType, setFilterType] = useState<ApprovalFilterType>('all');
    const [showFilters, setShowFilters] = useState(true);

    // Superadmin Edit & Details Modals State
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);

    // Filter Options State for Superadmin editing
    const [templesList, setTemplesList] = useState<TempleData[]>([]);
    const [centersList, setCentersList] = useState<CenterData[]>([]);
    const [counselorsList, setCounselorsList] = useState<CounselorData[]>([]);

    // Check if current user is Super Admin
    const currentUserRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role || 'student'];
    const isSuperAdmin = currentUserRoles.some(r => r === 'super_admin' || r === 8 || getRoleHierarchyNumber(r) === 8);

    const toggleSelectAll = () => {
        if (selectedUserIds.size === filteredUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const toggleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
    };

    const handleBulkApproveClick = () => {
        setConfirmApprove({ isOpen: true, userId: null });
    };

    const handleBulkRejectClick = () => {
        setRejectionDialog({ isOpen: true, userId: null });
        setRejectionReason('');
    };

    const handleApproveClick = (userId: string) => {
        setConfirmApprove({ isOpen: true, userId });
    };

    const confirmApproveUser = async () => {
        if (!userData) return;

        const userIdsToApprove = confirmApprove.userId ? [confirmApprove.userId] : Array.from(selectedUserIds);
        if (userIdsToApprove.length === 0) return;

        setConfirmApprove({ isOpen: false, userId: null });

        if (confirmApprove.userId) setProcessingId(confirmApprove.userId);

        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token || '';

            const res = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    type: 'user',
                    ids: userIdsToApprove,
                    action: 'approve'
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to approve user(s)');

            setUsers(prev => prev.filter(u => !userIdsToApprove.includes(u.id)));
            setSelectedUserIds(prev => {
                const newSet = new Set(prev);
                userIdsToApprove.forEach(id => newSet.delete(id));
                return newSet;
            });
            toast.success(userIdsToApprove.length === 1 ? 'User approved successfully' : `${userIdsToApprove.length} users approved`);
        } catch (error: any) {
            console.error('Failed to approve user(s):', error);
            toast.error(error.message || 'Failed to approve user(s)');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectClick = (userId: string) => {
        setRejectionDialog({ isOpen: true, userId });
        setRejectionReason('');
    };

    const submitRejection = async () => {
        if (!rejectionReason.trim() || !userData) return;

        const userIdsToReject = rejectionDialog.userId ? [rejectionDialog.userId] : Array.from(selectedUserIds);
        if (userIdsToReject.length === 0) return;

        setRejectionDialog({ isOpen: false, userId: null });
        if (rejectionDialog.userId) setProcessingId(rejectionDialog.userId);

        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token || '';

            const res = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    type: 'user',
                    ids: userIdsToReject,
                    action: 'reject',
                    reason: rejectionReason.trim()
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to reject user(s)');

            setUsers(prev => prev.filter(u => !userIdsToReject.includes(u.id)));
            setSelectedUserIds(prev => {
                const newSet = new Set(prev);
                userIdsToReject.forEach(id => newSet.delete(id));
                return newSet;
            });
            toast.success('User registration rejected');
        } catch (error: any) {
            console.error('Failed to reject user(s):', error);
            toast.error(`Failed to reject user: ${error?.message || error}`);
        } finally {
            setProcessingId(null);
        }
    };

    const loadDropdownData = async () => {
        try {
            const [t, c, co] = await Promise.all([
                getTemplesFromSupabase(),
                getCentersFromSupabase(),
                getCounselorsFromSupabase()
            ]);
            setTemplesList(t);
            setCentersList(c);
            setCounselorsList(co);
        } catch (err) {
            console.error('Error fetching centers/temples:', err);
        }
    };

    useEffect(() => {
        if (userData) {
            const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            const isAdmin = currentUserRoles.some(role =>
                ['super_admin', 'state_admin', 'city_admin', 'bc_voice_manager', 'voice_manager', 'counselor'].includes(role as string) ||
                (typeof role === 'number' && role >= 2)
            );

            if (!isAdmin) {
                router.push('/dashboard');
                return;
            }
        }

        const loadPendingUsers = async () => {
            try {
                const pending = await getPendingUsers();
                setUsers(pending);
            } catch (err) {
                console.error('Error loading pending users:', err);
            } finally {
                setLoading(false);
            }
        };

        if (userData) {
            loadPendingUsers();
            loadDropdownData();
        }
    }, [userData, router]);

    // Cascading options
    const availableCenters = useMemo(() => {
        if (!selectedTemple || selectedTemple === '__other__' || selectedTemple === '__none__') return centersList;

        const templeObj = templesList.find(
            t => t.name?.trim().toLowerCase() === selectedTemple.trim().toLowerCase() || t.id === selectedTemple
        );

        return centersList.filter(c => {
            if (templeObj && c.temple_id && c.temple_id === templeObj.id) return true;
            if (c.temple_id && c.temple_id === selectedTemple) return true;
            if (c.temple_name && c.temple_name.trim().toLowerCase() === selectedTemple.trim().toLowerCase()) return true;
            return false;
        });
    }, [centersList, selectedTemple, templesList]);

    const availableCounselors = useMemo(() => {
        if (!selectedCenter || selectedCenter === '__other__' || selectedCenter === '__none__') return counselorsList;

        const centerObj = centersList.find(c => c.name === selectedCenter);
        if (centerObj) {
            return counselorsList.filter(co => co.city === centerObj.city);
        }
        return counselorsList;
    }, [counselorsList, selectedCenter, centersList]);

    // Searchable Select Options for Table Filters
    const templeFilterOptions = useMemo(() => [
        { id: '', name: 'All Temples' },
        { id: '__other__', name: '⚠️ Other Temple (Custom)' },
        { id: '__none__', name: '⚪ None / Unassigned Temple' },
        ...templesList.map(t => ({
            id: t.name,
            name: t.name,
            email: t.city ? (t.state ? `${t.city}, ${t.state}` : t.city) : t.state || ''
        }))
    ], [templesList]);

    const centerFilterOptions = useMemo(() => [
        { id: '', name: 'All Centers' },
        { id: '__other__', name: '⚠️ Other Center (Custom)' },
        { id: '__none__', name: '⚪ None / Unassigned Center' },
        ...availableCenters.map(c => ({
            id: c.name,
            name: c.name,
            email: [c.temple_name, c.city].filter(Boolean).join(' • ')
        }))
    ], [availableCenters]);

    const counselorFilterOptions = useMemo(() => [
        { id: '', name: 'All Counselors' },
        { id: '__other__', name: '⚠️ Other Counselor (Custom)' },
        { id: '__none__', name: '⚪ None / No Counselor' },
        ...availableCounselors.map(c => ({
            id: c.name,
            name: c.name,
            email: [c.ashram, c.city, c.mobile, c.email].filter(Boolean).join(' • ')
        }))
    ], [availableCounselors]);

    // Counts for badges
    const needsAllocationCount = useMemo(() => {
        return users.filter(u => {
            const h = u.hierarchy || {};
            const otherCenter = u.otherCenter || h.otherCenter || (u as any).other_center;
            const otherTemple = u.otherTemple || h.otherTemple || (u as any).other_temple;
            const otherCounselor = u.otherCounselor || h.otherCounselor || (u as any).other_counselor;
            const rawCenter = h.center || h.currentCenter || u.currentCenter;
            const rawTemple = h.currentTemple || u.currentTemple;
            const rawCounselor = h.counselor;

            return (
                rawCenter === 'Other' || rawCenter === 'None' || !rawCenter || Boolean(otherCenter) ||
                rawTemple === 'Other' || rawTemple === 'None' || !rawTemple || Boolean(otherTemple) ||
                rawCounselor === 'Other' || rawCounselor === 'None' || !rawCounselor || Boolean(otherCounselor)
            );
        }).length;
    }, [users]);

    const otherCenterCount = useMemo(() => {
        return users.filter(u => {
            const h = u.hierarchy || {};
            const otherCenter = u.otherCenter || h.otherCenter || (u as any).other_center;
            const rawCenter = h.center || h.currentCenter || u.currentCenter;
            return Boolean(otherCenter) || rawCenter === 'Other';
        }).length;
    }, [users]);

    const otherTempleCount = useMemo(() => {
        return users.filter(u => {
            const h = u.hierarchy || {};
            const otherTemple = u.otherTemple || h.otherTemple || (u as any).other_temple;
            const rawTemple = h.currentTemple || u.currentTemple;
            return Boolean(otherTemple) || rawTemple === 'Other';
        }).length;
    }, [users]);

    const otherCounselorCount = useMemo(() => {
        return users.filter(u => {
            const h = u.hierarchy || {};
            const otherCounselor = u.otherCounselor || h.otherCounselor || (u as any).other_counselor;
            const rawCounselor = h.counselor;
            return Boolean(otherCounselor) || rawCounselor === 'Other';
        }).length;
    }, [users]);

    // Super Admin Edit Handler
    const handleEditUser = (user: User) => {
        setUserToEdit(user);
        setIsEditProfileModalOpen(true);
    };

    // Super Admin Details Handler
    const handleViewDetails = (user: User) => {
        setSelectedUserDetails(user);
        setIsDetailsModalOpen(true);
    };

    const handleSaveUserProfile = async (userId: string, updatedData: Partial<User> & Record<string, any>) => {
        try {
            await updateUser(userId, updatedData);

            try {
                const { data: sessionData } = await supabase?.auth.getSession();
                const token = sessionData?.session?.access_token || '';
                await fetch(`/api/admin/users/${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        name: updatedData.name,
                        email: updatedData.email,
                        phone: updatedData.phone,
                        birthDate: updatedData.birthDate,
                        verificationStatus: updatedData.verificationStatus,
                        currentTemple: updatedData.currentTemple || updatedData.hierarchy?.currentTemple,
                        currentCenter: updatedData.currentCenter || updatedData.hierarchy?.currentCenter,
                        parentTemple: updatedData.parentTemple || updatedData.hierarchy?.parentTemple,
                        parentCenter: updatedData.parentCenter || updatedData.hierarchy?.parentCenter,
                        otherCenter: updatedData.otherCenter || updatedData.hierarchy?.otherCenter,
                        otherTemple: updatedData.otherTemple || updatedData.hierarchy?.otherTemple,
                        otherCounselor: updatedData.otherCounselor || updatedData.hierarchy?.otherCounselor,
                        ashram: updatedData.ashram || updatedData.hierarchy?.ashram,
                        counselor: updatedData.hierarchy?.counselor,
                        counselorId: updatedData.hierarchy?.counselorId,
                        initiationStatus: updatedData.hierarchy?.initiationStatus,
                        initiatedName: updatedData.hierarchy?.initiatedName,
                        spiritualMasterName: updatedData.hierarchy?.spiritualMasterName,
                        rounds: updatedData.hierarchy?.rounds,
                        introducedToKcIn: updatedData.introducedToKcIn || updatedData.hierarchy?.introducedToKcIn
                    })
                });
            } catch (patchErr) {
                console.warn('Optional backend sync warning:', patchErr);
            }

            // If Superadmin approved or rejected directly from the edit modal, remove from pending list
            if (updatedData.verificationStatus && updatedData.verificationStatus !== 'pending') {
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                // Otherwise update the local user row so the new center/temple/counselor is shown immediately
                setUsers(prev =>
                    prev.map(u => {
                        if (u.id === userId) {
                            return {
                                ...u,
                                ...updatedData,
                                hierarchy: {
                                    ...(u.hierarchy || {}),
                                    ...(updatedData.hierarchy || {})
                                }
                            };
                        }
                        return u;
                    })
                );
            }

            toast.success('User details updated successfully');
        } catch (err: any) {
            console.error('Error saving user profile:', err);
            toast.error(err.message || 'Failed to update user profile');
            throw err;
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const hierarchy = user.hierarchy || {};
            const otherCenter = user.otherCenter || hierarchy.otherCenter || (user as any).other_center || '';
            const otherTemple = user.otherTemple || hierarchy.otherTemple || (user as any).other_temple || '';
            const otherCounselor = user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor || '';

            const rawCenter = hierarchy.center || hierarchy.currentCenter || user.currentCenter || '';
            const rawTemple = hierarchy.currentTemple || user.currentTemple || '';
            const rawCounselor = hierarchy.counselor || hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor || '';
            const initiatedName = hierarchy.initiatedName || '';

            // 1. Text Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchName = user.name?.toLowerCase().includes(query) || initiatedName.toLowerCase().includes(query);
                const matchEmail = user.email?.toLowerCase().includes(query);
                const matchPhone = user.phone?.toLowerCase().includes(query);
                const matchLocation = (
                    hierarchy.city?.toLowerCase().includes(query) ||
                    rawCenter.toLowerCase().includes(query) ||
                    rawTemple.toLowerCase().includes(query) ||
                    otherCenter.toLowerCase().includes(query) ||
                    otherTemple.toLowerCase().includes(query) ||
                    otherCounselor.toLowerCase().includes(query)
                );

                if (!matchName && !matchEmail && !matchPhone && !matchLocation) return false;
            }

            // 2. Temple Filter
            if (selectedTemple) {
                const hasOtherTemple = Boolean(otherTemple) || rawTemple === 'Other';
                if (selectedTemple === '__other__') {
                    if (!hasOtherTemple) return false;
                } else if (selectedTemple === '__none__') {
                    if (rawTemple && rawTemple !== 'None' && !hasOtherTemple) return false;
                } else {
                    if (!rawTemple || rawTemple.trim().toLowerCase() !== selectedTemple.trim().toLowerCase()) return false;
                }
            }

            // 3. Center Filter
            if (selectedCenter) {
                const hasOtherCenter = Boolean(otherCenter) || rawCenter === 'Other';
                if (selectedCenter === '__other__') {
                    if (!hasOtherCenter) return false;
                } else if (selectedCenter === '__none__') {
                    if (rawCenter && rawCenter !== 'None' && !hasOtherCenter) return false;
                } else {
                    if (!rawCenter || rawCenter.trim().toLowerCase() !== selectedCenter.trim().toLowerCase()) return false;
                }
            }

            // 4. Counselor Filter
            if (selectedCounselor) {
                const hasOtherCounselor = Boolean(otherCounselor) || rawCounselor === 'Other';
                if (selectedCounselor === '__other__') {
                    if (!hasOtherCounselor) return false;
                } else if (selectedCounselor === '__none__') {
                    if (rawCounselor && rawCounselor !== 'None' && !hasOtherCounselor) return false;
                } else {
                    if (rawCounselor !== selectedCounselor) return false;
                }
            }

            // 5. Quick Filter Pills
            if (filterType === 'other_none') {
                const isCenterOtherOrNone = !rawCenter || rawCenter === 'None' || rawCenter === 'Other' || Boolean(otherCenter);
                const isTempleOtherOrNone = !rawTemple || rawTemple === 'None' || rawTemple === 'Other' || Boolean(otherTemple);
                const isCounselorOtherOrNone = !rawCounselor || rawCounselor === 'None' || rawCounselor === 'Other' || Boolean(otherCounselor);
                return isCenterOtherOrNone || isTempleOtherOrNone || isCounselorOtherOrNone;
            }

            if (filterType === 'other_center') {
                return Boolean(otherCenter) || rawCenter === 'Other';
            }

            if (filterType === 'other_temple') {
                return Boolean(otherTemple) || rawTemple === 'Other';
            }

            if (filterType === 'other_counselor') {
                return Boolean(otherCounselor) || rawCounselor === 'Other';
            }

            return true;
        });
    }, [users, searchQuery, selectedTemple, selectedCenter, selectedCounselor, filterType]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-5 relative">
            {/* Confirmation Modal */}
            {confirmApprove.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {confirmApprove.userId ? 'Confirm Approval' : 'Confirm Bulk Approval'}
                        </h3>
                        <p className="text-gray-600 text-sm mb-6">
                            {confirmApprove.userId
                                ? 'Are you sure you want to approve this devotee registration?'
                                : `Are you sure you want to approve ${selectedUserIds.size} selected users?`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmApprove({ isOpen: false, userId: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmApproveUser}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectionDialog.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {rejectionDialog.userId ? 'Reject User Registration' : 'Reject Selected Registrations'}
                        </h3>
                        <p className="text-gray-600 text-xs mb-4">
                            {rejectionDialog.userId
                                ? 'Please provide a reason for rejection. This will be visible to the user.'
                                : `Please provide a reason for rejecting ${selectedUserIds.size} users. This reason will be visible to all of them.`}
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none min-h-[100px] text-xs font-medium"
                            placeholder="Reason for rejection..."
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRejectionDialog({ isOpen: false, userId: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRejection}
                                disabled={!rejectionReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black font-display text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-600" />
                        User Approvals
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {users.length} Total Pending • {filteredUsers.length} Displayed
                        {needsAllocationCount > 0 && (
                            <span className="ml-2 font-bold text-amber-600">
                                ({needsAllocationCount} with Other/Unassigned Center or Temple)
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by legal name, spiritual name, email, phone, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 placeholder:text-gray-400 text-xs font-semibold transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-all shadow-2xs"
                    >
                        <Filter className={`w-3.5 h-3.5 ${showFilters ? 'text-orange-500' : ''}`} />
                        <span>{showFilters ? 'Hide Filters' : 'Filter by Temple & Center'}</span>
                    </button>
                </div>

                {/* Dropdown Filters (Temple, Center, Counselor) */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-gray-50 animate-in fade-in duration-150">
                        {/* Temple Filter */}
                        <SearchableSelect
                            options={templeFilterOptions}
                            value={selectedTemple}
                            valueProperty="id"
                            onChange={(val) => {
                                setSelectedTemple(val);
                                setSelectedCenter('');
                                setSelectedCounselor('');
                            }}
                            placeholder="All Temples"
                            searchPlaceholder="Search temple by name, city, state..."
                            icon={<Landmark className="w-3.5 h-3.5 text-gray-400" />}
                            className="w-full"
                            triggerClassName="w-full py-2 bg-white border border-gray-100 rounded-xl font-bold text-xs text-gray-600 shadow-2xs hover:border-gray-200 transition-colors"
                        />

                        {/* Center Filter */}
                        <SearchableSelect
                            options={centerFilterOptions}
                            value={selectedCenter}
                            valueProperty="id"
                            onChange={(val) => {
                                setSelectedCenter(val);
                                setSelectedCounselor('');
                            }}
                            placeholder="All Centers"
                            searchPlaceholder="Search center..."
                            icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
                            className="w-full"
                            triggerClassName="w-full py-2 bg-white border border-gray-100 rounded-xl font-bold text-xs text-gray-600 shadow-2xs hover:border-gray-200 transition-colors"
                        />

                        {/* Counselor Filter */}
                        <SearchableSelect
                            options={counselorFilterOptions}
                            value={selectedCounselor}
                            valueProperty="id"
                            onChange={(val) => setSelectedCounselor(val)}
                            placeholder="All Counselors"
                            searchPlaceholder="Search counselor by name, phone, email..."
                            icon={<Users className="w-3.5 h-3.5 text-gray-400" />}
                            className="w-full"
                            triggerClassName="w-full py-2 bg-white border border-gray-100 rounded-xl font-bold text-xs text-gray-600 shadow-2xs hover:border-gray-200 transition-colors"
                        />
                    </div>
                )}

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Quick:</span>
                    {[
                        { id: 'all', label: 'All Pending' },
                        { id: 'other_none', label: `⚠️ Needs Allocation (${needsAllocationCount})` },
                        { id: 'other_center', label: `Other Center (${otherCenterCount})` },
                        { id: 'other_temple', label: `Other Temple (${otherTempleCount})` },
                        { id: 'other_counselor', label: `Other Counselor (${otherCounselorCount})` },
                    ].map((pill) => (
                        <button
                            key={pill.id}
                            onClick={() => {
                                setFilterType(pill.id as any);
                                if (pill.id === 'all') {
                                    setSelectedTemple('');
                                    setSelectedCenter('');
                                    setSelectedCounselor('');
                                    setSearchQuery('');
                                }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
                                filterType === pill.id
                                    ? 'bg-gray-900 text-white border-transparent shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions Banner */}
            {selectedUserIds.size > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-xs text-orange-900">{selectedUserIds.size} users selected</span>
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 underline"
                        >
                            {selectedUserIds.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkRejectClick}
                            className="px-3.5 py-1.5 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                        >
                            <XCircle className="w-4 h-4" />
                            Reject Selected
                        </button>
                        <button
                            onClick={handleBulkApproveClick}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Approve Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Approvals Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Shield className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-base font-bold text-gray-800">No matching approvals found</p>
                        <p className="text-xs text-gray-500 mt-1">Try clearing your filters or search terms.</p>
                        <button
                            onClick={() => {
                                setSelectedTemple('');
                                setSelectedCenter('');
                                setSelectedCounselor('');
                                setFilterType('all');
                                setSearchQuery('');
                            }}
                            className="mt-3 text-orange-600 font-bold text-xs uppercase tracking-wider hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Spiritual Connection</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location & Affiliation</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Registered</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => {
                                    const hierarchy = user.hierarchy || {};
                                    const otherCenter = user.otherCenter || hierarchy.otherCenter || (user as any).other_center;
                                    const otherTemple = user.otherTemple || hierarchy.otherTemple || (user as any).other_temple;
                                    const otherCounselor = user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor;

                                    const rawCenter = hierarchy.center || hierarchy.currentCenter || user.currentCenter;
                                    const rawTemple = hierarchy.currentTemple || user.currentTemple;
                                    const rawCounselor = hierarchy.counselor;

                                    const hasOtherOrNone = (
                                        rawCenter === 'Other' || rawCenter === 'None' || !rawCenter || Boolean(otherCenter) ||
                                        rawTemple === 'Other' || rawTemple === 'None' || !rawTemple || Boolean(otherTemple) ||
                                        rawCounselor === 'Other' || rawCounselor === 'None' || !rawCounselor || Boolean(otherCounselor)
                                    );

                                    return (
                                        <tr
                                            key={user.id}
                                            className={`transition-colors ${hasOtherOrNone ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/60'}`}
                                        >
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.has(user.id)}
                                                    onChange={() => toggleSelectUser(user.id)}
                                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 h-10 w-10 relative">
                                                        {user.profileImage ? (
                                                            <Image
                                                                className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                                                src={user.profileImage}
                                                                alt=""
                                                                width={40}
                                                                height={40}
                                                                unoptimized={true}
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                                                                {user.name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-gray-900 leading-snug break-words">{user.name}</div>
                                                        {hierarchy.initiatedName && (
                                                            <div className="text-[10px] font-semibold text-amber-700">{hierarchy.initiatedName}</div>
                                                        )}
                                                        <div className="text-[11px] text-gray-500 truncate" title={user.email}>{user.email}</div>
                                                        <div className="text-[10px] text-gray-400 font-medium">{user.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs">
                                                <div className="text-gray-900 font-bold capitalize">{hierarchy.ashram || 'Student'}</div>
                                                <div className="text-gray-500 mt-0.5">
                                                    {otherCounselor || rawCounselor === 'Other' ? (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                                                            Other Counselor: {otherCounselor || 'Unspecified'}
                                                        </span>
                                                    ) : rawCounselor ? (
                                                        <span className="text-gray-600">Counselor: {rawCounselor}</span>
                                                    ) : (
                                                        <span className="text-red-500 font-medium">No counselor selected</span>
                                                    )}
                                                </div>
                                                {hierarchy.initiationStatus && (
                                                    <div className="text-[10px] text-gray-400 mt-0.5 capitalize">
                                                        Status: {hierarchy.initiationStatus}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs">
                                                <div className="font-bold text-gray-900">
                                                    {otherTemple || rawTemple === 'Other' ? (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                                                            Other Temple: {otherTemple || 'Unspecified'}
                                                        </span>
                                                    ) : (
                                                        rawTemple || <span className="text-gray-400 italic">No Temple</span>
                                                    )}
                                                </div>
                                                <div className="mt-1">
                                                    {otherCenter || rawCenter === 'Other' ? (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                                                            Other Center: {otherCenter || 'Unspecified'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600">{rawCenter || <span className="text-red-500">No Center</span>}</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {hierarchy.city ? `${hierarchy.city}, ${hierarchy.state || ''}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-medium">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* View Details Button */}
                                                    <button
                                                        onClick={() => handleViewDetails(user)}
                                                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                                        title="View Complete Profile"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {/* SUPERADMIN ONLY: Edit User Info Before Approving */}
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-[11px] font-bold border border-orange-200/80 transition-all flex items-center gap-1 shadow-2xs"
                                                            title="Edit user information or allocate official center/temple"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            <span>Edit Info</span>
                                                        </button>
                                                    )}

                                                    {/* Reject Button */}
                                                    <button
                                                        onClick={() => handleRejectClick(user.id)}
                                                        disabled={processingId === user.id}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 border border-transparent hover:border-red-200"
                                                        title="Reject Registration"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>

                                                    {/* Approve Button */}
                                                    <button
                                                        onClick={() => handleApproveClick(user.id)}
                                                        disabled={processingId === user.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm font-bold text-xs"
                                                        title="Approve User Registration"
                                                    >
                                                        {processingId === user.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Approve</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SUPERADMIN ONLY: Edit User Profile Modal */}
            {isSuperAdmin && (
                <EditUserProfileModal
                    isOpen={isEditProfileModalOpen}
                    user={userToEdit}
                    onClose={() => {
                        setIsEditProfileModalOpen(false);
                        setUserToEdit(null);
                    }}
                    onSave={handleSaveUserProfile}
                    templesList={templesList}
                    centersList={centersList}
                    counselorsList={counselorsList}
                    onRefreshData={loadDropdownData}
                />
            )}

            {/* User Details Modal (View Full Application) */}
            <UserDetailsModal
                isOpen={isDetailsModalOpen}
                user={selectedUserDetails}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedUserDetails(null);
                }}
                onEditProfile={(user) => {
                    setIsDetailsModalOpen(false);
                    if (isSuperAdmin) {
                        handleEditUser(user);
                    }
                }}
                onAssignRole={() => {}}
                onStatusChange={async (targetUser, newStatus) => {
                    if (newStatus === 'approved') {
                        setConfirmApprove({ isOpen: true, userId: targetUser.id });
                    } else if (newStatus === 'rejected') {
                        handleRejectClick(targetUser.id);
                    }
                }}
            />
        </div>
    );
}

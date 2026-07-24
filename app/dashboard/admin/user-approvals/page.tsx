'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPendingUsers, updateUser } from '@/lib/supabase/users'; // We need to update updateUser to support verificationStatus if it doesn't already
import { User } from '@/types';
import { CheckCircle, XCircle, Search, Filter, Loader2, Shield } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/roles';
import { supabase } from '@/lib/supabase/config';

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

        // Simple loading indication
        if (confirmApprove.userId) setProcessingId(confirmApprove.userId);

        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token || '';

            const res = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
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
        } catch (error) {
            console.error('Failed to approve user(s):', error);
            alert('Failed to approve user(s)');
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
                    ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
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
        } catch (error: any) {
            console.error('Failed to reject user(s):', error);
            alert(`Failed to reject user: ${error?.message || error}`);
        } finally {
            setProcessingId(null);
        }
    };

    useEffect(() => {
        // Check permissions - only admins should see this
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
            // In a real app we might want to filter pending users by the admin's scope (e.g. only users in their city)
            // For now, let's fetch all pending users and filter in UI or backend if needed.
            // But getPendingUsers fetches ALL pending users. 
            // Ideally we should pass filters to getPendingUsers, but for now let's just fetch all and filter client side if needed.
            const pending = await getPendingUsers();

            // Filter based on admin scope?
            // For this MVP, let's assume Super Admin sees all, others might be restricted.
            // But user asked for "User Approvals" page similar to Users page.
            setUsers(pending);
            setLoading(false);
        };

        if (userData) {
            loadPendingUsers();
        }
    }, [userData, router]);



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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 relative">
            {/* Confirmation Modal */}
            {confirmApprove.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {confirmApprove.userId ? 'Confirm Approval' : 'Confirm Bulk Approval'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {confirmApprove.userId
                                ? 'Are you sure you want to approve this user?'
                                : `Are you sure you want to approve ${selectedUserIds.size} selected users?`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmApprove({ isOpen: false, userId: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmApproveUser}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {rejectionDialog.userId ? 'Reject User' : 'Reject Selected Users'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {rejectionDialog.userId
                                ? 'Please provide a reason for rejection. This will be visible to the user.'
                                : `Please provide a reason for rejecting ${selectedUserIds.size} users. This reason will be visible to all of them.`}
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none min-h-[100px]"
                            placeholder="Reason for rejection..."
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRejectionDialog({ isOpen: false, userId: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRejection}
                                disabled={!rejectionReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-600" />
                        User Approvals
                    </h1>
                    <p className="text-gray-500 mt-1">Review and approve new user registrations</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none w-full sm:w-64"
                    />
                </div>
            </div>

            {selectedUserIds.size > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                        <span className="font-medium text-orange-900">{selectedUserIds.size} users selected</span>
                        <button
                            onClick={toggleSelectAll}
                            className="text-sm text-orange-600 hover:text-orange-700 underline"
                        >
                            {selectedUserIds.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleBulkRejectClick}
                            className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm flex items-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Reject Selected
                        </button>
                        <button
                            onClick={handleBulkApproveClick}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Approve Selected
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Shield className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No pending approvals</p>
                        <p className="text-sm mt-1">All caught up! There are no users waiting for approval.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spiritual Connection</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`transition-colors ${(user.hierarchy?.center === 'Other' || user.hierarchy?.center === 'None' || !user.hierarchy?.center ||
                                        user.hierarchy?.currentCenter === 'Other' || user.hierarchy?.currentCenter === 'None' || !user.hierarchy?.currentCenter ||
                                        user.hierarchy?.counselor === 'Other' || user.hierarchy?.counselor === 'None' || !user.hierarchy?.counselor)
                                        ? 'bg-red-100/80 hover:bg-red-200/80'
                                        : 'hover:bg-gray-50/50'
                                        }`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.has(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    {user.profileImage ? (
                                                        <Image
                                                            className="h-10 w-10 rounded-full object-cover"
                                                            src={user.profileImage}
                                                            alt=""
                                                            width={40}
                                                            height={40}
                                                            unoptimized={true}
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                                            {user.name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                    <div className="text-xs text-gray-400">{user.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">{user.hierarchy?.ashram || 'Not specified'}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {user.hierarchy?.counselor === 'Other' ? (
                                                    <span className="text-red-600 font-medium">Other: {user.hierarchy.otherCounselor}</span>
                                                ) : user.hierarchy?.counselor ? (
                                                    `Counselor: ${user.hierarchy.counselor}`
                                                ) : (
                                                    <span className="text-red-500">No counselor selected</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.hierarchy?.currentTemple || 'Unknown Temple'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {user.hierarchy?.center === 'Other' || user.hierarchy?.currentCenter === 'Other' ? (
                                                    <span className="text-red-600 font-medium">Other: {user.hierarchy.otherCenter}</span>
                                                ) : (
                                                    user.hierarchy?.currentCenter || user.hierarchy?.center || <span className="text-red-500">No center</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {user.hierarchy?.city}, {user.hierarchy?.state}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.createdAt?.toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleRejectClick(user.id)}
                                                    disabled={processingId === user.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleApproveClick(user.id)}
                                                    disabled={processingId === user.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                                                >
                                                    {processingId === user.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import {
    Check, X, User, Clock, AlertCircle, Eye,
    ChevronDown, ChevronUp, History, UserCheck,
    MessageCircle, ArrowRight, Shield, Mail, Calendar, Search
} from 'lucide-react';
import { canAccessLevel } from '@/lib/utils/roles';

interface ProfileRequest {
    id: string;
    user_id: string;
    requested_changes: any;
    current_values: any;
    status: 'pending' | 'approved' | 'rejected';
    admin_feedback: string | null;
    created_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export default function ProfileApprovalsPage() {
    const { user, userData } = useAuth();
    const [requests, setRequests] = useState<ProfileRequest[]>([]);
    const [loading, setLoading] = useState(false); // Start false to avoid stuck loading if auth takes time
    const [debugError, setDebugError] = useState<string | null>(null);
    const [apiDebug, setApiDebug] = useState<string[]>([]);
    const [rawResponse, setRawResponse] = useState<any>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            setDebugError(null);
            console.log('Fetching requests...'); // Debug log
            let token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (!token && supabase) {
                const session = await supabase.auth.getSession();
                token = session.data.session?.access_token || null;
            }

            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`/api/profile-requests?status=${selectedStatus}&_t=${new Date().getTime()}`, {
                headers,
                cache: 'no-store'
            });
            const data = await response.json();
            console.log('API Response:', data); // Debug log

            if (data.debug) {
                setApiDebug(data.debug);
            }

            if (data.success && Array.isArray(data.data)) {
                setRequests(data.data);
            } else {
                setRequests([]);
                setDebugError(data.error || 'API returned failure or invalid format');
                console.warn('Invalid data format or error:', data);
            }
        } catch (error: any) {
            console.error('Error fetching requests:', error);
            setRequests([]);
            setDebugError(error.message || 'Network or client error');
        } finally {
            setLoading(false);
        }
    }, [selectedStatus]);

    useEffect(() => {
        if (!userData) return;
        // userData.role comes from normalizeRoleFromFirestore which returns string/string[]
        // e.g. role 8 → 'super_admin', role [11] → 'managing_director'
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        const roleNums = roles.map(Number); // only useful if stored as numbers
        const roleStrs = roles.map(String); // used for string role names
        const adminRoleStrings = [
            'super_admin', 'admin', 'managing_director', 'director',
            'central_voice_manager', 'youth_preacher', 'project_manager',
            'project_advisor', 'acting_manager', 'center_admin', 'counselor',
            'care_giver', 'oc', 'mentor'
        ];
        const adminRoleNumbers = [2, 8, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 25];
        const canView =
            roleStrs.some(r => adminRoleStrings.includes(r)) ||
            roleNums.some(n => adminRoleNumbers.includes(n));
        console.log('[ProfileApprovals] userData.role:', userData.role, '→ canView:', canView);
        if (canView) {
            fetchRequests();
        }
    }, [userData, selectedStatus, fetchRequests]);

    const handleBatchAction = async (status: 'approved' | 'rejected') => {
        if (selectedRequestIds.length === 0) return;

        try {
            setProcessingId('batch');
            let token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (!token && supabase) {
                const session = await supabase.auth.getSession();
                token = session.data.session?.access_token || null;
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/profile-requests/batch', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    requestIds: selectedRequestIds,
                    status,
                    feedback: status === 'rejected' ? 'Batch rejection' : undefined
                })
            });

            const result = await response.json();
            if (result.success) {
                setRequests(requests.filter(r => !selectedRequestIds.includes(r.id)));
                setSelectedRequestIds([]);
                alert(result.message);
            } else {
                alert(result.error || 'Failed to process batch requests');
            }
        } catch (error) {
            console.error('Batch action error:', error);
            alert('An error occurred while processing bulk requests');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = useMemo(() => {
        if (!searchQuery.trim()) return requests;
        const q = searchQuery.toLowerCase().trim();
        return requests.filter(req => {
            const name = (req.user?.name || '').toLowerCase();
            const email = (req.user?.email || '').toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [requests, searchQuery]);

    const toggleSelectAll = () => {
        if (selectedRequestIds.length === filteredRequests.length && filteredRequests.length > 0) {
            setSelectedRequestIds([]);
        } else {
            setSelectedRequestIds(filteredRequests.map(r => r.id));
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedRequestIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        try {
            setProcessingId(id);
            let token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (!token && supabase) {
                const session = await supabase.auth.getSession();
                token = session.data.session?.access_token || null;
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`/api/profile-requests/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    status,
                    feedback,
                    approvedFields: status === 'approved' ? selectedFields[id] : undefined
                })
            });

            const result = await response.json();
            if (result.success) {
                setRequests(requests.filter(r => r.id !== id));
                setExpandedId(null);
                setFeedback('');
            } else {
                alert(result.error || 'Failed to process request');
            }
        } catch (error) {
            console.error('Action error:', error);
            alert('An error occurred while processing the request');
        } finally {
            setProcessingId(null);
        }
    };

    const renderFieldChange = (requestId: string, key: string, newValue: any, oldValue: any) => {
        // Skip internal technical ID fields (show names instead)
        if (key === 'counselorId' || key === 'counselor_id') return null;

        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

        // Normalize values for display
        const displayOld = (oldValue === null || oldValue === undefined || oldValue === '') ? 'Not Set' : oldValue.toString();
        const displayNew = (newValue === null || newValue === undefined || newValue === '') ? 'Cleared' : newValue.toString();

        // If both are functionally empty, skip
        if (displayOld === 'Not Set' && (displayNew === 'Cleared' || displayNew === '')) return null;
        if (displayOld === displayNew) return null;

        const isSelected = selectedFields[requestId]?.includes(key) ?? true;

        const toggleField = () => {
            setSelectedFields(prev => {
                const current = prev[requestId] || Object.keys(requests.find(r => r.id === requestId)?.requested_changes || {});
                if (current.includes(key)) {
                    return { ...prev, [requestId]: current.filter(k => k !== key) };
                } else {
                    return { ...prev, [requestId]: [...current, key] };
                }
            });
        };

        return (
            <div
                key={key}
                className={`flex items-start gap-2.5 sm:gap-3 py-2 sm:py-2.5 border-b border-gray-100 last:border-0 hover:bg-amber-50/40 transition-colors px-1.5 sm:px-2 rounded-xl cursor-pointer ${!isSelected ? 'opacity-50' : ''}`}
                onClick={selectedStatus === 'pending' ? toggleField : undefined}
            >
                {selectedStatus === 'pending' && (
                    <div className="pt-1 shrink-0">
                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 ring-2 ring-amber-200' : 'border-gray-300 bg-white'}`}>
                            {isSelected && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white stroke-[3px]" />}
                        </div>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        {label}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5">
                        <div className="flex items-center gap-1.5 bg-rose-50/70 border border-rose-100 px-2 py-1 rounded-lg text-xs min-w-0">
                            <span className="text-[9.5px] font-bold text-rose-500 uppercase tracking-tight shrink-0">Current:</span>
                            <span className="text-gray-600 line-through decoration-rose-300 truncate" title={displayOld}>{displayOld}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 px-2 py-1 rounded-lg text-xs min-w-0">
                            <span className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-tight shrink-0">Requested:</span>
                            <span className="font-bold text-emerald-800 truncate" title={displayNew}>{displayNew}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        type: 'approved' | 'rejected' | null;
        count: number;
        requestId?: string | null;
    }>({ isOpen: false, type: null, count: 0, requestId: null });

    const openConfirmation = (type: 'approved' | 'rejected', requestId: string | null = null) => {
        setConfirmation({
            isOpen: true,
            type,
            count: requestId ? 1 : requests.filter(r => selectedRequestIds.includes(r.id)).length,
            requestId
        });
    };

    const confirmAction = async () => {
        if (confirmation.type) {
            if (confirmation.requestId) {
                await handleAction(confirmation.requestId, confirmation.type);
            } else {
                await handleBatchAction(confirmation.type);
            }
            setConfirmation({ isOpen: false, type: null, count: 0, requestId: null });
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 animate-fadeIn p-2.5 sm:p-4 lg:p-6 relative">
            {/* Custom Confirmation Modal */}
            {confirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden transform transition-all border border-gray-100">
                        <div className={`p-4 sm:p-5 ${confirmation.type === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-full shrink-0 ${confirmation.type === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {confirmation.type === 'approved' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-800">
                                        {confirmation.type === 'approved' ? 'Approve Requests' : 'Reject Requests'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                                        Are you sure you want to {confirmation.type} <span className="font-bold text-gray-800">{confirmation.count}</span> {confirmation.count === 1 ? 'request' : 'requests'}?
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5 bg-white space-y-3">
                            <p className="text-xs text-gray-400 italic">
                                This action will process all selected requests immediately.
                                {confirmation.type === 'approved' && ' All profile changes for these users will be applied.'}
                            </p>
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmation({ isOpen: false, type: null, count: 0 })}
                                    className="px-3.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmAction}
                                    className={`px-4 sm:px-5 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                                        confirmation.type === 'approved'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                                >
                                    Confirm {confirmation.type === 'approved' ? 'Approval' : 'Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-md border border-amber-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 p-3.5 sm:p-5 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-inner shrink-0">
                                <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-xl font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                                    Profile Update Approvals
                                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 border border-white/25">
                                        {requests.length}
                                    </span>
                                </h1>
                                <p className="text-amber-100 text-[11px] sm:text-xs mt-0.5 font-medium line-clamp-1">
                                    Review and manage sensitive spiritual information updates
                                </p>
                            </div>
                        </div>

                        {/* Controls & Status Tabs */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                            {selectedStatus === 'pending' && selectedRequestIds.length > 0 && (
                                <button
                                    onClick={() => openConfirmation('approved')}
                                    disabled={processingId !== null}
                                    className="px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve ({selectedRequestIds.length})</span>
                                </button>
                            )}

                            <div className="flex items-center bg-black/15 backdrop-blur-md rounded-xl p-1 border border-white/20 shrink-0">
                                {(['pending', 'approved', 'rejected'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setSelectedStatus(status);
                                            setSelectedRequestIds([]);
                                        }}
                                        className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                            selectedStatus === status
                                                ? 'bg-white text-amber-700 shadow-xs'
                                                : 'text-amber-100 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Bulk Selection Toolbar */}
            {requests.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-100 shadow-2xs">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by devotee name or email..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs text-gray-800 bg-gray-50/70 border border-gray-200 rounded-xl focus:border-amber-500 focus:bg-white outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {selectedStatus === 'pending' && filteredRequests.length > 0 && (
                        <div className="flex items-center justify-between sm:justify-end gap-3 px-1">
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-amber-700 cursor-pointer"
                            >
                                <div
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                        selectedRequestIds.length === filteredRequests.length && filteredRequests.length > 0
                                            ? 'bg-amber-500 border-amber-500'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedRequestIds.length === filteredRequests.length && filteredRequests.length > 0 && (
                                        <Check className="h-3 w-3 text-white stroke-[3px]" />
                                    )}
                                </div>
                                <span className="text-[11px] sm:text-xs">
                                    {selectedRequestIds.length === 0
                                        ? 'Select All'
                                        : `${selectedRequestIds.length} of ${filteredRequests.length} Selected`}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-xs border border-gray-100">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-amber-200 border-t-amber-600 shadow-xs mb-3"></div>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium animate-pulse">Fetching requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xs border border-dashed border-gray-200 p-8 sm:p-12 text-center animate-fadeIn">
                    <div className="inline-flex items-center justify-center p-3 bg-gray-50 rounded-full mb-3">
                        <Shield className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-700 text-sm sm:text-base font-bold">
                        {searchQuery ? 'No matching requests found.' : `No ${selectedStatus} requests found.`}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                        {searchQuery ? 'Try clearing your search term.' : 'All caught up with current profile updates.'}
                    </p>
                    {debugError && (
                        <div className="mt-3 p-2.5 bg-red-50 text-red-700 rounded-xl text-xs font-mono max-w-md mx-auto">
                            Error: {debugError}
                        </div>
                    )}
                    {apiDebug.length > 0 && (
                        <div className="mt-2.5 p-2.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-mono max-w-md mx-auto text-left space-y-1">
                            <span className="font-bold text-gray-700">API Debug Log:</span>
                            {apiDebug.map((line, idx) => (
                                <div key={idx}>- {line}</div>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => fetchRequests()}
                        className="mt-3 px-3.5 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-amber-600 transition-colors cursor-pointer"
                    >
                        Refresh
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5 sm:space-y-3">
                    {filteredRequests.map((request) => {
                        const isExpanded = expandedId === request.id;
                        const isSelected = selectedRequestIds.includes(request.id);
                        const changesCount = Object.keys(request.requested_changes || {}).length;

                        return (
                            <div
                                key={request.id}
                                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isExpanded
                                        ? 'ring-2 ring-amber-400 border-amber-400 shadow-md'
                                        : isSelected
                                        ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                                        : 'border-gray-200/80 hover:border-amber-200 shadow-2xs hover:shadow-xs'
                                }`}
                            >
                                {/* Request Summary Row */}
                                <div
                                    className="p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-4 cursor-pointer select-none"
                                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                                >
                                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                        {selectedStatus === 'pending' && (
                                            <div
                                                className="shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(request.id);
                                                }}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-amber-500 border-amber-500 shadow-xs'
                                                            : 'border-gray-300 hover:border-amber-400 bg-white'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                                                </div>
                                            </div>
                                        )}

                                        <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
                                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                                    {request.user?.name || 'Unknown User'}
                                                </h3>
                                                {request.status === 'pending' && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {changesCount} {changesCount === 1 ? 'change' : 'changes'}
                                                    </span>
                                                )}
                                                {request.status === 'approved' && (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                                                        Approved
                                                    </span>
                                                )}
                                                {request.status === 'rejected' && (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-bold shrink-0">
                                                        Rejected
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 mt-0.5 flex-wrap">
                                                <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-[200px]" title={request.user?.email}>
                                                    <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                                                    <span className="truncate">{request.user?.email || 'No email'}</span>
                                                </span>
                                                <span className="hidden xs:inline text-gray-300">•</span>
                                                <span className="flex items-center gap-1 shrink-0 text-gray-400">
                                                    <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                                                    {new Date(request.created_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                        {request.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openConfirmation('approved', request.id);
                                                }}
                                                disabled={processingId === request.id}
                                                className="px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-200 hover:shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                title="Quick Approve"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">Approve</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                                                isExpanded
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                                            }`}
                                            title={isExpanded ? 'Collapse' : 'Expand Details'}
                                        >
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Comparison View */}
                                {isExpanded && (
                                    <div className="px-2.5 pb-3 sm:px-4 sm:pb-4 pt-1 border-t border-gray-100 bg-slate-50/60 animate-fadeIn">
                                        <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 mt-1 space-y-3">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <History className="h-4 w-4 text-amber-600" />
                                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                        Changes Comparison
                                                    </h4>
                                                </div>
                                                {selectedStatus === 'pending' && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: [] }))}
                                                            className="text-gray-400 hover:text-rose-600 cursor-pointer"
                                                        >
                                                            Deselect All
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: Object.keys(request.requested_changes) }))}
                                                            className="text-gray-400 hover:text-emerald-600 cursor-pointer"
                                                        >
                                                            Select All
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Field Changes */}
                                            <div className="space-y-1">
                                                {Object.keys(request.requested_changes || {}).map(key =>
                                                    renderFieldChange(request.id, key, request.requested_changes[key], request.current_values?.[key])
                                                )}
                                            </div>

                                            {/* Feedback and Submission for Pending */}
                                            {request.status === 'pending' ? (
                                                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <MessageCircle className="h-3.5 w-3.5 text-gray-500" />
                                                            <label className="text-xs font-bold text-gray-700">
                                                                Authority Feedback / Rejection Reason
                                                            </label>
                                                        </div>
                                                        <textarea
                                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-500 focus:bg-white outline-none resize-none transition-colors"
                                                            rows={2}
                                                            placeholder="Optional for approval; required if rejecting..."
                                                            value={feedback}
                                                            onChange={(e) => setFeedback(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openConfirmation('rejected', request.id)}
                                                            disabled={processingId === request.id}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                feedback.trim() === ''
                                                                    ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                                                                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white'
                                                            }`}
                                                            title={feedback.trim() === '' ? 'Please provide feedback to reject' : 'Reject request'}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Reject Update
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => openConfirmation('approved', request.id)}
                                                            disabled={processingId === request.id || (selectedFields[request.id] && selectedFields[request.id].length === 0)}
                                                            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                            {selectedFields[request.id]?.length === Object.keys(request.requested_changes).length || !selectedFields[request.id]
                                                                ? 'Approve All Changes'
                                                                : `Approve (${selectedFields[request.id]?.length}) Selected`}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                                    <div className="flex items-center gap-1.5 mb-1 text-gray-500 font-bold uppercase text-[10px]">
                                                        <Shield className="h-3.5 w-3.5" />
                                                        Processed
                                                    </div>
                                                    <div className="text-gray-700">
                                                        Status:{' '}
                                                        <span className={`font-bold ${request.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {request.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {request.admin_feedback && (
                                                        <p className="mt-1.5 text-gray-600 italic bg-white p-2 rounded-lg border border-gray-200 text-xs">
                                                            &ldquo;{request.admin_feedback}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="h-6" />
        </div>
    );
}

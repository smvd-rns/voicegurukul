'use client';

import { useState, useEffect, useCallback } from 'react';
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

    const toggleSelectAll = () => {
        if (selectedRequestIds.length === requests.length) {
            setSelectedRequestIds([]);
        } else {
            setSelectedRequestIds(requests.map(r => r.id));
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedRequestIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // ... (rest of the component logic)

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
                className={`flex items-start gap-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-lg cursor-pointer ${!isSelected ? 'opacity-60 grayscale-[0.5]' : ''}`}
                onClick={selectedStatus === 'pending' ? toggleField : undefined}
            >
                {selectedStatus === 'pending' && (
                    <div className="pt-5">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 ring-2 ring-amber-200' : 'border-gray-300 bg-white'}`}>
                            {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                        </div>
                    </div>
                )}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label} (Current)</span>
                        <span className="text-sm text-gray-600 line-through decoration-red-300 opacity-70 bg-red-50/30 px-2 py-1 rounded w-fit">{displayOld}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">{label} (Requested)</span>
                        <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded shadow-sm">{displayNew}</span>
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
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn p-4 sm:p-0 relative">
            {/* Custom Confirmation Modal */}
            {confirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-gray-100">
                        <div className={`p-6 ${confirmation.type === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${confirmation.type === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {confirmation.type === 'approved' ? <Check className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">
                                        {confirmation.type === 'approved' ? 'Approve Requests' : 'Reject Requests'}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Are you sure you want to {confirmation.type} <span className="font-bold text-gray-800">{confirmation.count}</span> requests?
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white space-y-3">
                            <p className="text-xs text-gray-400 italic">
                                This action will process all selected requests immediately.
                                {confirmation.type === 'approved' && " All profile changes for these users will be applied."}
                            </p>
                            <div className="flex items-center justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setConfirmation({ isOpen: false, type: null, count: 0 })}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all transform hover:scale-105 ${confirmation.type === 'approved'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-emerald-200'
                                        : 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-red-200'
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
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
      `}</style>

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden transform transition-all hover:shadow-2xl">
                <div className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 px-6 py-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-sm font-display tracking-tight">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                                    <UserCheck className="h-6 w-6 text-white" />
                                </div>
                                Profile Update Approvals
                            </h1>
                            <p className="text-amber-50/90 text-sm mt-1 font-medium italic">Review and manage sensitive spiritual information updates by authority</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {selectedStatus === 'pending' && (
                                <div className="flex items-center bg-white/20 backdrop-blur-md rounded-xl p-1 shadow-inner overflow-hidden border border-white/30 mr-2">
                                    <button
                                        onClick={() => openConfirmation('approved')}
                                        disabled={selectedRequestIds.length === 0 || processingId !== null}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center gap-2 ${selectedRequestIds.length > 0 && processingId === null
                                            ? 'bg-white text-emerald-600 shadow-md hover:bg-emerald-50 cursor-pointer'
                                            : 'bg-white/10 text-white/50 cursor-not-allowed'
                                            }`}
                                    >
                                        <Check className="h-3 w-3" />
                                        Approve ({selectedRequestIds.length})
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center bg-white/20 backdrop-blur-md rounded-xl p-1 shadow-inner overflow-hidden border border-white/30">
                                {(['pending', 'approved', 'rejected'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setSelectedStatus(status);
                                            setSelectedRequestIds([]);
                                        }}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${selectedStatus === status
                                            ? 'bg-white text-orange-600 shadow-md transform scale-[1.02]'
                                            : 'text-white hover:bg-white/10'
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

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 shadow-sm mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Fetching requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-dashed border-gray-200 p-16 text-center animate-fadeInUp">
                    <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-full mb-4">
                        <Shield className="h-12 w-12 text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No {selectedStatus} requests found.</p>
                    <p className="text-gray-400 text-sm mt-1">Excellent! All caught up with current profile updates.</p>
                    {debugError && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-mono max-w-md mx-auto">
                            Error: {debugError}
                        </div>
                    )}
                    {apiDebug.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-mono max-w-md mx-auto text-left space-y-1">
                            <span className="font-bold text-gray-700">API Debug Log:</span>
                            {apiDebug.map((line, idx) => (
                                <div key={idx}>- {line}</div>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => fetchRequests()}
                        className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow hover:bg-amber-600 transition-colors"
                    >
                        Refresh Requests
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {selectedStatus === 'pending' && requests.length > 0 && (
                        <div className="flex items-center gap-3 px-6 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${selectedRequestIds.length === requests.length && requests.length > 0 ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}
                                onClick={toggleSelectAll}
                            >
                                {selectedRequestIds.length === requests.length && requests.length > 0 && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                            </div>
                            <span className="text-sm font-semibold text-gray-600">
                                {selectedRequestIds.length === 0 ? 'Select All' : `${selectedRequestIds.length} Selected`}
                            </span>
                        </div>
                    )}

                    {requests.map((request) => (
                        <div
                            key={request.id}
                            className={`bg-white rounded-2xl shadow-md border transition-all duration-300 overflow-hidden ${expandedId === request.id
                                ? 'ring-2 ring-amber-400 border-transparent shadow-2xl scale-[1.01]'
                                : selectedRequestIds.includes(request.id) ? 'border-amber-300 bg-amber-50/30' : 'border-gray-100 hover:border-amber-200 hover:shadow-lg'
                                }`}
                        >
                            {/* Request Row */}
                            <div
                                className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                            >
                                <div className="flex items-center gap-4">
                                    {selectedStatus === 'pending' && (
                                        <div
                                            className="mr-2"
                                            onClick={(e) => { e.stopPropagation(); toggleSelection(request.id); }}
                                        >
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedRequestIds.includes(request.id) ? 'bg-amber-500 border-amber-500 shadow-sm' : 'border-gray-300 hover:border-amber-400 bg-white'}`}>
                                                {selectedRequestIds.includes(request.id) && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100 shadow-sm relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-blue-400/10 scale-0 group-hover:scale-100 transition-transform rounded-full"></div>
                                        <User className="h-6 w-6 text-blue-600 relative z-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            {request.user?.name || 'Unknown User'}
                                            {request.status === 'pending' && <span className="p-1.5 bg-amber-100 text-amber-600 rounded-full animate-pulse transition-all hover:scale-110" title="Pending Review"><Clock className="h-3 w-3" /></span>}
                                        </h3>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                {request.user?.email || 'No email provided'}
                                            </span>
                                            <span className="text-sm text-gray-400 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                {new Date(request.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        className={`p-2.5 rounded-xl transition-all duration-300 ${expandedId === request.id
                                            ? 'bg-amber-100 text-amber-600'
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                            }`}
                                    >
                                        {expandedId === request.id ? <ChevronUp className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                    {request.status === 'pending' && (
                                        <div className="hidden sm:flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openConfirmation('approved', request.id); }}
                                                disabled={processingId === request.id}
                                                className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl text-sm font-bold transition-all shadow-sm border border-emerald-100 hover:shadow-md disabled:opacity-50"
                                            >
                                                {processingId === request.id ? '...' : <div className="flex items-center gap-2"><Check className="h-4 w-4" /> Approve</div>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Comparison View */}
                            {expandedId === request.id && (
                                <div className="px-6 pb-6 pt-2 border-t border-gray-50 animate-fadeIn bg-slate-50/50">
                                    <div className="bg-white rounded-2xl shadow-inner border border-gray-100 p-6 mt-2">
                                        <div className="flex items-center justify-between gap-2 mb-6 border-b border-gray-100 pb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                                    <History className="h-5 w-5 text-blue-500" />
                                                </div>
                                                <h4 className="font-bold text-gray-800 tracking-tight">Changes Comparison</h4>
                                            </div>
                                            {selectedStatus === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFields(prev => ({ ...prev, [request.id]: [] }));
                                                        }}
                                                        className="text-[10px] font-bold uppercase text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        Deselect All
                                                    </button>
                                                    <span className="text-gray-200">|</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFields(prev => ({ ...prev, [request.id]: Object.keys(request.requested_changes) }));
                                                        }}
                                                        className="text-[10px] font-bold uppercase text-gray-400 hover:text-emerald-500 transition-colors"
                                                    >
                                                        Select All
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            {Object.keys(request.requested_changes).map(key =>
                                                renderFieldChange(request.id, key, request.requested_changes[key], request.current_values[key])
                                            )}
                                        </div>

                                        {request.status === 'pending' ? (
                                            <div className="mt-8 pt-6 border-t border-gray-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <MessageCircle className="h-5 w-5 text-gray-400" />
                                                    <label className="text-sm font-bold text-gray-700">Authority Feedback / Rejection Reason</label>
                                                </div>
                                                <textarea
                                                    className="w-full px-4 py-3 text-sm bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition-all outline-none"
                                                    rows={3}
                                                    placeholder="Provide feedback or reason for rejection if necessary..."
                                                    value={feedback}
                                                    onChange={(e) => setFeedback(e.target.value)}
                                                />
                                                <div className="flex justify-end gap-3 mt-4">
                                                    <button
                                                        onClick={() => openConfirmation('rejected', request.id)}
                                                        disabled={processingId === request.id}
                                                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border border-red-100 flex items-center gap-2 ${feedback.trim() === ''
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                            : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:shadow-md'
                                                            }`}
                                                        title={feedback.trim() === '' ? 'Please provide feedback to reject' : 'Reject request'}
                                                    >
                                                        <X className="h-4 w-4" /> Reject Update
                                                    </button>
                                                    <button
                                                        onClick={() => openConfirmation('approved', request.id)}
                                                        disabled={processingId === request.id || (selectedFields[request.id] && selectedFields[request.id].length === 0)}
                                                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        {selectedFields[request.id]?.length === Object.keys(request.requested_changes).length || !selectedFields[request.id]
                                                            ? 'Approve All Changes'
                                                            : `Approve ${selectedFields[request.id]?.length} Selected Fields`}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Shield className="h-4 w-4 text-gray-400" />
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Process Details</span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Status: <span className={`font-bold ${request.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>{request.status.toUpperCase()}</span>
                                                </p>
                                                {request.admin_feedback && (
                                                    <p className="text-sm text-gray-600 mt-2 italic shadow-sm bg-white p-3 rounded-xl border border-gray-100">
                                                        &quot; {request.admin_feedback} &quot;
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="h-8" />
        </div>
    );
}

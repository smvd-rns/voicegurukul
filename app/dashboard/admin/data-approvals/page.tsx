'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { Shield, Check, X, Building2, MapPin, User, Loader2, AlertCircle, Lock } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useAuth } from '@/components/providers/AuthProvider';

export default function DataApprovalsPage() {
    const { userData, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'centers' | 'cities' | 'counselors'>('centers');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'danger' | 'warning';
        title: string;
        message: string;
        action: 'approve' | 'reject' | null;
    }>({
        isOpen: false,
        type: 'warning',
        title: '',
        message: '',
        action: null
    });

    const router = useRouter();

    const fetchData = useCallback(async () => {
        // Double check access before fetching
        if (!userData) return;

        let roles = userData.role;
        if (typeof roles === 'string' && roles.startsWith('[')) {
            try { roles = JSON.parse(roles); } catch { }
        }
        const rolesArray = Array.isArray(roles) ? roles : [roles];
        const hasAccess = rolesArray.some(r => {
            const val = String(r).trim();
            return val === '8' || val === 'super_admin';
        });

        if (!hasAccess) return;

        setLoading(true);
        try {
            let table = '';
            if (activeTab === 'centers') table = 'centers';
            if (activeTab === 'cities') table = 'cities';
            if (activeTab === 'counselors') table = 'counselors';

            if (!supabase) return;

            const { data: items, error } = await supabase
                .from(table)
                .select('*')
                .eq('is_verified', false) // Only get pending items
                .order('created_at', { ascending: false, nullsFirst: true });

            if (error) throw error;
            setData(items || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [userData, activeTab]);

    useEffect(() => {
        if (!authLoading && userData) {
            // Check if user has role 8 (Super Admin) - Robust check with JSON parse & string handling
            let roles = userData.role;
            if (typeof roles === 'string' && roles.startsWith('[')) {
                try { roles = JSON.parse(roles); } catch { }
            }
            const rolesArray = Array.isArray(roles) ? roles : [roles];
            const hasAccess = rolesArray.some(r => {
                const val = String(r).trim();
                return val === '8' || val === 'super_admin';
            });

            if (!hasAccess) {
                // Redirect or show access denied
                // We'll let the render handle the access denied view
                return;
            }
            fetchData();
        }
        setSelectedIds(new Set());
    }, [activeTab, authLoading, userData, fetchData]);

    const getSingularType = (tab: string) => {
        const map: Record<string, string> = {
            'centers': 'center',
            'cities': 'city',
            'counselors': 'counselor'
        };
        return map[tab] || tab.slice(0, -1);
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setProcessingId(id);
        try {
            if (!supabase) return;
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    type: getSingularType(activeTab),
                    id,
                    action
                })
            });

            if (!response.ok) throw new Error('Failed to update');

            // Remove from list
            setData(prev => prev.filter(item => item.id !== id));
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });

        } catch (error) {
            console.error('Error processing action:', error);
            alert('Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    const initiateBulkAction = (action: 'approve' | 'reject') => {
        if (selectedIds.size === 0) return;

        setModalConfig({
            isOpen: true,
            type: action === 'approve' ? 'success' : 'danger',
            title: `${action === 'approve' ? 'Approve' : 'Reject'} ${selectedIds.size} Items?`,
            message: `Are you sure you want to ${action} the selected items? This action cannot be undone.`,
            action: action
        });
    };

    const executeBulkAction = async () => {
        const action = modalConfig.action;
        if (!action) return;

        setBulkProcessing(true);
        try {
            if (!supabase) return;
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const ids = Array.from(selectedIds);
            const batchSize = 5;

            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                await Promise.all(batch.map(id =>
                    fetch('/api/admin/verify-data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                            type: getSingularType(activeTab),
                            id,
                            action
                        })
                    })
                ));
            }

            setData(prev => prev.filter(item => !selectedIds.has(item.id)));
            setSelectedIds(new Set());
            setModalConfig(prev => ({ ...prev, isOpen: false })); // Close modal on success

        } catch (error) {
            console.error(`Error processing bulk ${action}:`, error);
            alert(`Failed to complete bulk ${action}. Some items may not have been updated.`);
            fetchData();
        } finally {
            setBulkProcessing(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === data.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(data.map(item => item.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Check access for render
    const hasAccess = userData && (() => {
        let roles = userData.role;

        // Handle stringified JSON (potential edge case)
        if (typeof roles === 'string' && roles.startsWith('[')) {
            try {
                roles = JSON.parse(roles);
            } catch (e) {
                console.error('Failed to parse role string:', e);
            }
        }

        const rolesArray = Array.isArray(roles) ? roles : [roles];
        return rolesArray.some(r => {
            const val = String(r).trim();
            return val === '8' || val === 'super_admin';
        });
    })();

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="p-4 bg-red-100 rounded-full mb-4">
                    <Lock className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-500 max-w-md mb-6">
                    You do not have permission to access this page. This area is restricted to Super Administrators only.
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-t-lg font-medium transition-colors ${activeTab === id
                ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeBulkAction}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.action === 'approve' ? 'Yes, Approve All' : 'Yes, Reject All'}
                isLoading={bulkProcessing}
            />

            <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Data Approvals</h1>
                    <p className="text-gray-500">Verify user-submitted centers, cities, and counselors</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <TabButton id="centers" label="Pending Centers" icon={Building2} />
                <TabButton id="cities" label="Pending Cities" icon={MapPin} />
                <TabButton id="counselors" label="Pending Counselors" icon={User} />
            </div>

            {/* Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="mb-4 flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <span className="font-medium text-blue-800">{selectedIds.size} items selected</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => initiateBulkAction('approve')}
                            disabled={bulkProcessing}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                        >
                            {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Approve Selected
                        </button>
                        <button
                            onClick={() => initiateBulkAction('reject')}
                            disabled={bulkProcessing}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                        >
                            {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            Reject Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        Loading pending items...
                    </div>
                ) : data.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                        <p>No pending {activeTab} to verify.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            checked={data.length > 0 && selectedIds.size === data.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4">Name</th>
                                    {activeTab !== 'cities' && <th className="px-6 py-4">Details</th>}
                                    {activeTab === 'counselors' && <th className="px-6 py-4">Contact</th>}
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((item) => (
                                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelectOne(item.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {item.name}
                                            {activeTab === 'cities' && <span className="block text-xs text-gray-500">{item.state}</span>}
                                        </td>

                                        {activeTab !== 'cities' && (
                                            <td className="px-6 py-4 text-gray-600">
                                                {activeTab === 'centers' && (
                                                    <>
                                                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.city}, {item.state}</div>
                                                        {item.address && <div className="text-xs mt-1 opacity-75">{item.address}</div>}
                                                    </>
                                                )}
                                                {activeTab === 'counselors' && (
                                                    <>
                                                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.city}</div>
                                                        <div className="text-xs mt-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full inline-block">{item.ashram}</div>
                                                    </>
                                                )}
                                            </td>
                                        )}

                                        {activeTab === 'counselors' && (
                                            <td className="px-6 py-4 text-gray-600">
                                                <div>{item.email}</div>
                                                <div className="text-xs">{item.mobile}</div>
                                            </td>
                                        )}

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleAction(item.id, 'approve')}
                                                    disabled={processingId === item.id || bulkProcessing}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Approve"
                                                >
                                                    {processingId === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => handleAction(item.id, 'reject')}
                                                    disabled={processingId === item.id || bulkProcessing}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    {processingId === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
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

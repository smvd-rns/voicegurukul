'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Plus, Trash2, Building2, MapPin, Phone, User, ShieldCheck, Edit2 } from 'lucide-react';
import {
    getTemplesFromSupabase,
    addTempleToSupabase,
    updateTempleInSupabase,
    deleteTempleFromSupabase,
    addTemplesBulkToSupabase
} from '@/lib/supabase/temples';
import { TempleData } from '@/types';
import { indianStates, stateCities } from '@/lib/data/india-states';
import { supabase } from '@/lib/supabase/config';
import { getUsersForDropdown } from '@/lib/supabase/users';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function TemplesPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [temples, setTemples] = useState<TempleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTemple, setNewTemple] = useState({
        name: '', state: '', city: '', address: '', contact: '',
        managing_director_id: '', director_id: '', central_voice_manager_id: '', yp_id: ''
    });
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [showImportSection, setShowImportSection] = useState(false);
    const [editingTempleId, setEditingTempleId] = useState<string | null>(null);
    const [editTempleData, setEditTempleData] = useState<any>(null);
    const [editAvailableCities, setEditAvailableCities] = useState<string[]>([]);

    // Only Super Admin (Role 8) can access this page
    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const userOptions = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email
    }));

    useEffect(() => {
        if (userData && !isSuperAdmin) {
            router.push('/dashboard');
            return;
        }
    }, [userData, isSuperAdmin, router]);

    useEffect(() => {
        if (isSuperAdmin) {
            loadTemples();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (newTemple.state) {
            const cities = stateCities[newTemple.state] || [];
            setAvailableCities(cities);
            if (!cities.includes(newTemple.city)) {
                setNewTemple(prev => ({ ...prev, city: '' }));
            }
        } else {
            setAvailableCities([]);
        }
    }, [newTemple.state, newTemple.city]);

    useEffect(() => {
        if (editTempleData?.state) {
            const cities = stateCities[editTempleData.state] || [];
            setEditAvailableCities(cities);
        } else {
            setEditAvailableCities([]);
        }
    }, [editTempleData?.state]);

    const loadTemples = async () => {
        setLoading(true);
        try {
            const allTemples = await getTemplesFromSupabase();
            setTemples(allTemples);
        } catch (error) {
            console.error('Error loading temples:', error);
            setError('Failed to load temples');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const allUsers = await getUsersForDropdown();
            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading users', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) {
            loadUsers();
        }
    }, [isSuperAdmin]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                selectedFile.type === 'application/vnd.ms-excel' ||
                selectedFile.name.endsWith('.xlsx') ||
                selectedFile.name.endsWith('.xls')) {
                setFile(selectedFile);
                setError('');
            } else {
                setError('Please select a valid Excel file (.xlsx or .xls)');
                setFile(null);
            }
        }
    };

    const parseExcel = async (file: File): Promise<any[]> => {
        return new Promise(async (resolve, reject) => {
            try {
                const XLSX = await import('xlsx');
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error('Failed to parse Excel file. Please ensure it is a valid Excel file.'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
            } catch (error) {
                reject(new Error('Failed to load Excel parser. Please refresh the page and try again.'));
            }
        });
    };

    const handleImport = async () => {
        if (!file) {
            setError('Please select a file');
            return;
        }

        setImporting(true);
        setError('');
        setSuccess('');
        setProgress({ processed: 0, total: 0, errors: 0 });

        try {
            const data = await parseExcel(file);
            setProgress({ processed: 0, total: data.length, errors: 0 });

            const templesToImport: Omit<TempleData, 'id' | 'created_at' | 'updated_at'>[] = [];
            let parseErrors = 0;

            for (const row of data) {
                const name = row.name || row.Name || '';
                const state = row.state || row.State || '';
                const city = row.city || row.City || '';
                const address = row.address || row.Address || '';
                const contact = row.contact || row.Contact || '';

                if (!name || !state || !city) {
                    parseErrors++;
                    continue;
                }

                templesToImport.push({
                    name: typeof name === 'string' ? name : String(name),
                    state: typeof state === 'string' ? state : String(state),
                    city: typeof city === 'string' ? city : String(city),
                    address: address ? String(address) : undefined,
                    contact: contact ? String(contact) : undefined,
                });
            }

            if (templesToImport.length > 0) {
                const result = await addTemplesBulkToSupabase(templesToImport);

                const totalErrors = parseErrors + result.errors;
                const totalProcessed = result.success;

                setProgress({
                    processed: totalProcessed,
                    total: data.length,
                    errors: totalErrors
                });

                if (totalErrors > 0) {
                    setSuccess(`Import completed with warnings. Imported: ${totalProcessed}. Errors: ${totalErrors}.`);
                } else {
                    setSuccess(`Successfully imported ${totalProcessed} temples.`);
                }
            } else {
                setError('No valid data found in file. Please checks columns (name, state, city).');
            }

            setFile(null);
            loadTemples();

            const fileInput = document.getElementById('excel-file') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (err: any) {
            setError(err.message || 'Failed to import file');
        } finally {
            setImporting(false);
        }
    };

    const handleAddTemple = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemple.name || !newTemple.state || !newTemple.city) {
            setError('Name, State, and City are required');
            return;
        }

        try {
            const success = await addTempleToSupabase({
                name: newTemple.name,
                state: newTemple.state,
                city: newTemple.city,
                address: newTemple.address || undefined,
                contact: newTemple.contact || undefined,
                managing_director_id: newTemple.managing_director_id || undefined,
                managing_director_name: newTemple.managing_director_id ? userOptions.find(u => u.id === newTemple.managing_director_id)?.name : undefined,
                director_id: newTemple.director_id || undefined,
                director_name: newTemple.director_id ? userOptions.find(u => u.id === newTemple.director_id)?.name : undefined,
                central_voice_manager_id: newTemple.central_voice_manager_id || undefined,
                central_voice_manager_name: newTemple.central_voice_manager_id ? userOptions.find(u => u.id === newTemple.central_voice_manager_id)?.name : undefined,
                yp_id: newTemple.yp_id || undefined,
                yp_name: newTemple.yp_id ? userOptions.find(u => u.id === newTemple.yp_id)?.name : undefined,
            });

            if (success) {
                setSuccess('Temple added successfully');
                setNewTemple({
                    name: '', state: '', city: '', address: '', contact: '',
                    managing_director_id: '', director_id: '', central_voice_manager_id: '', yp_id: ''
                });
                setShowAddForm(false);
                loadTemples();
            } else {
                setError('Failed to add temple');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add temple');
        }
    };

    const handleEditTemple = (temple: TempleData) => {
        setEditingTempleId(temple.id);
        setEditTempleData({
            id: temple.id,
            name: temple.name,
            state: temple.state,
            city: temple.city,
            address: temple.address || '',
            contact: temple.contact || '',
            managing_director_id: temple.managing_director_id || '',
            director_id: temple.director_id || '',
            central_voice_manager_id: temple.central_voice_manager_id || '',
            yp_id: temple.yp_id || '',
        });
        setError('');
        setSuccess('');
    };

    const handleUpdateTemple = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTempleId || !editTempleData.name || !editTempleData.state || !editTempleData.city) {
            setError('Name, State, and City are required');
            return;
        }

        try {
            const success = await updateTempleInSupabase(editingTempleId, {
                name: editTempleData.name,
                state: editTempleData.state,
                city: editTempleData.city,
                address: editTempleData.address || undefined,
                contact: editTempleData.contact || undefined,
                managing_director_id: editTempleData.managing_director_id || undefined,
                managing_director_name: editTempleData.managing_director_id ? userOptions.find(u => u.id === editTempleData.managing_director_id)?.name : undefined,
                director_id: editTempleData.director_id || undefined,
                director_name: editTempleData.director_id ? userOptions.find(u => u.id === editTempleData.director_id)?.name : undefined,
                central_voice_manager_id: editTempleData.central_voice_manager_id || undefined,
                central_voice_manager_name: editTempleData.central_voice_manager_id ? userOptions.find(u => u.id === editTempleData.central_voice_manager_id)?.name : undefined,
                yp_id: editTempleData.yp_id || undefined,
                yp_name: editTempleData.yp_id ? userOptions.find(u => u.id === editTempleData.yp_id)?.name : undefined,
            });

            if (success) {
                setSuccess('Temple updated successfully');
                setEditingTempleId(null);
                loadTemples();
            } else {
                setError('Failed to update temple');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update temple');
        }
    };

    const handleDeleteTemple = async (templeId: string) => {
        if (!confirm('Are you sure you want to delete this temple?')) return;

        try {
            const success = await deleteTempleFromSupabase(templeId);
            if (success) {
                setSuccess('Temple deleted successfully');
                loadTemples();
            } else {
                setError('Failed to delete temple');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete temple');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 -m-8 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-primary-600 font-semibold text-sm mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Administrative Dashboard</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                            Temples Management
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                            Oversee and organize ISKCON temples across India. Manage roles, locations, and central coordination.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowImportSection(!showImportSection)}
                            className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 border-2 ${showImportSection
                                ? 'bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/20'
                                : 'bg-white border-gray-100 text-gray-700 hover:border-primary-200 hover:bg-primary-50'
                                }`}
                        >
                            <FileSpreadsheet className="h-5 w-5" />
                            {showImportSection ? 'Hide Import' : 'Bulk Import'}
                        </button>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center shadow-lg hover:shadow-primary-500/25 ${showAddForm
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-0.5'
                                }`}
                        >
                            {showAddForm ? (
                                <>Close Form</>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5 mr-2" />
                                    Add New Temple
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {(error || success) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        {error && (
                            <div className="bg-white border-l-4 border-red-500 shadow-sm rounded-xl px-6 py-4 flex items-center gap-4">
                                <div className="bg-red-50 p-2 rounded-full">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-900 leading-tight">Action Failed</h4>
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="bg-white border-l-4 border-emerald-500 shadow-sm rounded-xl px-6 py-4 flex items-center gap-4">
                                <div className="bg-emerald-50 p-2 rounded-full">
                                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-900 leading-tight">Success!</h4>
                                    <p className="text-emerald-700 text-sm">{success}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Temple Form */}
                {showAddForm && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500">
                        <div className="h-2 w-full bg-gradient-to-r from-primary-600 to-indigo-600"></div>
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="bg-primary-50 p-3 rounded-2xl">
                                    <Building2 className="h-8 w-8 text-primary-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Add New Temple</h2>
                                    <p className="text-gray-500">Enter temple details and assign administrative roles.</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddTemple} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            Temple Name <span className="text-primary-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. ISKCON Bangalore"
                                            value={newTemple.name}
                                            onChange={(e) => setNewTemple({ ...newTemple, name: e.target.value })}
                                            required
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            State <span className="text-primary-500">*</span>
                                        </label>
                                        <select
                                            value={newTemple.state}
                                            onChange={(e) => setNewTemple({ ...newTemple, state: e.target.value, city: '' })}
                                            required
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white appearance-none"
                                        >
                                            <option value="">Select State</option>
                                            {indianStates.map(state => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            City <span className="text-primary-500">*</span>
                                        </label>
                                        <select
                                            value={newTemple.city}
                                            onChange={(e) => setNewTemple({ ...newTemple, city: e.target.value })}
                                            required
                                            disabled={!newTemple.state || availableCities.length === 0}
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white appearance-none disabled:opacity-50"
                                        >
                                            <option value="">Select City</option>
                                            {availableCities.map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            Contact Information
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +91 98765 43210"
                                            value={newTemple.contact}
                                            onChange={(e) => setNewTemple({ ...newTemple, contact: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                            Managing Director
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.managing_director_id || ''}
                                            valueProperty="id"
                                            onChange={(val) => setNewTemple({ ...newTemple, managing_director_id: val })}
                                            placeholder="Select Managing Director"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            <User className="h-4 w-4 text-emerald-500" />
                                            Director
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.director_id || ''}
                                            valueProperty="id"
                                            onChange={(val) => setNewTemple({ ...newTemple, director_id: val })}
                                            placeholder="Select Director"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            <Building2 className="h-4 w-4 text-amber-500" />
                                            Central VOICE Manager
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.central_voice_manager_id || ''}
                                            valueProperty="id"
                                            onChange={(val) => setNewTemple({ ...newTemple, central_voice_manager_id: val })}
                                            placeholder="Select VOICE Manager"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            <User className="h-4 w-4 text-purple-500" />
                                            Youth Preacher
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.yp_id || ''}
                                            valueProperty="id"
                                            onChange={(val) => setNewTemple({ ...newTemple, yp_id: val })}
                                            placeholder="Select Youth Preacher"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                        Full Address
                                    </label>
                                    <textarea
                                        placeholder="Enter the complete postal address..."
                                        value={newTemple.address}
                                        onChange={(e) => setNewTemple({ ...newTemple, address: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white resize-none"
                                    />
                                </div>

                                <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setNewTemple({
                                                name: '', state: '', city: '', address: '', contact: '',
                                                managing_director_id: '', director_id: '', central_voice_manager_id: '', yp_id: ''
                                            });
                                        }}
                                        className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-10 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Create Temple Record
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Temple Form - Modal Overlay */}
                {editingTempleId && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-primary-100 animate-in zoom-in-95 duration-300 max-w-5xl w-full my-8">
                            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-primary-600"></div>
                            <div className="p-8 max-h-[85vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-50 p-3 rounded-2xl">
                                            <Edit2 className="h-8 w-8 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">Edit Temple Details</h2>
                                            <p className="text-gray-500">Update naming, location, or administrative roles.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setEditingTempleId(null)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <Plus className="h-6 w-6 text-gray-400 rotate-45" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateTemple} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Temple Name <span className="text-primary-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editTempleData.name}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, name: e.target.value })}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                State <span className="text-primary-500">*</span>
                                            </label>
                                            <select
                                                value={editTempleData.state}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, state: e.target.value, city: '' })}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white appearance-none"
                                            >
                                                <option value="">Select State</option>
                                                {indianStates.map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                City <span className="text-primary-500">*</span>
                                            </label>
                                            <select
                                                value={editTempleData.city}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, city: e.target.value })}
                                                required
                                                disabled={!editTempleData.state || editAvailableCities.length === 0}
                                                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white appearance-none disabled:opacity-50"
                                            >
                                                <option value="">Select City</option>
                                                {editAvailableCities.map(city => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Contact Information
                                            </label>
                                            <input
                                                type="text"
                                                value={editTempleData.contact}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, contact: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                                Managing Director
                                            </label>
                                            <SearchableSelect
                                                options={userOptions}
                                                value={editTempleData.managing_director_id || ''}
                                                valueProperty="id"
                                                onChange={(val) => setEditTempleData({
                                                    ...editTempleData,
                                                    managing_director_id: val,
                                                    managing_director_name: userOptions.find(u => u.id === val)?.name || ''
                                                })}
                                                placeholder="Assign Managing Director"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                <User className="h-4 w-4 text-emerald-500" />
                                                Director
                                            </label>
                                            <SearchableSelect
                                                options={userOptions}
                                                value={editTempleData.director_id || ''}
                                                valueProperty="id"
                                                onChange={(val) => setEditTempleData({
                                                    ...editTempleData,
                                                    director_id: val,
                                                    director_name: userOptions.find(u => u.id === val)?.name || ''
                                                })}
                                                placeholder="Assign Director"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                <Building2 className="h-4 w-4 text-amber-500" />
                                                Central VOICE Manager
                                            </label>
                                            <SearchableSelect
                                                options={userOptions}
                                                value={editTempleData.central_voice_manager_id || ''}
                                                valueProperty="id"
                                                onChange={(val) => setEditTempleData({
                                                    ...editTempleData,
                                                    central_voice_manager_id: val,
                                                    central_voice_manager_name: userOptions.find(u => u.id === val)?.name || ''
                                                })}
                                                placeholder="Assign VOICE Manager"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                <User className="h-4 w-4 text-purple-500" />
                                                Youth Preacher
                                            </label>
                                            <SearchableSelect
                                                options={userOptions}
                                                value={editTempleData.yp_id || ''}
                                                valueProperty="id"
                                                onChange={(val) => setEditTempleData({
                                                    ...editTempleData,
                                                    yp_id: val,
                                                    yp_name: userOptions.find(u => u.id === val)?.name || ''
                                                })}
                                                placeholder="Assign Youth Preacher"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            Full Address
                                        </label>
                                        <textarea
                                            value={editTempleData.address}
                                            onChange={(e) => setEditTempleData({ ...editTempleData, address: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-gray-900 bg-gray-50 hover:bg-white resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setEditingTempleId(null)}
                                            className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-10 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Import Section */}
                {showImportSection && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500">
                        <div className="bg-gray-900 p-8 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <FileSpreadsheet className="h-24 w-24" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Upload className="h-6 w-6 text-primary-400" />
                                    Bulk Import Temples
                                </h2>
                                <p className="text-gray-400 mt-1 selection:bg-primary-500">Fast-track your setup by importing multiple temple records from an Excel file.</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            <div
                                className={`relative border-2 border-dashed rounded-3xl transition-all duration-300 ${file
                                    ? 'border-emerald-400 bg-emerald-50/30'
                                    : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50/20'
                                    }`}
                            >
                                <input
                                    id="excel-file"
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                <div className="p-12 text-center">
                                    <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-50 text-primary-600'
                                        }`}>
                                        <FileSpreadsheet className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                        {file ? file.name : 'Choose Excel file'}
                                    </h3>
                                    <p className="text-gray-500 text-sm">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drag & drop your .xlsx or .xls file here'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                                <div className="flex items-center gap-2 mb-4 text-blue-800 font-bold text-sm uppercase tracking-wider">
                                    <ShieldCheck className="h-4 w-4" />
                                    Required Data Format
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {['name', 'state', 'city'].map(col => (
                                        <div key={col} className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-bold shadow-sm">
                                            {col} <span className="text-blue-300 font-normal ml-1">(Required)</span>
                                        </div>
                                    ))}
                                    {['address', 'contact'].map(col => (
                                        <div key={col} className="bg-white/50 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-bold">
                                            {col} <span className="text-gray-300 font-normal ml-1">(Optional)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {importing && progress.total > 0 && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Processing Upload...</p>
                                            <p className="text-xs text-gray-500">{progress.processed} of {progress.total} entries handled</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-primary-600">{Math.round((progress.processed / progress.total) * 100)}%</span>
                                            {progress.errors > 0 && <p className="text-[10px] text-red-500 font-bold">{progress.errors} Errors Found</p>}
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div
                                            className="bg-primary-600 h-full rounded-full transition-all duration-500 ease-out shadow-lg shadow-primary-500/30"
                                            style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={!file || importing}
                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 active:scale-[0.99]"
                            >
                                {importing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white mr-3"></div>
                                        Synchronizing Database...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-5 w-5 mr-2 text-primary-400" />
                                        Process Batch & Import
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Temples List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-primary-600" />
                            All Temples ({temples.length})
                        </h2>
                    </div>

                    {temples.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No temples found. Add temples manually or import from Excel.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {temples.map((temple, index) => {
                                const colors = [
                                    { border: 'border-indigo-100', bg: 'bg-indigo-50/50', accent: 'text-indigo-600', gradient: 'from-indigo-600 to-blue-600', ribbon: 'bg-indigo-600' },
                                    { border: 'border-emerald-100', bg: 'bg-emerald-50/50', accent: 'text-emerald-600', gradient: 'from-emerald-600 to-teal-600', ribbon: 'bg-emerald-600' },
                                    { border: 'border-amber-100', bg: 'bg-amber-50/50', accent: 'text-amber-600', gradient: 'from-amber-600 to-orange-600', ribbon: 'bg-amber-600' },
                                    { border: 'border-rose-100', bg: 'bg-rose-50/50', accent: 'text-rose-600', gradient: 'from-rose-600 to-pink-600', ribbon: 'bg-rose-600' },
                                    { border: 'border-violet-100', bg: 'bg-violet-50/50', accent: 'text-violet-600', gradient: 'from-violet-600 to-purple-600', ribbon: 'bg-violet-600' },
                                    { border: 'border-sky-100', bg: 'bg-sky-50/50', accent: 'text-sky-600', gradient: 'from-sky-600 to-blue-500', ribbon: 'bg-sky-600' },
                                ];
                                const theme = colors[index % colors.length];

                                return (
                                    <div
                                        key={temple.id}
                                        className={`group relative bg-white rounded-2xl border-2 ${theme.border} shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col h-full overflow-hidden`}
                                    >
                                        {/* Gradient Header */}
                                        <div className={`h-2 w-full bg-gradient-to-r ${theme.gradient}`}></div>

                                        <div className="p-6 flex flex-col flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                                        {temple.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>{temple.city}, {temple.state}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditTemple(temple)}
                                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300"
                                                        title="Edit Temple"
                                                    >
                                                        <Edit2 className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTemple(temple.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300"
                                                        title="Delete Temple"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Roles Section */}
                                            <div className="space-y-3 mb-6 bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.accent}`}>
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Managing Director</p>
                                                        <p className="text-sm font-semibold text-gray-800">{temple.managing_director_name || 'Not assigned'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.accent}`}>
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Director</p>
                                                        <p className="text-sm font-semibold text-gray-800">{temple.director_name || 'Not assigned'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.accent}`}>
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Central VOICE Manager</p>
                                                        <p className="text-sm font-semibold text-gray-800">{temple.central_voice_manager_name || 'Not assigned'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.accent}`}>
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Youth Preacher</p>
                                                        <p className="text-sm font-semibold text-gray-800">{temple.yp_name || 'Not assigned'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
                                                {temple.address && (
                                                    <div className="flex items-start gap-2 text-xs text-gray-500">
                                                        <Building2 className="h-3.5 w-3.5 mt-0.5 text-gray-400" />
                                                        <span className="line-clamp-2">{temple.address}</span>
                                                    </div>
                                                )}
                                                {temple.contact && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                        <span>{temple.contact}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

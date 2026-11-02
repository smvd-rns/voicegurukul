'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { 
    Upload, 
    FileSpreadsheet, 
    AlertCircle, 
    CheckCircle, 
    Plus, 
    Trash2, 
    Building2, 
    MapPin, 
    Phone, 
    User, 
    ShieldCheck, 
    Edit2,
    Search,
    X
} from 'lucide-react';
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

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('');

    // Only Super Admin (Role 8) can access this page
    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const userOptions = [
        { id: '', name: 'Not assigned' },
        ...users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email
        }))
    ];

    // Helper to build options for a role dropdown, ensuring the current assigned user's name is present
    const getRoleOptions = (currentId?: string, currentName?: string) => {
        const list: { id: string; name: string; email?: string }[] = [
            { id: '', name: 'Not assigned' }
        ];

        // If currently assigned user is not in the general users list (e.g. legacy/imported), preserve their name
        if (currentId && currentName && !users.some(u => u.id === currentId)) {
            list.push({
                id: currentId,
                name: currentName,
                email: '(Current)'
            });
        }

        users.forEach(u => {
            list.push({
                id: u.id,
                name: u.name,
                email: u.email
            });
        });

        return list;
    };

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
            managing_director_name: temple.managing_director_name || '',
            director_id: temple.director_id || '',
            director_name: temple.director_name || '',
            central_voice_manager_id: temple.central_voice_manager_id || '',
            central_voice_manager_name: temple.central_voice_manager_name || '',
            yp_id: temple.yp_id || '',
            yp_name: temple.yp_name || '',
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
                managing_director_id: editTempleData.managing_director_id || null,
                managing_director_name: editTempleData.managing_director_id ? editTempleData.managing_director_name : null,
                director_id: editTempleData.director_id || null,
                director_name: editTempleData.director_id ? editTempleData.director_name : null,
                central_voice_manager_id: editTempleData.central_voice_manager_id || null,
                central_voice_manager_name: editTempleData.central_voice_manager_id ? editTempleData.central_voice_manager_name : null,
                yp_id: editTempleData.yp_id || null,
                yp_name: editTempleData.yp_id ? editTempleData.yp_name : null,
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

    // Filter temples based on search query and state filter
    const filteredTemples = temples.filter(temple => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q || (
            temple.name.toLowerCase().includes(q) ||
            (temple.city && temple.city.toLowerCase().includes(q)) ||
            (temple.state && temple.state.toLowerCase().includes(q)) ||
            (temple.managing_director_name && temple.managing_director_name.toLowerCase().includes(q)) ||
            (temple.director_name && temple.director_name.toLowerCase().includes(q)) ||
            (temple.central_voice_manager_name && temple.central_voice_manager_name.toLowerCase().includes(q)) ||
            (temple.yp_name && temple.yp_name.toLowerCase().includes(q))
        );

        const matchesState = !stateFilter || temple.state === stateFilter;

        return matchesSearch && matchesState;
    });

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 -m-8 p-6 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 text-primary-600 font-semibold text-xs mb-0.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Administrative Dashboard</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                            Temples Management
                        </h1>
                        <p className="text-gray-500 mt-0.5 text-sm max-w-xl">
                            Oversee and organize ISKCON temples across India. Manage roles, locations, and central coordination.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setShowImportSection(!showImportSection)}
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 border ${showImportSection
                                ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-primary-200 hover:bg-primary-50'
                                }`}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {showImportSection ? 'Hide Import' : 'Bulk Import'}
                        </button>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center shadow-sm ${showAddForm
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-primary-600 text-white hover:bg-primary-700'
                                }`}
                        >
                            {showAddForm ? (
                                <>Close Form</>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Add New Temple
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Compact Dismissible Alerts */}
                {(error || success) && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                                <button onClick={() => setError('')} className="p-1 text-red-500 hover:text-red-700">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    <span>{success}</span>
                                </div>
                                <button onClick={() => setSuccess('')} className="p-1 text-emerald-500 hover:text-emerald-700">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Temple Form */}
                {showAddForm && (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Add New Temple
                                </h2>
                                <p className="text-primary-100 text-xs">Fill in the temple details and assign administrative roles.</p>
                            </div>
                            <button onClick={() => setShowAddForm(false)} className="text-white/80 hover:text-white p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddTemple} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Temple Name <span className="text-primary-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newTemple.name}
                                            onChange={(e) => setNewTemple({ ...newTemple, name: e.target.value })}
                                            placeholder="e.g. ISKCON Bangalore"
                                            required
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            State <span className="text-primary-500">*</span>
                                        </label>
                                        <select
                                            value={newTemple.state}
                                            onChange={(e) => setNewTemple({ ...newTemple, state: e.target.value, city: '' })}
                                            required
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white appearance-none"
                                        >
                                            <option value="">Select State</option>
                                            {indianStates.map(state => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            City <span className="text-primary-500">*</span>
                                        </label>
                                        <select
                                            value={newTemple.city}
                                            onChange={(e) => setNewTemple({ ...newTemple, city: e.target.value })}
                                            required
                                            disabled={!newTemple.state || availableCities.length === 0}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white appearance-none disabled:opacity-50"
                                        >
                                            <option value="">Select City</option>
                                            {availableCities.map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Contact Info
                                        </label>
                                        <input
                                            type="text"
                                            value={newTemple.contact}
                                            onChange={(e) => setNewTemple({ ...newTemple, contact: e.target.value })}
                                            placeholder="Phone or Email"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                            Managing Director
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.managing_director_id || ''}
                                            valueProperty="id"
                                            allowClear={true}
                                            onChange={(val) => setNewTemple({ ...newTemple, managing_director_id: val })}
                                            placeholder="Assign Managing Director"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <User className="h-3.5 w-3.5 text-emerald-500" />
                                            Director
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.director_id || ''}
                                            valueProperty="id"
                                            allowClear={true}
                                            onChange={(val) => setNewTemple({ ...newTemple, director_id: val })}
                                            placeholder="Assign Director"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <Building2 className="h-3.5 w-3.5 text-amber-500" />
                                            Central VOICE Manager
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.central_voice_manager_id || ''}
                                            valueProperty="id"
                                            allowClear={true}
                                            onChange={(val) => setNewTemple({ ...newTemple, central_voice_manager_id: val })}
                                            placeholder="Assign VOICE Manager"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <User className="h-3.5 w-3.5 text-purple-500" />
                                            Youth Preacher
                                        </label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={newTemple.yp_id || ''}
                                            valueProperty="id"
                                            allowClear={true}
                                            onChange={(val) => setNewTemple({ ...newTemple, yp_id: val })}
                                            placeholder="Assign Youth Preacher"
                                            disabled={loadingUsers}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Full Address
                                    </label>
                                    <textarea
                                        value={newTemple.address}
                                        onChange={(e) => setNewTemple({ ...newTemple, address: e.target.value })}
                                        placeholder="Enter complete physical address"
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white resize-none"
                                    />
                                </div>

                                <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        className="px-4 py-2 text-xs sm:text-sm text-gray-500 font-bold hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-primary-600 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:bg-primary-700 transition-all"
                                    >
                                        Create Temple
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Temple Form - Compact Modal Overlay */}
                {editingTempleId && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200 max-w-3xl w-full my-4">
                            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-primary-600"></div>
                            <div className="p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
                                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                                            <Edit2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Edit Temple Details</h2>
                                            <p className="text-xs text-gray-500">Update naming, location, or administrative roles.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setEditingTempleId(null)}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateTemple} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Temple Name <span className="text-primary-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editTempleData.name}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, name: e.target.value })}
                                                required
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                State <span className="text-primary-500">*</span>
                                            </label>
                                            <select
                                                value={editTempleData.state}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, state: e.target.value, city: '' })}
                                                required
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white appearance-none"
                                            >
                                                <option value="">Select State</option>
                                                {indianStates.map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                City <span className="text-primary-500">*</span>
                                            </label>
                                            <select
                                                value={editTempleData.city}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, city: e.target.value })}
                                                required
                                                disabled={!editTempleData.state || editAvailableCities.length === 0}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white appearance-none disabled:opacity-50"
                                            >
                                                <option value="">Select City</option>
                                                {editAvailableCities.map(city => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Contact Info
                                            </label>
                                            <input
                                                type="text"
                                                value={editTempleData.contact}
                                                onChange={(e) => setEditTempleData({ ...editTempleData, contact: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                                Managing Director
                                            </label>
                                            <SearchableSelect
                                                options={getRoleOptions(editTempleData.managing_director_id, editTempleData.managing_director_name)}
                                                value={editTempleData.managing_director_id || ''}
                                                displayValue={editTempleData.managing_director_name || ''}
                                                valueProperty="id"
                                                allowClear={true}
                                                onChange={(val) => {
                                                    const roleOptions = getRoleOptions(editTempleData.managing_director_id, editTempleData.managing_director_name);
                                                    const selected = roleOptions.find(u => u.id === val);
                                                    setEditTempleData({
                                                        ...editTempleData,
                                                        managing_director_id: val,
                                                        managing_director_name: val ? (selected?.name || '') : ''
                                                    });
                                                }}
                                                placeholder="Assign Managing Director"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <User className="h-3.5 w-3.5 text-emerald-500" />
                                                Director
                                            </label>
                                            <SearchableSelect
                                                options={getRoleOptions(editTempleData.director_id, editTempleData.director_name)}
                                                value={editTempleData.director_id || ''}
                                                displayValue={editTempleData.director_name || ''}
                                                valueProperty="id"
                                                allowClear={true}
                                                onChange={(val) => {
                                                    const roleOptions = getRoleOptions(editTempleData.director_id, editTempleData.director_name);
                                                    const selected = roleOptions.find(u => u.id === val);
                                                    setEditTempleData({
                                                        ...editTempleData,
                                                        director_id: val,
                                                        director_name: val ? (selected?.name || '') : ''
                                                    });
                                                }}
                                                placeholder="Assign Director"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <Building2 className="h-3.5 w-3.5 text-amber-500" />
                                                Central VOICE Manager
                                            </label>
                                            <SearchableSelect
                                                options={getRoleOptions(editTempleData.central_voice_manager_id, editTempleData.central_voice_manager_name)}
                                                value={editTempleData.central_voice_manager_id || ''}
                                                displayValue={editTempleData.central_voice_manager_name || ''}
                                                valueProperty="id"
                                                allowClear={true}
                                                onChange={(val) => {
                                                    const roleOptions = getRoleOptions(editTempleData.central_voice_manager_id, editTempleData.central_voice_manager_name);
                                                    const selected = roleOptions.find(u => u.id === val);
                                                    setEditTempleData({
                                                        ...editTempleData,
                                                        central_voice_manager_id: val,
                                                        central_voice_manager_name: val ? (selected?.name || '') : ''
                                                    });
                                                }}
                                                placeholder="Assign VOICE Manager"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <User className="h-3.5 w-3.5 text-purple-500" />
                                                Youth Preacher
                                            </label>
                                            <SearchableSelect
                                                options={getRoleOptions(editTempleData.yp_id, editTempleData.yp_name)}
                                                value={editTempleData.yp_id || ''}
                                                displayValue={editTempleData.yp_name || ''}
                                                valueProperty="id"
                                                allowClear={true}
                                                onChange={(val) => {
                                                    const roleOptions = getRoleOptions(editTempleData.yp_id, editTempleData.yp_name);
                                                    const selected = roleOptions.find(u => u.id === val);
                                                    setEditTempleData({
                                                        ...editTempleData,
                                                        yp_id: val,
                                                        yp_name: val ? (selected?.name || '') : ''
                                                    });
                                                }}
                                                placeholder="Assign Youth Preacher"
                                                disabled={loadingUsers}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Full Address
                                        </label>
                                        <textarea
                                            value={editTempleData.address}
                                            onChange={(e) => setEditTempleData({ ...editTempleData, address: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 bg-gray-50 hover:bg-white resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setEditingTempleId(null)}
                                            className="px-4 py-2 text-xs sm:text-sm text-gray-500 font-bold hover:text-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:from-emerald-700 hover:to-emerald-800 transition-all"
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
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="bg-gray-900 p-6 text-white relative">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <FileSpreadsheet className="h-16 w-16" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-primary-400" />
                                    Bulk Import Temples
                                </h2>
                                <p className="text-gray-400 text-xs mt-0.5">Fast-track your setup by importing multiple temple records from an Excel file.</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div
                                className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${file
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
                                <div className="p-8 text-center">
                                    <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-50 text-primary-600'
                                        }`}>
                                        <FileSpreadsheet className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                                        {file ? file.name : 'Choose Excel file'}
                                    </h3>
                                    <p className="text-gray-500 text-xs">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drag & drop your .xlsx or .xls file here'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                                <div className="flex items-center gap-1.5 mb-2 text-blue-800 font-bold text-xs uppercase tracking-wider">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Required Data Format
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['name', 'state', 'city'].map(col => (
                                        <div key={col} className="bg-white px-2.5 py-1 rounded-md border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
                                            {col} <span className="text-blue-400 font-normal ml-0.5">(Required)</span>
                                        </div>
                                    ))}
                                    {['address', 'contact'].map(col => (
                                        <div key={col} className="bg-white/60 px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 text-xs font-bold">
                                            {col} <span className="text-gray-400 font-normal ml-0.5">(Optional)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {importing && progress.total > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end text-xs">
                                        <p className="font-bold text-gray-900">{progress.processed} of {progress.total} entries handled</p>
                                        <span className="font-bold text-primary-600">{Math.round((progress.processed / progress.total) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                                        <div
                                            className="bg-primary-600 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={!file || importing}
                                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-gray-900/10"
                            >
                                {importing ? 'Synchronizing Database...' : 'Process Batch & Import'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Temples List with Search & Filters */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary-600" />
                                All Temples ({temples.length})
                            </h2>
                            {(searchQuery || stateFilter) && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Showing <span className="font-semibold text-gray-800">{filteredTemples.length}</span> of {temples.length} temples
                                </p>
                            )}
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            {/* Search Input */}
                            <div className="relative flex-1 sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search temple, city, state, or manager..."
                                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* State Filter Dropdown */}
                            <select
                                value={stateFilter}
                                onChange={(e) => setStateFilter(e.target.value)}
                                className="px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs text-gray-700 font-medium"
                            >
                                <option value="">All States ({indianStates.length})</option>
                                {indianStates.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>

                            {(searchQuery || stateFilter) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStateFilter('');
                                    }}
                                    className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {temples.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-8 text-center">
                            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No temples found. Add temples manually or import from Excel.</p>
                        </div>
                    ) : filteredTemples.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-8 text-center">
                            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-gray-800">No temples found</h3>
                            <p className="text-gray-500 text-xs mt-0.5 max-w-sm mx-auto">
                                No temples match your search &ldquo;{searchQuery || stateFilter}&rdquo;.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStateFilter('');
                                }}
                                className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        /* Compact Grid of Temple Cards */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTemples.map((temple, index) => {
                                const colors = [
                                    { border: 'border-indigo-100 hover:border-indigo-200', bg: 'bg-indigo-50', accent: 'text-indigo-600', gradient: 'from-indigo-600 to-blue-600' },
                                    { border: 'border-emerald-100 hover:border-emerald-200', bg: 'bg-emerald-50', accent: 'text-emerald-600', gradient: 'from-emerald-600 to-teal-600' },
                                    { border: 'border-amber-100 hover:border-amber-200', bg: 'bg-amber-50', accent: 'text-amber-600', gradient: 'from-amber-600 to-orange-600' },
                                    { border: 'border-rose-100 hover:border-rose-200', bg: 'bg-rose-50', accent: 'text-rose-600', gradient: 'from-rose-600 to-pink-600' },
                                    { border: 'border-violet-100 hover:border-violet-200', bg: 'bg-violet-50', accent: 'text-violet-600', gradient: 'from-violet-600 to-purple-600' },
                                    { border: 'border-sky-100 hover:border-sky-200', bg: 'bg-sky-50', accent: 'text-sky-600', gradient: 'from-sky-600 to-blue-500' },
                                ];
                                const theme = colors[index % colors.length];

                                return (
                                    <div
                                        key={temple.id}
                                        className={`group relative bg-white rounded-xl border ${theme.border} shadow-2xs transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden`}
                                    >
                                        {/* Top Accent Strip */}
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`}></div>

                                        <div className="p-4 sm:p-4.5 flex flex-col flex-1">
                                            {/* Card Header: Title & Actions */}
                                            <div className="flex justify-between items-start gap-2 mb-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                                                        {temple.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-xs">
                                                        <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{temple.city}, {temple.state}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleEditTemple(temple)}
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="Edit Temple"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTemple(temple.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Temple"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Compact 2x2 Roles Grid */}
                                            <div className="grid grid-cols-2 gap-2 my-2 bg-gray-50/70 rounded-lg p-2.5 border border-gray-100">
                                                {/* Managing Director */}
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <div className={`p-1 rounded ${theme.bg} ${theme.accent} flex-shrink-0 mt-0.5`}>
                                                        <ShieldCheck className="h-3 w-3" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">MD</p>
                                                        <p className={`text-xs font-semibold truncate ${temple.managing_director_name ? 'text-gray-900' : 'text-gray-400 font-normal italic'}`}>
                                                            {temple.managing_director_name || 'Not assigned'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Director */}
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <div className={`p-1 rounded ${theme.bg} ${theme.accent} flex-shrink-0 mt-0.5`}>
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">Director</p>
                                                        <p className={`text-xs font-semibold truncate ${temple.director_name ? 'text-gray-900' : 'text-gray-400 font-normal italic'}`}>
                                                            {temple.director_name || 'Not assigned'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Central VOICE Manager */}
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <div className={`p-1 rounded ${theme.bg} ${theme.accent} flex-shrink-0 mt-0.5`}>
                                                        <ShieldCheck className="h-3 w-3" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">VOICE Mgr</p>
                                                        <p className={`text-xs font-semibold truncate ${temple.central_voice_manager_name ? 'text-gray-900' : 'text-gray-400 font-normal italic'}`}>
                                                            {temple.central_voice_manager_name || 'Not assigned'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Youth Preacher */}
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <div className={`p-1 rounded ${theme.bg} ${theme.accent} flex-shrink-0 mt-0.5`}>
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">YP</p>
                                                        <p className={`text-xs font-semibold truncate ${temple.yp_name ? 'text-gray-900' : 'text-gray-400 font-normal italic'}`}>
                                                            {temple.yp_name || 'Not assigned'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Compact Footer (Address / Contact) */}
                                            {(temple.address || temple.contact) && (
                                                <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                                                    {temple.address ? (
                                                        <span className="truncate flex items-center gap-1 min-w-0" title={temple.address}>
                                                            <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                            <span className="truncate">{temple.address}</span>
                                                        </span>
                                                    ) : <span></span>}
                                                    {temple.contact && (
                                                        <span className="flex-shrink-0 flex items-center gap-1 font-medium text-gray-600">
                                                            <Phone className="h-3 w-3 text-gray-400" />
                                                            <span>{temple.contact}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
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

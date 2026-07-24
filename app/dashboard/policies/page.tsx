'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import {
    BookOpen, Plus, FileText, Trash2, Edit, Calendar,
    Link as LinkIcon, AlertCircle, Upload, Search,
    ArrowUpDown, Share2, Check, Copy, X, Clock, Filter
} from 'lucide-react';
import { getHighestRole, getRoleDisplayName } from '@/lib/utils/roles';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// List of all applicable roles 1 to 30 based on the db
const ROLE_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1).map(roleId => ({
    id: roleId,
    name: getRoleDisplayName(roleId as any)
}));

export default function PoliciesPage() {
    const { userData, loading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [policies, setPolicies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search and Sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'>('date_desc');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
 
    // Preview states
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [applicableDate, setApplicableDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

    const fetchPolicies = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('/api/policies', {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            const result = await response.json();
            if (result.success) {
                setPolicies(result.data);
            }
        } catch (error) {
            console.error('Error fetching policies', error);
            toast.error('Failed to load policies');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && userData) {
            fetchPolicies();
        }
    }, [userData, loading, fetchPolicies]);

    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const numericRoles = userRoles.map((r: any) => typeof r === 'number' ? r : parseInt(r)).filter((r: number) => !isNaN(r));
    const isSuperAdmin = numericRoles.includes(8) || userRoles.includes('super_admin');
    const canSeeAllPolicies = numericRoles.some(r => [8, 9, 10].includes(r)) || userRoles.includes('super_admin');

    // Filter and Sort Logic
    const filteredPolicies = useMemo(() => {
        let result = [...policies];

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => p.title.toLowerCase().includes(query));
        }

        // Role Filter (Superadmin only)
        if (canSeeAllPolicies && selectedRoleFilter !== 'all') {
            const roleId = parseInt(selectedRoleFilter);
            result = result.filter(p => p.target_roles?.includes(roleId));
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'date_desc') return new Date(b.applicable_date).getTime() - new Date(a.applicable_date).getTime();
            if (sortBy === 'date_asc') return new Date(a.applicable_date).getTime() - new Date(b.applicable_date).getTime();
            if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
            if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
            return 0;
        });

        return result;
    }, [policies, searchQuery, sortBy, selectedRoleFilter, canSeeAllPolicies]);

    // Handle initial shared policy ID
    useEffect(() => {
        const sharedId = searchParams.get('id');
        if (sharedId && !isLoading && policies.length > 0) {
            const element = document.getElementById(`policy-${sharedId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-4', 'ring-amber-400', 'ring-offset-4');
                setTimeout(() => {
                    element.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-4');
                }, 3000);
            }
        }
    }, [searchParams, isLoading, policies]);

    const handleCopyLink = (policyId: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const url = `${baseUrl}${window.location.pathname}?id=${policyId}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
    };

    const handleRoleSelection = (roleId: number) => {
        if (selectedRoles.includes(roleId)) {
            setSelectedRoles(selectedRoles.filter(id => id !== roleId));
        } else {
            setSelectedRoles([...selectedRoles, roleId]);
        }
    };

    const handleSelectAllRoles = () => {
        if (selectedRoles.length === ROLE_OPTIONS.length) {
            setSelectedRoles([]);
        } else {
            setSelectedRoles(ROLE_OPTIONS.map(r => r.id));
        }
    };

    const handleOpenPreview = (policy: any) => {
        // Convert view link to preview link for embedding
        let embedUrl = policy.file_url;
        if (embedUrl.includes('/view')) {
            embedUrl = embedUrl.replace('/view', '/preview');
        } else if (!embedUrl.includes('/preview')) {
            // Fallback: If it's a direct ID or other format, we might need more logic
            // but for now assume webViewLink was saved.
        }
        
        setPreviewUrl(embedUrl);
        setPreviewTitle(policy.title);
    };

    const handleEdit = (policy: any) => {
        setEditingId(policy.id);
        setIsEditing(true);
        setTitle(policy.title);
        setDescription(policy.description || '');
        setApplicableDate(new Date(policy.applicable_date).toISOString().split('T')[0]);
        setSelectedRoles(policy.target_roles || []);
        setSelectedFile(null); // File is optional for editing
        setShowUploadModal(true);
    };

    const handleUpdate = async () => {
        if (!editingId || !title || !applicableDate || selectedRoles.length === 0) {
            setUploadError('Please fill in title, date and select roles.');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            const updateRes = await fetch(`/api/policies/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    title,
                    description,
                    applicable_date: applicableDate,
                    target_roles: selectedRoles
                })
            });

            const updateResult = await updateRes.json();

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Failed to update policy');
            }

            setShowUploadModal(false);
            setIsEditing(false);
            setEditingId(null);
            setTitle('');
            setDescription('');
            setApplicableDate(new Date().toISOString().split('T')[0]);
            setSelectedRoles([]);
            fetchPolicies();
            toast.success('Policy updated successfully');
        } catch (error: any) {
            setUploadError(error.message || 'An unexpected error occurred during update.');
            toast.error(error.message || 'Update failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEditing) {
            handleUpdate();
            return;
        }

        if (!title || !applicableDate || !selectedFile || selectedRoles.length === 0) {
            setUploadError('Please fill in all fields and select at least one role.');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            // Helper for XMLHttpRequest based upload to track progress
            const uploadFileWithProgress = (url: string, file: File): Promise<any> => {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', url);
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch {
                                resolve({ id: 'unknown' });
                            }
                        } else {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error during upload'));
                    xhr.send(file);
                });
            };

            // 1. Get token from backend
            const tokenRes = await fetch('/api/upload-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    fileType: selectedFile.type || 'application/octet-stream',
                    targetFolderId: '1b94q4-8wVGVU_pv4AUVpTFMrnfY9v2ng', // Drive Folder ID
                    userId: userData?.id || 'admin'
                })
            });

            if (!tokenRes.ok) {
                const errorData = await tokenRes.json();
                throw new Error(errorData.error || 'Failed to initialize upload token');
            }
            const tokenData = await tokenRes.json();

            // 2. Initialize Resumable Upload on Google Drive
            const metadata = {
                name: selectedFile.name,
                mimeType: selectedFile.type || 'application/octet-stream',
                parents: [tokenData.folderId]
            };

            const sessionRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                method: 'POST',
                headers: {
                    ...(tokenData.accessToken ? { "Authorization": `Bearer ${tokenData.accessToken}` } : {}),
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': selectedFile.type || 'application/octet-stream',
                    'X-Upload-Content-Length': selectedFile.size.toString()
                },
                body: JSON.stringify(metadata)
            });

            if (!sessionRes.ok) throw new Error('Failed to initialize Google Drive resumable upload');
            const location = sessionRes.headers.get('Location');
            if (!location) throw new Error('No upload location received from Google Drive');

            // 3. Perform direct browser-to-Drive upload
            const driveData = await uploadFileWithProgress(location, selectedFile);

            // Fetch extra info if links are missing
            if (!driveData.webViewLink) {
                const extraRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}?fields=id,name,mimeType,size,thumbnailLink,webViewLink`, {
                    headers: tokenData.accessToken ? { ...(tokenData.accessToken ? { "Authorization": `Bearer ${tokenData.accessToken}` } : {}) } : undefined
                });
                if (extraRes.ok) {
                    const extraData = await extraRes.json();
                    Object.assign(driveData, extraData);
                }
            }

            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            // 4. Save Policy to Database
            const policyRes = await fetch('/api/policies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    title,
                    description,
                    applicable_date: applicableDate,
                    file_name: selectedFile.name,
                    file_url: driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view`,
                    file_id: driveData.id,
                    file_type: selectedFile.type,
                    target_roles: selectedRoles
                })
            });

            const policyResult = await policyRes.json();

            if (!policyResult.success) {
                throw new Error(policyResult.error || 'Failed to save policy record');
            }

            // Reset and close
            setShowUploadModal(false);
            setTitle('');
            setDescription('');
            setApplicableDate(new Date().toISOString().split('T')[0]);
            setSelectedFile(null);
            setSelectedRoles([]);
            fetchPolicies();
            toast.success('Policy uploaded successfully');

        } catch (error: any) {
            setUploadError(error.message || 'An unexpected error occurred during upload.');
            toast.error(error.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this policy?')) return;

        try {
            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/policies/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            const result = await res.json();
            if (result.success) {
                fetchPolicies();
                toast.success('Policy deleted');
            } else {
                toast.error(result.error || 'Failed to delete policy');
            }
        } catch (error) {
            console.error('Error deleting policy:', error);
            toast.error('Error deleting policy');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div className="w-full sm:w-auto">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500" />
                        Official Policies
                    </h1>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-2 ml-1">
                        View active documents and guidelines
                    </p>
                </div>

                {isSuperAdmin && (
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setEditingId(null);
                            setTitle('');
                            setDescription('');
                            setApplicableDate(new Date().toISOString().split('T')[0]);
                            setSelectedRoles([]);
                            setSelectedFile(null);
                            setShowUploadModal(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3.5 sm:py-3 rounded-2xl font-black shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] sm:text-xs"
                    >
                        <Plus className="h-4 w-4 stroke-[3px]" /> Upload Policy
                    </button>
                )}
            </div>

            {/* Controls Bar: Search & Sort */}
            <div className="flex flex-col md:flex-row gap-4 bg-white/60 backdrop-blur-md p-4 sm:p-5 rounded-[2rem] border border-white shadow-sm">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search policies by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border-2 border-transparent focus:border-amber-400 rounded-2xl outline-none font-bold text-gray-700 transition-all placeholder:text-gray-300 shadow-inner text-sm"
                    />
                </div>

                <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    <div className="relative min-w-[160px] sm:min-w-[180px]">
                        <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 sm:py-3.5 bg-white border-2 border-transparent focus:border-amber-400 rounded-2xl outline-none font-black text-[10px] sm:text-xs uppercase tracking-widest text-gray-700 appearance-none shadow-inner cursor-pointer"
                        >
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="title_asc">Title (A-Z)</option>
                            <option value="title_desc">Title (Z-A)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>

                    {canSeeAllPolicies && (
                        <div className="relative min-w-[160px] sm:min-w-[180px]">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <select
                                value={selectedRoleFilter}
                                onChange={(e: any) => setSelectedRoleFilter(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 sm:py-3.5 bg-white border-2 border-transparent focus:border-amber-400 rounded-2xl outline-none font-black text-[10px] sm:text-xs uppercase tracking-widest text-gray-700 appearance-none shadow-inner cursor-pointer"
                            >
                                <option value="all">All Roles</option>
                                {ROLE_OPTIONS.filter(r => r.name !== 'Unknown Role').map(role => (
                                    <option key={role.id} value={role.id.toString()}>
                                        {role.id}. {role.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => { setSearchQuery(''); setSortBy('date_desc'); setSelectedRoleFilter('all'); }}
                        className="flex items-center gap-2 px-4 py-3 sm:py-3.5 bg-gray-100/50 hover:bg-gray-100 text-gray-500 rounded-2xl transition-colors font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap"
                    >
                        <X className="h-4 w-4" /> Clear
                    </button>
                </div>
            </div>

            {/* List Section */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white">
                    <div className="animate-spin h-10 w-10 border-4 border-amber-200 border-t-amber-600 rounded-full mb-4"></div>
                </div>
            ) : filteredPolicies.length === 0 ? (
                <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white border-dashed">
                    <div className="bg-amber-100/50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FileText className="h-10 w-10 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">No Policies Found</h3>
                    <p className="text-gray-500 font-medium mt-2 max-w-sm mx-auto px-4">
                        We couldn&apos;t find any policies matching your current search or role access.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {filteredPolicies.map(policy => (
                        <div
                            key={policy.id}
                            id={`policy-${policy.id}`}
                            className="bg-white rounded-[2rem] sm:rounded-3xl p-5 sm:p-6 shadow-xl shadow-orange-100/40 border border-amber-100/50 group relative overflow-hidden transition-all hover:scale-[1.02] flex flex-col justify-between"
                        >
                            {/* Decorative Accent */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
                                        <FileText className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleCopyLink(policy.id)}
                                            className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                            title="Copy Shareable Link"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                         {isSuperAdmin && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEdit(policy)}
                                                    className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                                    title="Edit Policy"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(policy.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete Policy"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2 leading-tight group-hover:text-amber-600 transition-colors">
                                    {policy.title}
                                </h3>

                                 {policy.description && (
                                     <div className="mt-4 p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100/50 shadow-inner relative group/desc hover:bg-amber-100/50 transition-colors">
                                         <p className="text-[11px] font-extrabold text-slate-700 italic leading-relaxed whitespace-pre-wrap">
                                             &ldquo;{policy.description}&rdquo;
                                         </p>
                                     </div>
                                 )}

                                <div className="flex items-center gap-2.5 text-[10px] sm:text-xs font-bold text-gray-500 bg-gray-50/80 px-3 py-2 rounded-xl mt-4 w-fit">
                                    <Calendar className="h-4 w-4 text-orange-500" />
                                    <span>Applicable: <span className="text-gray-900">{new Date(policy.applicable_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span></span>
                                </div>

                                {/* Visibility Section */}
                                <div className="mt-4 flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Visible To</label>
                                    <div className="flex flex-wrap gap-1">
                                        {policy.target_roles?.length === ROLE_OPTIONS.length ? (
                                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-100/50">
                                                All Roles (1-30)
                                            </span>
                                        ) : (
                                            policy.target_roles
                                                ?.sort((a: number, b: number) => a - b)
                                                .map((roleId: number) => {
                                                    const name = getRoleDisplayName(roleId as any);
                                                    if (name === 'Unknown Role') return null;
                                                    return (
                                                        <span key={roleId} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-tight border border-blue-100/50">
                                                            {name}
                                                        </span>
                                                    );
                                                })
                                        )}
                                        {(!policy.target_roles || policy.target_roles.length === 0) && (
                                            <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-gray-100">
                                                No Roles Selected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col gap-2">
                                <button
                                    onClick={() => handleOpenPreview(policy)}
                                    className="flex items-center gap-2 justify-center w-full bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-700 hover:from-amber-500 hover:to-orange-600 hover:text-white px-4 py-3.5 sm:py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-orange-200"
                                >
                                    <LinkIcon className="h-3.5 w-3.5" /> View Policy Document
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Layer */}
            {isSuperAdmin && showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-none sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto hidden-scrollbar flex flex-col">
                        <div className="p-6 sm:p-8 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-10 flex justify-between items-center shadow-sm">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900">{isEditing ? 'Update Policy' : 'Upload New Policy'}</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    {isEditing ? 'Modify details and visibility for this document' : 'Add a document and set visibility'}
                                </p>
                            </div>
                            <button onClick={() => !isUploading && setShowUploadModal(false)} className="text-gray-400 hover:bg-gray-100 p-2.5 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleFileUpload} className="p-6 sm:p-8 space-y-6">
                            {uploadError && (
                                <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-3 animate-shake">
                                    <AlertCircle className="h-5 w-5 shrink-0" /> {uploadError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Policy Title</label>
                                <input
                                    type="text"
                                     value={title}
                                     onChange={(e) => setTitle(e.target.value)}
                                     placeholder="e.g. 2026 Code of Conduct"
                                     className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-2xl outline-none font-bold text-slate-800 transition-all placeholder:text-gray-400 shadow-sm"
                                 />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Policy Description (Short Notes)</label>
                                <textarea
                                     value={description}
                                     onChange={(e) => setDescription(e.target.value)}
                                     placeholder="Enter a brief summary or notes about this policy..."
                                     rows={3}
                                     className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-2xl outline-none font-bold text-slate-800 transition-all placeholder:text-gray-400 text-sm resize-none shadow-sm"
                                 />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Applicable From</label>
                                    <input
                                         type="date"
                                         value={applicableDate}
                                         onChange={(e) => setApplicableDate(e.target.value)}
                                         className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-2xl outline-none font-bold text-slate-800 transition-all uppercase tracking-widest text-[11px] shadow-sm"
                                     />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document File {isEditing && '(Optional)'}</label>
                                    <div className="relative">
                                         <input
                                             type="file"
                                             onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                             className="w-full px-5 py-3.5 bg-white border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl outline-none font-bold text-slate-600 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer text-xs shadow-sm"
                                         />
                                        {isEditing && (
                                            <p className="text-[9px] font-bold text-amber-600 mt-2 ml-1 uppercase bubble-glow animate-pulse">
                                                Leave empty to keep existing document
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end px-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Roles (Visibility)</label>
                                    <button
                                        type="button"
                                        onClick={handleSelectAllRoles}
                                        className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg transition-colors border border-amber-100"
                                    >
                                        {selectedRoles.length === ROLE_OPTIONS.length ? 'Deselect All' : 'Select All 1-30'}
                                    </button>
                                </div>
                                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-[2rem] border border-gray-100 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 scrollbar-thin scrollbar-thumb-gray-200">
                                    {ROLE_OPTIONS.filter(r => r.name !== 'Unknown Role').map(role => (
                                        <label key={role.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedRoles.includes(role.id) ? 'bg-amber-50 border-slate-900 text-amber-900 shadow-sm' : 'bg-white border-transparent text-gray-600 hover:border-gray-200'}`}>
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedRoles.includes(role.id) ? 'bg-amber-500 border-slate-900' : 'bg-white border-gray-300'}`}>
                                                {selectedRoles.includes(role.id) && <Check className="h-3.5 w-3.5 text-white stroke-[4px]" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedRoles.includes(role.id)}
                                                onChange={() => handleRoleSelection(role.id)}
                                            />
                                            <span className="text-[9px] font-black uppercase tracking-widest truncate">{role.id}. {role.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 sm:static bg-white sm:bg-transparent pb-4 sm:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    disabled={isUploading}
                                    className="px-6 py-4 sm:py-3.5 rounded-2xl text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    Go Back
                                </button>
                                <button
                                     type="submit"
                                     disabled={isUploading || !title || !applicableDate || (!isEditing && !selectedFile) || selectedRoles.length === 0}
                                     className="flex items-center gap-2 justify-center px-8 py-4 sm:py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                 >
                                     {isUploading ? (
                                         <><div className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full"></div> {isEditing ? 'Updating...' : 'Syncing with Cloud...'}</>
                                     ) : (
                                         <>{isEditing ? <Edit className="h-4 w-4 stroke-[3px]" /> : <Upload className="h-4 w-4 stroke-[3px]" />} {isEditing ? 'Save Changes' : 'Save & Publish Policy'}</>
                                     )}
                                 </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-6 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-full sm:h-[90vh] rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl shrink-0">
                                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                                </div>
                                <div className="overflow-hidden">
                                    <h2 className="text-base sm:text-xl font-black text-gray-900 truncate leading-tight">{previewTitle}</h2>
                                    <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Policy Preview</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                                <a 
                                    href={previewUrl.replace('/preview', '/view')} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 sm:p-2.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                    title="Open Full Link"
                                >
                                    <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                </a>
                                <button 
                                    onClick={() => setPreviewUrl(null)} 
                                    className="p-2 sm:p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - iFrame */}
                        <div className="flex-1 bg-gray-100/50 relative">
                            <iframe 
                                src={previewUrl}
                                className="w-full h-full border-none shadow-inner"
                                allow="autoplay"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-center bg-gray-50/50">
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="w-full sm:w-auto px-10 py-4 sm:py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
            `}</style>
        </div>
    );
}

// Icon fallbacks
function ChevronDown(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    )
}

'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Database, Trash2, ExternalLink, FileText, Video, Music,
    Image as ImageIcon, FileArchive, RefreshCw, ChevronRight, ChevronLeft,
    ShieldCheck, Users, CheckCircle2, Check, Loader2
} from 'lucide-react';
import sadhanaDb from '@/lib/supabase/sadhanaDb';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getRoleDisplayName } from '@/lib/utils/roles';

type FileRecord = {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    google_drive_url: string;
    google_drive_id?: string;
    thumbnail_link: string;
    category: string;
    description: string;
    created_at: string;
    views: number;
    user_id: string;
    uploader_name?: string;
    uploader_role?: any;
};

const CATEGORIES = [
    { id: 'all', label: 'All Resources', icon: Database },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'audio', label: 'Audios', icon: Music },
    { id: 'pdf', label: 'PDFs', icon: FileText },
    { id: 'doc', label: 'Docs', icon: FileText },
    { id: 'images', label: 'Images', icon: ImageIcon },
];

export default function AdminDataCenterPage() {
    const { userData } = useAuth();
    const router = useRouter();
    
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeView, setActiveView] = useState<'resources' | 'scans'>('resources');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [fileIdsToDelete, setFileIdsToDelete] = useState<string[]>([]);

    // Uploader Filter State
    const [uploaderOptions, setUploaderOptions] = useState<{id: string, name: string}[]>([]);
    const [selectedUploaderId, setSelectedUploaderId] = useState('all');
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [uploaderSearch, setUploaderSearch] = useState('');

    const filteredUploaderOptions = useMemo(() => {
        return uploaderOptions.filter(opt => 
            opt.name.toLowerCase().includes(uploaderSearch.toLowerCase())
        );
    }, [uploaderOptions, uploaderSearch]);

    // Server-side State
    const [totalCount, setTotalCount] = useState(0);
    const [filteredTotalCount, setFilteredTotalCount] = useState(0);
    const [totalStorageSize, setTotalStorageSize] = useState('0.00 GB');
    const [filteredStorageSize, setFilteredStorageSize] = useState('0.00 GB');
    const [uniqueUploadersCount, setUniqueUploadersCount] = useState(0);

    // Scans State
    const [scans, setScans] = useState<any[]>([]);
    const [isScansLoading, setIsScansLoading] = useState(false);
    const [scanSearchQuery, setScanSearchQuery] = useState('');
    const [selectedScanUserId, setSelectedScanUserId] = useState('all');
    const [isScanUserOpen, setIsScanUserOpen] = useState(false);
    const [scanUserSearch, setScanUserSearch] = useState('');
    const [scanCurrentPage, setScanCurrentPage] = useState(1);
    const [scanItemsPerPage, setScanItemsPerPage] = useState(20);
    const [scanTotalCount, setScanTotalCount] = useState(0);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Security Check
    useEffect(() => {
        if (userData) {
            const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
            if (!roles.includes(8) && !roles.includes('super_admin')) {
                toast.error('Access Denied: Super Admin roles required');
                router.push('/dashboard');
            }
        }
    }, [userData, router]);

    const fetchScans = useCallback(async () => {
        setIsScansLoading(true);
        try {
            if (!sadhanaDb) return;

            const from = (scanCurrentPage - 1) * scanItemsPerPage;
            const to = from + scanItemsPerPage - 1;

            let query = sadhanaDb
                .from('drive_scans')
                .select('*', { count: 'exact' });

            if (scanSearchQuery) {
                query = query.or(`description.ilike.%${scanSearchQuery}%,user_name.ilike.%${scanSearchQuery}%`);
            }

            if (selectedScanUserId !== 'all') {
                query = query.eq('user_id', selectedScanUserId);
            }

            const { data, error, count } = await query
                .order('started_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setScans(data || []);
            setScanTotalCount(count || 0);
        } catch (err) {
            console.error('Fetch scans error:', err);
            toast.error('Failed to access secure scan history');
        } finally {
            setIsScansLoading(false);
        }
    }, [scanCurrentPage, scanItemsPerPage, scanSearchQuery, selectedScanUserId]);

    const fetchAllFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!sadhanaDb) throw new Error('Secondary Database not connected');
            if (!supabase) throw new Error('Primary Supabase not connected');

            // 1. Prepare query with range for pagination
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = sadhanaDb
                .from('files')
                .select('*', { count: 'exact' });

            // Apply search filters server-side
            if (searchQuery) {
                query = query.ilike('file_name', `%${searchQuery}%`);
            }

            // Apply category filter server-side
            if (activeCategory !== 'all') {
                query = query.eq('category', activeCategory);
            }

            // Apply uploader filter server-side
            if (selectedUploaderId !== 'all') {
                query = query.eq('user_id', selectedUploaderId);
            }

            const { data: filesData, error: filesError, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (filesError) throw filesError;

            // 2. Fetch Global Stats (Total count, total size)
            if (count !== null) setFilteredTotalCount(count);

            // Helper for batch summing file sizes
            const calculateTotalSize = async (baseQuery: any, total: number) => {
                let currentSize = 0;
                let fetched = 0;
                while (fetched < total) {
                    const { data } = await baseQuery.select('file_size').range(fetched, fetched + 999);
                    if (!data || data.length === 0) break;
                    currentSize += data.reduce((acc: number, f: any) => acc + (f.file_size || 0), 0);
                    fetched += data.length;
                    if (data.length < 1000) break;
                }
                return currentSize;
            };

            // Calculate Global Stats if not already set or for accuracy
            const { count: globalCount } = await sadhanaDb.from('files').select('*', { count: 'exact', head: true });
            if (globalCount !== null) {
                setTotalCount(globalCount);
                const globalSize = await calculateTotalSize(sadhanaDb.from('files'), globalCount);
                setTotalStorageSize((globalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB');
            }

            // Calculate Filtered Stats
            if (count !== null) {
                const isFiltered = searchQuery || activeCategory !== 'all' || selectedUploaderId !== 'all';
                if (isFiltered) {
                    const filteredSize = await calculateTotalSize(query, count);
                    setFilteredStorageSize((filteredSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB');
                } else {
                    setFilteredStorageSize(totalStorageSize);
                }
            }

            // Fetch Unique Uploaders count (global)
            const { data: uploaderData } = await sadhanaDb.from('files').select('user_id');
            if (uploaderData) {
                setUniqueUploadersCount(new Set(((uploaderData || []) as any[]).map((f: any) => f.user_id)).size);
            }

            // 3. Fetch unique uploaders from PRIMARY Database for the CURRENT page
            const userIds = Array.from(new Set(filesData.map((f: any) => f.user_id).filter(Boolean)));
            
            let userMap: Record<string, {name: string, role: any}> = {};
            
            if (userIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, name, role')
                    .in('id', userIds);
                
                if (!usersError && usersData) {
                    usersData.forEach((u: any) => {
                        userMap[u.id] = { name: u.name, role: u.role };
                    });
                }
            }

            // 4. Format files with uploader info
            const formattedFiles = filesData.map((f: any) => ({
                ...f,
                uploader_name: userMap[f.user_id]?.name || 'Unknown User',
                uploader_role: userMap[f.user_id]?.role
            }));

            setFiles(formattedFiles);
        } catch (error: any) {
            toast.error('Failed to fetch files: ' + error.message);
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, itemsPerPage, searchQuery, activeCategory, selectedUploaderId]);

    const fetchUploaders = useCallback(async () => {
        try {
            if (!sadhanaDb || !supabase) return;

            // 1. Get unique user_ids from files table
            const { data, error } = await sadhanaDb
                .from('files')
                .select('user_id');
            
            if (error) throw error;

            const uniqueIds = Array.from(new Set(((data || []) as any[]).map((f: any) => f.user_id).filter(Boolean)));

            if (uniqueIds.length === 0) return;

            // 2. Resolve names from primary database
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', uniqueIds);
            
            if (userError) throw userError;

            setUploaderOptions(users || []);
        } catch (err: any) {
            console.error('Error fetching uploaders:', err);
        }
    }, []);

    useEffect(() => {
        fetchUploaders();
    }, [fetchUploaders]);

    useEffect(() => {
        if (activeView === 'resources') {
            fetchAllFiles();
        } else {
            fetchScans();
        }
    }, [fetchAllFiles, fetchScans, activeView]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeCategory, itemsPerPage, selectedUploaderId]);

    useEffect(() => {
        setScanCurrentPage(1);
    }, [scanSearchQuery, selectedScanUserId, scanItemsPerPage]);

    const stats = useMemo(() => {
        const isFiltered = searchQuery || activeCategory !== 'all' || selectedUploaderId !== 'all';
        return {
            total: totalCount,
            size: isFiltered ? filteredStorageSize : totalStorageSize,
            uploaders: uniqueUploadersCount,
            filtered: filteredTotalCount,
            isFiltered
        };
    }, [totalCount, totalStorageSize, filteredStorageSize, uniqueUploadersCount, filteredTotalCount, searchQuery, activeCategory, selectedUploaderId]);

    const getThumbnailUrl = (file: FileRecord): string | null => {
        if (file.google_drive_id) {
            return `https://lh3.googleusercontent.com/d/${file.google_drive_id}=w400-h250-c`;
        }
        if (file.thumbnail_link) {
            return file.thumbnail_link.replace('=s220', '=w400-h250-c');
        }
        return null;
    };

    const getFileIcon = (category: string) => {
        switch (category?.toLowerCase()) {
            case 'video': return Video;
            case 'audio': return Music;
            case 'pdf': return FileText;
            case 'doc': return FileText;
            case 'image':
            case 'images': return ImageIcon;
            case 'zip':
            case 'archive': return FileArchive;
            default: return FileText;
        }
    };

    const handleDelete = (ids: string[]) => {
        setFileIdsToDelete(ids);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            if (!sadhanaDb) throw new Error('Database not connected');
            
            const { error } = await sadhanaDb
                .from('files')
                .delete()
                .in('id', fileIdsToDelete);

            if (error) throw error;
            
            toast.success(`Successfully deleted ${fileIdsToDelete.length} file(s)`);
            fetchAllFiles(); // Refresh from server
            setSelectedFiles([]);
            setIsDeleteModalOpen(false);
            setFileIdsToDelete([]);
        } catch (error: any) {
            toast.error('Deletion failed: ' + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedFiles.length === files.length && files.length > 0) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(files.map(f => f.id));
        }
    };

    const totalPages = Math.ceil(filteredTotalCount / (itemsPerPage || 1));
    const scanTotalPages = Math.ceil(scanTotalCount / (scanItemsPerPage || 1));

    if (!userData) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-4 lg:p-8 bg-slate-50/30 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                            <Database className="w-6 h-6 text-white" />
                        </div>
                        Global Data Center
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        Administrative Resource Management • {stats.total} Total Files
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={activeView === 'resources' ? fetchAllFiles : fetchScans}
                        disabled={isLoading || isScansLoading}
                        className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-5 h-5 ${(isLoading || isScansLoading) ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Total Storage</span>
                        <span className="text-xl font-black text-slate-800 leading-none">{stats.size}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-[2rem] w-fit border-2 border-slate-50 shadow-inner">
                <button
                    onClick={() => setActiveView('resources')}
                    className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'resources' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Resources Database
                </button>
                <button
                    onClick={() => setActiveView('scans')}
                    className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'scans' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Scan History
                </button>
            </div>

            <AnimatePresence mode='wait'>
                {activeView === 'resources' ? (
                    <motion.div 
                        key="resources"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-10"
                    >
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { 
                                    label: stats.isFiltered ? 'Found Files' : 'Total Files', 
                                    value: stats.isFiltered ? stats.filtered : stats.total, 
                                    icon: FileArchive, 
                                    color: 'text-blue-600', 
                                    bg: 'bg-blue-100' 
                                },
                                { 
                                    label: stats.isFiltered ? 'Active Uploaders' : 'Total Personnel', 
                                    value: stats.isFiltered ? files.reduce((acc, f) => acc.add(f.user_id), new Set()).size : stats.uploaders, 
                                    icon: Users, 
                                    color: 'text-purple-600', 
                                    bg: 'bg-purple-100' 
                                },
                                { label: 'Storage Impact', value: stats.size, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex items-center gap-5 group hover:border-indigo-100 transition-all">
                                    <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                        <stat.icon className={`w-7 h-7 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls Section */}
                        <div className="bg-white border-2 border-slate-100 p-6 lg:p-8 rounded-[2.5rem] shadow-xl space-y-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1 relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by file name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-100 overflow-x-auto max-w-full">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat.id 
                                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                                    : 'text-slate-500 hover:bg-white'}`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setIsUploaderOpen(!isUploaderOpen)}
                                            className="flex items-center gap-2 bg-slate-50 p-1.5 px-4 rounded-2xl border-2 border-slate-100 min-w-[200px] hover:border-indigo-200 transition-all text-left"
                                        >
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Uploader</p>
                                                <p className="text-xs font-black text-slate-700 truncate max-w-[150px]">
                                                    {selectedUploaderId === 'all' ? 'Every Uploader' : (uploaderOptions.find(o => o.id === selectedUploaderId)?.name || 'Unknown')}
                                                </p>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isUploaderOpen ? 'rotate-90' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isUploaderOpen && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-40" 
                                                        onClick={() => {
                                                            setIsUploaderOpen(false);
                                                            setUploaderSearch('');
                                                        }} 
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden min-w-[260px]"
                                                    >
                                                        <div className="p-3 border-b-2 border-slate-50 bg-slate-50/50">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="Search uploader name..."
                                                                    value={uploaderSearch}
                                                                    onChange={(e) => setUploaderSearch(e.target.value)}
                                                                    className="w-full pl-9 pr-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUploaderId('all');
                                                                    setIsUploaderOpen(false);
                                                                    setUploaderSearch('');
                                                                }}
                                                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all ${selectedUploaderId === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-slate-50 text-slate-600'}`}
                                                            >
                                                                Every Uploader
                                                                {selectedUploaderId === 'all' && <Check className="w-4 h-4" />}
                                                            </button>
                                                            
                                                            <div className="h-2" />
                                                            
                                                            {filteredUploaderOptions.length > 0 ? (
                                                                filteredUploaderOptions.map(opt => (
                                                                    <button
                                                                        key={opt.id}
                                                                        onClick={() => {
                                                                            setSelectedUploaderId(opt.id);
                                                                            setIsUploaderOpen(false);
                                                                            setUploaderSearch('');
                                                                        }}
                                                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all mt-1 ${selectedUploaderId === opt.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                    >
                                                                        <span className="truncate">{opt.name}</span>
                                                                        {selectedUploaderId === opt.id && <Check className="w-4 h-4" />}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-8 text-center">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Matches</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {selectedFiles.length > 0 && (
                                        <button
                                            onClick={() => handleDelete(selectedFiles)}
                                            disabled={isDeleting}
                                            className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {isDeleting ? 'Deleting...' : `Delete ${selectedFiles.length} selected`}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Table Layout */}
                            <div className="overflow-x-auto rounded-3xl border-2 border-slate-50 min-h-[400px]">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="p-5 text-left w-12">
                                                <button 
                                                    onClick={toggleSelectAll}
                                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedFiles.length === files.length && files.length > 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                                                >
                                                    {selectedFiles.length === files.length && files.length > 0 && <Check className="w-4 h-4 text-white" />}
                                                </button>
                                            </th>
                                            <th className="p-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                                            <th className="p-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Uploader</th>
                                            <th className="p-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Size</th>
                                            <th className="p-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Date</th>
                                            <th className="p-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-50">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={6} className="p-20 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Secure Records...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <AnimatePresence mode='popLayout'>
                                                {files.map((file) => (
                                                    <motion.tr 
                                                        layout
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        key={file.id} 
                                                        className={`group hover:bg-indigo-50/30 transition-all ${selectedFiles.includes(file.id) ? 'bg-indigo-50/50' : ''}`}
                                                    >
                                                        <td className="p-5">
                                                            <button 
                                                                onClick={() => setSelectedFiles(prev => prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedFiles.includes(file.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}
                                                            >
                                                                {selectedFiles.includes(file.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                                            </button>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-16 h-10 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center shadow-sm overflow-hidden relative group/thumb">
                                                                    {getThumbnailUrl(file) ? (
                                                                        <img 
                                                                            src={getThumbnailUrl(file)!} 
                                                                            alt={file.file_name}
                                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                                (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            {(() => {
                                                                                const Icon = getFileIcon(file.category);
                                                                                return <Icon className="w-5 h-5 text-indigo-600" />;
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-slate-800 text-sm truncate max-w-[200px] lg:max-w-md">{file.file_name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold truncate">{file.description || 'No description'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                                                                    {file.uploader_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-slate-700 leading-none">{file.uploader_name}</span>
                                                                    {file.uploader_role && (
                                                                        <span className="text-[9px] font-black text-indigo-600/60 uppercase tracking-widest mt-0.5">
                                                                            {getRoleDisplayName(file.uploader_role as any)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-indigo-600 uppercase mb-0.5">{file.category}</span>
                                                                <span className="text-xs font-bold text-slate-400">
                                                                    {file.file_size > 1024 * 1024 * 1024 
                                                                        ? (file.file_size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
                                                                        : (file.file_size / (1024 * 1024)).toFixed(2) + ' MB'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-xs font-bold text-slate-500">
                                                            {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            <div className="flex items-center justify-end gap-2 text-slate-400 group-hover:text-slate-600">
                                                                <a 
                                                                    href={file.google_drive_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 transition-all hover:text-indigo-600 hover:bg-slate-50 rounded-xl"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                                <button 
                                                                    onClick={() => handleDelete([file.id])}
                                                                    className="p-2 transition-all hover:text-rose-600 hover:bg-slate-50 rounded-xl"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                        {(files.length === 0 && !isLoading) && (
                                            <tr>
                                                <td colSpan={6} className="p-20 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <div className="p-6 bg-slate-50 rounded-full mb-4">
                                                            <Search className="w-12 h-12 text-slate-200" />
                                                        </div>
                                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No resources found matching your search</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t-2 border-slate-50">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Page {currentPage} of {totalPages || 1} • {stats.filtered} Records Found
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                        className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none cursor-pointer"
                                    >
                                        {[10, 20, 50].map(val => (
                                            <option key={val} value={val}>{val} per page</option>
                                        ))}
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 bg-white border-2 border-slate-100 rounded-xl text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30 disabled:hover:border-slate-100 transition-all shadow-sm"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="p-2 bg-white border-2 border-slate-100 rounded-xl text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30 disabled:hover:border-slate-100 transition-all shadow-sm"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="scans"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Scan Logs</h2>
                                <p className="text-slate-500 font-bold mt-1 text-sm">Monitoring all resource indexing activities across the platform</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Scan Search Bar */}
                                <div className="relative group min-w-[300px]">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by description or user..."
                                        value={scanSearchQuery}
                                        onChange={(e) => setScanSearchQuery(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                                    />
                                </div>

                                {/* Initiated By Filter */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsScanUserOpen(!isScanUserOpen)}
                                        className={`flex items-center gap-3 px-6 py-4 bg-white border-2 rounded-2xl transition-all shadow-sm ${
                                            selectedScanUserId !== 'all' ? 'border-indigo-200 text-indigo-600 transition-all font-black' : 'border-slate-100 text-slate-500 hover:border-slate-200 font-black'
                                        }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        <span className="text-[10px] uppercase tracking-widest">
                                            {selectedScanUserId === 'all' ? 'Initiated By' : uploaderOptions.find(u => u.id === selectedScanUserId)?.name || 'Filtered User'}
                                        </span>
                                    </button>

                                    <AnimatePresence>
                                        {isScanUserOpen && (
                                            <>
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setIsScanUserOpen(false)}
                                                    className="fixed inset-0 z-40 bg-transparent"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border-2 border-slate-50 p-4 z-50 overflow-hidden"
                                                >
                                                    <div className="relative mb-4">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input 
                                                            type="text"
                                                            placeholder="Search user..."
                                                            value={scanUserSearch}
                                                            onChange={(e) => setScanUserSearch(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                        />
                                                    </div>
                                                    
                                                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedScanUserId('all');
                                                                setIsScanUserOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                selectedScanUserId === 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            All Initiators
                                                        </button>
                                                        {uploaderOptions
                                                            .filter(u => u.name.toLowerCase().includes(scanUserSearch.toLowerCase()))
                                                            .map(user => (
                                                            <button
                                                                key={user.id}
                                                                onClick={() => {
                                                                    setSelectedScanUserId(user.id);
                                                                    setIsScanUserOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${
                                                                    selectedScanUserId === user.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {user.name}
                                                                {selectedScanUserId === user.id && <Check className="w-3 h-3" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button 
                                    onClick={fetchScans}
                                    className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    <RefreshCw className={`w-5 h-5 ${isScansLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-[2.5rem] border-2 border-slate-50 min-h-[400px] bg-white shadow-sm overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Initiated By</th>
                                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Drive Source</th>
                                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progress</th>
                                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50">
                                    {isScansLoading && scans.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving System Logs...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : scans.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest leading-relaxed">
                                                <Search className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                                No scan history found matching your filters
                                            </td>
                                        </tr>
                                    ) : (
                                        scans.map((scan) => (
                                            <tr key={scan.id} className="group hover:bg-slate-50/50 transition-all">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-xs font-black text-indigo-600 border border-indigo-100 shadow-sm">
                                                            {scan.user_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <span className="text-sm font-black text-slate-700">{scan.user_name || 'System Admin'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col max-w-[200px]">
                                                        <p className="text-sm font-bold text-slate-700 truncate">{scan.description || 'Global Indexing'}</p>
                                                        <a href={scan.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 font-bold hover:underline truncate inline-flex items-center gap-1 group/link">
                                                            View Drive Folder
                                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-2 min-w-[180px]">
                                                        <div className="flex justify-between items-end">
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Scanned</span>
                                                                <span className="text-xs font-black text-slate-700">{scan.files_found}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">New/Updated</span>
                                                                <span className="text-xs font-black text-indigo-600">{scan.files_processed}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">Skipped</span>
                                                                <span className="text-xs font-black text-amber-600">{scan.files_skipped || 0}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                            <motion.div 
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${((scan.files_processed + (scan.files_skipped || 0)) / (scan.files_found || 1)) * 100}%` }}
                                                                className={`h-full ${scan.scan_status === 'failed' ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            <span>Sync Progress</span>
                                                            <span>{Math.round(((scan.files_processed + (scan.files_skipped || 0)) / (scan.files_found || 1)) * 100)}%</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${
                                                        scan.scan_status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-50' :
                                                        scan.scan_status === 'processing' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse shadow-sm shadow-indigo-50' :
                                                        scan.scan_status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-50' :
                                                        'bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-50'
                                                    }`}>
                                                        {scan.scan_status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-600">{new Date(scan.started_at).toLocaleDateString()}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{new Date(scan.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Scan Pagination Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t-2 border-slate-50">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Page {scanCurrentPage} of {scanTotalPages || 1} • {scanTotalCount} Scans Logged
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <select
                                    value={scanItemsPerPage}
                                    onChange={(e) => setScanItemsPerPage(Number(e.target.value))}
                                    className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none cursor-pointer shadow-sm"
                                >
                                    {[10, 20, 50].map(val => (
                                        <option key={val} value={val}>{val} per page</option>
                                    ))}
                                </select>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setScanCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={scanCurrentPage === 1}
                                        className="p-2 bg-white border-2 border-slate-100 rounded-xl text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30 disabled:hover:border-slate-100 transition-all shadow-sm"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setScanCurrentPage(p => Math.min(scanTotalPages, p + 1))}
                                        disabled={scanCurrentPage === scanTotalPages || scanTotalPages === 0}
                                        className="p-2 bg-white border-2 border-slate-100 rounded-xl text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30 disabled:hover:border-slate-100 transition-all shadow-sm"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

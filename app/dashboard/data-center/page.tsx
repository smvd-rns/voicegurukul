'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Folder, ExternalLink, Download, FileText, Video, Music,
    Image as ImageIcon, FileArchive, LayoutGrid, List, Upload, Clock, Eye,
    HardDriveUpload, Trash2, AlertCircle, Loader2, CheckCircle2, ChevronRight, ChevronDown,
    SearchX, User, HardDrive, FileType, MoreHorizontal, ArrowUp, ArrowDown, PlusSquare, MinusSquare,
    ChevronLeft, X, Presentation, FileSpreadsheet, ShieldCheck, Settings2, Check, Users
} from 'lucide-react';
import sadhanaDb from '@/lib/supabase/sadhanaDb';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/config';
import { getRoleDisplayName, getRoleHierarchyNumber } from '@/lib/utils/roles';

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
    metadata: any;
    upload_method: string;
    user_id: string;
    folder_id: string | null;
};

type FolderRecord = {
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    created_at: string;
};

const CATEGORY_THEMES: Record<string, {
    border: string;
    bg: string;
    text: string;
    shadow: string;
    iconBg: string;
}> = {
    all: {
        border: 'border-blue-200 shadow-lg shadow-blue-500/10',
        bg: 'bg-blue-50/50',
        text: 'text-blue-900',
        shadow: 'shadow-blue-500/20',
        iconBg: 'bg-blue-600'
    },
    video: {
        border: 'border-rose-200 shadow-lg shadow-rose-500/10',
        bg: 'bg-rose-50/50',
        text: 'text-rose-900',
        shadow: 'shadow-rose-500/20',
        iconBg: 'bg-rose-600'
    },
    audio: {
        border: 'border-violet-200 shadow-lg shadow-violet-500/10',
        bg: 'bg-violet-50/50',
        text: 'text-violet-900',
        shadow: 'shadow-violet-500/20',
        iconBg: 'bg-violet-600'
    },
    pdf: {
        border: 'border-rose-200 shadow-lg shadow-rose-500/10',
        bg: 'bg-rose-50/50',
        text: 'text-rose-900',
        shadow: 'shadow-rose-500/20',
        iconBg: 'bg-rose-600'
    },
    doc: {
        border: 'border-blue-200 shadow-lg shadow-blue-500/10',
        bg: 'bg-blue-50/50',
        text: 'text-blue-900',
        shadow: 'shadow-blue-500/20',
        iconBg: 'bg-blue-600'
    },
    ppt: {
        border: 'border-amber-200 shadow-lg shadow-amber-500/10',
        bg: 'bg-amber-50/50',
        text: 'text-amber-900',
        shadow: 'shadow-amber-500/20',
        iconBg: 'bg-amber-600'
    },
    excel: {
        border: 'border-emerald-200 shadow-lg shadow-emerald-500/10',
        bg: 'bg-emerald-50/50',
        text: 'text-emerald-900',
        shadow: 'shadow-emerald-500/20',
        iconBg: 'bg-emerald-600'
    },
    images: {
        border: 'border-indigo-200 shadow-lg shadow-indigo-500/10',
        bg: 'bg-indigo-50/50',
        text: 'text-indigo-900',
        shadow: 'shadow-indigo-500/20',
        iconBg: 'bg-indigo-600'
    },
    other: {
        border: 'border-slate-300 shadow-md',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        shadow: 'shadow-slate-400/30',
        iconBg: 'bg-slate-500'
    }
};

const CATEGORIES = [
    { id: 'all', label: 'All', icon: Folder },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'audio', label: 'Audios', icon: Music },
    { id: 'pdf', label: 'PDFs', icon: FileText },
    { id: 'doc', label: 'Docs', icon: FileText },
    { id: 'ppt', label: 'Slides', icon: FileArchive },
    { id: 'excel', label: 'Sheets', icon: List },
    { id: 'images', label: 'Images', icon: ImageIcon },
];

export default function DataCenterPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    const { user, userData } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const urlFolderId = searchParams?.get('folderId') || 'root';
    const urlCategory = searchParams?.get('category') || 'all';

    const [activeTab, setActiveTab] = useState<'global' | 'my'>('global');
    const [allowedUploadRoles, setAllowedUploadRoles] = useState<number[]>([2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21]);
    const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
    const [isPermissionDropdownOpen, setIsPermissionDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(urlCategory);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'views_desc'>('newest');
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        images: 0,
        videos: 0,
        documents: 0,
        size: 0
    });

    // New search-related visibility state
    const [foldersWithMatchingResources, setFoldersWithMatchingResources] = useState<Set<string>>(new Set());
    const [matchingResourceUserIds, setMatchingResourceUserIds] = useState<Set<string>>(new Set());
    const [foldersWithFiles, setFoldersWithFiles] = useState<Set<string>>(new Set());
    const [folderFilesMap, setFolderFilesMap] = useState<Record<string, FileRecord[]>>({});
    const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

    const [limit, setLimit] = useState(24);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const isSearching = searchQuery.trim().length > 0;

    // Explorer State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentFolderId, setCurrentFolderId] = useState<string | 'root'>(urlFolderId);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
    const [folders, setFolders] = useState<FolderRecord[]>([]);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

    // Sync state with URL for back button support
    useEffect(() => {
        if (urlFolderId && urlFolderId !== currentFolderId) {
            setCurrentFolderId(urlFolderId);
        }
        if (urlCategory && urlCategory !== activeCategory) {
            setActiveCategory(urlCategory);
        }
    }, [urlFolderId, urlCategory, activeCategory, currentFolderId]);

    // Delete State
    const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderRecord | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [showBulkDownloadConfirm, setShowBulkDownloadConfirm] = useState(false);
    const [filesToDownload, setFilesToDownload] = useState<FileRecord[]>([]);
    const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
    const [allFolders, setAllFolders] = useState<FolderRecord[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Fetch allowed roles from database
    useEffect(() => {
        const fetchAllowedRoles = async () => {
            if (!sadhanaDb) return;
            try {
                const { data, error } = await sadhanaDb
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'data_center_upload_roles')
                    .maybeSingle();
                
                if (data && Array.isArray(data.value)) {
                    setAllowedUploadRoles(data.value.map(Number));
                }
            } catch (err) {
                console.error('Fetch allowed roles error:', err);
            }
        };
        fetchAllowedRoles();
    }, []);



    const isSuperAdmin = useMemo(() => {
        if (!userData?.role) return false;
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        return roles.some(r => getRoleHierarchyNumber(r) === 8);
    }, [userData?.role]);

    const canUpload = useMemo(() => {
        if (!userData?.role) return false;
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        return roles.some(r => allowedUploadRoles.includes(getRoleHierarchyNumber(r)));
    }, [userData?.role, allowedUploadRoles]);

    useEffect(() => {
        if (!canUpload && activeTab === 'my') {
            setActiveTab('global');
        }
    }, [canUpload, activeTab]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            if (newWidth > 180 && newWidth < 800) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isResizing]);



    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        const currentViewIds = [...files.map(f => f.id), ...folders.map(f => f.id)];
        const allInViewSelected = currentViewIds.length > 0 && currentViewIds.every(id => selectedIds.has(id));

        const newSelected = new Set(selectedIds);
        if (allInViewSelected) {
            currentViewIds.forEach(id => newSelected.delete(id));
        } else {
            currentViewIds.forEach(id => newSelected.add(id));
        }
        setSelectedIds(newSelected);
    };

    const fetchStats = useCallback(async () => {
        if (!sadhanaDb) return;
        try {
            console.log('Fetching stats for tab:', activeTab, 'User:', user?.id);

            // Build the base filter
            let base = sadhanaDb.from('files');
            let filteredBase = base.select('*', { count: 'exact', head: true });

            if (activeTab === 'my' && user) {
                filteredBase = filteredBase.eq('user_id', user.id);
            }

            // 1. Get counts using head: true for efficiency
            // Note: We need separate builders for each count because filters are additive
            const [totalRes, imagesRes, videosRes, docsRes] = await Promise.all([
                (activeTab === 'my' && user) ? sadhanaDb.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id) : sadhanaDb.from('files').select('*', { count: 'exact', head: true }),
                (activeTab === 'my' && user) ? sadhanaDb.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('category', 'images') : sadhanaDb.from('files').select('*', { count: 'exact', head: true }).eq('category', 'images'),
                (activeTab === 'my' && user) ? sadhanaDb.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('category', 'video') : sadhanaDb.from('files').select('*', { count: 'exact', head: true }).eq('category', 'video'),
                (activeTab === 'my' && user) ? sadhanaDb.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('category', ['pdf', 'doc', 'ppt', 'excel']) : sadhanaDb.from('files').select('*', { count: 'exact', head: true }).in('category', ['pdf', 'doc', 'ppt', 'excel'])
            ]);

            console.log('Stats results:', { total: totalRes.count, images: imagesRes.count });

            // 2. Get total size
            let totalSize = 0;
            const totalFiles = totalRes.count || 0;

            if (totalFiles > 0) {
                let sizeQuery = sadhanaDb.from('files').select('file_size');
                if (activeTab === 'my' && user) {
                    sizeQuery = sizeQuery.eq('user_id', user.id);
                }

                if (totalFiles <= 1000) {
                    const { data } = await sizeQuery;
                    if (data) {
                        totalSize = (data as any[]).reduce((acc: number, f: any) => acc + (Number(f.file_size) || 0), 0);
                    }
                } else {
                    let fetchedCount = 0;
                    while (fetchedCount < totalFiles) {
                        const { data } = await sizeQuery.range(fetchedCount, fetchedCount + 999);
                        if (!data || data.length === 0) break;
                        totalSize += (data as any[]).reduce((acc: number, f: any) => acc + (Number(f.file_size) || 0), 0);
                        fetchedCount += data.length;
                        if (data.length < 1000) break;
                    }
                }
            }

            setStats({
                total: totalFiles,
                images: imagesRes.count || 0,
                videos: videosRes.count || 0,
                documents: docsRes.count || 0,
                size: totalSize
            });
        } catch (err) {
            console.error('Stats error:', err);
        }
    }, [activeTab, user]);

    const fetchAllFolders = useCallback(async () => {
        if (!sadhanaDb || !user) return;
        try {
            let allFoldersData: FolderRecord[] = [];
            let from = 0;
            const limit = 1000;

            while (true) {
                let query = sadhanaDb.from('folders')
                    .select('*')
                    .order('name', { ascending: true })
                    .range(from, from + limit - 1);

                if (activeTab === 'my') {
                    query = query.eq('user_id', user.id);
                }

                const { data, error } = await query;
                if (error) throw error;
                if (!data || data.length === 0) break;

                allFoldersData = [...allFoldersData, ...data as FolderRecord[]];
                if (data.length < limit) break;
                from += limit;
            }

            setAllFolders(allFoldersData);

            // For global tab, resolve usernames
            if (activeTab === 'global' && allFoldersData.length > 0) {
                const uniqueUserIds = Array.from(new Set(allFoldersData.map(f => f.user_id)));
                if (uniqueUserIds.length > 0) {
                    // Populate initial fallback mapping using user ID prefixes
                    const mapping: Record<string, string> = {};
                    uniqueUserIds.forEach(id => {
                        mapping[id] = 'Loading...';
                    });
                    setUserMap(mapping);

                    try {
                        const { data: userData, error: userError } = await (supabase as any)
                            .from('users')
                            .select('id, name, email')
                            .in('id', uniqueUserIds);

                        if (userData) {
                            const updatedMapping = { ...mapping };
                            userData.forEach((u: any) => {
                                updatedMapping[u.id] = u.name || u.email?.split('@')[0] || `User (${u.id.substring(0, 6)})`;
                            });
                            // Set fallback for users not found in the users table
                            const foundIds = new Set(userData.map((u: any) => u.id));
                            uniqueUserIds.forEach(id => {
                                if (!foundIds.has(id)) {
                                    updatedMapping[id] = `Unknown User (${id.substring(0, 6)})`;
                                }
                            });
                            setUserMap(updatedMapping);
                        }
                    } catch (fetchErr) {
                        console.error('Failed to resolve usernames, using fallbacks:', fetchErr);
                    }
                }
            }
        } catch (err) {
            console.error('Fetch all folders error:', err);
        }
    }, [user, activeTab]);

    const fetchFoldersWithFiles = useCallback(async () => {
        if (!sadhanaDb) return;
        try {
            let allFolderIds = new Set<string>();
            let from = 0;
            const limit = 1000;

            while (true) {
                const { data, error } = await sadhanaDb
                    .from('files')
                    .select('folder_id')
                    .not('folder_id', 'is', null)
                    .range(from, from + limit - 1);

                if (error) throw error;
                if (!data || data.length === 0) break;

                (data as any[]).forEach((f: any) => {
                    if (f.folder_id) allFolderIds.add(f.folder_id);
                });

                if (data.length < limit) break;
                from += limit;
            }

            setFoldersWithFiles(allFolderIds);
        } catch (err) {
            console.error('Fetch folders with files error:', err);
        }
    }, []);

    useEffect(() => {
        fetchAllFolders();
        fetchFoldersWithFiles();
    }, [fetchAllFolders, fetchFoldersWithFiles]);

    // Visibility logic for tree filtering
    const { visibleFolderIds, visibleUserIds } = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return { visibleFolderIds: new Set<string>(), visibleUserIds: new Set<string>() };

        const folderIds = new Set<string>();
        const userIds = new Set<string>();

        // 1. Folders that match by name OR contain matching files
        allFolders.forEach(f => {
            if (f.name.toLowerCase().includes(query) || foldersWithMatchingResources.has(f.id)) {
                folderIds.add(f.id);
            }
        });

        // 2. Users that match by name
        Object.entries(userMap).forEach(([id, name]) => {
            if (name.toLowerCase().includes(query)) {
                userIds.add(id);
                // Also show all folders for matching users? Or just the root?
                // The user requested searching user name, showing result in tree.
                // Usually this means showing the user's root.
            }
        });

        // 3. Propagate folder visibility up to roots
        folderIds.forEach(id => {
            let current = allFolders.find(f => f.id === id);
            while (current && current.parent_id) {
                folderIds.add(current.parent_id);
                current = allFolders.find(f => f.id === current?.parent_id);
            }
            if (current) userIds.add(current.user_id);
        });

        // 4. Ensure users with visible folders are themselves visible
        allFolders.forEach(f => {
            if (folderIds.has(f.id)) {
                userIds.add(f.user_id);
            }
        });

        // 5. Ensure users with matching resources anywhere are visible
        matchingResourceUserIds.forEach(uid => userIds.add(uid));

        return { visibleFolderIds: folderIds, visibleUserIds: userIds };
    }, [searchQuery, allFolders, userMap, foldersWithMatchingResources, matchingResourceUserIds]);

    const fetchFolderFiles = useCallback(async (folderId: string) => {
        if (!sadhanaDb) return;
        try {
            let query = sadhanaDb.from('files').select('*');
            if (folderId === 'root' || folderId.startsWith('root-')) {
                const targetUserId = folderId.startsWith('root-') ? folderId.replace('root-', '') : user?.id;
                if (!targetUserId) return;
                query = query.is('folder_id', null).eq('user_id', targetUserId);
            } else {
                query = query.eq('folder_id', folderId);
            }

            const { data, error } = await query.order('file_name', { ascending: true });
            if (error) throw error;
            if (data) {
                setFolderFilesMap(prev => {
                    if (prev[folderId]) return prev;
                    return { ...prev, [folderId]: data as FileRecord[] };
                });
            }
        } catch (err) {
            console.error('Fetch folder files error:', err);
        }
    }, [user]);

    useEffect(() => {
        // Automatically fetch files for any expanded folder if not already cached.
        // This covers manual expansion...
        expandedFolders.forEach(id => {
            if (!folderFilesMap[id]) {
                fetchFolderFiles(id);
            }
        });

        // ...and auto-expansion during search.
        if (isSearching) {
            visibleFolderIds.forEach(id => {
                if (!folderFilesMap[id]) {
                    fetchFolderFiles(id);
                }
            });
        }
    }, [expandedFolders, isSearching, visibleFolderIds, folderFilesMap, fetchFolderFiles]);

    const toggleFolderExpansion = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const getDirectDownloadUrl = (file: FileRecord) => {
        if (file.google_drive_id) {
            return `https://drive.google.com/uc?export=download&id=${file.google_drive_id}`;
        }
        // Fallback for older records: extract ID from URL
        const idMatch = file.google_drive_url.match(/[-\w]{25,}/);
        if (idMatch) {
            return `https://drive.google.com/uc?export=download&id=${idMatch[0]}`;
        }
        return file.google_drive_url;
    };

    const getThumbnailUrl = (file: FileRecord): string | null => {
        if (file.google_drive_id) {
            // Use Google Drive image delivery endpoint with requested size
            return `https://lh3.googleusercontent.com/d/${file.google_drive_id}=w400-h250-c`;
        }

        if (file.thumbnail_link) {
            // Fallback to stored thumbnail link, normalizing size if possible
            return file.thumbnail_link.replace('=s220', '=w400-h250-c');
        }

        return null;
    };

    const getDescendantFolderIds = useCallback((folderId: string): string[] => {
        const descendants: string[] = [];
        const findChildren = (id: string) => {
            const children = allFolders.filter(f => f.parent_id === id);
            children.forEach(child => {
                descendants.push(child.id);
                findChildren(child.id);
            });
        };
        findChildren(folderId);
        return descendants;
    }, [allFolders]);

    const fetchFiles = useCallback(async () => {
        if (!sadhanaDb) return;

        try {
            setIsLoading(true);
            setSelectedIds(new Set());

            // 1. Fetch Folders
            // (Folders are fetched independently via fetchAllFolders)

            // 2. Fetch Files
            let query = sadhanaDb.from('files').select('*', { count: 'exact' });

            if (activeTab === 'my' && user) {
                query = query.eq('user_id', user.id);
            }

            // Recursive Folder filtering
            const searching = searchQuery.trim().length > 0;
            if (!searching) {
                if (currentFolderId === 'root') {
                    // All files
                } else if (currentFolderId.startsWith('root-')) {
                    const userId = currentFolderId.replace('root-', '');
                    query = query.eq('user_id', userId);
                } else {
                    const descendantIds = getDescendantFolderIds(currentFolderId);
                    const allTargetIds = [currentFolderId, ...descendantIds];
                    query = query.in('folder_id', allTargetIds);
                }
            } else {
                if (activeTab === 'global' && currentFolderId.startsWith('root-')) {
                    const userId = currentFolderId.replace('root-', '');
                    query = query.eq('user_id', userId);
                }
                if (activeTab === 'global' && !currentFolderId.startsWith('root-') && currentFolderId !== 'root') {
                    const descendantIds = getDescendantFolderIds(currentFolderId);
                    const allTargetIds = [currentFolderId, ...descendantIds];
                    query = query.in('folder_id', allTargetIds);
                }
            }

            if (searchQuery.trim()) {
                const words = searchQuery.trim().split(/\s+/).filter(Boolean);
                for (const word of words) {
                    query = query.or(`file_name.ilike.%${word}%,description.ilike.%${word}%`);
                }
            }

            if (activeCategory !== 'all') {
                query = query.eq('category', activeCategory);
            }

            // Sorting - Added stable ID sort as secondary
            switch (sortBy) {
                case 'newest': query = query.order('created_at DESC, id', { ascending: true }); break;
                case 'oldest': query = query.order('created_at ASC, id', { ascending: true }); break;
                case 'name_asc': query = query.order('file_name ASC, id', { ascending: true }); break;
                case 'name_desc': query = query.order('file_name DESC, id', { ascending: true }); break;
                case 'views_desc': query = query.order('views DESC, id', { ascending: true }); break;
                default: query = query.order('created_at DESC, id', { ascending: true });
            }

            query = query.range((currentPage - 1) * limit, currentPage * limit - 1);

            if (searching) {
                let treeFilterQuery = sadhanaDb.from('files').select('folder_id, user_id');
                if (activeTab === 'my' && user) {
                    treeFilterQuery = treeFilterQuery.eq('user_id', user.id);
                }
                const words = searchQuery.trim().split(/\s+/).filter(Boolean);
                for (const word of words) {
                    treeFilterQuery = treeFilterQuery.or(`file_name.ilike.%${word}%,description.ilike.%${word}%`);
                }

                (treeFilterQuery as any).then((res: any) => {
                    const data = res?.data;
                    if (data) {
                        const matchingFolderIds = new Set(((data || []) as any[]).filter((f: any) => f.folder_id).map((f: any) => f.folder_id!));
                        const matchingUserIds = new Set(((data || []) as any[]).map((f: any) => f.user_id));
                        setFoldersWithMatchingResources(matchingFolderIds);
                        setMatchingResourceUserIds(matchingUserIds);
                    }
                });
            } else {
                setFoldersWithMatchingResources(new Set());
                setMatchingResourceUserIds(new Set());
            }

            const { data, error, count } = await query;

            if (error) throw error;

            if (data) {
                setFiles(data as FileRecord[]);
                setTotalCount(count || 0);
            }
        } catch (error) {
            console.error('Fetch exception:', error);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, activeCategory, activeTab, user, sortBy, limit, currentPage, currentFolderId, getDescendantFolderIds]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchFiles();
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, activeCategory, activeTab, sortBy, currentPage, limit, currentFolderId, viewMode, fetchFiles]);

    useEffect(() => {
        // Reset to page 1 when filters or folder changes
        setCurrentPage(1);
    }, [searchQuery, activeCategory, activeTab, sortBy, currentFolderId]);

    useEffect(() => {
        // Clear selection when changing tabs
        setSelectedIds(new Set());
    }, [activeTab]);

    const handleDelete = async () => {
        if (!sadhanaDb || !user) return;

        const idsToDelete = fileToDelete ? [fileToDelete.id] : Array.from(selectedIds);
        if (idsToDelete.length === 0) return;

        setIsDeleting(true);
        try {
            const { data: sessionData } = await (supabase as any).auth.getSession();
            const token = sessionData?.session?.access_token;

            // Separate folder IDs and file IDs
            const folderIds = idsToDelete.filter(id => allFolders.some(f => f.id === id));
            const fileIds = idsToDelete.filter(id => !folderIds.includes(id));

            console.log(`[Bulk Delete] User ${user.id} deleting ${fileIds.length} files and ${folderIds.length} folders`);

            const deletePromises: Promise<any>[] = [];

            // 1. Delete Files
            if (fileIds.length > 0) {
                deletePromises.push(
                    fetch('/api/drive/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
                        },
                        body: JSON.stringify({ ids: fileIds })
                    }).then(async res => {
                        const result = await res.json();
                        if (!res.ok) throw new Error(result.error || 'Failed to delete files');
                        return result;
                    })
                );
            }

            // 2. Delete Folders (Recursive)
            for (const folderId of folderIds) {
                deletePromises.push(
                    fetch('/api/folders/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
                        },
                        body: JSON.stringify({ id: folderId })
                    }).then(async res => {
                        const result = await res.json();
                        if (!res.ok) throw new Error(result.error || 'Failed to delete folder');
                        return result;
                    })
                );
            }

            const results = await Promise.all(deletePromises);
            console.log('Bulk delete completed successfully', results);

            // Update UI
            setFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
            setFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
            setSelectedIds(new Set());
            setFileToDelete(null);
            setShowBulkDeleteConfirm(false);

            await fetchFiles();
            await fetchAllFolders();

            showToast('Selected items removed successfully', 'success');

            // Wait slightly for DB to settle and then refresh stats
            setTimeout(() => {
                fetchStats();
            }, 1000);
        } catch (err: any) {
            console.error('Delete error:', err);
            showToast(`Delete failed: ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteFolder = async () => {
        if (!folderToDelete || !user) return;

        setIsDeleting(true);
        try {
            const { data: sessionData } = await (supabase as any).auth.getSession();
            const token = sessionData?.session?.access_token;

            const res = await fetch('/api/folders/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
                },
                body: JSON.stringify({ id: folderToDelete.id })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to delete folder');

            console.log(`Successfully deleted folder ${folderToDelete.id} and its recursive contents`);

            // If we are currently in this folder or a subfolder, go back to root
            if (currentFolderId === folderToDelete.id || getDescendantFolderIds(folderToDelete.id).includes(currentFolderId)) {
                setCurrentFolderId('root');
                setBreadcrumbs([]);
            }

            // Refresh everything
            await Promise.all([
                fetchAllFolders(),
                fetchFiles()
            ]);

            setTimeout(() => {
                fetchStats();
            }, 1000);

            setFolderToDelete(null);
        } catch (err: any) {
            console.error('Folder delete error:', err);
            showToast(`Delete failed: ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !user || isSubmittingFolder) return;
        setIsSubmittingFolder(true);
        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            const res = await fetch('/api/folders/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
                },
                body: JSON.stringify({
                    name: newFolderName,
                    parentId: currentFolderId === 'root' ? null : currentFolderId
                })
            });
            if (res.ok) {
                setNewFolderName('');
                setIsCreatingFolder(false);
                await Promise.all([
                    fetchAllFolders(),
                    fetchFiles()
                ]);
                setTimeout(() => {
                    fetchStats();
                }, 1000);
            } else {
                const errData = await res.json();
                showToast(errData.error || 'Failed to create folder', 'error');
            }
        } catch (err: any) {
            console.error('Create folder error:', err);
            showToast(err?.message || 'Create folder error', 'error');
        } finally {
            setIsSubmittingFolder(false);
        }
    };

    const getRecursiveFiles = useCallback(async (selectedIdList: string[]) => {
        if (!sadhanaDb) return [];

        const fileIds = selectedIdList.filter(id => !allFolders.some(f => f.id === id) && id !== 'root' && !id.startsWith('root-'));
        const folderIds = selectedIdList.filter(id => allFolders.some(f => f.id === id) || id === 'root' || id.startsWith('root-'));

        let allTargetFolderIds = new Set<string>();
        folderIds.forEach(fid => {
            allTargetFolderIds.add(fid);
            const descendants = getDescendantFolderIds(fid);
            descendants.forEach(did => allTargetFolderIds.add(did));
        });

        const finalFiles: FileRecord[] = [];

        // 1. Add explicitly selected files
        if (fileIds.length > 0) {
            const { data: explicitFiles } = await sadhanaDb.from('files').select('*').in('id', fileIds);
            if (explicitFiles) finalFiles.push(...(explicitFiles as FileRecord[]));
        }

        // 2. Add files from all selected folders and their descendants
        if (allTargetFolderIds.size > 0) {
            const folderIdArray = Array.from(allTargetFolderIds);
            // Handle 'root' and 'root-user' separately as they are NULL folder_id in DB
            const dbFolderIds = folderIdArray.filter(id => id !== 'root' && !id.startsWith('root-'));
            const hasRoot = folderIdArray.some(id => id === 'root' || id.startsWith('root-'));

            if (dbFolderIds.length > 0) {
                const { data: folderFiles } = await sadhanaDb.from('files').select('*').in('folder_id', dbFolderIds);
                if (folderFiles) finalFiles.push(...(folderFiles as FileRecord[]));
            }

            if (hasRoot) {
                const rootUserIds = folderIdArray.filter(id => id.startsWith('root-')).map(id => id.replace('root-', ''));
                if (folderIdArray.includes('root') && user) rootUserIds.push(user.id);

                if (rootUserIds.length > 0) {
                    const { data: rootFiles } = await sadhanaDb.from('files').select('*').is('folder_id', null).in('user_id', rootUserIds);
                    if (rootFiles) finalFiles.push(...(rootFiles as FileRecord[]));
                }
            }
        }

        // De-duplicate by ID
        const uniqueMap = new Map();
        finalFiles.forEach(f => uniqueMap.set(f.id, f));
        return Array.from(uniqueMap.values());
    }, [allFolders, getDescendantFolderIds, user]);

    const handleBulkDownloadConfirm = async () => {
        setIsDownloadingBulk(true);
        try {
            const gathered = await getRecursiveFiles(Array.from(selectedIds));
            setFilesToDownload(gathered);
            setShowBulkDownloadConfirm(true);
        } catch (err) {
            console.error('Bulk download gather error:', err);
            showToast('Failed to gather files for download.', 'error');
        } finally {
            setIsDownloadingBulk(false);
        }
    };

    const handleExecuteBulkDownload = async () => {
        setIsDownloadingBulk(true);
        try {
            // Trigger downloads sequentially using individual anchor elements.
            // Re-using a single iframe causes the browser to only keep the last navigation.
            // Each file needs its own hidden <a> trigger with a sufficient delay.
            for (let i = 0; i < filesToDownload.length; i++) {
                const file = filesToDownload[i];
                const directUrl = getDirectDownloadUrl(file);

                // Create a fresh anchor element for every file
                const a = document.createElement('a');
                a.href = directUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();

                // Clean up this element after a brief moment
                setTimeout(() => {
                    document.body.removeChild(a);
                }, 2000);

                // Wait between downloads so the browser doesn't block them as simultaneous requests
                if (i < filesToDownload.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            // Close confirmation modal
            setShowBulkDownloadConfirm(false);
            setSelectedIds(new Set());
            showToast(`Downloading ${filesToDownload.length} files sequentially...`, 'success');
        } catch (error) {
            console.error('Bulk download execution error:', error);
            showToast('An error occurred during bulk download.', 'error');
        } finally {
            setIsDownloadingBulk(false);
        }
    };

    const navigateToFolder = (folder: FolderRecord | 'root', globalUserId: string | null = null) => {
        const id = folder === 'root' ? (globalUserId ? `root-${globalUserId}` : 'root') : folder.id;
        
        // Push to history for back button support
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('folderId', id);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });

        if (folder === 'root') {
            setCurrentFolderId(id);
            setBreadcrumbs([]);
        } else {
            setCurrentFolderId(folder.id);
            // Append to breadcrumbs if not already there
            setBreadcrumbs(prev => {
                const index = prev.findIndex(b => b.id === folder.id);
                if (index !== -1) return prev.slice(0, index + 1);
                return [...prev, { id: folder.id, name: folder.name }];
            });
            // Ensure path to this folder is expanded in tree
            setExpandedFolders(prev => {
                const next = new Set(prev);
                next.add('root');

                // Recursively add all parent IDs of the target folder
                let currentId = folder.id;
                next.add(currentId);

                let current = allFolders.find(f => f.id === currentId);
                while (current && current.parent_id) {
                    next.add(current.parent_id);
                    currentId = current.parent_id;
                    current = allFolders.find(f => f.id === currentId);
                }

                return next;
            });
        }
        setCurrentPage(1);
        // Reset scroll when navigating folders
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Recursive Tree Item Component
    const FolderTreeItem = ({ folder, level = 0, globalUser = null }: { folder: FolderRecord | 'root'; level?: number; globalUser?: { id: string, name: string } | null }) => {
        const id = folder === 'root' ? (globalUser ? `root-${globalUser.id}` : 'root') : folder.id;
        const name = folder === 'root' ? (globalUser ? globalUser.name : 'My Drive') : folder.name;

        // Visibility Check
        if (isSearching) {
            if (folder === 'root') {
                if (globalUser && !visibleUserIds.has(globalUser.id)) return null;
            } else {
                if (!visibleFolderIds.has(folder.id)) return null;
            }
        }

        const isExpanded = expandedFolders.has(id) || (isSearching && folder !== 'root' && visibleFolderIds.has(folder.id));
        const isSelected = currentFolderId === id;

        // Filter children:
        // 1. If this is a user root in global mode, children are folders with no parent belonging to this user.
        // 2. If this is the 'root' in 'my' mode, children are folders with no parent belonging to current user.
        // 3. Otherwise, children are folders whose parent_id matches this folder's id.
        let children: FolderRecord[] = [];
        if (folder === 'root') {
            const targetUserId = globalUser ? globalUser.id : user?.id;
            children = allFolders.filter(f => f.parent_id === null && f.user_id === targetUserId);
        } else {
            children = allFolders.filter(f => f.parent_id === folder.id);
        }

        const hasChildren = children.length > 0;
        const isOwner = folder !== 'root' && folder.user_id === user?.id;

        // Filter files for this folder:
        // 1. Regular view: show all files in folderFilesMap[id]
        // 2. Search view: show matching files in this folder
        let folderFiles: FileRecord[] = [];
        if (folderFilesMap[id]) {
            folderFiles = folderFilesMap[id];
        }

        if (isSearching) {
            const query = searchQuery.trim().toLowerCase();
            // If we are searching, we should also consider showing matching files 
            // even if they are not in the current page (fetchFiles handles pagination, 
            // but the tree should show all matches in this folder if possible).
            // For now, we'll filter the cached files.
            folderFiles = folderFiles.filter(f =>
                f.file_name.toLowerCase().includes(query) ||
                (f.description && f.description.toLowerCase().includes(query))
            );
        }

        return (
            <div className="select-none">
                <div
                    className={`flex items-center gap-1 py-0.5 px-2 hover:bg-blue-50/50 cursor-pointer rounded-lg transition-colors group ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
                    style={{ paddingLeft: `${level * 8 + 4}px` }}
                    onClick={() => navigateToFolder(folder, globalUser?.id)}
                >
                    <div
                        className={`w-3.5 h-3.5 flex items-center justify-center ${isSelected ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderExpansion(id);
                        }}
                    >
                        {(hasChildren || foldersWithFiles.has(id)) ? (
                            isExpanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />
                        ) : (
                            <div className="w-3" />
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(id); }}
                        className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 ${selectedIds.has(id) ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-300 hover:border-blue-500'}`}
                    >
                        {selectedIds.has(id) && <CheckCircle2 className="w-2 h-2 fill-white text-blue-600" />}
                    </button>

                    <Folder className={`w-3.5 h-3.5 ${isSelected ? 'fill-blue-200 text-blue-600' : 'fill-blue-100 text-blue-500'} group-hover:scale-110 transition-transform`} />
                    <span className={`text-[11px] whitespace-nowrap overflow-hidden text-overflow-ellipsis font-bold flex-1 flex items-center`}>
                        {name === 'Loading...' || name.startsWith('User (') ? (
                            <span className="inline-block w-24 h-3 bg-slate-200 animate-pulse rounded-md" />
                        ) : (
                            name
                        )}
                    </span>

                    {/* Individual delete removed in favor of bulk delete at bottom */}
                </div>
                {isExpanded && (
                    <>
                        {children.map(child => (
                            <FolderTreeItem key={child.id} folder={child} level={level + 1} />
                        ))}
                        {folderFiles.map(file => (
                            <div
                                key={file.id}
                                className={`flex items-center gap-2 py-0.5 px-2 hover:bg-blue-50/30 cursor-pointer rounded-lg transition-colors group ${selectedFile?.id === file.id ? 'bg-blue-50/50 text-blue-700 font-bold' : 'text-gray-500'}`}
                                style={{ paddingLeft: `${(level + 1) * 8 + 4}px` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFile(file);
                                }}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                                    className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 ${selectedIds.has(file.id) ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-300 hover:border-blue-500'}`}
                                >
                                    {selectedIds.has(file.id) && <CheckCircle2 className="w-2 h-2 fill-white text-blue-600" />}
                                </button>
                                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                    {getFileIcon(file.category)}
                                </div>
                                <span className="text-[10.5px] whitespace-nowrap overflow-hidden text-overflow-ellipsis flex-1 font-medium">
                                    {file.file_name}
                                </span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <div ref={containerRef} className="min-h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-500/30">

                {/* Subtle Animated Blue Background Elements */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center items-center z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" />
                    <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-sky-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000" />
                    <div className="absolute bottom-[-10%] left-[10%] w-[70%] h-[70%] bg-indigo-100/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000" />
                </div>

                <div className="relative z-10 px-1 lg:p-8 space-y-3 lg:space-y-6 max-w-[1600px] mx-auto">
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
                        {[
                            { label: 'Total Files', value: stats.total, icon: FileText, theme: CATEGORY_THEMES.all },
                            { label: 'Images', value: stats.images, icon: ImageIcon, theme: CATEGORY_THEMES.images },
                            { label: 'Videos', value: stats.videos, icon: Video, theme: CATEGORY_THEMES.video },
                            { label: 'Docs', value: stats.documents, icon: FileArchive, theme: CATEGORY_THEMES.doc },
                            { label: 'Storage', value: formatSize(stats.size), icon: HardDrive, theme: CATEGORY_THEMES.ppt },
                        ].map((stat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={stat.label}
                                className={`relative group overflow-hidden ${stat.theme.bg} backdrop-blur-xl p-3 lg:p-4 rounded-2xl border-2 ${stat.theme.border} shadow-lg hover:shadow-xl transition-all duration-300 ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`}
                            >
                                <div className={`flex items-center gap-3 lg:gap-4 relative z-10 ${i === 4 ? 'justify-center lg:justify-start' : ''}`}>
                                    <div className={`p-2 lg:p-3 rounded-xl ${stat.theme.iconBg} shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0`}>
                                        <stat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                                    </div>
                                    <div className={`min-w-0 ${i === 4 ? 'text-center lg:text-left' : ''}`}>
                                        <p className={`text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest ${i === 4 ? 'text-center' : ''}`}>{stat.label}</p>
                                        <p className={`text-sm lg:text-lg font-black text-gray-900 leading-none mt-1 ${i === 4 ? 'text-center' : ''}`}>{stat.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Header & Main Search Section */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border-2 border-blue-100 shadow-2xl shadow-blue-900/10 relative z-0">
                        <div className="p-2 md:p-8 space-y-4 lg:space-y-8">
                            {/* Tabs & Active View */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl w-full lg:w-fit border-2 border-slate-200/50 shadow-inner">
                                    <button
                                        onClick={() => setActiveTab('global')}
                                        className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-xl font-black text-[11px] lg:text-sm uppercase tracking-widest transition-all ${activeTab === 'global' ? 'bg-blue-600 text-white shadow-lg border-b-2 border-blue-800' : 'text-slate-500 hover:text-blue-600'}`}
                                    >
                                        Global
                                    </button>
                                    {canUpload && (
                                        <button
                                            onClick={() => setActiveTab('my')}
                                            className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-xl font-black text-[11px] lg:text-sm uppercase tracking-widest transition-all ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-lg border-b-2 border-blue-800' : 'text-slate-500 hover:text-blue-600'}`}
                                        >
                                            My Space
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: [0, -2, 0]
                                        }}
                                        transition={{
                                            opacity: { duration: 0.3 },
                                            scale: { duration: 0.3 },
                                            y: {
                                                repeat: Infinity,
                                                duration: 3,
                                                ease: "easeInOut"
                                            }
                                        }}
                                        onClick={() => setIsMobileSidebarOpen(true)}
                                        className="lg:hidden flex items-center justify-center p-3.5 bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white rounded-2xl border-2 border-indigo-400/30 shadow-[0_8px_25px_-5px_rgba(99,102,241,0.5)] active:scale-90 transition-all relative group overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
                                        <Folder className="w-5 h-5 text-white drop-shadow-md" />
                                    </motion.button>

                                    <div className="flex-1 flex items-center gap-2">
                                        <AnimatePresence>
                                            {(files.length > 0 || folders.length > 0) && (
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    onClick={toggleSelectAll}
                                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all border-2 border-blue-100 shadow-sm"
                                                >
                                                    {(() => {
                                                        const currentViewIds = [...files.map(f => f.id), ...folders.map(f => f.id)];
                                                        const isAllSelected = currentViewIds.length > 0 && currentViewIds.every(id => selectedIds.has(id));
                                                        return (
                                                            <>
                                                                <CheckCircle2 className={`w-3.5 h-3.5 ${isAllSelected ? 'fill-blue-500 text-white' : ''}`} />
                                                                {isAllSelected ? 'None' : 'All'}
                                                            </>
                                                        );
                                                    })()}
                                                </motion.button>
                                            )}
                                        </AnimatePresence>

                                        {canUpload && (
                                            <Link href={`/dashboard/data-center/upload${currentFolderId !== 'root' ? `?folderId=${currentFolderId}` : ''}`} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border-b-4 border-blue-800 hover:brightness-110 active:scale-95 transition-all shadow-lg">
                                                <Upload className="w-3.5 h-3.5" />
                                                Add Resource
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Sidebar Folder Tree */}
                                <AnimatePresence>
                                    {sidebarOpen && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: sidebarWidth, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            className="hidden lg:block flex-shrink-0 border-r border-blue-100/30 pr-4 overflow-y-auto max-h-[800px] scrollbar-hide pt-2 relative"
                                            style={{ width: sidebarWidth }}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between mb-4 px-2">
                                                    <h3 className="text-[9px] font-black text-blue-900/30 uppercase tracking-[0.2em]">Folders</h3>
                                                </div>
                                                {activeTab === 'my' ? (
                                                    <FolderTreeItem folder="root" />
                                                ) : (
                                                    <>
                                                        {/* In Global mode, show multiple root nodes - one per user who has folders */}
                                                        {Object.keys(userMap).sort((a, b) => userMap[a].localeCompare(userMap[b])).map(userId => (
                                                            <FolderTreeItem
                                                                key={`root-${userId}`}
                                                                folder="root"
                                                                globalUser={{ id: userId, name: userMap[userId] }}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Resize Handle */}
                                {sidebarOpen && (
                                    <div
                                        onMouseDown={() => setIsResizing(true)}
                                        className={`hidden lg:block w-4 hover:bg-blue-400/10 cursor-col-resize transition-all self-stretch relative z-30 group -mx-2 ${isResizing ? 'bg-blue-400/20' : ''}`}
                                    >
                                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-blue-300 group-hover:bg-blue-500/50 transition-colors" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-blue-300/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}

                                {/* Main Content Area */}
                                <div className="flex-1 space-y-4 lg:space-y-8 min-w-0">
                                    {/* Permission Manager for Super Admins */}
                                    {isSuperAdmin && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`bg-white/95 backdrop-blur-md border-2 border-indigo-100 p-4 lg:p-6 rounded-[2rem] shadow-xl relative mb-6 ${isPermissionDropdownOpen ? 'z-[60]' : 'z-10'}`}
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                                                        <ShieldCheck className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Upload Permissions</h3>
                                                        <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-[0.2em]">Authorized Personnel</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-end">
                                                    <div className="relative w-full lg:w-96">
                                                        <button
                                                            onClick={() => setIsPermissionDropdownOpen(!isPermissionDropdownOpen)}
                                                            className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-indigo-300 hover:bg-white transition-all group"
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <Users className="w-4 h-4 text-indigo-500" />
                                                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest truncate">
                                                                    {allowedUploadRoles.length === 0 
                                                                        ? "No Roles Selected" 
                                                                        : `${allowedUploadRoles.length} Roles Authorized`}
                                                                </span>
                                                            </div>
                                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isPermissionDropdownOpen ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        <AnimatePresence>
                                                            {isPermissionDropdownOpen && (
                                                                <>
                                                                    <motion.div 
                                                                        initial={{ opacity: 0 }} 
                                                                        animate={{ opacity: 1 }} 
                                                                        exit={{ opacity: 0 }}
                                                                        onClick={() => setIsPermissionDropdownOpen(false)}
                                                                        className="fixed inset-0 z-[60]"
                                                                    />
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        className="absolute right-0 top-full mt-3 w-full lg:w-[480px] bg-white rounded-[2.5rem] border-2 border-indigo-100 shadow-2xl shadow-indigo-900/20 z-[70] overflow-hidden"
                                                                    >
                                                                        <div className="p-6 border-b border-indigo-50 bg-slate-50/50">
                                                                            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                                                                <Settings2 className="w-3.5 h-3.5" />
                                                                                Select Authorized Roles
                                                                            </h4>
                                                                        </div>
                                                                        <div className="max-h-[400px] overflow-y-auto p-4 scrollbar-hide bg-white">
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map(roleNum => (
                                                                                    <label 
                                                                                        key={roleNum}
                                                                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer group/item ${allowedUploadRoles.includes(roleNum) 
                                                                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                                                                            : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'}`}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="hidden"
                                                                                            checked={allowedUploadRoles.includes(roleNum)}
                                                                                            onChange={async () => {
                                                                                                const newRoles = allowedUploadRoles.includes(roleNum)
                                                                                                    ? allowedUploadRoles.filter(r => r !== roleNum)
                                                                                                    : [...allowedUploadRoles, roleNum];
                                                                                                
                                                                                                setIsUpdatingPermissions(true);
                                                                                                try {
                                                                                                    if (!sadhanaDb) throw new Error('Database not connected');
                                                                                                    const { error } = await sadhanaDb
                                                                                                        .from('app_configs')
                                                                                                        .upsert({ key: 'data_center_upload_roles', value: newRoles });
                                                                                                    
                                                                                                    if (error) throw error;
                                                                                                    setAllowedUploadRoles(newRoles);
                                                                                                    showToast(`${getRoleDisplayName(roleNum as any)} Updated`, 'success');
                                                                                                } catch (err: any) {
                                                                                                    showToast(`Failed to Sync: ${err.message}`, 'error');
                                                                                                } finally {
                                                                                                    setIsUpdatingPermissions(false);
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${allowedUploadRoles.includes(roleNum) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover/item:border-indigo-400'}`}>
                                                                                            {allowedUploadRoles.includes(roleNum) && <Check className="w-3.5 h-3.5 text-white" />}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className={`text-[10px] font-black uppercase tracking-tight truncate ${allowedUploadRoles.includes(roleNum) ? 'text-indigo-900' : 'text-slate-500'}`}>
                                                                                                {getRoleDisplayName(roleNum as any)}
                                                                                            </p>
                                                                                            <p className="text-[8px] font-bold opacity-40">Role ID: {roleNum}</p>
                                                                                        </div>
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        {isUpdatingPermissions && (
                                                                            <div className="p-3 bg-indigo-600 text-white flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                                Synchronizing Access
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                </>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {/* Search & Filters Row */}
                                    <div className="bg-white/95 backdrop-blur-md border-[1.5px] lg:border-2 border-blue-100 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] shadow-xl space-y-3 lg:space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="flex-1 relative group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500 group-focus-within:text-blue-700 transition-colors w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder={`Search resources...`}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-11 pr-24 py-3.5 bg-slate-50/50 border-2 border-slate-200/60 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-bold text-sm"
                                                />
                                                {(searchQuery || currentFolderId !== 'root') && (
                                                    <button
                                                        onClick={() => {
                                                            setSearchQuery('');
                                                            setCurrentFolderId('root');
                                                            setBreadcrumbs([]);
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 border border-blue-200"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value as any)}
                                                    className="flex-1 sm:flex-none pl-3 pr-8 py-3.5 bg-slate-50/50 border-2 border-slate-200/60 rounded-2xl text-[11px] font-black text-slate-700 uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 focus:bg-white cursor-pointer transition-all"
                                                >
                                                    <option value="newest">Newest</option>
                                                    <option value="oldest">Oldest</option>
                                                    <option value="name_asc">A - Z</option>
                                                    <option value="name_desc">Z - A</option>
                                                    <option value="views_desc">Popular</option>
                                                </select>

                                                <div className="flex bg-blue-50 p-1.5 rounded-xl border-2 border-blue-100 shadow-inner">
                                                    <button
                                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                                        title="Toggle Tree"
                                                        className={`p-2 rounded-lg transition-all ${sidebarOpen ? 'bg-indigo-600 shadow-lg text-white border-b-2 border-indigo-800' : 'bg-white text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 border border-indigo-100'}`}
                                                    >
                                                        <HardDrive className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-px h-6 bg-blue-200 mx-1 items-center self-center" />
                                                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-blue-600 border border-blue-100' : 'text-gray-400 hover:text-blue-600'}`}>
                                                        <LayoutGrid className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-blue-600 border border-blue-100' : 'text-gray-400 hover:text-blue-600'}`}>
                                                        <List className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breadcrumbs (only in explorer mode) */}
                                    <AnimatePresence>
                                        {(currentFolderId !== 'root' || breadcrumbs.length > 0) && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex items-center gap-4 py-2 bg-blue-50 border-2 border-blue-100 rounded-xl px-4"
                                            >
                                                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[10px] uppercase font-black tracking-widest">
                                                    <button
                                                        onClick={() => navigateToFolder('root')}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${currentFolderId === 'root' ? 'bg-blue-600 text-white shadow-md border border-blue-700' : 'text-blue-900/60 hover:text-blue-600 hover:bg-white border border-transparent'}`}
                                                    >
                                                        <HardDrive className="w-3.5 h-3.5" />
                                                        Root
                                                    </button>
                                                    {breadcrumbs.map((crumb) => (
                                                        <div key={crumb.id} className="flex items-center gap-1.5">
                                                            <ChevronRight className="w-3 h-3 text-blue-300 shrink-0" />
                                                            <button
                                                                onClick={() => navigateToFolder({ id: crumb.id, name: crumb.name } as any)}
                                                                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${currentFolderId === crumb.id ? 'bg-blue-600 text-white shadow-md border border-blue-700' : 'text-blue-900/60 hover:text-blue-600 hover:bg-white border border-transparent'}`}
                                                            >
                                                                {crumb.name}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Categories Strip */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 pt-1">
                                        {CATEGORIES.map(cat => {
                                            const theme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES.other;
                                            const isActive = activeCategory === cat.id;
 
                                            // Extract colors for active/inactive states
                                            const activeBg = theme.iconBg;
                                            const activeBorder = theme.border.split(' ')[0];
                                            const inactiveBg = theme.bg;
                                            const inactiveText = theme.text;
                                            const inactiveBorder = theme.border.split(' ')[0].replace('200', '100');
 
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                    setActiveCategory(cat.id);
                                                    const params = new URLSearchParams(searchParams?.toString() || '');
                                                    params.set('category', cat.id);
                                                    router.push(`${pathname}?${params.toString()}`, { scroll: false });
                                                }}
                                                    className={`group flex items-center justify-center lg:justify-start gap-2 px-3 py-1.5 lg:px-4 lg:py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap border-2 shadow-sm ${isActive
                                                        ? `${activeBg} text-white ${activeBorder} shadow-lg shadow-${theme.shadow.split('-')[1]}-500/30 scale-105 -translate-y-0.5`
                                                        : `${inactiveBg} ${inactiveBorder} ${inactiveText} hover:scale-105 hover:shadow-md hover:border-${theme.shadow.split('-')[1]}-200`
                                                        }`}
                                                >
                                                    <cat.icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : inactiveText}`} />
                                                    <span className="hidden lg:block">{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* File Results Area */}
                                    <div className="bg-white/95 backdrop-blur-xl p-1 md:p-6 min-h-[500px] rounded-2xl lg:rounded-[2.5rem] shadow-2xl shadow-blue-900/5 mt-1">
                                        {isLoading && files.length === 0 ? (
                                            <div 
                                                className={viewMode === 'grid' 
                                                    ? "grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 md:gap-6" 
                                                    : "flex flex-col gap-2"
                                                }
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                    <div key={i} className="animate-pulse bg-white border border-slate-100 h-48 md:h-64 rounded-[1.5rem] md:rounded-[2rem] shadow-sm p-3 md:p-6 flex flex-col gap-3 md:gap-4">
                                                        <div className="w-full h-24 md:h-32 bg-gray-100 rounded-xl md:rounded-2xl" />
                                                        <div className="h-3 md:h-4 bg-gray-100 rounded w-3/4" />
                                                        <div className="h-2 md:h-3 bg-gray-50 rounded w-1/2" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : files.length === 0 && folders.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <SearchX className="w-16 h-16 text-gray-300 mb-6" />
                                                <h3 className="text-xl font-black text-gray-800 tracking-tight">No files found</h3>
                                                <p className="text-gray-500 mt-2 font-medium">Try different keywords or filters.</p>
                                            </div>
                                        ) : (
                                            <div
                                                className={viewMode === 'grid' 
                                                    ? "grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 md:gap-4" 
                                                    : "flex flex-col gap-2"
                                                }
                                            >

                                                <AnimatePresence mode="popLayout">
                                                    {/* Folders in Grid/List View */}
                                                    {folders.map(folder => (
                                                        <motion.div
                                                            key={folder.id}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.98 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                            onClick={() => navigateToFolder(folder)}
                                                            className={`group relative bg-white rounded-[1.25rem] md:rounded-[1.5rem] border-2 cursor-pointer border-slate-200 shadow-lg hover:shadow-2xl hover:border-indigo-400 hover:-translate-y-2 transition-all duration-300 overflow-hidden ${viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'p-3 md:p-4 flex flex-col h-full'}`}
                                                        >
                                                            <div className={viewMode === 'grid' ? "relative aspect-video mb-3 md:mb-4 rounded-[1rem] bg-indigo-50/50 flex items-center justify-center overflow-hidden border-2 border-slate-100" : "flex items-center gap-4 w-full"}>
                                                                <div className={`absolute top-3 left-3 z-20 ${viewMode === 'list' ? 'relative top-0 left-0' : ''}`}>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleSelect(folder.id); }}
                                                                        className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center backdrop-blur-md shadow-md ${selectedIds.has(folder.id) ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white/90 border-slate-300 hover:border-blue-500'}`}
                                                                    >
                                                                        {selectedIds.has(folder.id) && <CheckCircle2 className="w-3 h-3 fill-white text-blue-600" />}
                                                                    </button>
                                                                </div>
                                                                {viewMode === 'grid' ? (
                                                                    <>
                                                                        <div className="absolute top-0 left-0 right-0 h-1 md:h-2 z-10 bg-indigo-500" />
                                                                        <div className="p-2 md:p-4 bg-white rounded-xl md:rounded-2xl shadow-inner border-2 border-indigo-50 group-hover:scale-110 transition-transform duration-500">
                                                                            <Folder className="w-6 h-6 md:w-10 md:h-10 fill-indigo-100 text-indigo-500" />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="w-12 h-12 rounded-[1rem] bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-inner border-2 border-white/20">
                                                                            <Folder className="w-6 h-6 fill-indigo-100" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <h3 className="font-bold text-slate-900 truncate text-sm">{folder.name}</h3>
                                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Folder • {new Date(folder.created_at).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {viewMode === 'grid' && (
                                                                <div className="flex-1 min-w-0 px-2 pb-1">
                                                                    <h3
                                                                        title={folder.name}
                                                                        className="font-bold text-slate-900 line-clamp-2 leading-tight text-xs lg:text-sm group-hover:text-indigo-700 transition-colors uppercase tracking-tight min-h-[2.5rem] lg:min-h-[3rem] flex items-start break-words"
                                                                    >
                                                                        {folder.name}
                                                                    </h3>
                                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-slate-50">
                                                                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">Folder</span>
                                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(folder.created_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))}

                                                    {/* Files */}
                                                    {files.map((file) => {
                                                        const theme = CATEGORY_THEMES[file.category] || CATEGORY_THEMES.other;
                                                        return (
                                                            <motion.div
                                                                key={file.id}
                                                                layout
                                                                initial={{ opacity: 0, scale: 0.98 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.98 }}
                                                                onClick={() => setSelectedFile(file)}
                                                                className={`group relative bg-white rounded-xl border-2 cursor-pointer ${selectedIds.has(file.id) ? 'border-blue-700 shadow-2xl ring-4 ring-blue-500/20 translate-y-[-4px]' : 'border-slate-200 shadow-lg hover:shadow-2xl hover:border-blue-400 hover:-translate-y-2'} transition-all duration-300 overflow-hidden ${viewMode === 'list' ? 'flex items-center gap-3 p-3' : 'p-2 md:p-3 flex flex-col h-full'}`}
                                                            >
                                                                {viewMode === 'grid' ? (
                                                                    <>
                                                                        <div className="relative aspect-video mb-3 md:mb-4 rounded-[1rem] bg-slate-50 overflow-hidden border-2 border-slate-100">
                                                                            <div className={`absolute top-0 left-0 right-0 h-1 md:h-2 z-10 ${theme.iconBg}`} />
                                                                            <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-20">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                                                                                    className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center backdrop-blur-md shadow-md ${selectedIds.has(file.id) ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white/90 border-slate-300 hover:border-blue-500'}`}
                                                                                >
                                                                                    {selectedIds.has(file.id) && <CheckCircle2 className="w-3 h-3 fill-white text-blue-600" />}
                                                                                </button>
                                                                            </div>
                                                                            {getThumbnailUrl(file) && !failedThumbnails[file.id] ? (
                                                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                                                <img
                                                                                    src={getThumbnailUrl(file) as string}
                                                                                    alt=""
                                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                                    referrerPolicy="no-referrer"
                                                                                    onError={() => {
                                                                                        setFailedThumbnails(prev => ({
                                                                                            ...prev,
                                                                                            [file.id]: true,
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center opacity-90 ${theme.bg} ${theme.text} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner border-2 border-white mt-1`}>
                                                                                    {getFileIcon(file.category)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0 px-2 pb-1">
                                                                            <h3
                                                                                title={file.file_name}
                                                                                className="font-bold text-slate-900 line-clamp-2 leading-tight text-xs lg:text-sm group-hover:text-blue-700 transition-colors uppercase tracking-tight min-h-[2.5rem] lg:min-h-[3rem] flex items-start break-words"
                                                                            >
                                                                                {file.file_name}
                                                                            </h3>
                                                                            <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-slate-50">
                                                                                <span className={`text-[10px] font-black px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200`}>{formatSize(file.file_size)}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <a
                                                                                        href={getDirectDownloadUrl(file)}
                                                                                        download={file.file_name}
                                                                                        onClick={(e) => {
                                                                                            // Since it's a direct download uc? link, we don't strictly need target="_blank"
                                                                                            // but we leave it as anchor default behavior or use a hidden iframe approach if user prefers.
                                                                                            // For single files, anchor + download attr is usually enough for modern browsers.
                                                                                        }}
                                                                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"
                                                                                    >
                                                                                        <Download className="w-3.5 h-3.5" />
                                                                                    </a>
                                                                                    {activeTab === 'my' && (
                                                                                        <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file); }} className="p-2 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex items-center gap-4 w-full relative">
                                                                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${theme.iconBg} rounded-l-[1.5rem]`} />
                                                                        <div className="ml-2">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                                                                                className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center backdrop-blur-md shadow-md ${selectedIds.has(file.id) ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white/90 border-slate-300 hover:border-blue-500'}`}
                                                                            >
                                                                                {selectedIds.has(file.id) && <CheckCircle2 className="w-3 h-3 fill-white text-blue-600" />}
                                                                            </button>
                                                                        </div>
                                                                        <div className={`w-12 h-12 rounded-[1rem] ${theme.iconBg} text-white flex items-center justify-center shrink-0 shadow-inner border-2 border-white/20`}>
                                                                            {getFileIcon(file.category)}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0 py-1 pl-1">
                                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                                <h3 className="font-bold text-slate-900 line-clamp-2 text-[11px] lg:text-sm leading-tight">{file.file_name}</h3>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`text-[8px] lg:text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200`}>{formatSize(file.file_size)}</span>
                                                                                <span className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{file.category}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 pr-2">
                                                                            <a
                                                                                href={getDirectDownloadUrl(file)}
                                                                                download={file.file_name}
                                                                                className="p-2 lg:p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg lg:rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                                                            </a>
                                                                            {activeTab === 'my' && (
                                                                                <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file); }} className="p-2 lg:p-3 bg-red-50 text-red-500 border border-red-100 rounded-lg lg:rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                                                    <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        {/* Pagination Controls */}
                                        {totalCount > 0 && (
                                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-t border-slate-200/60 pt-8">
                                                {/* Page Size Selector */}
                                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200/50">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-2">Show</p>
                                                    {[24, 48, 96].map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => {
                                                                setLimit(size);
                                                                setCurrentPage(1);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${limit === size ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Page Numbers */}
                                                <div className="flex items-center gap-2 select-none">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage === 1}
                                                        className="p-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 bg-white"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>

                                                    {/* Simplified pagination logic */}
                                                    {Array.from({ length: Math.ceil(totalCount / limit) }).map((_, i) => {
                                                        const pageNum = i + 1;
                                                        const totalPages = Math.ceil(totalCount / limit);

                                                        // Show first, last, current, and neighbors
                                                        if (
                                                            pageNum === 1 ||
                                                            pageNum === totalPages ||
                                                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                                        ) {
                                                            return (
                                                                <button
                                                                    key={pageNum}
                                                                    onClick={() => setCurrentPage(pageNum)}
                                                                    className={`w-10 h-10 rounded-xl text-[12px] font-bold transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}
                                                                >
                                                                    {pageNum}
                                                                </button>
                                                            );
                                                        } else if (
                                                            (pageNum === currentPage - 2 && pageNum > 1) ||
                                                            (pageNum === currentPage + 2 && pageNum < totalPages)
                                                        ) {
                                                            return <span key={pageNum} className="text-slate-400">...</span>;
                                                        }
                                                        return null;
                                                    })}

                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / limit), prev + 1))}
                                                        disabled={currentPage === Math.ceil(totalCount / limit)}
                                                        className="p-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 bg-white"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <p className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/50">
                                                    Results: <span className="text-slate-700">{(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalCount)}</span> of <span className="text-slate-700">{totalCount}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals placed outside the z-10 container to break stacking context */}
            {/* Confirmation Modal */}
            <AnimatePresence>
                {(fileToDelete || folderToDelete || showBulkDeleteConfirm) && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setFileToDelete(null); setFolderToDelete(null); setShowBulkDeleteConfirm(false); }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden relative z-10 p-6 text-center border border-red-100"
                        >
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">
                                {folderToDelete ? 'Delete Folder?' : (fileToDelete ? 'Delete File?' : `Delete ${selectedIds.size} Files?`)}
                            </h3>
                            <div className="text-[13px] text-gray-500 mb-6 leading-relaxed px-2">
                                {folderToDelete && (
                                    <>
                                        You are about to remove <span className="text-gray-900 font-bold">&quot;{folderToDelete.name}&quot;</span>.
                                        <br />
                                        <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-lg border border-red-100 font-bold text-[11px] uppercase tracking-wider">
                                            Warning: All subfolders and files inside will also be removed from Data Center.
                                        </div>
                                    </>
                                )}
                                {fileToDelete && (
                                    <>You are about to remove <span className="text-gray-900 font-bold">&quot;{fileToDelete.file_name}&quot;</span>.</>
                                )}
                                {showBulkDeleteConfirm && (
                                    <>You are about to permanently delete <span className="text-gray-900 font-bold">{selectedIds.size} selected files</span>.</>
                                )}
                                <div className="mt-3 text-red-500 font-bold">This action cannot be undone.</div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setFileToDelete(null); setFolderToDelete(null); setShowBulkDeleteConfirm(false); }}
                                    className="flex-1 px-4 py-3 bg-gray-50 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-100 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={folderToDelete ? handleDeleteFolder : handleDelete}
                                    className="flex-1 px-4 py-3 bg-blue-700 text-white rounded-xl font-black text-xs hover:shadow-xl hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Download Modal */}
            <AnimatePresence>
                {showBulkDownloadConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDownloadingBulk && setShowBulkDownloadConfirm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.15)] max-w-md w-full overflow-hidden relative z-10 flex flex-col border border-slate-200/60 max-h-[85vh]"
                        >
                            {/* Compact Header */}
                            <div className="p-8 pb-4 text-center">
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    className="w-14 h-14 bg-gradient-to-tr from-slate-800 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border-b-2 border-indigo-500/30"
                                >
                                    <Download className="w-7 h-7 text-white" />
                                </motion.div>
                                <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Bulk Download</h3>
                                <div className="inline-flex items-center gap-2.5 text-[9px] font-black text-indigo-700 bg-indigo-50/50 py-1.5 px-4 rounded-full border border-indigo-100 uppercase tracking-widest mb-4">
                                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{filesToDownload.length} Selected</span>
                                    <span className="w-1 h-1 bg-indigo-200 rounded-full" />
                                    <span>{formatSize(filesToDownload.reduce((acc, f) => acc + (Number(f.file_size) || 0), 0))}</span>
                                </div>
                            </div>

                            {/* Streamlined File List */}
                            <div className="flex-1 overflow-y-auto px-6 py-1 space-y-2 mb-4 min-h-[140px] max-h-[300px] custom-scrollbar">
                                {filesToDownload.map((file, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        key={file.id}
                                        className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200/60 group hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 shadow-sm"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                            {getFileIcon(file.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-slate-800 truncate uppercase tracking-tight">{file.file_name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{formatSize(file.file_size)}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Refined Actions */}
                            <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/30 flex gap-3">
                                <button
                                    onClick={() => setShowBulkDownloadConfirm(false)}
                                    disabled={isDownloadingBulk}
                                    className="flex-1 px-4 py-3.5 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all border-2 border-slate-100 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteBulkDownload}
                                    disabled={isDownloadingBulk || filesToDownload.length === 0}
                                    className="flex-[2] px-4 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-xl hover:shadow-indigo-900/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:grayscale"
                                >
                                    {isDownloadingBulk ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Start Sequential Download</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Folder Modal */}
            <AnimatePresence>
                {isCreatingFolder && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreatingFolder(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden relative z-10 p-8 border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner shadow-blue-900/20">
                                <Folder className="w-8 h-8 text-white hover:scale-110 transition-transform" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">New Folder</h3>
                            <p className="text-gray-500 mb-8 text-[12px] text-center">Organize your resources into folders</p>

                            <input
                                autoFocus
                                type="text"
                                placeholder="Enter folder name..."
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-sky-400 outline-none transition-all font-bold text-gray-800 text-sm shadow-inner"
                            />

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setIsCreatingFolder(false)}
                                    disabled={isSubmittingFolder}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim() || isSubmittingFolder}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmittingFolder ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <span>Create</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== File Viewer Modal ===== */}
            <AnimatePresence>
                {selectedFile && (() => {
                    const theme = CATEGORY_THEMES[selectedFile.category] || CATEGORY_THEMES.other;
                    const previewUrl = getPreviewUrl(selectedFile.google_drive_url, selectedFile.category);
                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        >
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedFile(null)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                            />
                            {/* Modal Content Container */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-[95vw] h-[92vh] bg-white rounded-[3rem] shadow-[0_0_50px_rgba(30,58,138,0.25)] overflow-hidden flex flex-col border-4 border-blue-100"
                            >
                                {/* Modal Header - Glassmorphism Responsive Layout */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 lg:px-8 lg:py-6 bg-white/80 backdrop-blur-md border-b-2 border-blue-50 z-10 gap-4">
                                    <div className="flex items-center gap-3 lg:gap-5 min-w-0">
                                        <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl ${theme.iconBg} text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20`}>
                                            <div className="scale-75 lg:scale-100">
                                                {getFileIcon(selectedFile.category)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="text-base lg:text-xl font-black text-slate-900 truncate pr-4 tracking-tight leading-tight" title={selectedFile.file_name}>
                                                {selectedFile.file_name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 lg:mt-1.5">
                                                <span className={`text-[8px] lg:text-[10px] font-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-lg ${theme.bg} ${theme.text} uppercase tracking-widest border border-blue-100/50`}>
                                                    {selectedFile.category}
                                                </span>
                                                <span className="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                    {formatSize(selectedFile.file_size)}
                                                </span>
                                                <span className="hidden lg:inline text-slate-200">•</span>
                                                <span className="text-[9px] lg:text-[11px] font-black text-slate-400 flex items-center gap-1.5 lg:gap-2 uppercase tracking-widest">
                                                    <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                                    {new Date(selectedFile.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 lg:gap-3 shrink-0 ml-auto lg:ml-0">
                                        <a
                                            href={selectedFile.google_drive_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl bg-blue-700 text-white hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-500/40 transition-all font-black text-[10px] lg:text-xs flex items-center gap-2 border-2 border-blue-800 uppercase tracking-widest"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 lg:w-4 h-4" />
                                            <span>Open Resource</span>
                                        </a>
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="p-2.5 lg:p-3.5 rounded-xl lg:rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 border-2 border-slate-100 hover:border-slate-200 transition-all shadow-sm active:scale-95"
                                        >
                                            <X className="w-4 h-4 lg:w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Description strip if exists */}
                                {selectedFile.description && (
                                    <div className="px-8 py-4 bg-blue-50/30 border-b border-blue-50">
                                        <p className="text-sm font-bold text-slate-600 leading-relaxed">{selectedFile.description}</p>
                                    </div>
                                )}

                                {/* Immersive Preview Area */}
                                <div className="flex-1 bg-slate-50 overflow-hidden relative group">
                                    {previewUrl ? (
                                        <iframe
                                            src={previewUrl}
                                            className="w-full h-full border-0"
                                            allow="autoplay; encrypted-media"
                                            allowFullScreen
                                            title={selectedFile.file_name}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-300">
                                            <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl border-4 border-blue-50">
                                                <FileText className="w-16 h-16 text-blue-100" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Preview not available</p>
                                                <a href={selectedFile.google_drive_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-black text-sm uppercase tracking-widest">View in Google Drive</a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileSidebarOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm max-h-[80vh] bg-white shadow-2xl rounded-[2rem] flex flex-col overflow-hidden border-2 border-blue-50 z-[101]"
                        >
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <Folder className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Explorer</h3>
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Select Folder</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    className="p-2 bg-white rounded-xl border-2 border-slate-100/50 shadow-sm text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                <div className="space-y-1">
                                    {activeTab === 'my' ? (
                                        <FolderTreeItem folder="root" />
                                    ) : (
                                        <>
                                            {Object.keys(userMap).sort((a, b) => userMap[a].localeCompare(userMap[b])).map(userId => (
                                                <FolderTreeItem
                                                    key={`mobile-root-${userId}`}
                                                    folder="root"
                                                    globalUser={{ id: userId, name: userMap[userId] }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                <button
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    className="px-8 py-2.5 bg-white text-slate-600 font-bold text-xs rounded-xl border-2 border-slate-100 shadow-sm active:scale-95 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Styles for Scrollbars */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>

            {/* Premium Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-md"
                    >
                        <div className={`
                            relative overflow-hidden
                            bg-white/80 backdrop-blur-2xl 
                            border-2 rounded-[2rem] p-5
                            shadow-[0_20px_50px_rgba(0,0,0,0.1)]
                            flex items-center gap-4
                            ${toast.type === 'success' ? 'border-emerald-100' :
                                toast.type === 'error' ? 'border-rose-100' : 'border-blue-100'}
                        `}>
                            <div className={`
                                p-3 rounded-2xl shrink-0
                                ${toast.type === 'success' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' :
                                    toast.type === 'error' ? 'bg-rose-500 shadow-lg shadow-rose-500/20' :
                                        'bg-blue-500 shadow-lg shadow-blue-500/20'}
                            `}>
                                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-white" /> :
                                    toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-white" /> :
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-800 tracking-tight leading-tight">
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={() => setToast(null)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Decorative gradient blur */}
                            <div className={`
                                absolute -bottom-10 -right-10 w-24 h-24 blur-3xl opacity-20 pointer-events-none
                                ${toast.type === 'success' ? 'bg-emerald-500' :
                                    toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}
                            `} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Mobile/Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && !fileToDelete && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-[88px] sm:bottom-6 left-0 sm:left-1/2 sm:-translate-x-1/2 bg-white sm:bg-white/95 backdrop-blur-2xl border-t-2 sm:border-2 border-blue-100 p-3 sm:p-3 sm:rounded-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-3 sm:gap-6 z-[1000] w-full sm:w-[calc(100%-1.5rem)] max-w-none sm:max-w-[550px]"
                    >
                        {/* Selected count badge - compact on mobile */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shrink-0 shadow-lg shadow-blue-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                            <span className="hidden min-[400px]:inline">{selectedIds.size} Selected</span>
                            <span className="min-[400px]:hidden">{selectedIds.size}</span>
                        </div>

                        <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3 pr-1">
                            {/* Cancel — icon only on mobile, text on sm+ */}
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="p-2 sm:px-4 sm:py-2 text-slate-400 font-black hover:text-blue-600 text-[10px] sm:text-[11px] uppercase tracking-widest transition-all rounded-xl hover:bg-blue-50 active:scale-95 flex items-center justify-center border-2 border-transparent hover:border-blue-100"
                                title="Cancel Selection"
                            >
                                <X className="w-4 h-4 sm:hidden" />
                                <span className="hidden sm:inline">Cancel</span>
                            </button>

                            {/* Delete — only in My Space */}
                            {activeTab === 'my' && (
                                <button
                                    onClick={() => setShowBulkDeleteConfirm(true)}
                                    className="px-4 py-2.5 sm:px-6 bg-red-500 text-white rounded-xl font-black shadow-lg hover:bg-red-600 active:scale-95 text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center gap-1.5 transition-all border-b-4 border-red-700"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden min-[350px]:inline">Delete</span>
                                    <span className="min-[350px]:hidden">Del</span>
                                </button>
                            )}

                            {/* Download — icon+text on all sizes, but compact padding on mobile */}
                            <button
                                onClick={handleBulkDownloadConfirm}
                                disabled={isDownloadingBulk}
                                className="px-4 py-2.5 sm:px-6 bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white rounded-xl font-black shadow-[0_8px_25px_-5px_rgba(99,102,241,0.5)] border-2 border-indigo-400/30 hover:shadow-indigo-500/40 hover:brightness-110 active:scale-95 text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all"
                            >
                                {isDownloadingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                <span className="hidden min-[350px]:inline">Download</span>
                                <span className="min-[350px]:hidden">DL</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getPreviewUrl = (url: string, category: string): string => {
    if (!url) return '';
    // Extract file ID from various Google Drive URL formats
    const matchId = url.match(/[-\w]{25,}/);
    if (!matchId) return url;
    const fileId = matchId[0];
    // For all types - use Google Docs viewer/preview
    return `https://drive.google.com/file/d/${fileId}/preview`;
};

const getFileIcon = (category: string) => {
    switch (category) {
        case 'video': return <Video className="text-rose-700" />;
        case 'audio': return <Music className="text-violet-600" />;
        case 'images': return <ImageIcon className="text-indigo-500" />;
        case 'pdf': return <FileText className="text-rose-600" />;
        case 'ppt': return <Presentation className="text-amber-600" />;
        case 'excel': return <FileSpreadsheet className="text-emerald-600" />;
        case 'doc': return <FileText className="text-blue-700" />;
        default: return <FileText className="text-gray-500" />;
    }
};

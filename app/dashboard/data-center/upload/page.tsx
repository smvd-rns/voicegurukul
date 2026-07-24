'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link as LinkIcon, FileCheck, AlertCircle, Loader2, FolderSearch, X, Music, Video, FileText, Image as ImageIcon, FileArchive, Search, File, Folder, PlusSquare, ChevronRight, ChevronDown, HardDrive } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import sadhanaDb from '@/lib/supabase/sadhanaDb';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getRoleHierarchyNumber } from '@/lib/utils/roles';

export default function DataCenterUploadPage() {
    const { user, userData } = useAuth();
    const [activeTab, setActiveTab] = useState<'upload' | 'fetch'>('upload');
    const [allowedUploadRoles, setAllowedUploadRoles] = useState<number[] | null>(null);
    const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
    const [targetFolderId, setTargetFolderId] = useState<string>('root');
    const [allFolders, setAllFolders] = useState<any[]>([]);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Upload State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error' | 'skipped'>>({});
    const [batchDescription, setBatchDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch State
    const [driveLink, setDriveLink] = useState('');
    const [scanDisplayName, setScanDisplayName] = useState('');
    const [scanDescription, setScanDescription] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [scanError, setScanError] = useState('');
    // Always awake — using internal Next.js API route, no external server needed
    const [renderWorkerStatus] = useState<'waking' | 'awake' | 'error'>('awake');
    const [wakeUpTimer] = useState(0);

    const SCAN_API_URL = '/api/drive/scan';

    const retryWakeUp = () => {}; // No-op: no external server to retry

    const fetchRecentScans = useCallback(async () => {
        if (!user || !sadhanaDb) return;
        const { data } = await sadhanaDb
            .from('drive_scans')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(5);
        if (data) setRecentScans(data);
    }, [user]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fid = params.get('folderId');
        if (fid) setTargetFolderId(fid);
    }, []);

    const fetchFolders = useCallback(async () => {
        if (!user || !sadhanaDb) return;
        try {
            const { data } = await sadhanaDb
                .from('folders')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true });
            if (data) setAllFolders(data);
        } catch (err) {
            console.error('Fetch folders error:', err);
        }
    }, [user]);

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
                } else {
                    setAllowedUploadRoles([2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21]);
                }
            } catch (err) {
                console.error('Fetch allowed roles error:', err);
                setAllowedUploadRoles([2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21]);
            } finally {
                setIsCheckingPermissions(false);
            }
        };
        fetchAllowedRoles();
    }, []);

    const canUpload = useMemo(() => {
        if (!userData?.role || !allowedUploadRoles) return false;
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        return roles.some(r => allowedUploadRoles.includes(getRoleHierarchyNumber(r)));
    }, [userData?.role, allowedUploadRoles]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files) {
            const filesArray = Array.from(e.dataTransfer.files);
            setSelectedFiles(prev => [...prev, ...filesArray]);

            // Initialize statuses
            const newStatuses = { ...fileStatuses };
            filesArray.forEach(f => {
                newStatuses[f.name] = 'pending';
            });
            setFileStatuses(newStatuses);

            setUploadStatus('idle');
            setUploadError('');
        }
    }, [fileStatuses]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);

    if (isCheckingPermissions) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">Verifying Permissions...</p>
            </div>
        );
    }

    if (!canUpload) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
                <div className="p-6 bg-rose-50 rounded-[2.5rem] border-2 border-rose-100 shadow-xl shadow-rose-500/10 transition-all hover:scale-105 group">
                    <AlertCircle className="w-16 h-16 text-rose-600 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="text-center space-y-3 max-w-sm">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Access Restricted</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Permission Required</p>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed italic border-t border-slate-100 pt-4">
                        You do not have the required credentials to access the Data Center upload facility. Contact your administrator if you believe this is an error.
                    </p>
                </div>
                <Link href="/dashboard/data-center" className="group flex items-center gap-3 px-8 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:shadow-slate-500/20 active:scale-95">
                    <HardDrive className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    Return to Data Center
                </Link>
            </div>
        );
    }

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
                    name: newFolderName.trim(),
                    parentId: targetFolderId === 'root' ? null : targetFolderId
                })
            });

            const data = await res.json();
            if (res.ok && data.folder) {
                setAllFolders(prev => [...prev, data.folder]);
                setTargetFolderId(data.folder.id);
                setIsCreatingFolder(false);
                setNewFolderName('');
            } else {
                throw new Error(data.error || 'Failed to create folder');
            }
        } catch (err: any) {
            console.error('Create folder error:', err);
            alert(err.message || 'Failed to create folder');
        } finally {
            setIsSubmittingFolder(false);
        }
    };

    const getFolderName = (id: string) => {
        if (id === 'root') return 'Root Repository';
        return allFolders.find(f => f.id === id)?.name || 'Unknown Folder';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...filesArray]);

            // Initialize statuses
            const newStatuses = { ...fileStatuses };
            filesArray.forEach(f => {
                newStatuses[f.name] = 'pending';
            });
            setFileStatuses(newStatuses);

            setUploadStatus('idle');
            setUploadError('');
        }
    };



    const removeFile = (index: number) => {
        const fileToRemove = selectedFiles[index];
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        if (fileToRemove) {
            const newStatuses = { ...fileStatuses };
            delete newStatuses[fileToRemove.name];
            setFileStatuses(newStatuses);
        }
    };



    const performUpload = async () => {
        if (selectedFiles.length === 0 || !user) return;

        if (batchDescription.trim() === '') {
            toast.error("Missing Description! Please write a description for this batch.");
            return;
        }

        setIsUploading(true);
        setUploadStatus('idle');
        setUploadError('');

        // Helper for XMLHttpRequest based upload to track progress
        const uploadFileWithProgress = (url: string, file: File, onProgress: (pct: number) => void): Promise<any> => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', url);
                
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 100);
                        onProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            resolve({ id: 'unknown' }); // Fallback if not JSON
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });
        };

        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                setCurrentFileIndex(i);
                setUploadProgress(0);

                // 1. Check for Duplicate (Global check across all users and folders)
                if (sadhanaDb) {
                    const { data: existing } = await sadhanaDb
                        .from('files')
                        .select('id')
                        .eq('file_name', file.name)
                        .maybeSingle();

                    if (existing) {
                        setFileStatuses(prev => ({ ...prev, [file.name]: 'skipped' }));
                        continue;
                    }
                }

                setFileStatuses(prev => ({ ...prev, [file.name]: 'uploading' }));
                setUploadProgress(10);

                // Get token from Render Backend
                let tokenData;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000);

                    const tokenRes = await fetch('/api/upload-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: controller.signal,
                        body: JSON.stringify({
                            fileName: file.name,
                            fileType: file.type || 'application/octet-stream',
                            targetFolderId,
                            userId: user.id,
                            userName: userData?.name || user.email?.split('@')[0] || user.id.substring(0, 8)
                        })
                    });
                    clearTimeout(timeoutId);

                    if (!tokenRes.ok) {
                        const errorData = await tokenRes.json();
                        throw new Error(errorData.error || 'Failed to initialize upload via Render');
                    }
                    tokenData = await tokenRes.json();
                } catch (err: any) {
                    console.error('Render backend upload error:', err);
                    throw new Error(`Upload failed: ${err.message}. Please wait for the engine to wake up.`);
                }

                setUploadProgress(20);

                const metadata = {
                    name: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    parents: [tokenData.folderId]
                };

                const sessionRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                    method: 'POST',
                    headers: {
                        ...(tokenData.accessToken ? { "Authorization": `Bearer ${tokenData.accessToken}` } : {}),
                        'Content-Type': 'application/json; charset=UTF-8',
                        'X-Upload-Content-Type': file.type || 'application/octet-stream',
                        'X-Upload-Content-Length': file.size.toString()
                    },
                    body: JSON.stringify(metadata)
                });

                if (!sessionRes.ok) throw new Error(`Failed to initialize resumable upload for ${file.name}`);
                const location = sessionRes.headers.get('Location');
                if (!location) throw new Error('No upload location received from Google Drive');

                // Real-time progress upload
                const driveData = await uploadFileWithProgress(location, file, (percent) => {
                    // Map 0-100% of file to 20-90% of overall progress
                    const mappedProgress = 20 + Math.round(percent * 0.7);
                    setUploadProgress(mappedProgress);
                });

                if (!driveData.thumbnailLink || !driveData.webViewLink) {
                    const extraRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}?fields=id,name,mimeType,size,thumbnailLink,webViewLink`, {
                        headers: {
                            ...(tokenData.accessToken ? { "Authorization": `Bearer ${tokenData.accessToken}` } : {}),
                        }
                    });
                    if (extraRes.ok) {
                        const extraData = await extraRes.json();
                        Object.assign(driveData, extraData);
                    }
                }

                setUploadProgress(95);

                const mimeType = driveData.mimeType || '';
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                let category = 'other';
                if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) category = 'ppt';
                else if (mimeType.includes('pdf') || extension === 'pdf') category = 'pdf';
                else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx'].includes(extension)) category = 'excel';
                else if (mimeType.includes('video') || ['mp4', 'avi', 'mov'].includes(extension)) category = 'video';
                else if (mimeType.includes('audio') || ['mp3', 'wav'].includes(extension)) category = 'audio';
                else if (mimeType.includes('document') || mimeType.includes('word') || ['doc', 'docx'].includes(extension)) category = 'doc';
                else if (mimeType.includes('image') || ['jpg', 'jpeg', 'png'].includes(extension)) category = 'images';

                if (sadhanaDb) {
                    const { error: dbError } = await sadhanaDb.from('files').insert({
                        google_drive_id: driveData.id,
                        file_name: file.name,
                        file_type: driveData.mimeType || 'application/octet-stream',
                        file_size: file.size,
                        google_drive_url: driveData.webViewLink,
                        thumbnail_link: driveData.thumbnailLink,
                        upload_method: 'direct_upload',
                        category: category,
                        description: batchDescription,
                        user_id: user.id,
                        folder_id: targetFolderId === 'root' ? null : targetFolderId,
                        views: 0,
                        points_awarded: 0,
                    });

                    if (dbError) throw dbError;
                }

                setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
                setUploadProgress(100);
            }

            setUploadStatus('success');
            setTimeout(() => {
                setSelectedFiles([]);
                setFileStatuses({});
                setBatchDescription('');
                setUploadProgress(0);
                setUploadStatus('idle');
            }, 5000);

        } catch (error: any) {
            console.error('Upload Error:', error);
            setUploadError(error.message || 'An unknown error occurred');
            setUploadStatus('error');
        } finally {
            setIsUploading(false);
        }
    };

    const performScan = async () => {
        if (!driveLink.trim() || !user) return;

        if (scanDescription.trim() === '') {
            toast.error("Missing Description! Please write a description for this folder scan.");
            return;
        }

        setIsScanning(true);
        setScanStatus('idle');

        try {
            // Use internal Next.js API route — no external server needed
            const res = await fetch(SCAN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    driveLink,
                    displayName: scanDisplayName,
                    description: scanDescription,
                    parentId: targetFolderId === 'root' ? null : targetFolderId,
                    userId: user.id,
                    userName: userData?.name || user.email?.split('@')[0] || user.id.substring(0, 8)
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start scan');

            setScanStatus('success');
            fetchRecentScans();
            setTimeout(() => {
                setDriveLink('');
                setScanDescription('');
                setScanStatus('idle');
            }, 5000);

        } catch (error: any) {
            console.error('Scan Error:', error);
            setScanError(error.message || 'Failed to start folder scan');
            setScanStatus('error');
        } finally {
            setIsScanning(false);
        }
    };

    const handleCancelScan = async (scanId: string) => {
        if (!user) return;
        try {
            const { data: sessionData } = await (supabase as any).auth.getSession();
            const token = sessionData?.session?.access_token;

            const res = await fetch('/api/drive/scan/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : {})
                },
                body: JSON.stringify({ scanId })
            });

            if (res.ok) {
                toast.success('Cancellation requested');
                fetchRecentScans();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to cancel scan');
            }
        } catch (err: any) {
            console.error('Cancel scan error:', err);
            toast.error(err.message || 'Failed to cancel scan');
        }
    };

    const getFileIcon = (type: string, name: string) => {
        if (type.includes('video')) return <Video className="w-8 h-8 text-blue-500" />;
        if (type.includes('audio')) return <Music className="w-8 h-8 text-yellow-500" />;
        if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-green-500" />;
        if (type.includes('zip') || name.endsWith('zip')) return <FileArchive className="w-8 h-8 text-red-500" />;
        return <FileText className="w-8 h-8 text-orange-500" />;
    };

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-orange-500/30 pb-20">
            {/* Subtle Animated Warm Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center items-center z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" />
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-amber-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[10%] w-[70%] h-[70%] bg-orange-100/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/data-center" className="p-3 bg-white/80 backdrop-blur-md rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-orange-600 hover:border-orange-100 transition-all shadow-sm active:scale-95 group">
                            <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Add Resources</h1>
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mt-0.5">Global Repository</p>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border-2 border-orange-100 shadow-2xl shadow-orange-900/10 overflow-hidden">
                    <div className="p-5 md:p-10 space-y-8">
                        {/* Tab Selector */}
                        <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl w-full sm:w-fit border-2 border-slate-200/50 shadow-inner mx-auto sm:mx-0">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-[11px] lg:text-sm uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-orange-600 text-white shadow-lg border-b-2 border-orange-800' : 'text-slate-500 hover:text-orange-600'}`}
                            >
                                Direct Upload
                            </button>
                            <button
                                onClick={() => setActiveTab('fetch')}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-[11px] lg:text-sm uppercase tracking-widest transition-all ${activeTab === 'fetch' ? 'bg-orange-600 text-white shadow-lg border-b-2 border-orange-800' : 'text-slate-500 hover:text-orange-600'}`}
                            >
                                Fetch Drive
                            </button>
                        </div>

                        <div className="p-0">
                            <AnimatePresence mode="wait">
                                {activeTab === 'upload' ? (
                                    <motion.div
                                        key="upload"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Direct File Upload</h2>
                                            <p className="text-slate-500 text-sm mt-1 font-medium">Files will be indexed in <span className="text-orange-600 font-black">{getFolderName(targetFolderId)}</span></p>
                                        </div>

                                        {/* Folder Picker */}
                                        <div className="space-y-3 relative group text-left">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between px-1">
                                                Destination Folder
                                                <button
                                                    onClick={() => setIsCreatingFolder(true)}
                                                    className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                                >
                                                    <PlusSquare className="w-3.5 h-3.5" />
                                                    New Folder
                                                </button>
                                            </label>
                                            <div
                                                onClick={() => setIsPickerOpen(!isPickerOpen)}
                                                className={`w-full px-5 py-4 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center justify-between shadow-sm group ${isPickerOpen ? 'border-orange-500 bg-white ring-4 ring-orange-500/10' : 'border-slate-100 bg-slate-50/50 hover:border-orange-200 hover:bg-white'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                                                        <Folder className="w-5 h-5 text-amber-600 fill-amber-500/10" />
                                                    </div>
                                                    <span className="font-black text-slate-700">{getFolderName(targetFolderId)}</span>
                                                </div>
                                                {isPickerOpen ? <ChevronDown className="w-4 h-4 text-orange-500 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />}
                                            </div>

                                            <AnimatePresence>
                                                {isPickerOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                        className="absolute z-50 top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border-2 border-orange-100 rounded-[2rem] shadow-2xl shadow-orange-900/10 overflow-hidden max-h-[350px] overflow-y-auto p-3 ring-1 ring-black/5"
                                                    >
                                                        <div
                                                            onClick={() => { setTargetFolderId('root'); setIsPickerOpen(false); }}
                                                            className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all ${targetFolderId === 'root' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-600 hover:bg-orange-50 font-bold text-sm'}`}
                                                        >
                                                            <HardDrive className={`w-4 h-4 ${targetFolderId === 'root' ? 'text-white' : 'text-orange-600'}`} />
                                                            Root Repository
                                                        </div>
                                                        <div className="h-px bg-slate-100 my-2 mx-2" />
                                                        <div className="grid grid-cols-1 gap-1">
                                                            {allFolders.map(folder => (
                                                                <div
                                                                    key={folder.id}
                                                                    onClick={() => { setTargetFolderId(folder.id); setIsPickerOpen(false); }}
                                                                    className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all ${targetFolderId === folder.id ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-600 hover:bg-orange-50 font-bold text-sm'}`}
                                                                >
                                                                    <Folder className={`w-4 h-4 ${targetFolderId === folder.id ? 'text-white' : 'text-amber-500'}`} />
                                                                    {folder.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Drag & Drop Area */}
                                        <div
                                            onClick={() => !isUploading && fileInputRef.current?.click()}
                                            onDrop={!isUploading ? handleDrop : undefined}
                                            onDragOver={handleDragOver}
                                            className={`relative group border-2 border-dashed rounded-[2.5rem] p-8 md:p-12 text-center transition-all duration-500 ${isUploading ? 'opacity-50 cursor-not-allowed border-slate-200' : 'border-slate-300 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/30 cursor-pointer shadow-inner'}`}
                                        >
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                disabled={isUploading}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-3xl shadow-xl shadow-slate-200 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10">
                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center animate-bounce shadow-lg">
                                                    <PlusCircle className="w-4 h-4 text-white" />
                                                </div>
                                                <UploadCloud className="w-10 h-10 text-orange-500" />
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Drop files or click to browse</h3>
                                                <p className="text-slate-500 mt-2 font-medium text-xs md:text-sm max-w-sm mx-auto leading-relaxed">
                                                    Upload multiple resources at once. They will appear in the repository instantly after indexing.
                                                </p>
                                            </div>
                                        </div>

                                        {selectedFiles.length > 0 && (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 text-left">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                                                        Batch Metadata (Applies to all files) <span className="text-rose-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <textarea
                                                            placeholder="Add a common description to help others find these files..."
                                                            value={batchDescription}
                                                            onChange={(e) => setBatchDescription(e.target.value)}
                                                            disabled={isUploading}
                                                            rows={2}
                                                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all resize-none bg-slate-50/50 focus:bg-white text-sm font-bold placeholder:font-medium placeholder:text-slate-400 shadow-sm"
                                                        />
                                                        <FileText className="absolute right-4 top-4 w-4 h-4 text-slate-300" />
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-inner">
                                                    <div className="p-4 bg-white/60 border-b border-white backdrop-blur-md flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Ready to upload ({selectedFiles.length})</span>
                                                    </div>
                                                    <div className="max-h-[300px] overflow-y-auto divide-y-2 divide-white">
                                                        {selectedFiles.map((file, index) => (
                                                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-4 md:p-5 group hover:bg-white transition-colors">
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <div className="p-2.5 md:p-3 bg-white rounded-2xl shadow-md border border-slate-100 group-hover:scale-110 group-hover:bg-orange-50 group-hover:border-orange-100 transition-all">
                                                                        {getFileIcon(file.type, file.name)}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-black text-slate-800 truncate text-sm tracking-tight">{file.name}</h4>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                                            {fileStatuses[file.name] === 'skipped' && (
                                                                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-rose-100">Duplicate</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {!isUploading && (
                                                                    <button onClick={() => removeFile(index)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                                                        <XCircleIcon className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                                {isUploading && index === currentFileIndex && fileStatuses[file.name] === 'uploading' && (
                                                                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                                                )}
                                                                {(fileStatuses[file.name] === 'success' || (isUploading && index < currentFileIndex && fileStatuses[file.name] === 'success')) && (
                                                                    <div className="p-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                                                                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                                                                    </div>
                                                                )}
                                                                {fileStatuses[file.name] === 'skipped' && (
                                                                    <div className="p-1.5 bg-rose-50 rounded-full border border-rose-100">
                                                                        <AlertCircle className="w-4 h-4 text-rose-600" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {isUploading && (
                                                    <div className="bg-orange-500/5 backdrop-blur-md p-6 rounded-[2rem] border-2 border-orange-100 space-y-4 shadow-lg shadow-orange-900/5">
                                                        <div className="flex justify-between items-end">
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Processing Batch</span>
                                                                <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                                    {currentFileIndex + 1} / {selectedFiles.length} Files
                                                                    <span className="text-xs font-bold text-slate-400 truncate max-w-[150px]">({selectedFiles[currentFileIndex]?.name})</span>
                                                                </span>
                                                            </div>
                                                            <span className="text-2xl font-black text-orange-600 tracking-tighter">{uploadProgress}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden p-1 shadow-inner">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${uploadProgress}%` }}
                                                                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full shadow-lg"
                                                                transition={{ duration: 0.5 }}
                                                            ></motion.div>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedFiles.length > 0 && (
                                                    <>
                                                        {renderWorkerStatus === 'error' && (
                                                            <button
                                                                onClick={retryWakeUp}
                                                                className="w-full px-8 py-5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all"
                                                            >
                                                                <Loader2 className="w-5 h-5" />
                                                                Engine Offline — Retry Connection
                                                            </button>
                                                        )}
                                                        {renderWorkerStatus !== 'error' && (
                                                            <button
                                                                onClick={performUpload}
                                                                disabled={isUploading || selectedFiles.length === 0 || renderWorkerStatus !== 'awake'}
                                                                className={`w-full px-8 py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                {renderWorkerStatus === 'waking' ? (
                                                                    <>
                                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                                        Engine Warming Up ({wakeUpTimer}s)
                                                                    </>
                                                                ) : isUploading ? (
                                                                    <>
                                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                                        Processing...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Upload className="w-5 h-5" />
                                                                        Start Upload
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="fetch"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="text-center mb-8">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Fetch from Google Drive</h2>
                                                {renderWorkerStatus === 'waking' && (
                                                    <span className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-orange-200 shadow-sm animate-pulse">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Waking Engine ({wakeUpTimer}s)...
                                                    </span>
                                                )}
                                                {renderWorkerStatus === 'awake' && (
                                                    <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-200">
                                                        <CheckIcon className="w-3 h-3" />
                                                        Engine Ready
                                                    </span>
                                                )}
                                                {renderWorkerStatus === 'error' && (
                                                    <button
                                                        onClick={retryWakeUp}
                                                        className="flex items-center gap-1.5 bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-rose-200 transition-all"
                                                    >
                                                        <AlertCircle className="w-3 h-3" />
                                                        Engine Offline — Tap to Retry
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-500 text-sm mt-2 font-medium">Provide a public folder link to index into your repository without timeouts.</p>
                                        </div>

                                        <div className="space-y-6 bg-slate-50/50 p-5 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-inner text-left">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                                    <LinkIcon className="w-3.5 h-3.5 text-orange-500" />
                                                    Google Drive Folder URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="https://drive.google.com/drive/folders/..."
                                                    value={driveLink}
                                                    onChange={(e) => setDriveLink(e.target.value)}
                                                    disabled={isScanning || scanStatus === 'success'}
                                                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all disabled:opacity-60 bg-white text-slate-800 font-bold text-sm placeholder:font-medium placeholder:text-slate-400"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                                    <Folder className="w-3.5 h-3.5 text-orange-500" />
                                                    Display Name in Tree
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="E.g., Special Collection / Research Archive"
                                                    value={scanDisplayName}
                                                    onChange={(e) => setScanDisplayName(e.target.value)}
                                                    disabled={isScanning || scanStatus === 'success'}
                                                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all disabled:opacity-60 bg-white text-slate-800 font-bold text-sm placeholder:font-medium placeholder:text-slate-400"
                                                />
                                                <p className="text-[9px] text-slate-400 font-bold italic px-1">This name will be displayed as the top-level folder in the repository tree.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                                    Batch Description / Comments <span className="text-rose-500">*</span>
                                                </label>
                                                <textarea
                                                    placeholder="Write a description for this folder scan..."
                                                    value={scanDescription}
                                                    onChange={(e) => setScanDescription(e.target.value)}
                                                    disabled={isScanning || scanStatus === 'success'}
                                                    rows={3}
                                                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all resize-none disabled:opacity-60 bg-white text-slate-800 font-bold text-sm placeholder:font-medium placeholder:text-slate-400"
                                                />
                                            </div>

                                            {scanStatus === 'success' && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="p-5 bg-emerald-50 text-emerald-700 rounded-2xl border-2 border-emerald-100 flex items-center gap-4"
                                                >
                                                    <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/30">
                                                        <CheckIcon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <span className="font-black block text-sm tracking-tight uppercase">Index Job Initiated</span>
                                                        <span className="text-xs font-bold opacity-80">The indexing worker is now processing the folder in the background.</span>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {scanStatus === 'error' && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="p-5 bg-rose-50 text-rose-700 rounded-2xl border-2 border-rose-100 flex items-start gap-4"
                                                >
                                                    <div className="p-2 bg-rose-500 rounded-lg shadow-lg shadow-rose-500/30 shrink-0 mt-0.5">
                                                        <AlertCircle className="w-5 h-5 text-white" />
                                                    </div>
                                                    <span className="font-bold text-sm leading-relaxed">{scanError}</span>
                                                </motion.div>
                                            )}

                                            {scanStatus !== 'success' && (
                                                <>
                                                    {renderWorkerStatus === 'error' && (
                                                        <button
                                                            onClick={retryWakeUp}
                                                            className="w-full px-8 py-5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all"
                                                        >
                                                            <AlertCircle className="w-5 h-5" />
                                                            Backend Offline — Retry Connection
                                                        </button>
                                                    )}
                                                    {renderWorkerStatus !== 'error' && (
                                                        <button
                                                            onClick={performScan}
                                                            disabled={isScanning || !driveLink.trim() || renderWorkerStatus !== 'awake'}
                                                            className="w-full px-8 py-5 bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:shadow-2xl hover:shadow-slate-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-slate-700 active:border-b-0"
                                                        >
                                                            {renderWorkerStatus === 'waking' ? (
                                                                <>
                                                                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                                                    Engine Warming Up ({wakeUpTimer}s)
                                                                </>
                                                            ) : isScanning ? (
                                                                <>
                                                                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                                                    Searching Directory...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FolderSearch className="w-5 h-5 text-orange-500" />
                                                                    Start Scanning
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Expanded History Section */}
                                        <div className="pt-8 border-t-2 border-slate-100 text-left">
                                            <div className="flex items-center justify-between mb-8 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-100 rounded-xl">
                                                        <FolderSearch className="w-5 h-5 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Indexing History</h3>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Track your previous Google Drive imports</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={fetchRecentScans}
                                                    className="group text-[10px] font-black text-orange-600 hover:text-white uppercase tracking-widest bg-orange-50 hover:bg-orange-500 px-4 py-2 rounded-xl border-2 border-orange-100 transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <Loader2 className="w-3 h-3 group-active:animate-spin" />
                                                    Refresh Logs
                                                </button>
                                            </div>

                                            {recentScans.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {recentScans.map((scan) => (
                                                        <div key={scan.id} className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm flex flex-col gap-5 group hover:border-orange-500 hover:shadow-xl hover:shadow-orange-900/5 transition-all">
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors border-2 border-transparent group-hover:border-orange-100">
                                                                            <LinkIcon className="w-4 h-4" />
                                                                        </div>
                                                                        <h4 className="text-sm font-black text-slate-800 truncate tracking-tight">{scan.drive_link}</h4>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-1">
                                                                        <div className="w-1.5 h-1.5 bg-orange-200 rounded-full" />
                                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(scan.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border-2 shadow-sm ${scan.scan_status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    scan.scan_status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                        'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                                                    }`}>
                                                                    {scan.scan_status}
                                                                </div>
                                                                {scan.scan_status === 'processing' && (
                                                                    <button
                                                                        onClick={() => handleCancelScan(scan.id)}
                                                                        className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-lg transition-all border border-transparent hover:border-rose-100"
                                                                        title="Cancel Scan"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {scan.description && (
                                                                <p className="text-xs font-medium text-slate-500 line-clamp-2 px-1 italic">
                                                                    &quot;{scan.description}&quot;
                                                                </p>
                                                            )}

                                                            <div className="grid grid-cols-4 gap-2 pt-5 border-t-2 border-slate-50">
                                                                <div className="text-center group-hover:scale-105 transition-transform bg-slate-50/50 py-3 rounded-2xl">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Found</p>
                                                                    <p className="text-sm font-black text-slate-900 leading-none">{scan.files_found || 0}</p>
                                                                </div>
                                                                <div className="text-center group-hover:scale-105 transition-transform bg-emerald-50/50 py-3 rounded-2xl border border-emerald-100/30">
                                                                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter mb-1">Added</p>
                                                                    <p className="text-sm font-black text-emerald-600 leading-none">{scan.files_processed || 0}</p>
                                                                </div>
                                                                <div className="text-center group-hover:scale-105 transition-transform bg-amber-50/50 py-3 rounded-2xl border border-amber-100/30">
                                                                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-tighter mb-1">Skipped</p>
                                                                    <p className="text-sm font-black text-amber-600 leading-none">{scan.files_skipped || 0}</p>
                                                                </div>
                                                                <div className="text-center group-hover:scale-105 transition-transform bg-rose-50/50 py-3 rounded-2xl border border-rose-100/30">
                                                                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-tighter mb-1">Error</p>
                                                                    <p className="text-sm font-black text-rose-600 leading-none">{scan.files_failed || 0}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                        <FolderSearch className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No indexing history yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Folder Creation Modal */}
                <AnimatePresence>
                    {isCreatingFolder && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2.5rem] border-2 border-orange-100 shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-100 rounded-2xl">
                                            <PlusSquare className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Create New Folder</h3>
                                            <p className="text-slate-500 text-xs font-medium">Inside {getFolderName(targetFolderId)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left block">Folder Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="E.g., Spiritual Literature"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setIsCreatingFolder(false)}
                                            disabled={isSubmittingFolder}
                                            className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all border-2 border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateFolder}
                                            disabled={!newFolderName.trim() || isSubmittingFolder}
                                            className="flex-1 px-6 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:scale-[1.02] hover:bg-orange-500 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isSubmittingFolder ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                    <span>Creating...</span>
                                                </>
                                            ) : (
                                                <span>Create Folder</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function Upgrade(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 3v13" />
            <path d="m16 7-4-4-4 4" />
            <path d="M20 21H4" />
        </svg>
    )
}

function HardDriveUpload(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m16 6-4-4-4 4" />
            <path d="M12 2v8" />
            <rect width="20" height="8" x="2" y="14" rx="2" />
            <path d="M6 18h.01" />
            <path d="M10 18h.01" />
        </svg>
    )
}

function UploadCloud(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
        </svg>
    )
}

function PlusCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
        </svg>
    )
}

function XCircleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    )
}

function CheckIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';
import {
    Users, FileCheck, Search, Activity, Shield, Filter, MapPin,
    CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight,
    History, Calendar, Mail, Quote, ShieldCheck, Check, Clock, X, ArrowRight, ShieldAlert, Edit, Plus, Trash2, Heart, Award, Lock
} from 'lucide-react';
import { getRoleDisplayName, getHighestRole } from '@/lib/utils/roles';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { User } from '@/types';
// Import UserDetailModal from MD dashboard (assuming it's generic enough)
import UserDetailModal from '@/components/dashboard/UserDetailModal';

// --- Types ---

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
        hierarchy?: any;
    };
}

const MANAGEABLE_ROLES = [
    { label: 'Member', value: 1 },
    { label: 'OC', value: 17 },
    { label: 'Internal Manager', value: 22 },
    { label: 'Preaching Coordinator', value: 23 },
    { label: 'Morning Program In-charge', value: 24 },
    { label: 'Mentor', value: 25 },
    { label: 'Frontliner', value: 26 },
    { label: 'Accountant', value: 27 },
    { label: 'Kitchen Head', value: 28 },
    { label: 'Study In-charge', value: 29 },
    { label: 'Grihstha Counselor', value: 31 },
    { label: 'Easy Incharge', value: 32 },
    { label: 'Prerna Incharge', value: 33 },
];

const CENTER_POST_OPTIONS = [
    { label: 'Member / No Post', value: 1 },
    ...MANAGEABLE_ROLES.filter(r => r.value !== 1)
];

import { createPortal } from 'react-dom';

const RoleMultiSelect = ({
    user,
    currentRoles,
    options,
    onUpdate,
    isUpdating
}: {
    user: any,
    currentRoles: number[],
    options: { label: string, value: number }[],
    onUpdate: (roles: number[]) => void,
    isUpdating: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<number[]>(currentRoles);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Reset selection when dropdown opens or currentRoles change
    useEffect(() => {
        if (isOpen) {
            setSelectedRoles(currentRoles);
        }
    }, [isOpen, currentRoles]);

    const handleToggle = (e: React.MouseEvent) => {
        if (isUpdating) return;
        e.stopPropagation();

        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const desiredHeight = 320; // Approx max height with footer

            const styles: React.CSSProperties = {
                position: 'fixed',
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column'
            };

            // Smart positioning: Prefer below if enough space, else choose side with more space
            if (spaceBelow >= 200 || spaceBelow > spaceAbove) {
                styles.top = rect.bottom + 4;
                styles.transformOrigin = 'top left';
                styles.maxHeight = Math.min(desiredHeight, spaceBelow - 20);
            } else {
                styles.bottom = window.innerHeight - rect.top + 4;
                styles.transformOrigin = 'bottom left';
                styles.maxHeight = Math.min(desiredHeight, spaceAbove - 20);
            }

            setDropdownStyles(styles);
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close on click outside and scroll/resize
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inButton = buttonRef.current && buttonRef.current.contains(target);
            const inDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!inButton && !inDropdown) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event: Event) => {
            // Ignore scroll events from within the dropdown
            if (dropdownRef.current && (event.target === dropdownRef.current || dropdownRef.current.contains(event.target as Node))) {
                return;
            }
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, { capture: true });
            window.addEventListener('resize', handleScroll);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, { capture: true });
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const toggleRole = (roleValue: number) => {
        if (roleValue === 1) {
            // If selecting Member, clear all others
            setSelectedRoles([1]);
        } else {
            // If selecting other roles, remove Member if present, then toggle
            setSelectedRoles(prev => {
                const withoutMember = prev.filter(r => r !== 1);
                if (withoutMember.includes(roleValue)) {
                    return withoutMember.filter(r => r !== roleValue);
                } else {
                    return [...withoutMember, roleValue];
                }
            });
        }
    };

    const handleUpdate = () => {
        // If selection is empty, default to Member (1)
        const finalRoles = selectedRoles.length > 0 ? selectedRoles : [1];
        onUpdate(finalRoles);
        setIsOpen(false);
    };

    // Calculate display text
    const distinctRoleNames = currentRoles
        .filter(r => r !== 1)
        .map(r => options.find(o => o.value === r)?.label)
        .join(', ');

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                disabled={isUpdating}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-gray-50 disabled:opacity-70 transition-all text-left flex items-center justify-between"
            >
                <span className="truncate">
                    {distinctRoleNames || 'Member / No Post'}
                </span>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    {isUpdating ? (
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    )}
                </div>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95"
                    style={dropdownStyles}
                >
                    <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex-shrink-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pb-1">Select Roles</p>
                    </div>
                    <div className="overflow-y-auto p-1 custom-scrollbar flex-1 min-h-0">
                        {options.map(option => {
                            const isSelected = selectedRoles.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRole(option.value);
                                    }}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-teal-50 text-teal-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}`}>
                                        {isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                                    </div>
                                    <span className="text-xs font-bold">{option.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2 flex-shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUpdate();
                            }}
                            className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-lg shadow-teal-100 transition-colors"
                        >
                            Update
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default function ProjectManagerDashboard() {
    const { userData } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'approvals' | 'user-management' | 'registrations' | 'service-team'>('approvals');

    // Context State
    const [currentCenter, setCurrentCenter] = useState<string>('');
    const [currentTemple, setCurrentTemple] = useState<string>('');
    const [loadingContext, setLoadingContext] = useState(true);

    // Initial load from cache to prevent flicker
    useEffect(() => {
        const cachedCenters = localStorage.getItem('pm_managed_centers');
        const cachedCenter = localStorage.getItem('pm_current_center');
        const cachedTemple = localStorage.getItem('pm_current_temple');

        if (cachedCenters) {
            try {
                const parsed = JSON.parse(cachedCenters);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    setManagedCenters(parsed);
                    if (cachedCenter) setCurrentCenter(cachedCenter);
                    if (cachedTemple) setCurrentTemple(cachedTemple);
                    // If we have cached data, we can skip the full-page loader
                    setLoadingContext(false);
                }
            } catch (e) {
                console.error('Failed to parse cached centers', e);
            }
        }
    }, []);

    // Stats
    const [stats, setStats] = useState({
        devotees: 0,
        pendingRequests: 0,
        newRegistrations: 0,
        loading: true
    });

    // Approvals State
    const [requests, setRequests] = useState<ProfileRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        type: 'approved' | 'rejected' | null;
        count: number;
        requestId?: string | null;
    }>({ isOpen: false, type: null, count: 0, requestId: null });

    // Registrations State
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
    const [selectedPendingUserIds, setSelectedPendingUserIds] = useState<string[]>([]);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [userToVerify, setUserToVerify] = useState<any | null>(null);
    const [verificationAction, setVerificationAction] = useState<'approved' | 'rejected' | null>(null);
    const [verificationMode, setVerificationMode] = useState<'single' | 'bulk'>('single');

    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [updatingGroupUserId, setUpdatingGroupUserId] = useState<string | null>(null);
    const [updatingKCStatusUserId, setUpdatingKCStatusUserId] = useState<string | null>(null);

    const BV_GROUPS = ['Yudhishthira', 'Bhima', 'Arjuna', 'Nakula', 'Sahadeva', 'Prerna', 'Non Residential Alumni'];
    const KC_STATUS_OPTIONS = ['Active', 'Passive', 'Dormant'];

    // Service Team State
    const [loadingStructure, setLoadingStructure] = useState(false);
    const [currentCenterData, setCurrentCenterData] = useState<any>(null);

    const roleToColumnMap: Record<number, string> = {
        17: 'oc_id',
        22: 'internal_manager_id',
        23: 'preaching_coordinator_id',
        24: 'morning_program_in_charge_id',
        25: 'mentor_id',
        26: 'frontliner_id',
        27: 'accountant_id',
        28: 'kitchen_head_id',
        29: 'study_in_charge_id',
        31: 'grihstha_counselor_id',
        32: 'easy_incharge_id',
        33: 'prerna_incharge_id'
    };

    const loadStructure = useCallback(async () => {
        if (!supabase || !currentCenter) return;
        setLoadingStructure(true);
        try {
            const { data, error } = await supabase
                .from('centers')
                .select('*')
                .eq('name', currentCenter)
                .single();

            if (error) throw error;
            setCurrentCenterData(data);

        } catch (error) {
            console.error('Error loading structure:', error);
            toast.error('Failed to load service team structure');
        } finally {
            setLoadingStructure(false);
        }
    }, [currentCenter]);

    const handleStructureUpdate = async (roleValue: number, userId: string) => {
        if (!supabase || !currentCenterData?.id) return;

        try {
            setLoadingStructure(true);
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/centers/structure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    centerId: currentCenterData.id,
                    roleValue,
                    userId: userId || null // Send null if empty string
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Structure updated successfully');
                loadStructure(); // Reload to reflect changes
                // Also reload users to update their role tags if visible
                loadUsers();
            } else {
                toast.error(result.error || 'Update failed');
            }

        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update structure');
        } finally {
            setLoadingStructure(false);
        }
    };

    // Multi-user version for Mentor (25) and Frontliner (26)
    const handleStructureUpdateMulti = async (roleValue: number, userIds: string[]) => {
        if (!supabase || !currentCenterData?.id) return;
        try {
            setLoadingStructure(true);
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const response = await fetch('/api/centers/structure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ centerId: currentCenterData.id, roleValue, userIds })
            });
            const result = await response.json();
            if (result.success) {
                toast.success('Structure updated successfully');
                loadStructure();
                loadUsers();
            } else {
                toast.error(result.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update structure');
        } finally {
            setLoadingStructure(false);
        }
    };


    // Role Assignment Modal
    // Role Assignment
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    // Removed modal state: showAssignModal, assignRoles, selectedUser

    // View User Modal
    const [showViewModal, setShowViewModal] = useState(false);
    const [userForView, setUserForView] = useState<User | null>(null);

    // Access Control
    // Allowed Roles: 14 (Project Advisor), 15 (Project Manager), 16 (Acting Manager)
    const ALLOWED_ROLES = [14, 15, 16];
    const ALLOWED_ROLE_NAMES = ['project_advisor', 'project_manager', 'acting_manager'];

    const isProjectManager = (Array.isArray(userData?.role) ? userData.role : [userData?.role]).some(r =>
        ALLOWED_ROLES.includes(Number(r)) || ALLOWED_ROLE_NAMES.includes(String(r))
    );

    // State for multiple managed centers
    const [managedCenters, setManagedCenters] = useState<{ id: string, name: string, temple_name: string, userRole: string, pendingCount: number, pendingRegCount: number }[]>([]);

    // Helper to determine role label
    const getCenterRoleLabel = (center: any, userId: string) => {
        if (center.project_manager_id === userId) return 'Project Manager';
        if (center.project_advisor_id === userId) return 'Project Advisor';
        if (center.acting_manager_id === userId) return 'Acting Manager';
        return 'Member';
    };

    const buildCenterMatch = useCallback((centerName: string) => {
        const normalized = centerName.trim();
        return `current_center.eq.${normalized},center.eq.${normalized},hierarchy->>currentCenter.eq.${normalized},hierarchy->>center.eq.${normalized},hierarchy->currentCenter->>name.eq.${normalized}`;
    }, []);

    const refreshCounts = useCallback(async (centersToMap: any[]) => {
        if (!supabase) return;
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (token) {
            try {
                // Fetch ALL pending requests once via API to handle RLS/Roles correctly
                const res = await fetch('/api/profile-requests?status=pending', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success) {
                    const allPending = json.data;
                    console.log(`PM Dashboard: Fetched ${allPending.length} pending requests for count context.`);

                    const pendingMap = new Map<string, number>();

                    // --- NEW: Pending Registration Counts ---
                    // Group users by current_center where verification_status is 'pending'
                    const { data: regStats, error: regError } = await supabase
                        .from('users')
                        .select('current_center, center, hierarchy')
                        .eq('verification_status', 'pending');

                    const centersWithRegCounts: { name: string, _count: number }[] = [];
                    if (!regError && regStats) {
                        const counts: Record<string, number> = {};
                        regStats.forEach(u => {
                            const uH = u.hierarchy as any;
                            const cName = u.current_center || u.center || uH?.currentCenter?.name || (typeof uH?.currentCenter === 'string' ? uH?.currentCenter : '') || uH?.center || '';
                            if (cName) {
                                counts[cName] = (counts[cName] || 0) + 1;
                            }
                        });
                        Object.entries(counts).forEach(([name, count]) => {
                            centersWithRegCounts.push({ name, _count: count });
                        });
                    }

                    (allPending || []).forEach((req: any) => {
                        // Determine center for this request
                        let cName = req.center_name;
                        if (!cName) {
                            const h = req.user?.hierarchy;
                            cName = h?.currentCenter?.name || (typeof h?.currentCenter === 'string' ? h?.currentCenter : '');
                        }
                        if (cName) {
                            // Normalize keys for map (trimmed, lowercase)
                            const norm = cName.trim().toLowerCase();
                            pendingMap.set(norm, (pendingMap.get(norm) || 0) + 1);
                        }
                    });

                    const centersWithCounts = centersToMap.map(center => {
                        // Normalize lookup key
                        const lookup = center.name.trim().toLowerCase();

                        // Calculate registration count for this center
                        const regCount = centersWithRegCounts.find(dg =>
                            dg.name.trim().toLowerCase() === lookup
                        )?._count || 0;

                        return {
                            ...center,
                            pendingCount: pendingMap.get(lookup) || 0,
                            pendingRegCount: regCount
                        };
                    });

                    setManagedCenters(centersWithCounts);
                    localStorage.setItem('pm_managed_centers', JSON.stringify(centersWithCounts));
                } else {
                    console.warn('PM Dashboard: Failed to fetch pending counts from API', json.error);
                }
            } catch (err) {
                console.error('PM Dashboard: Exception fetching pending counts', err);
            }
        }
    }, []);

    useEffect(() => {
        if (!userData || !isProjectManager) {
            if (!isProjectManager && userData) { // Only redirect if userData exists but role is wrong
                router.push('/dashboard');
            }
            return;
        }

        const fetchInitialData = async () => {
            if (!supabase) { setLoadingContext(false); return; }
            const session = await supabase.auth.getSession();
            if (!session.data.session) {
                setLoadingContext(false);
                return;
            }

            const adminId = session.data.session.user.id;
            // Only show full page loader if we don't have cached data
            setLoadingContext(prev => managedCenters.length === 0);

            try {
                // 1. Fetch managed centers
                const { data, error } = await supabase
                    .from('centers')
                    .select('id, name, temple_name, project_manager_id, project_advisor_id, acting_manager_id')
                    .or(`project_manager_id.eq.${adminId},project_advisor_id.eq.${adminId},acting_manager_id.eq.${adminId}`);

                if (error) throw error;

                if (data && data.length > 0) {
                    const mappedCenters = data.map(center => {
                        const role = center.project_manager_id === adminId ? 'Project Manager' :
                            center.project_advisor_id === adminId ? 'Project Advisor' :
                                center.acting_manager_id === adminId ? 'Acting Manager' : 'Member';
                        return {
                            id: center.id,
                            name: center.name,
                            temple_name: center.temple_name,
                            userRole: role,
                            pendingCount: 0 // Will be updated by refreshCounts
                        };
                    });

                    // 2. Refresh counts using the newly fetched centers
                    await refreshCounts(mappedCenters);

                } else {
                    // Fallback: Use hierarchy if no centers found in DB
                    const h = userData.hierarchy as any;
                    const center = h?.currentCenter?.name || (typeof h?.currentCenter === 'string' ? h?.currentCenter : '');
                    const temple = h?.currentTemple?.name || (typeof h?.currentTemple === 'string' ? h?.currentTemple : '');

                    if (center) {
                        const roleName = (Array.isArray(userData.role) ? userData.role : [userData.role]).includes(15) || (Array.isArray(userData.role) ? userData.role : [userData.role]).includes('project_manager') ? 'Project Manager' :
                            (Array.isArray(userData.role) ? userData.role : [userData.role]).includes(14) || (Array.isArray(userData.role) ? userData.role : [userData.role]).includes('project_advisor') ? 'Project Advisor' :
                                (Array.isArray(userData.role) ? userData.role : [userData.role]).includes(16) || (Array.isArray(userData.role) ? userData.role : [userData.role]).includes('acting_manager') ? 'Acting Manager' : 'Member';

                        // Create a temporary center object for refreshCounts
                        const fallbackCenter = [{ id: 'hierarchy-fallback', name: center, temple_name: temple, userRole: roleName, pendingCount: 0 }];
                        await refreshCounts(fallbackCenter);
                    } else {
                        toast.error('No center assignment found for your profile.');
                    }
                }
            } catch (err) {
                console.error('Failed to load initial PM data', err);
                toast.error('Failed to load dashboard data.');
            } finally {
                setLoadingContext(false);
            }
        };

        fetchInitialData();
    }, [userData, isProjectManager, router, refreshCounts, managedCenters.length]);



    // Handle Center Change
    const handleCenterChange = (centerName: string) => {
        const selected = managedCenters.find(c => c.name === centerName);
        if (selected) {
            setCurrentCenter(selected.name);
            localStorage.setItem('pm_current_center', selected.name);
            // Clear lists to prevent stale data
            setUsers([]);
            setRequests([]);
            setPendingUsers([]);

            // Use temple from the selected center, or fallback to current if missing (unlikely for DB centers)
            const tName = selected.temple_name || currentTemple;
            setCurrentTemple(tName);
            localStorage.setItem('pm_current_temple', tName);

            // Reload data
            loadStats(selected.name, tName);
            // Reset specific view states if needed?
            // The useEffect on [activeTab, currentCenter] will trigger loadRequests/loadUsers automatically.
        }
    };

    // (useEffect for tab changes moved below, after all useCallbacks are declared)

    // --- Data Loading Functions ---

    const loadStats = useCallback(async (cName: string, tName: string) => {
        if (!supabase || !cName) return;
        setStats(prev => ({ ...prev, loading: true }));
        try {
            const [devoteesRes, pendingReqRes, pendingRegRes] = await Promise.all([
                // devotees: match users by current_center, center, or hierarchy fields
                supabase.from('users')
                    .select('id', { count: 'exact', head: true })
                    .eq('verification_status', 'approved')
                    .or(buildCenterMatch(cName)),
                // pending profile requests
                supabase.from('profile_update_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending')
                    .eq('center_name', cName),
                // pending registrations: match by current_center, center, or hierarchy fields
                supabase.from('users')
                    .select('id', { count: 'exact', head: true })
                    .eq('verification_status', 'pending')
                    .or(buildCenterMatch(cName))
            ]);

            const devoteesCount = devoteesRes.error ? 0 : devoteesRes.count ?? 0;
            const pendingReqCount = pendingReqRes.error ? 0 : pendingReqRes.count ?? 0;
            const pendingRegCount = pendingRegRes.error ? 0 : pendingRegRes.count ?? 0;

            if (devoteesRes.error) console.error('PM Dashboard: devotees count error', devoteesRes.error);
            if (pendingReqRes.error) console.error('PM Dashboard: pending request count error', pendingReqRes.error);
            if (pendingRegRes.error) console.error('PM Dashboard: pending registrations count error', pendingRegRes.error);

            setStats({
                devotees: devoteesCount,
                pendingRequests: pendingReqCount,
                newRegistrations: pendingRegCount,
                loading: false
            });
        } catch (err) {
            console.error('Error loading stats:', err);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, [buildCenterMatch]);

    // Effect to set initial center once managedCenters is populated
    useEffect(() => {
        if (managedCenters.length > 0 && !currentCenter && !loadingContext) {
            // Prioritize centers with pending requests, otherwise pick the first one
            const firstCenter = managedCenters.find(c => c.pendingCount > 0) || managedCenters[0];
            if (firstCenter) {
                setCurrentCenter(firstCenter.name);
                const tName = firstCenter.temple_name || '';
                setCurrentTemple(tName);
                loadStats(firstCenter.name, tName);
            }
        }
    }, [managedCenters, currentCenter, loadingContext, loadStats]);

    // --- New User Registrations Logic ---
    const loadPendingUsers = useCallback(async () => {
        if (!supabase || !currentCenter) return;
        setLoadingPendingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('verification_status', 'pending')
                .or(buildCenterMatch(currentCenter));

            if (error) throw error;
            setPendingUsers((data || []).map(u => ({
                ...u,
                hierarchy: u.hierarchy || {}
            })));
        } catch (error) {
            console.error('Error loading pending users:', error);
            toast.error('Failed to load pending users');
        } finally {
            setLoadingPendingUsers(false);
        }
    }, [buildCenterMatch, currentCenter]);

    const handleUserVerification = async (userId: string, status: 'approved' | 'rejected', reason?: string) => {
        if (!supabase) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) throw new Error('No auth token');

            const res = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'user',
                    ids: [userId],
                    action: status === 'approved' ? 'approve' : 'reject',
                    reason
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to update user status');

            toast.success(`User ${status} successfully`);
            loadPendingUsers();
            loadStats(currentCenter, currentTemple);
            setSelectedPendingUserIds(prev => prev.filter(id => id !== userId));
        } catch (error) {
            console.error('Error verifying user:', error);
            toast.error('Failed to update user status');
        }
    };

    const handleBulkVerification = async (status: 'approved' | 'rejected', reason?: string) => {
        if (!supabase || selectedPendingUserIds.length === 0) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) throw new Error('No auth token');

            const res = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'user',
                    ids: selectedPendingUserIds,
                    action: status === 'approved' ? 'approve' : 'reject',
                    reason
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Bulk update failed');

            toast.success(`${selectedPendingUserIds.length} users ${status} successfully`);
            loadPendingUsers();
            loadStats(currentCenter, currentTemple);
            setSelectedPendingUserIds([]);
        } catch (error) {
            console.error('Error in bulk verification:', error);
            toast.error('Bulk update failed');
        }
    };

    const loadRequests = useCallback(async () => {
        if (!supabase || !currentCenter) return;
        setLoadingRequests(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) return;

            // API handles filtering by temple AND center now
            const response = await fetch(`/api/profile-requests?status=${approvalStatus}&temple=${encodeURIComponent(currentTemple)}&center=${encodeURIComponent(currentCenter)}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setRequests(data.data || []);
            } else {
                toast.error(data.error || 'Failed to fetch requests');
            }

        } catch (error) {
            console.error(error);
            toast.error('Network error loading requests');
        } finally {
            setLoadingRequests(false);
        }
    }, [currentCenter, currentTemple, approvalStatus]);

    const loadUsers = useCallback(async () => {
        if (!supabase || !currentCenter) return;
        setLoadingUsers(true);
        try {
            // Fetch all users and filter by center client-side (users table is not huge yet, but ideally we'd filter on DB)
            // But 'hierarchy' is JSONB, so client-side filtering is often reliable enough for <10k users if we fetch light data
            // For now, fetching * is okay.
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('verification_status', 'approved')
                .or(buildCenterMatch(currentCenter));

            if (error) throw error;

            const mappedUsers = (data || []).map((u: any) => {
                const uH = u.hierarchy as any;
                const uCenter = u.current_center || u.center || uH?.currentCenter?.name || (typeof uH?.currentCenter === 'string' ? uH?.currentCenter : '') || uH?.center || '';
                if (uCenter !== currentCenter) return null;

                return {
                    ...u,
                    // Relative contact fields
                    relative1Name: u.relative_1_name,
                    relative1Relationship: u.relative_1_relationship,
                    relative1Phone: u.relative_1_phone,
                    relative2Name: u.relative_2_name,
                    relative2Relationship: u.relative_2_relationship,
                    relative2Phone: u.relative_2_phone,
                    relative3Name: u.relative_3_name,
                    relative3Relationship: u.relative_3_relationship,
                    relative3Phone: u.relative_3_phone,
                    // Health fields
                    healthChronicDisease: u.health_chronic_disease,
                    introducedToKcIn: u.introduced_to_kc_in || uH?.introducedToKcIn,
                };
            }).filter(Boolean);

            setUsers(mappedUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    }, [buildCenterMatch, currentCenter]);
    useEffect(() => {
        if (!currentCenter) return;

        if (activeTab === 'approvals') {
            loadRequests();
        } else if (activeTab === 'registrations') {
            loadPendingUsers();
        } else if (activeTab === 'user-management') {
            loadUsers();
        } else if (activeTab === 'service-team') {
            loadStructure();
            loadUsers(); // Also load users for role assignment
        }
    }, [activeTab, currentCenter, approvalStatus, loadRequests, loadPendingUsers, loadUsers, loadStructure]);

    // --- Action Handlers ---

    const handleApprovalAction = async (requestId: string, action: 'approved' | 'rejected', requestIds?: string[]) => {
        if (!supabase) return;

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            // Bulk support
            if (requestId === '' && requestIds && Array.isArray(requestIds)) {
                const bulkIds = requestIds;
                const response = await fetch('/api/profile-requests/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        requestIds: bulkIds,
                        status: action,
                        feedback: action === 'rejected' ? (feedback || 'Bulk rejection') : undefined
                    })
                });
                const result = await response.json();
                if (result.success) {
                    toast.success(result.message || `Bulk ${action} successful`);
                    setConfirmation({ isOpen: false, type: null, count: 0 });
                    setFeedback('');
                    setSelectedRequestIds([]);
                    loadRequests(); // Reload existing tab
                    loadStats(currentCenter, currentTemple); // Reload primary card
                    refreshCounts(managedCenters); // Reload breakdown list & dropdown
                } else {
                    toast.error(result.error || 'Bulk action failed');
                }
                return;
            }

            const response = await fetch(`/api/profile-requests/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: action,
                    feedback,
                    approvedFields: action === 'approved' ? selectedFields[requestId] : undefined
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`Request ${action}`);
                // Remove from list
                setRequests(prev => prev.filter(r => r.id !== requestId));
                setFeedback('');
                setExpandedRequestId(null);
                loadStats(currentCenter, currentTemple);
            } else {
                toast.error(result.error || 'Action failed');
            }
        } catch (error: any) {
            toast.error(error.message || 'Action failed');
        }
    };

    const renderFieldChange = (requestId: string, key: string, newValue: any, oldValue: any) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const displayOld = (oldValue === null || oldValue === undefined || oldValue === '') ? 'Not Set' : oldValue.toString();
        const displayNew = (newValue === null || newValue === undefined || newValue === '') ? 'Cleared' : newValue.toString();

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
                className={`flex items-start gap-3 sm:gap-4 py-3 sm:py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-lg cursor-pointer ${!isSelected ? 'opacity-60 grayscale-[0.5]' : ''}`}
                onClick={approvalStatus === 'pending' ? toggleField : undefined}
            >
                {approvalStatus === 'pending' && (
                    <div className="pt-4 sm:pt-5">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 ring-2 ring-amber-200 shadow-sm' : 'border-gray-300 bg-white'}`}>
                            {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                        </div>
                    </div>
                )}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label} (Current)</span>
                        <div className="inline-flex">
                            <span className="text-xs sm:text-sm text-gray-600 line-through decoration-red-300 opacity-70 bg-red-50/30 px-2 py-1 rounded truncate max-w-full">{displayOld}</span>
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-widest mb-1">{label} (Requested)</span>
                        <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded shadow-sm truncate max-w-full">{displayNew}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
                await handleApprovalAction(confirmation.requestId, confirmation.type);
            } else {
                // @ts-ignore - passing 3rd arg for bulk
                await handleApprovalAction('', confirmation.type, selectedRequestIds);
            }
            setConfirmation({ isOpen: false, type: null, count: 0, requestId: null });
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

    const handleInlineRoleUpdate = async (user: any, newRoles: number[]) => {
        if (!supabase) return;
        setUpdatingUserId(user.id);

        try {
            // Backend handles merging with other non-manageable roles, we just send the new set of manageable roles.
            // But we must ensure "Member" (1) logic is respected if we rely on backend for that?
            // Actually the backend just takes "roles" array and merges it.
            // So we send exactly what we want the manageable roles to be.

            const response = await fetch('/api/centers/assign-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    roles: newRoles
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user roles');
            }

            const rolesDisplay = newRoles.map(r => CENTER_POST_OPTIONS.find(o => o.value === r)?.label).join(', ');
            toast.success(`Roles updated to: ${rolesDisplay}`);
            loadUsers(); // Refresh list to show updated roles
        } catch (error: any) {
            toast.error(error.message || 'Update failed');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleAssignGroup = async (userId: string, groupName: string) => {
        if (!supabase) return;
        setUpdatingGroupUserId(userId);

        try {
            const response = await fetch('/api/admin/assign-bv-group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    userId,
                    bvGroup: groupName || null
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to assign group');
            }

            toast.success(`Group assigned successfully`);
            loadUsers(); // Refresh list to show updated group
            loadStats(currentCenter, currentTemple);
        } catch (error: any) {
            toast.error(error.message || 'Group assignment failed');
        } finally {
            setUpdatingGroupUserId(null);
        }
    };

    const handleAssignKCStatus = async (userId: string, kcStatus: string) => {
        if (!supabase) return;
        setUpdatingKCStatusUserId(userId);

        try {
            const { error } = await supabase
                .from('users')
                .update({ 
                    hierarchy: { 
                        ...users.find(u => u.id === userId)?.hierarchy,
                        kcStatus 
                    } 
                })
                .eq('id', userId);

            if (error) throw error;
            
            toast.success(`KC Status updated to ${kcStatus}`);
            loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'KC Status update failed');
        } finally {
            setUpdatingKCStatusUserId(null);
        }
    };

    // --- Render ---

    if (loadingContext) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="relative rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-600 p-6 sm:p-8 shadow-lg z-10 overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-teal-400/20 blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="text-white w-full">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Project Management</h1>
                        <div className="mt-3 text-teal-100 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                {managedCenters.length > 1 ? (
                                    <div className="relative group w-full max-w-[200px]">
                                        <select
                                            value={currentCenter}
                                            onChange={(e) => handleCenterChange(e.target.value)}
                                            className="w-full appearance-none bg-white/10 hover:bg-white/20 text-white font-bold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm transition-all text-sm truncate border border-white/20"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {managedCenters.map(c => (
                                                <option key={c.id} value={c.name} className="text-gray-900 bg-white py-2">
                                                    {c.name} {c.pendingCount > 0 ? `(${c.pendingCount})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-100 pointer-events-none" />
                                    </div>
                                ) : (
                                    <span className="font-semibold text-sm sm:text-base">{currentCenter}</span>
                                )}
                            </div>

                            {/* Role Badge */}
                            {managedCenters.find(c => c.name === currentCenter)?.userRole && (
                                <span className="w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/20 uppercase tracking-wide">
                                    {managedCenters.find(c => c.name === currentCenter)?.userRole}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    onClick={() => setActiveTab('user-management')}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex items-center cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-blue-50 rounded-2xl flex items-center justify-center mr-4 sm:mr-5 group-hover:bg-blue-100 transition-colors">
                        <Users className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Devotees</p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.devotees}</p>
                    </div>
                </div>
                <div
                    onClick={() => setActiveTab('approvals')}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex items-start cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-orange-50 rounded-2xl flex items-center justify-center mr-4 sm:mr-5 flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                        <FileCheck className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                    </div>
                    <div className="w-full">
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Requests</p>
                        {(() => {
                            const activeCenters = managedCenters.filter(c => c.pendingCount > 0);
                            if (activeCenters.length === 0) {
                                return <p className="text-2xl sm:text-3xl font-bold text-gray-400">0</p>;
                            }
                            return (
                                <div className="max-h-32 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {activeCenters.map(c => (
                                        <div key={c.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCenterChange(c.name);
                                                setActiveTab('approvals');
                                            }}
                                            className="flex justify-between items-center text-[11px] sm:text-sm p-1.5 rounded hover:bg-orange-100/50 cursor-pointer transition-colors group/item">
                                            <span className="font-medium text-gray-700 truncate mr-2 group-hover/item:text-orange-800">{c.name}</span>
                                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{c.pendingCount}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div
                    onClick={() => setActiveTab('registrations')}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex items-start cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mr-4 sm:mr-5 flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <Users className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
                    </div>
                    <div className="w-full">
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New Registrations</p>
                        {(() => {
                            const activeCenters = managedCenters.filter(c => (c.pendingRegCount || 0) > 0);
                            if (activeCenters.length === 0) {
                                return <p className="text-2xl sm:text-3xl font-bold text-gray-400">0</p>;
                            }
                            return (
                                <div className="max-h-32 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {activeCenters.map(c => (
                                        <div key={c.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCenterChange(c.name);
                                                setActiveTab('registrations');
                                            }}
                                            className="flex justify-between items-center text-[11px] sm:text-sm p-1.5 rounded hover:bg-emerald-100/50 cursor-pointer transition-colors group/item">
                                            <span className="font-medium text-gray-700 truncate mr-2 group-hover/item:text-emerald-800">{c.name}</span>
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{c.pendingRegCount}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div
                    onClick={() => setActiveTab('service-team')}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex items-center cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-teal-50 rounded-2xl flex items-center justify-center mr-4 sm:mr-5 group-hover:bg-teal-100 transition-colors">
                        <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Team</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Management roles</p>
                    </div>
                </div>

                <div
                    onClick={() => router.push('/dashboard/project-manager/sadhana-report')}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex items-center cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-amber-50 rounded-2xl flex items-center justify-center mr-4 sm:mr-5 group-hover:bg-amber-100 transition-colors">
                        <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Spiritual Progress</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Sadhana Report</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl w-fit border border-gray-200/50 shadow-sm">
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'approvals'
                            ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                    >
                        <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Spiritual Approval
                    </button>
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'registrations'
                            ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                    >
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        New Dev Approval
                        {stats.newRegistrations > 0 && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 ml-1" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('user-management')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'user-management'
                            ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                    >
                        <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Management roles
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'approvals' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col items-stretch lg:flex-row lg:items-center justify-between gap-6 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 items-center overflow-x-auto no-scrollbar">
                                <div className="flex min-w-max gap-1">
                                    {(['pending', 'approved', 'rejected'] as const).map(status => {
                                        const isActive = approvalStatus === status;
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setApprovalStatus(status);
                                                    setSelectedRequestIds([]);
                                                }}
                                                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isActive
                                                    ? 'bg-white text-gray-900 shadow-sm transform scale-[1.02]'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {approvalStatus === 'pending' && selectedRequestIds.length > 0 && (
                                <div className="flex items-center justify-between gap-4 bg-teal-600 p-2 pl-4 sm:pl-6 rounded-xl shadow-lg shadow-teal-200 animate-in zoom-in-95 duration-300">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedRequestIds.length} Selected</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openConfirmation('rejected')}
                                            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => openConfirmation('approved')}
                                            className="px-3 sm:px-4 py-2 bg-white text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loadingRequests ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <div className="animate-spin h-10 w-10 border-4 border-teal-100 border-t-teal-600 rounded-full mb-4"></div>
                                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving requests...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
                                <div className="bg-gray-50 h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <History className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Queue Clear</h3>
                                <p className="text-gray-500 font-medium mt-2 max-w-sm mx-auto">No {approvalStatus} profile update requests found for {currentCenter}.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {approvalStatus === 'pending' && requests.length > 0 && (
                                    <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${selectedRequestIds.length === requests.length && requests.length > 0 ? 'bg-teal-600 border-teal-600 shadow-sm' : 'border-gray-300 hover:border-teal-400'}`}
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedRequestIds.length === requests.length && requests.length > 0 && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                                        </div>
                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                            {selectedRequestIds.length === 0 ? 'Select All Requests' : `Batch Management (${selectedRequestIds.length})`}
                                        </span>
                                    </div>
                                )}

                                {requests.map(request => {
                                    const isExpanded = expandedRequestId === request.id;
                                    const changeCount = Object.keys(request.requested_changes).length;

                                    return (
                                        <div key={request.id} className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-teal-300 shadow-xl ring-4 ring-teal-500/10' : 'border-gray-200 shadow-sm hover:border-teal-200 hover:shadow-md'}`}>
                                            <div
                                                className={`p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 cursor-pointer transition-colors ${isExpanded ? 'bg-teal-50/30' : 'hover:bg-gray-50/50'}`}
                                                onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                                            >
                                                <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                                                    {approvalStatus === 'pending' && (
                                                        <div
                                                            className="flex-shrink-0"
                                                            onClick={(e) => { e.stopPropagation(); toggleSelection(request.id); }}
                                                        >
                                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${selectedRequestIds.includes(request.id) ? 'bg-teal-600 border-teal-600 shadow-md rotate-0' : 'border-gray-300 hover:border-teal-400 bg-white rotate-12 hover:rotate-0'}`}>
                                                                {selectedRequestIds.includes(request.id) && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                                                        <div className={`p-3 rounded-xl shadow-inner flex-shrink-0 ${request.status === 'pending' ? 'bg-amber-100 text-amber-600' : request.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                            {request.status === 'pending' ? <Clock className="h-5 w-5 stroke-[2.5px]" /> : request.status === 'approved' ? <Check className="h-5 w-5 stroke-[2.5px]" /> : <X className="h-5 w-5 stroke-[2.5px]" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm sm:text-base font-black text-gray-900 tracking-tight group-hover:text-teal-700 transition-colors uppercase truncate">{request.user?.name || 'Unknown Identity'}</h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Calendar className="h-3 w-3" /> {new Date(request.created_at).toLocaleDateString()}
                                                                </p>
                                                                <div className="hidden xs:block h-1 w-1 rounded-full bg-gray-300" />
                                                                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
                                                                    <Mail className="h-3 w-3" /> {request.user?.email || 'OFFLINE'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-gray-100 md:border-0 pt-4 md:pt-0">
                                                    <div className="px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                                                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                                            {changeCount} Delta{changeCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    <div className={`p-2 rounded-lg border transition-all ${isExpanded ? 'bg-teal-600 border-teal-600 text-white rotate-180 shadow-md' : 'bg-white border-gray-200 text-gray-400 group-hover:border-teal-300 group-hover:text-teal-600'}`}>
                                                        <ChevronDown className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </div>


                                            {
                                                isExpanded && (
                                                    <div className="p-5 sm:p-8 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                                            <div>
                                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                                    <History className="h-4 w-4 text-teal-500" /> Modification Audit
                                                                </h4>
                                                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Review proposed changes</p>
                                                            </div>
                                                            {approvalStatus === 'pending' && (
                                                                <div className="flex bg-gray-200 p-1 rounded-lg border border-gray-300">
                                                                    <button
                                                                        onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: [] }))}
                                                                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-600 transition-colors"
                                                                    >
                                                                        Reject All
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: Object.keys(request.requested_changes) }))}
                                                                        className="px-3 py-1.5 bg-white text-[10px] font-black uppercase tracking-widest text-teal-700 rounded shadow-sm hover:shadow transition-all"
                                                                    >
                                                                        Sync All
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-3 mb-8 bg-white rounded-xl border border-gray-200 p-4">
                                                            {Object.keys(request.requested_changes).map(key =>
                                                                renderFieldChange(request.id, key, request.requested_changes[key], request.current_values[key])
                                                            )}
                                                        </div>

                                                        {request.status === 'pending' ? (
                                                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Feedback & Rationale</label>
                                                                    <textarea
                                                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-teal-200 focus:ring-4 focus:ring-teal-500/10 outline-none font-medium transition-all resize-none text-gray-700 text-sm"
                                                                        rows={2}
                                                                        placeholder="Optional notes..."
                                                                        value={feedback}
                                                                        onChange={(e) => setFeedback(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col sm:flex-row justify-end gap-4">
                                                                    <button
                                                                        onClick={() => openConfirmation('rejected', request.id)}
                                                                        disabled={!feedback.trim()}
                                                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${!feedback.trim() ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-red-600 border-red-100 hover:bg-red-50'}`}
                                                                    >
                                                                        <X className="h-4 w-4 stroke-[3px]" /> Reject
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openConfirmation('approved', request.id)}
                                                                        disabled={selectedFields[request.id] && selectedFields[request.id].length === 0}
                                                                        className="px-6 py-3 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-200 hover:shadow-xl hover:bg-teal-700 transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                                                    >
                                                                        <Check className="h-4 w-4 stroke-[3px]" />
                                                                        {selectedFields[request.id]?.length === changeCount || !selectedFields[request.id]
                                                                            ? 'Approve Full Identity'
                                                                            : `Authorize ${selectedFields[request.id]?.length} Deltas`}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`h-3 w-3 rounded-full ${request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                        <p className="text-lg font-black text-gray-900 tracking-tight uppercase">Request {request.status}</p>
                                                                    </div>
                                                                </div>
                                                                {request.admin_feedback && (
                                                                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 italic text-sm text-gray-500 font-medium">
                                                                        <span className="font-bold text-gray-400 not-italic mr-2">Feedback:</span>
                                                                        &quot;{request.admin_feedback}&quot;
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'registrations' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Status Filter & Bulk Actions */}
                        <div className="flex flex-col items-stretch lg:flex-row lg:items-center justify-between gap-6 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <Users className="h-6 w-6 text-orange-600" />
                                New Dev Approvals
                            </h2>

                            {selectedPendingUserIds.length > 0 && (
                                <div className="flex items-center justify-between gap-4 bg-teal-600 p-2 pl-4 sm:pl-6 rounded-xl shadow-lg shadow-teal-200 animate-in zoom-in-95 duration-300">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedPendingUserIds.length} Selected</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setVerificationAction('rejected');
                                                setVerificationMode('bulk');
                                                setShowRejectionModal(true);
                                            }}
                                            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVerificationAction('approved');
                                                setVerificationMode('bulk');
                                                setConfirmation({
                                                    isOpen: true,
                                                    type: 'approved',
                                                    count: selectedPendingUserIds.length
                                                });
                                            }}
                                            className="px-3 sm:px-4 py-2 bg-white text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loadingPendingUsers ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <div className="animate-spin h-10 w-10 border-4 border-teal-100 border-t-teal-600 rounded-full mb-4"></div>
                                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving registrations...</p>
                            </div>
                        ) : pendingUsers.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
                                <div className="bg-gray-50 h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <Users className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">All caught up!</h3>
                                <p className="text-gray-500 font-medium max-w-xs mx-auto mt-2 text-sm">No pending user registrations for {currentCenter} at the moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Mobile Card View */}
                                <div className="lg:hidden space-y-4">
                                    {pendingUsers.map((user) => (
                                        <div key={user.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPendingUserIds.includes(user.id)}
                                                    onChange={() => {
                                                        setSelectedPendingUserIds(prev =>
                                                            prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                                        );
                                                    }}
                                                    className="w-5 h-5 rounded-md border-gray-300 text-teal-600"
                                                />
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black text-gray-900 truncate">{user.name}</h4>
                                                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-gray-100">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Center Info</p>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-gray-700 truncate">{(user.hierarchy?.currentTemple as any)?.name || user.hierarchy?.currentTemple || 'N/A'}</span>
                                                        <span className="text-[10px] font-bold text-teal-600 truncate">{(user.hierarchy?.currentCenter as any)?.name || user.hierarchy?.currentCenter || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Spiritual</p>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-orange-600 truncate">
                                                            {(() => {
                                                                const counselor = (user.hierarchy?.counselor as any)?.name || user.hierarchy?.counselor || user.hierarchy?.grihasthaCounselor || user.hierarchy?.brahmachariCounselor;
                                                                return counselor === 'Other' ? `Other: ${user.hierarchy?.otherCounselor}` : (counselor || 'N/A');
                                                            })()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-blue-600 truncate">{user.hierarchy?.ashram || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setUserToVerify(user);
                                                        setVerificationAction('rejected');
                                                        setVerificationMode('single');
                                                        setShowRejectionModal(true);
                                                    }}
                                                    className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all border border-rose-100"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setUserToVerify(user);
                                                        setVerificationAction('approved');
                                                        setVerificationMode('single');
                                                        setConfirmation({
                                                            isOpen: true,
                                                            type: 'approved',
                                                            count: 1,
                                                            requestId: user.id
                                                        });
                                                    }}
                                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block bg-white rounded-[2rem] border border-gray-200 shadow-xl shadow-gray-100/50 overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPendingUserIds.length === pendingUsers.length && pendingUsers.length > 0}
                                                        onChange={() => {
                                                            if (selectedPendingUserIds.length === pendingUsers.length) setSelectedPendingUserIds([]);
                                                            else setSelectedPendingUserIds(pendingUsers.map(u => u.id));
                                                        }}
                                                        className="w-4 h-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                </th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Hierarchy</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Counselor & Ashram</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {pendingUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50/80 transition-all duration-300 group">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPendingUserIds.includes(user.id)}
                                                            onChange={() => {
                                                                setSelectedPendingUserIds(prev =>
                                                                    prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                                                );
                                                            }}
                                                            className="w-4 h-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-gray-900 tracking-tight">{user.name}</span>
                                                            <span className="text-xs font-bold text-gray-400">{user.email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                                <span className="text-[10px] font-black text-gray-500 tracking-tight">{(user.hierarchy?.currentTemple as any)?.name || user.hierarchy?.currentTemple || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                                <span className="text-[10px] font-bold text-gray-600 tracking-tight italic">{(user.hierarchy?.currentCenter as any)?.name || user.hierarchy?.currentCenter || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                                                <span className="text-[10px] font-black text-gray-500 tracking-tight">
                                                                    {(() => {
                                                                        const counselor = (user.hierarchy?.counselor as any)?.name || user.hierarchy?.counselor || user.hierarchy?.grihasthaCounselor || user.hierarchy?.brahmachariCounselor;
                                                                        const other = user.hierarchy?.otherCounselor;
                                                                        return counselor === 'Other' ? `Other: ${other}` : (counselor || 'N/A');
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                                <span className="text-[10px] font-bold text-gray-600 tracking-tight italic">{user.hierarchy?.ashram || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                                                            <button
                                                                onClick={() => {
                                                                    setUserToVerify(user);
                                                                    setVerificationAction('rejected');
                                                                    setVerificationMode('single');
                                                                    setShowRejectionModal(true);
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black transition-all active:scale-95 border border-rose-100"
                                                            >
                                                                <X className="h-3 w-3" />
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setUserToVerify(user);
                                                                    setVerificationAction('approved');
                                                                    setVerificationMode('single');
                                                                    setConfirmation({
                                                                        isOpen: true,
                                                                        type: 'approved',
                                                                        count: 1,
                                                                        requestId: user.id
                                                                    });
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black transition-all active:scale-95 border border-emerald-100"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                                Approve
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'user-management' && (
                    <div className="space-y-6">
                        {/* Search */}
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-4">
                            {users
                                .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                    u.email.toLowerCase().includes(userSearch.toLowerCase()))
                                .map((user) => (
                                    <div key={user.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-gray-900 truncate uppercase">{user.name}</h4>
                                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                            </div>
                                            <button
                                                className="p-2 bg-gray-50 text-gray-400 hover:text-teal-600 rounded-lg transition-colors"
                                                onClick={() => {
                                                    setUserForView(user);
                                                    setShowViewModal(true);
                                                }}
                                            >
                                                <Activity className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Roles</p>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {(Array.isArray(user.role) ? user.role : [user.role]).map((r: any, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded text-[10px] font-bold uppercase">
                                                        {getRoleDisplayName(r)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Center Post</label>
                                            <div className="mt-1 relative">
                                                {(() => {
                                                    const existingRoles = (Array.isArray(user.role) ? user.role : [user.role]).map((r: any) => Number(r));
                                                    const isLocked = existingRoles.some((r: number) => !MANAGEABLE_ROLES.some(mr => mr.value === r));

                                                    // Find current center post (first matching manageable role)
                                                    // Prioritize higher roles 29->17->1
                                                    // But actually we just find the one that exists in CENTER_POST_OPTIONS
                                                    // Sort user roles by value descending to pick "highest" post
                                                    const currentPost = existingRoles
                                                        .filter((r: number) => CENTER_POST_OPTIONS.some(o => o.value === r))
                                                        .sort((a: number, b: number) => b - a)[0] || 1;

                                                    if (isLocked) {
                                                        return (
                                                            <div className="w-full py-3 px-4 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold border border-gray-200 flex items-center justify-between">
                                                                <span>Locked (Higher Role)</span>
                                                                <Lock className="h-3 w-3" />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="relative">
                                                            <RoleMultiSelect
                                                                user={user}
                                                                currentRoles={existingRoles}
                                                                options={CENTER_POST_OPTIONS}
                                                                onUpdate={(newRoles) => handleInlineRoleUpdate(user, newRoles)}
                                                                isUpdating={updatingUserId === user.id}
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-1">VOICE group level</label>
                                            <div className="relative">
                                                <select
                                                    value={user.bv_group || ''}
                                                    onChange={(e) => handleAssignGroup(user.id, e.target.value)}
                                                    disabled={updatingGroupUserId === user.id}
                                                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-gray-50 disabled:opacity-70 transition-all cursor-pointer"
                                                >
                                                    <option value="">-- No Group Segment --</option>
                                                    {BV_GROUPS.map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    {updatingGroupUserId === user.id ? (
                                                        <div className="animate-spin h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-1">KC Status</label>
                                            <div className="relative">
                                                <select
                                                    value={user.hierarchy?.kcStatus || ''}
                                                    onChange={(e) => handleAssignKCStatus(user.id, e.target.value)}
                                                    disabled={updatingKCStatusUserId === user.id}
                                                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-gray-50 disabled:opacity-70 transition-all cursor-pointer"
                                                >
                                                    <option value="">-- No KC Status --</option>
                                                    {KC_STATUS_OPTIONS.map(status => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    {updatingKCStatusUserId === user.id ? (
                                                        <div className="animate-spin h-3.5 w-3.5 border-2 border-orange-500 border-t-transparent rounded-full" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">Center Post</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">VOICE group level</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">KC Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {users
                                        .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                            u.email.toLowerCase().includes(userSearch.toLowerCase()))
                                        .map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="ml-0">
                                                            <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(Array.isArray(user.role) ? user.role : [user.role]).map((r: any, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                                                {getRoleDisplayName(r)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="relative w-48 text-left">
                                                        {(() => {
                                                            const existingRoles = (Array.isArray(user.role) ? user.role : [user.role]).map((r: any) => Number(r));
                                                            const isLocked = existingRoles.some((r: number) => !MANAGEABLE_ROLES.some(mr => mr.value === r));

                                                            // Find current center post
                                                            const currentPost = existingRoles
                                                                .filter((r: number) => CENTER_POST_OPTIONS.some(o => o.value === r))
                                                                .sort((a: number, b: number) => b - a)[0] || 1;

                                                            if (isLocked) {
                                                                return (
                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                                        <Lock className="h-3 w-3" /> Locked
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="relative">
                                                                    <RoleMultiSelect
                                                                        user={user}
                                                                        currentRoles={existingRoles}
                                                                        options={CENTER_POST_OPTIONS}
                                                                        onUpdate={(newRoles) => handleInlineRoleUpdate(user, newRoles)}
                                                                        isUpdating={updatingUserId === user.id}
                                                                    />
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative w-full">
                                                        <select
                                                            value={user.bv_group || ''}
                                                            onChange={(e) => handleAssignGroup(user.id, e.target.value)}
                                                            disabled={updatingGroupUserId === user.id}
                                                            className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-gray-50 transition-all cursor-pointer hover:border-teal-300"
                                                        >
                                                            <option value="">- No Group -</option>
                                                            {BV_GROUPS.map(g => (
                                                                <option key={g} value={g}>{g}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            {updatingGroupUserId === user.id ? (
                                                                <div className="animate-spin h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative w-full">
                                                        <select
                                                            value={user.hierarchy?.kcStatus || ''}
                                                            onChange={(e) => handleAssignKCStatus(user.id, e.target.value)}
                                                            disabled={updatingKCStatusUserId === user.id}
                                                            className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-gray-50 transition-all cursor-pointer hover:border-orange-300"
                                                        >
                                                            <option value="">- No Status -</option>
                                                            {KC_STATUS_OPTIONS.map(status => (
                                                                <option key={status} value={status}>{status}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            {updatingKCStatusUserId === user.id ? (
                                                                <div className="animate-spin h-3.5 w-3.5 border-2 border-orange-500 border-t-transparent rounded-full" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        className="text-gray-400 hover:text-gray-600"
                                                        onClick={() => {
                                                            setUserForView(user);
                                                            setShowViewModal(true);
                                                        }}
                                                    >
                                                        <Activity className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'service-team' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-teal-100/50 overflow-hidden relative">
                            {/* Header Background */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 pointer-events-none" />

                            <div className="p-8 relative">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-teal-50 rounded-2xl">
                                        <ShieldCheck className="h-8 w-8 text-teal-600 stroke-[1.5px]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Service Team Structure</h3>
                                        <p className="text-gray-500 font-medium mt-1">Manage operational roles for {currentCenter}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {MANAGEABLE_ROLES.filter(r => r.value >= 17).map((role) => {
                                        const isMultiUser = [23, 25, 26, 31, 32, 33].includes(role.value);
                                        const idsCol = roleToColumnMap[role.value]?.replace('_id', '_ids');

                                        // Multi-user: read from _ids array
                                        const currentIds: string[] = isMultiUser
                                            ? ((currentCenterData as any)?.[idsCol] || [])
                                            : [];

                                        // Single-user: read legacy single ID column
                                        const currentHolderId = !isMultiUser
                                            ? ((currentCenterData as any)?.[roleToColumnMap[role.value]] || '')
                                            : '';

                                        const currentHolderName = !isMultiUser
                                            ? ((currentCenterData as any)?.[roleToColumnMap[role.value]?.replace('_id', '_name')] || '')
                                            : '';

                                        const isActive = isMultiUser ? currentIds.length > 0 : !!currentHolderId;

                                        return (
                                            <div key={role.value} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-5 hover:bg-white hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 text-gray-400 group-hover:bg-white group-hover:text-teal-500'}`}>
                                                            <Award className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-gray-900">{role.label}</h4>
                                                            {isMultiUser && (
                                                                <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">Multi-user</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isActive && (
                                                        <div className="px-2 py-1 bg-teal-100 text-teal-700 text-[10px] font-bold uppercase rounded-lg">
                                                            {isMultiUser ? `${currentIds.length} Assigned` : 'Active'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">Assigned To</label>

                                                    {isMultiUser ? (
                                                        // ---- Multi-checkbox list ----
                                                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 rounded-xl border border-gray-200 bg-white p-2">
                                                            {users.length === 0 ? (
                                                                <p className="text-[10px] text-gray-400 text-center py-3">No users in this center</p>
                                                            ) : (
                                                                users.map(u => {
                                                                    const checked = currentIds.includes(u.id);
                                                                    return (
                                                                        <label
                                                                            key={u.id}
                                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-teal-50 hover:bg-teal-100' : 'hover:bg-gray-50'} ${loadingStructure ? 'opacity-50 pointer-events-none' : ''}`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                disabled={loadingStructure}
                                                                                onChange={() => {
                                                                                    const newIds = checked
                                                                                        ? currentIds.filter(id => id !== u.id)
                                                                                        : [...currentIds, u.id];
                                                                                    handleStructureUpdateMulti(role.value, newIds);
                                                                                }}
                                                                                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                                            />
                                                                            <span className={`text-xs font-bold truncate ${checked ? 'text-teal-700' : 'text-gray-700'}`}>
                                                                                {u.name}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // ---- Single select dropdown ----
                                                        <div className="relative">
                                                            <select
                                                                className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-bold py-3 pl-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer hover:border-teal-200"
                                                                value={currentHolderId}
                                                                onChange={(e) => handleStructureUpdate(role.value, e.target.value)}
                                                                disabled={loadingStructure}
                                                            >
                                                                <option value="">-- No Assignment --</option>
                                                                {users.map(u => (
                                                                    <option key={u.id} value={u.id}>
                                                                        {u.name} ({getRoleDisplayName(getHighestRole(u.role))})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                                <ChevronDown className="h-4 w-4" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Current holder display for single-user */}
                                                    {!isMultiUser && currentHolderId && (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100">
                                                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                                            <span className="text-xs font-bold text-gray-600 truncate">{currentHolderName || 'Unknown User'}</span>
                                                        </div>
                                                    )}

                                                    {/* Assigned pills for multi-user */}
                                                    {isMultiUser && currentIds.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {currentIds.map(id => {
                                                                const u = users.find(x => x.id === id);
                                                                return (
                                                                    <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-700 rounded-full text-[10px] font-bold">
                                                                        <div className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                                                                        {u?.name || 'Unknown'}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal (Approvals) - MD Style */}
            {
                confirmation.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-white/20 animate-in zoom-in-95 duration-300">
                            <div className={`p-8 ${confirmation.type === 'approved' ? 'bg-gradient-to-br from-emerald-50 to-teal-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className={`p-4 rounded-2xl ${confirmation.type === 'approved' ? 'bg-white text-emerald-600 shadow-emerald-100' : 'bg-white text-red-600 shadow-red-100'} shadow-xl`}>
                                        {confirmation.type === 'approved' ? <Check className="h-8 w-8 stroke-[2.5px]" /> : <AlertCircle className="h-8 w-8 stroke-[2.5px]" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                            {confirmation.type === 'approved' ? 'Approve Updates?' : 'Reject Updates?'}
                                        </h3>
                                        <p className="text-gray-500 font-medium mt-1">
                                            You are about to {confirmation.type} <span className="text-gray-900 font-bold underline decoration-2 decoration-teal-400">{confirmation.count}</span> {activeTab === 'registrations' ? (confirmation.count === 1 ? 'user registration' : 'user registrations') : (confirmation.count === 1 ? 'profiled request' : 'profiled requests')}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-white space-y-4">
                                {confirmation.type === 'rejected' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                                        <textarea
                                            className="w-full px-4 py-3 text-sm bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-red-400 focus:bg-white outline-none transition-all resize-none"
                                            rows={3}
                                            placeholder="Please provide constructive feedback..."
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            if (activeTab === 'registrations') {
                                                if (verificationMode === 'single' && confirmation.requestId) {
                                                    handleUserVerification(confirmation.requestId, 'approved');
                                                } else {
                                                    handleBulkVerification('approved');
                                                }
                                                setConfirmation({ isOpen: false, type: null, count: 0 });
                                            } else {
                                                confirmAction();
                                            }
                                        }}
                                        disabled={confirmation.type === 'rejected' && !feedback.trim()}
                                        className={`w-full py-4 text-sm font-black text-white rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale ${confirmation.type === 'approved'
                                            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 shadow-emerald-200'
                                            : 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 shadow-red-200'
                                            }`}
                                    >
                                        {confirmation.type === 'approved' ? 'CONFIRM APPROVAL' : 'CONFIRM REJECTION'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmation({ isOpen: false, type: null, count: 0, requestId: null })}
                                        className="w-full py-4 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Rejection Modal (Registrations) - Redesigned to match MD style */}
            {
                showRejectionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                            <div className="p-8 sm:p-10 bg-gradient-to-br from-rose-600 to-red-700 text-white relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl" />
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl">
                                        <ShieldAlert className="h-8 w-8 text-white stroke-[2.5px]" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Access Denied</h3>
                                        <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mt-0.5">Identity Verification Failed</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 sm:p-10 space-y-8 bg-[#fffdfa]">
                                <div className="text-center">
                                    <p className="text-gray-500 font-medium">
                                        {verificationMode === 'single'
                                            ? `Rejecting registration for ${userToVerify?.name}.`
                                            : `Rejecting ${selectedPendingUserIds.length} selected registrations.`}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Rejection (Visible to User)</label>
                                    <textarea
                                        className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 outline-none font-medium transition-all shadow-inner resize-none text-gray-700"
                                        rows={4}
                                        placeholder="e.g., Profile photo missing or invalid temple center specified..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            if (verificationMode === 'single') handleUserVerification(userToVerify.id, 'rejected', rejectionReason);
                                            else handleBulkVerification('rejected', rejectionReason);
                                            setShowRejectionModal(false);
                                            setRejectionReason('');
                                        }}
                                        disabled={!rejectionReason.trim()}
                                        className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        Confirm Rejection
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowRejectionModal(false);
                                            setRejectionReason('');
                                        }}
                                        className="w-full py-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"
                                    >
                                        Return to Review
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View User Modal */}
            <UserDetailModal
                user={userForView}
                isOpen={showViewModal}
                onClose={() => {
                    setShowViewModal(false);
                    setUserForView(null);
                }}
            />
        </div >
    );
}

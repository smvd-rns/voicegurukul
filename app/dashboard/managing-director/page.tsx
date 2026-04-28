'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';
import {
    Activity, Building2, Users, FileCheck, Search, Plus, Trash2,
    MapPin, UserCheck, X, Check, AlertCircle, Eye, Home,
    ChevronDown, ChevronUp, History, ArrowRight, Clock, Mail, Calendar, Shield, Filter, Phone, Heart,
    ChevronRight, ShieldAlert, Quote, ShieldCheck, AlertTriangle, Award, Lock, Edit, Loader2
} from 'lucide-react';
import { getRoleDisplayName, getRoleHierarchyNumber, canAdminManageTarget } from '@/lib/utils/roles';
import { CenterData, addCenterToLocal, deleteCenterFromLocal } from '@/lib/data/local-centers';
import UserDetailModal from '@/components/dashboard/UserDetailModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { User } from '@/types';

// Reuse types/interfaces where possible or define locally if specific to this view
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

const CAMP_OPTIONS = [
    { label: 'DYS', value: 'campDys' },
    { label: 'Sankalpa', value: 'campSankalpa' },
    { label: 'Sphurti', value: 'campSphurti' },
    { label: 'Utkarsh', value: 'campUtkarsh' },
    { label: 'SRCGD Workshop', value: 'campSrcgdWorkshop' },
    { label: 'Nishtha', value: 'campNishtha' },
    { label: 'FTEC', value: 'campFtec' },
    { label: 'Ashraya', value: 'campAshraya' },
    { label: 'MTEC', value: 'campMtec' },
    { label: 'Sharanagati', value: 'campSharanagati' },
    { label: 'IDC', value: 'campIdc' },
    { label: 'Royal', value: 'royal' },
];

const MANAGEABLE_ROLES = [
    { label: 'Director', value: 12 },
    { label: 'Central VOICE Manager', value: 13 },
    { label: 'Project Advisor', value: 14 },
    { label: 'Project Manager', value: 15 },
    { label: 'Acting Manager', value: 16 },
    { label: 'OC', value: 17 },
    { label: 'Student', value: 1 },
];

export default function ManagingDirectorDashboard() {
    const { userData } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'centers' | 'user-management' | 'approvals' | 'registrations'>('centers');

    // Centers State
    const [centers, setCenters] = useState<CenterData[]>([]);
    const [loadingCenters, setLoadingCenters] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddCenterModal, setShowAddCenterModal] = useState(false);
    const [newCenter, setNewCenter] = useState<{
        name: string;
        address: string;
        contact: string;
        projectManagerId: string;
        projectAdvisorId: string;
        actingManagerId: string;
        internalManagerId: string;
        preachingCoordinatorIds: string[];
        morningProgramInChargeId: string;
        mentorIds: string[];
        frontlinerIds: string[];
        accountantId: string;
        kitchenHeadId: string;
        studyInChargeId: string;
        grihsthaCounselorIds: string[];
        easyInchargeIds: string[];
        prernaInchargeIds: string[];
        ocId: string;
    }>({
        name: '',
        address: '',
        contact: '',
        projectManagerId: '',
        projectAdvisorId: '',
        actingManagerId: '',
        internalManagerId: '',
        preachingCoordinatorIds: [] as string[],
        morningProgramInChargeId: '',
        mentorIds: [] as string[],
        frontlinerIds: [] as string[],
        accountantId: '',
        kitchenHeadId: '',
        studyInChargeId: '',
        grihsthaCounselorIds: [] as string[],
        easyInchargeIds: [] as string[],
        prernaInchargeIds: [] as string[],
        ocId: ''
    });

    // Edit Center State
    const [showEditCenterModal, setShowEditCenterModal] = useState(false);
    const [editingCenter, setEditingCenter] = useState<{
        id: string;
        name: string;
        address: string;
        contact: string;
        projectManagerId: string;
        projectAdvisorId: string;
        actingManagerId: string;
        internalManagerId: string;
        preachingCoordinatorIds: string[];
        morningProgramInChargeId: string;
        mentorIds: string[];
        frontlinerIds: string[];
        accountantId: string;
        kitchenHeadId: string;
        studyInChargeId: string;
        grihsthaCounselorIds: string[];
        easyInchargeIds: string[];
        prernaInchargeIds: string[];
        ocId: string;
    } | null>(null);

    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [selectedCenter, setSelectedCenter] = useState('');
    const [selectedCamp, setSelectedCamp] = useState('');
    const [selectedRole, setSelectedRole] = useState<number | ''>('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [pendingAdminRole, setPendingAdminRole] = useState<number | null>(null);
    const [pendingSpiritualRole, setPendingSpiritualRole] = useState<number | 'none'>('none');
    const [updatingGroupUserId, setUpdatingGroupUserId] = useState<string | null>(null);
    const [updatingKCStatusUserId, setUpdatingKCStatusUserId] = useState<string | null>(null);
    const BV_GROUPS = ['Yudhishthira', 'Bhima', 'Arjuna', 'Nakula', 'Sahadeva'];
    const KC_STATUS_OPTIONS = ['Active', 'Passive', 'Dormant'];

    // --- Counselor Assignment States ---
    const [showCounselorModal, setShowCounselorModal] = useState(false);
    const [counselorActionUser, setCounselorActionUser] = useState<any>(null);
    const [counselorActionType, setCounselorActionType] = useState<'assign' | 'revoke'>('assign');
    const [selectedCounselorRole, setSelectedCounselorRole] = useState<'counselor' | 'care_giver'>('counselor');
    const [isProcessingCounselor, setIsProcessingCounselor] = useState(false);
    const [pendingCenters, setPendingCenters] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Approvals State
    const [requests, setRequests] = useState<ProfileRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [feedback, setFeedback] = useState('');
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        type: 'approved' | 'rejected' | null;
        count: number;
        requestId?: string | null;
    }>({ isOpen: false, type: null, count: 0, requestId: null });
    const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
    const [selectedPendingUserIds, setSelectedPendingUserIds] = useState<string[]>([]);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [userToVerify, setUserToVerify] = useState<any | null>(null);
    const [verificationAction, setVerificationAction] = useState<'approved' | 'rejected' | null>(null);
    const [verificationMode, setVerificationMode] = useState<'single' | 'bulk'>('single');

    // View User State
    const [showViewModal, setShowViewModal] = useState(false);
    const [userForView, setUserForView] = useState<User | null>(null);

    const ADMIN_ROLES = [8, 11, 12, 13, 21];
    const isMD = (Array.isArray(userData?.role) ? userData.role : [userData?.role]).some(r =>
        ADMIN_ROLES.includes(Number(r)) ||
        ['managing_director', 'super_admin', 'director', 'central_voice_manager', 'youth_preacher'].includes(String(r))
    );

    // Temple Details State
    const [templeDetails, setTempleDetails] = useState<any>(null);
    const [assignedTemples, setAssignedTemples] = useState<any[]>([]);
    const [selectedTemple, setSelectedTemple] = useState<any>(null);
    const [loadingAssignments, setLoadingAssignments] = useState(true);

    // Derived State
    const currentTemple = selectedTemple?.name || '';

    // Dashboard Stats State
    const [stats, setStats] = useState({
        centers: 0,
        devotees: 0,
        pendingProfiles: 0,
        newRequests: 0,
        pendingBreakdown: [] as { name: string, count: number }[],
        pendingRegBreakdown: [] as { name: string, count: number }[],
        loading: true
    });

    // Data Mapping Helper
    const mapUserData = (user: any): User => {
        const normalizedRole = Array.isArray(user.role) ? user.role : [user.role || 1];

        const hierarchy = {
            ...(user.hierarchy || {}),
            currentTemple: user.current_temple || user.hierarchy?.currentTemple,
            currentCenter: user.current_center || user.hierarchy?.currentCenter,
            center: user.center || user.hierarchy?.center,
            counselor: user.counselor || user.hierarchy?.counselor,
            otherCenter: user.other_center || user.hierarchy?.otherCenter,
            otherTemple: user.other_temple || user.hierarchy?.otherTemple,
            otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
            ashram: user.ashram || user.hierarchy?.ashram,
        };

        const mapped: User = {
            ...user,
            birthDate: user.birth_date,
            role: normalizedRole,
            hierarchy: hierarchy,
            // Map Education (edu_1_*)
            education: (() => {
                const eduArray = [];
                for (let i = 1; i <= 5; i++) {
                    const inst = user[`edu_${i}_institution`];
                    const field = user[`edu_${i}_field`];
                    const year = user[`edu_${i}_year`];
                    if (inst || field) {
                        eduArray.push({
                            institution: inst || '',
                            field: field || '',
                            year: year || null,
                        });
                    }
                }
                return eduArray.length > 0 ? eduArray : undefined;
            })(),
            // Map Work Experience (work_1_*)
            workExperience: (() => {
                const workArray = [];
                for (let i = 1; i <= 5; i++) {
                    const company = user[`work_${i}_company`];
                    const position = user[`work_${i}_position`];
                    const startDate = user[`work_${i}_start_date`];
                    const endDate = user[`work_${i}_end_date`];
                    const current = user[`work_${i}_current`];
                    if (company || position) {
                        workArray.push({
                            company: company || '',
                            position: position || '',
                            startDate: startDate || null,
                            endDate: endDate || null,
                            current: current || false,
                        });
                    }
                }
                return workArray.length > 0 ? workArray : undefined;
            })(),
            // Ensure camp completion fields are mapped correctly if they differ in casing
            campDys: user.camp_dys ?? user.campDys,
            campSankalpa: user.camp_sankalpa ?? user.campSankalpa,
            campSphurti: user.camp_sphurti ?? user.campSphurti,
            campUtkarsh: user.camp_utkarsh ?? user.campUtkarsh,
            campSrcgdWorkshop: user.camp_srcgd_workshop ?? user.campSrcgdWorkshop,
            campNishtha: user.camp_nishtha ?? user.camp_nistha ?? user.campNishtha ?? user.campNistha,
            campFtec: user.camp_ftec ?? user.campFtec,
            campAshraya: user.camp_ashraya ?? user.camp_ashray ?? user.campAshraya ?? user.campAshray,
            campMtec: user.camp_mtec ?? user.campMtec,
            campSharanagati: user.camp_sharanagati ?? user.campSharanagati,
            campIdc: user.camp_idc ?? user.campIdc,

            // Map Books
            spbookThirdSsr15: user.spbook_third_ssr_1_5 ?? user.spbookThirdSsr15,
            spbookThirdComingBack: user.spbook_third_coming_back ?? user.spbookThirdComingBack,
            spbookThirdPqpa: user.spbook_third_pqpa ?? user.spbookThirdPqpa,
            spbookThirdMatchlessGift: user.spbook_third_matchless_gift ?? user.spbookThirdMatchlessGift,
            spbookThirdRajaVidya: user.spbook_third_raja_vidya ?? user.spbookThirdRajaVidya,
            spbookThirdElevationKc: user.spbook_third_elevation_kc ?? user.spbookThirdElevationKc,
            spbookThirdBeyondBirthDeath: user.spbook_third_beyond_birth_death ?? user.spbookThirdBeyondBirthDeath,
            spbookThirdKrishnaReservoir: user.spbook_third_krishna_reservoir ?? user.spbookThirdKrishnaReservoir,

            spbookFourthSsr68: user.spbook_fourth_ssr_6_8 ?? user.spbookFourthSsr68,
            spbookFourthLawsOfNature: user.spbook_fourth_laws_of_nature ?? user.spbookFourthLawsOfNature,
            spbookFourthDharma: user.spbook_fourth_dharma ?? user.spbookFourthDharma,
            spbookFourthSecondChance: user.spbook_fourth_second_chance ?? user.spbookFourthSecondChance,
            spbookFourthIsopanishad110: user.spbook_fourth_isopanishad_1_10 ?? user.spbookFourthIsopanishad110,
            spbookFourthQueenKuntiVideo: user.spbook_fourth_queen_kunti_video ?? user.spbookFourthQueenKuntiVideo,
            spbookFourthEnlightenmentNatural: user.spbook_fourth_enlightenment_natural ?? user.spbookFourthEnlightenmentNatural,
            spbookFourthKrishnaBook121: user.spbook_fourth_krishna_book_1_21 ?? user.spbookFourthKrishnaBook121,

            spbookFifthLifeFromLife: user.spbook_fifth_life_from_life ?? user.spbookFifthLifeFromLife,
            spbookFifthPrahladTeachings: user.spbook_fifth_prahlad_teachings ?? user.spbookFifthPrahladTeachings,
            spbookFifthJourneySelfDiscovery: user.spbook_fifth_journey_self_discovery ?? user.spbookFifthJourneySelfDiscovery,
            spbookFifthQueenKuntiHearing: user.spbook_fifth_queen_kunti_hearing ?? user.spbookFifthQueenKuntiHearing,
            spbookFifthLordKapila: user.spbook_fifth_lord_kapila ?? user.spbookFifthLordKapila,
            spbookFifthNectar16: user.spbook_fifth_nectar_1_6 ?? user.spbookFifthNectar16,
            spbookFifthGita16: user.spbook_fifth_gita_1_6 ?? user.spbookFifthGita16,
            spbookFifthKrishnaBook2428: user.spbook_fifth_krishna_book_24_28 ?? user.spbookFifthKrishnaBook2428,

            spbookSixthNectar711: user.spbook_sixth_nectar_7_11 ?? user.spbookSixthNectar711,
            spbookSixthPathPerfection: user.spbook_sixth_path_perfection ?? user.spbookSixthPathPerfection,
            spbookSixthCivilisationTranscendence: user.spbook_sixth_civilisation_transcendence ?? user.spbookSixthCivilisationTranscendence,
            spbookSixthHareKrishnaChallenge: user.spbook_sixth_hare_krishna_challenge ?? user.spbookSixthHareKrishnaChallenge,
            spbookSixthGita712: user.spbook_sixth_gita_7_12 ?? user.spbookSixthGita712,
            spbookSixthSb1stCanto16: user.spbook_sixth_sb_1st_canto_1_6 ?? user.spbookSixthSb1stCanto16,
            spbookSixthKrishnaBook3559: user.spbook_sixth_krishna_book_35_59 ?? user.spbookSixthKrishnaBook3559,

            spbookSeventhGita1318: user.spbook_seventh_gita_13_18 ?? user.spbookSeventhGita1318,
            spbookSeventhSb1stCanto713: user.spbook_seventh_sb_1st_canto_7_13 ?? user.spbookSeventhSb1stCanto713,
            spbookSeventhKrishnaBook6378: user.spbook_seventh_krishna_book_63_78 ?? user.spbookSeventhKrishnaBook6378,

            spbookEighthSb1stCanto1419: user.spbook_eighth_sb_1st_canto_14_19 ?? user.spbookEighthSb1stCanto1419,
            spbookEighthKrishnaBook7889: user.spbook_eighth_krishna_book_78_89 ?? user.spbookEighthKrishnaBook7889,

            // Relative contact fields
            relative1Name: user.relative_1_name,
            relative1Relationship: user.relative_1_relationship,
            relative1Phone: user.relative_1_phone,
            relative2Name: user.relative_2_name,
            relative2Relationship: user.relative_2_relationship,
            relative2Phone: user.relative_2_phone,
            relative3Name: user.relative_3_name,
            relative3Relationship: user.relative_3_relationship,
            relative3Phone: user.relative_3_phone,
            introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
            createdAt: user.created_at ? new Date(user.created_at) : new Date(),
            // Health fields
            healthChronicDisease: user.health_chronic_disease,
        };

        return mapped;
    };

    const loadStats = useCallback(async (tName: string) => {
        if (!supabase || !tName) return;

        try {
            // Get session for API calls
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            // Run major count queries in parallel
            const [centersCount, devoteesCount, newRequestsStats] = await Promise.all([
                // Centers count
                supabase.from('centers').select('*', { count: 'exact', head: true }).eq('temple_name', tName).then(res => res.count || 0),

                // Devotees count (filtered in memory for accuracy with hierarchy)
                supabase.from('users').select('current_temple, hierarchy').eq('verification_status', 'approved').then(({ data }) => {
                    return (data || []).filter((u: any) => {
                        const uH = u.hierarchy as any;
                        const uTemple = u.current_temple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '');
                        return uTemple === tName;
                    }).length;
                }),

                // New Requests count (registrations)
                supabase.from('users').select('current_temple, hierarchy').eq('verification_status', 'pending').then(({ data, error }) => {
                    if (error) {
                        console.error('[Stats] New Requests DB Error:', error);
                        return { count: 0, breakdown: [] };
                    }

                    const allPending = data || [];

                    // Filter for current temple
                    const countForCurrent = allPending.filter((u: any) => {
                        const uH = u.hierarchy as any;
                        const uTemple = u.current_temple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '');
                        return uTemple === tName;
                    }).length;

                    // Breakdown for all temples
                    const countsMap: Record<string, number> = {};
                    allPending.forEach((u: any) => {
                        const uH = u.hierarchy as any;
                        const uTemple = u.current_temple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '');
                        if (uTemple) {
                            countsMap[uTemple] = (countsMap[uTemple] || 0) + 1;
                        }
                    });

                    const breakdownList = Object.entries(countsMap)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count);

                    return { count: countForCurrent, breakdown: breakdownList };
                })
            ]);

            const newRequestsCount = newRequestsStats.count;
            const regBreakdown = newRequestsStats.breakdown;

            // Fetch ALL pending profile requests once to build the breakdown (Efficient for MDs)
            let pendingProfilesCount = 0;
            let breakdown: { name: string, count: number }[] = [];

            if (token) {
                try {
                    // Fetch WITHOUT temple filter to get all managed requests
                    const res = await fetch(`/api/profile-requests?status=pending&_t=${Date.now()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();

                    if (data.success) {
                        const allPending = data.data || [];

                        // Calculate count for selected temple
                        pendingProfilesCount = allPending.filter((req: any) => {
                            const h = req.user?.hierarchy;
                            const reqTemple = h?.currentTemple?.name || (typeof h?.currentTemple === 'string' ? h?.currentTemple : '');
                            return reqTemple === tName;
                        }).length;

                        // Calculate breakdown for all temples
                        const counts: Record<string, number> = {};
                        allPending.forEach((req: any) => {
                            const h = req.user?.hierarchy;
                            const reqTemple = h?.currentTemple?.name || (typeof h?.currentTemple === 'string' ? h?.currentTemple : '');
                            if (reqTemple) {
                                counts[reqTemple] = (counts[reqTemple] || 0) + 1;
                            }
                        });

                        breakdown = Object.entries(counts)
                            .map(([name, count]) => ({ name, count }))
                            .sort((a, b) => b.count - a.count);
                    }
                } catch (err) {
                    console.error('[Stats] Profile Requests Fetch Error:', err);
                }
            }

            setStats({
                centers: centersCount,
                devotees: devoteesCount,
                pendingProfiles: pendingProfilesCount,
                newRequests: newRequestsCount,
                pendingBreakdown: breakdown,
                pendingRegBreakdown: regBreakdown,
                loading: false
            });

        } catch (error) {
            console.error('Error loading stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const loadCenters = useCallback(async () => {
        if (!supabase) return;
        setLoadingCenters(true);
        try {
            const tName = selectedTemple?.name;
            if (!tName) {
                setLoadingCenters(false);
                return;
            }

            const { data, error } = await supabase
                .from('centers')
                .select('*')
                .eq('temple_name', tName)
                .order('name');

            if (error) throw error;
            setCenters(data || []);
            // Update stats locally when we have the real data
            setStats(prev => ({ ...prev, centers: (data || []).length }));
        } catch (error) {
            console.error('Error loading centers:', error);
            toast.error('Failed to load centers');
        } finally {
            setLoadingCenters(false);
        }
    }, [selectedTemple?.name]);



    const handleAddCenter = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const h = userData?.hierarchy as any;
            const templeId = templeDetails?.id || h?.currentTemple?.id;
            const templeName = templeDetails?.name || h?.currentTemple?.name || (typeof h?.currentTemple === 'string' ? h?.currentTemple : '');
            const templeState = templeDetails?.state || h?.currentTemple?.state || 'Unknown';
            const templeCity = templeDetails?.city || h?.currentTemple?.city || 'Unknown';

            if (!templeName) {
                toast.error('Your profile is not linked to a temple.');
                return;
            }

            setIsSubmitting(true);

            if (!newCenter.projectManagerId) {
                toast.error('Project Manager is required');
                return;
            }

            // Find selected user names
            const selectedPM = users.find(u => u.id === newCenter.projectManagerId);
            const selectedPA = users.find(u => u.id === newCenter.projectAdvisorId);
            const selectedAM = users.find(u => u.id === newCenter.actingManagerId);

            const response = await fetch('/api/centers/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCenter.name,
                    address: newCenter.address,
                    contact: newCenter.contact,
                    temple_id: templeId,
                    temple_name: templeName,
                    state: templeState,
                    city: templeCity,
                    project_manager_id: newCenter.projectManagerId,
                    project_manager_name: selectedPM?.name,
                    project_advisor_id: newCenter.projectAdvisorId,
                    project_advisor_name: selectedPA?.name,
                    acting_manager_id: newCenter.actingManagerId,
                    acting_manager_name: selectedAM?.name,
                    internal_manager_id: newCenter.internalManagerId,
                    internal_manager_name: users.find(u => u.id === newCenter.internalManagerId)?.name,
                    preaching_coordinator_id: newCenter.preachingCoordinatorIds[0] || null,
                    preaching_coordinator_name: users.find(u => u.id === newCenter.preachingCoordinatorIds[0])?.name || null,
                    preaching_coordinator_ids: newCenter.preachingCoordinatorIds,
                    preaching_coordinator_names: newCenter.preachingCoordinatorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    morning_program_in_charge_id: newCenter.morningProgramInChargeId,
                    morning_program_in_charge_name: users.find(u => u.id === newCenter.morningProgramInChargeId)?.name,
                    mentor_ids: newCenter.mentorIds,
                    mentor_names: newCenter.mentorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    frontliner_ids: newCenter.frontlinerIds,
                    frontliner_names: newCenter.frontlinerIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    accountant_id: newCenter.accountantId,
                    accountant_name: users.find(u => u.id === newCenter.accountantId)?.name,
                    kitchen_head_id: newCenter.kitchenHeadId,
                    kitchen_head_name: users.find(u => u.id === newCenter.kitchenHeadId)?.name,
                    study_in_charge_name: users.find(u => u.id === newCenter.studyInChargeId)?.name,
                    grihstha_counselor_id: newCenter.grihsthaCounselorIds[0] || null,
                    grihstha_counselor_name: users.find(u => u.id === newCenter.grihsthaCounselorIds[0])?.name || null,
                    grihstha_counselor_ids: newCenter.grihsthaCounselorIds,
                    grihstha_counselor_names: newCenter.grihsthaCounselorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    easy_incharge_id: newCenter.easyInchargeIds[0] || null,
                    easy_incharge_name: users.find(u => u.id === newCenter.easyInchargeIds[0])?.name || null,
                    easy_incharge_ids: newCenter.easyInchargeIds,
                    easy_incharge_names: newCenter.easyInchargeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    prerna_incharge_id: newCenter.prernaInchargeIds[0] || null,
                    prerna_incharge_name: users.find(u => u.id === newCenter.prernaInchargeIds[0])?.name || null,
                    prerna_incharge_ids: newCenter.prernaInchargeIds,
                    prerna_incharge_names: newCenter.prernaInchargeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    oc_id: newCenter.ocId,
                    oc_name: users.find(u => u.id === newCenter.ocId)?.name
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success('Center added successfully');
            setShowAddCenterModal(false);
            setNewCenter({
                name: '', address: '', contact: '',
                projectManagerId: '', projectAdvisorId: '', actingManagerId: '',
                internalManagerId: '', preachingCoordinatorId: '', morningProgramInChargeId: '',
                mentorIds: [], frontlinerIds: [], accountantId: '', kitchenHeadId: '',
                studyInChargeId: '', grihsthaCounselorIds: [], easyInchargeIds: [], prernaInchargeIds: [], ocId: ''
            });
            loadCenters();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add center');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCenter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCenter) return;

        setIsSubmitting(true);

        try {
            const h = userData?.hierarchy as any;
            const templeId = templeDetails?.id || h?.currentTemple?.id;
            const templeName = templeDetails?.name || h?.currentTemple?.name || (typeof h?.currentTemple === 'string' ? h?.currentTemple : '');
            const templeState = templeDetails?.state || h?.currentTemple?.state || 'Unknown';
            const templeCity = templeDetails?.city || h?.currentTemple?.city || 'Unknown';

            // Find selected user names
            const selectedPM = users.find(u => u.id === editingCenter.projectManagerId);
            const selectedPA = users.find(u => u.id === editingCenter.projectAdvisorId);
            const selectedAM = users.find(u => u.id === editingCenter.actingManagerId);

            const response = await fetch('/api/centers/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingCenter.id,
                    name: editingCenter.name,
                    address: editingCenter.address,
                    contact: editingCenter.contact,
                    temple_id: templeId,
                    temple_name: templeName,
                    state: templeState,
                    city: templeCity,
                    project_manager_id: editingCenter.projectManagerId,
                    project_manager_name: selectedPM?.name,
                    project_advisor_id: editingCenter.projectAdvisorId,
                    project_advisor_name: selectedPA?.name,
                    acting_manager_id: editingCenter.actingManagerId,
                    acting_manager_name: selectedAM?.name,
                    internal_manager_id: editingCenter.internalManagerId,
                    internal_manager_name: users.find(u => u.id === editingCenter.internalManagerId)?.name,
                    preaching_coordinator_id: editingCenter.preachingCoordinatorIds[0] || null,
                    preaching_coordinator_name: users.find(u => u.id === editingCenter.preachingCoordinatorIds[0])?.name || null,
                    preaching_coordinator_ids: editingCenter.preachingCoordinatorIds,
                    preaching_coordinator_names: editingCenter.preachingCoordinatorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    morning_program_in_charge_id: editingCenter.morningProgramInChargeId,
                    morning_program_in_charge_name: users.find(u => u.id === editingCenter.morningProgramInChargeId)?.name,
                    mentor_ids: editingCenter.mentorIds,
                    mentor_names: editingCenter.mentorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    frontliner_ids: editingCenter.frontlinerIds,
                    frontliner_names: editingCenter.frontlinerIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    grihstha_counselor_id: editingCenter.grihsthaCounselorIds[0] || null,
                    grihstha_counselor_name: users.find(u => u.id === editingCenter.grihsthaCounselorIds[0])?.name || null,
                    grihstha_counselor_ids: editingCenter.grihsthaCounselorIds,
                    grihstha_counselor_names: editingCenter.grihsthaCounselorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    easy_incharge_id: editingCenter.easyInchargeIds[0] || null,
                    easy_incharge_name: users.find(u => u.id === editingCenter.easyInchargeIds[0])?.name || null,
                    easy_incharge_ids: editingCenter.easyInchargeIds,
                    easy_incharge_names: editingCenter.easyInchargeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    prerna_incharge_id: editingCenter.prernaInchargeIds[0] || null,
                    prerna_incharge_name: users.find(u => u.id === editingCenter.prernaInchargeIds[0])?.name || null,
                    prerna_incharge_ids: editingCenter.prernaInchargeIds,
                    prerna_incharge_names: editingCenter.prernaInchargeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
                    accountant_id: editingCenter.accountantId,
                    accountant_name: users.find(u => u.id === editingCenter.accountantId)?.name,
                    kitchen_head_id: editingCenter.kitchenHeadId,
                    kitchen_head_name: users.find(u => u.id === editingCenter.kitchenHeadId)?.name,
                    study_in_charge_id: editingCenter.studyInChargeId,
                    study_in_charge_name: users.find(u => u.id === editingCenter.studyInChargeId)?.name,
                    oc_id: editingCenter.ocId,
                    oc_name: users.find(u => u.id === editingCenter.ocId)?.name
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success('Center updated successfully');
            setShowEditCenterModal(false);
            setEditingCenter(null);
            loadCenters();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update center');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditCenterModal = (center: CenterData) => {
        setEditingCenter({
            id: center.id,
            name: center.name,
            address: center.address || '',
            contact: center.contact || '',
            projectManagerId: center.project_manager_id || '',
            projectAdvisorId: center.project_advisor_id || '',
            actingManagerId: center.acting_manager_id || '',
            internalManagerId: center.internal_manager_id || '',
            preachingCoordinatorIds: center.preaching_coordinator_ids || (center.preaching_coordinator_id ? [center.preaching_coordinator_id] : []),
            morningProgramInChargeId: center.morning_program_in_charge_id || '',
            mentorIds: center.mentor_ids || (center.mentor_id ? [center.mentor_id] : []),
            frontlinerIds: center.frontliner_ids || (center.frontliner_id ? [center.frontliner_id] : []),
            accountantId: center.accountant_id || '',
            kitchenHeadId: center.kitchen_head_id || '',
            studyInChargeId: center.study_in_charge_id || '',
            grihsthaCounselorIds: center.grihstha_counselor_ids || (center.grihstha_counselor_id ? [center.grihstha_counselor_id] : []),
            easyInchargeIds: center.easy_incharge_ids || (center.easy_incharge_id ? [center.easy_incharge_id] : []),
            prernaInchargeIds: center.prerna_incharge_ids || (center.prerna_incharge_id ? [center.prerna_incharge_id] : []),
            ocId: center.oc_id || ''
        });

        const missingUsers: any[] = [];
        const checkAndAdd = (id: string | undefined | null, name: string | undefined | null) => {
            if (id && name && !users.some(u => u.id === id)) {
                missingUsers.push({ id, name, email: name + ' (Unlinked User)' });
            }
        };

        checkAndAdd(center.project_manager_id, center.project_manager_name);
        checkAndAdd(center.project_advisor_id, center.project_advisor_name);
        checkAndAdd(center.acting_manager_id, center.acting_manager_name);
        checkAndAdd(center.internal_manager_id, center.internal_manager_name);
        if (center.preaching_coordinator_ids && center.preaching_coordinator_names && center.preaching_coordinator_ids.length === center.preaching_coordinator_names.length) {
             center.preaching_coordinator_ids.forEach((id, idx) => checkAndAdd(id, center.preaching_coordinator_names![idx]));
        } else {
             checkAndAdd(center.preaching_coordinator_id, center.preaching_coordinator_name);
        }

        if (center.grihstha_counselor_ids && center.grihstha_counselor_names && center.grihstha_counselor_ids.length === center.grihstha_counselor_names.length) {
             center.grihstha_counselor_ids.forEach((id, idx) => checkAndAdd(id, center.grihstha_counselor_names![idx]));
        } else {
             checkAndAdd(center.grihstha_counselor_id, center.grihstha_counselor_name);
        }

        if (center.easy_incharge_ids && center.easy_incharge_names && center.easy_incharge_ids.length === center.easy_incharge_names.length) {
             center.easy_incharge_ids.forEach((id, idx) => checkAndAdd(id, center.easy_incharge_names![idx]));
        } else {
             checkAndAdd(center.easy_incharge_id, center.easy_incharge_name);
        }

        if (center.prerna_incharge_ids && center.prerna_incharge_names && center.prerna_incharge_ids.length === center.prerna_incharge_names.length) {
             center.prerna_incharge_ids.forEach((id, idx) => checkAndAdd(id, center.prerna_incharge_names![idx]));
        } else {
             checkAndAdd(center.prerna_incharge_id, center.prerna_incharge_name);
        }
        checkAndAdd(center.morning_program_in_charge_id, center.morning_program_in_charge_name);
        checkAndAdd(center.accountant_id, center.accountant_name);
        checkAndAdd(center.kitchen_head_id, center.kitchen_head_name);
        checkAndAdd(center.study_in_charge_id, center.study_in_charge_name);
        checkAndAdd(center.oc_id, center.oc_name);

        if (center.mentor_ids && center.mentor_names && center.mentor_ids.length === center.mentor_names.length) {
             center.mentor_ids.forEach((id, idx) => checkAndAdd(id, center.mentor_names![idx]));
        } else if (center.mentor_id && center.mentor_name) {
             checkAndAdd(center.mentor_id, center.mentor_name);
        }

        if (center.frontliner_ids && center.frontliner_names && center.frontliner_ids.length === center.frontliner_names.length) {
             center.frontliner_ids.forEach((id, idx) => checkAndAdd(id, center.frontliner_names![idx]));
        } else if (center.frontliner_id && center.frontliner_name) {
             checkAndAdd(center.frontliner_id, center.frontliner_name);
        }

        if (missingUsers.length > 0) {
            setUsers(prev => [...prev, ...missingUsers]);
        }

        setShowEditCenterModal(true);
        // Ensure users are loaded for dropdowns
        if (users.length === 0) {
            loadUsers();
        }
    };
    const handleDeleteCenter = async (id: string) => {
        if (!confirm('Are you sure you want to delete this center?')) return;
        try {
            const success = await deleteCenterFromLocal(id);
            if (success) {
                toast.success('Center deleted');
                loadCenters();
            } else {
                toast.error('Failed to delete center');
            }
        } catch (e) {
            toast.error('Error deleting center');
        }
    };

    // --- Counselors Logic ---
    const loadUsers = useCallback(async () => {
        if (!supabase) return;
        setLoadingUsers(true);
        try {
            const templeName = selectedTemple?.name;
            if (!templeName) return;

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('verification_status', 'approved');

            const filtered = (data || []).filter((u: any) => {
                const uH = u.hierarchy as any;
                const uTemple = u.current_temple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '');
                return uTemple === templeName;
            });

            setUsers(filtered.map(mapUserData));
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    }, [selectedTemple?.name]);

    const handleOpenAssignModal = async (user: any) => {
        setSelectedUser(user);
        const roles = Array.isArray(user.role) ? user.role : [user.role];

        // Find current manageable roles
        const adminRole = roles.find((r: any) => [1, 12, 13, 14, 15, 16, 17].includes(Number(r)));
        const spiritualRole = roles.find((r: any) => [2, 20].includes(Number(r)));

        setPendingAdminRole(adminRole ? Number(adminRole) : null);
        setPendingSpiritualRole(spiritualRole ? Number(spiritualRole) : 'none');

        // Ensure centers are loaded
        if (centers.length === 0) {
            loadCenters();
        }

        // Reset and fetch current centers if applicable
        setPendingCenters([]);
        if (supabase) {
            const { data: centersData } = await supabase
                .from('user_centers')
                .select('center_id')
                .eq('user_id', user.id);

            if (centersData) {
                setPendingCenters(centersData.map(c => c.center_id));
            }
        }

        setShowAssignModal(true);
    };


    const handleAssignRole = async () => {
        if (!selectedUser || !supabase) return;
        const currentRoles = Array.isArray(selectedUser.role) ? selectedUser.role : [selectedUser.role];
        const currentAdminRole = currentRoles.find((r: any) => [1, 12, 13, 14, 15, 16, 17].includes(Number(r)));
        const currentSpiritualRole = currentRoles.find((r: any) => [2, 20].includes(Number(r)));

        // Fetch current centers to detect changes
        const { data: currentCentersData } = await supabase
            .from('user_centers')
            .select('center_id')
            .eq('user_id', selectedUser.id);

        const currentCenterIds = currentCentersData?.map(c => c.center_id) || [];
        const adminRoleId = Number(pendingAdminRole);
        const isMultiCenterRole = [14, 15, 16, 17].includes(adminRoleId);

        const centersChanged = isMultiCenterRole && (
            currentCenterIds.length !== pendingCenters.length ||
            !currentCenterIds.every(id => pendingCenters.includes(id))
        );

        const adminChanged = Number(currentAdminRole) !== Number(pendingAdminRole);
        const spiritualChanged = (currentSpiritualRole ? Number(currentSpiritualRole) : 'none') !== pendingSpiritualRole;

        if (!adminChanged && !spiritualChanged && !centersChanged) {
            setShowAssignModal(false);
            return;
        }

        // Validation: Must select at least one center for roles 14-17
        if (isMultiCenterRole && pendingCenters.length === 0) {
            toast.error('Please select at least one center for this role.');
            return;
        }

        try {
            // 1. Handle Admin Role Assignment (api/admin/assign-role)
            if (adminChanged || centersChanged) {
                const response = await fetch('/api/admin/assign-role', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                    },
                    body: JSON.stringify({
                        userId: selectedUser.id,
                        roleId: pendingAdminRole,
                        centerIds: isMultiCenterRole ? pendingCenters : []
                    })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
            }

            // 2. Handle Spiritual Role Assignment (api/admin/counselor-assignment)
            if (spiritualChanged) {
                const isRevoke = pendingSpiritualRole === 'none';
                const response = await fetch('/api/admin/counselor-assignment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                    },
                    body: JSON.stringify({
                        userId: selectedUser.id,
                        action: isRevoke ? 'revoke' : 'assign',
                        roleType: isRevoke ? 'counselor' : (pendingSpiritualRole === 2 ? 'counselor' : 'care_giver')
                    })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
            }

            toast.success('User authorities updated successfully');
            setShowAssignModal(false);
            loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'Update failed');
        }
    };

    const handleCounselorAction = async () => {
        if (!supabase || !counselorActionUser) return;
        setIsProcessingCounselor(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/admin/counselor-assignment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: counselorActionUser.id,
                    action: counselorActionType,
                    roleType: counselorActionType === 'assign' ? selectedCounselorRole : undefined
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(result.message);
                setShowCounselorModal(false);
                loadUsers(); // Refresh list to show new roles
            } else {
                toast.error(result.error || 'Action failed');
            }
        } catch (err) {
            console.error('Counselor Action Error:', err);
            toast.error('Failed to process counselor assignment');
        } finally {
            setIsProcessingCounselor(false);
        }
    };

    // --- New User Registrations Logic ---
    const loadPendingUsers = useCallback(async (tName: string = selectedTemple?.name) => {
        if (!supabase || !tName) return;
        setLoadingPendingUsers(true);
        try {

            // Fetch users with pending status
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('verification_status', 'pending');

            if (error) throw error;

            const filtered = (data || []).filter((u: any) => {
                const uH = u.hierarchy as any;
                const uTemple = u.current_temple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '');
                return uTemple === tName;
            });

            setPendingUsers(filtered.map(mapUserData));
        } catch (error) {
            console.error('Error loading pending users:', error);
            toast.error('Failed to load pending users');
        } finally {
            setLoadingPendingUsers(false);
        }
    }, [selectedTemple?.name]);

    const handleUserVerification = async (userId: string, status: 'approved' | 'rejected', reason?: string) => {
        if (!supabase) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'user',
                    id: userId,
                    action: status === 'approved' ? 'approve' : 'reject',
                    reason: reason
                })
            });

            const json = await response.json();
            if (json.success) {
                toast.success(`User ${status} successfully ${reason ? `(Reason: ${reason})` : ''}`);
                loadPendingUsers();
                loadStats(currentTemple);
                setSelectedPendingUserIds(prev => prev.filter(id => id !== userId));
            } else {
                toast.error(json.error || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error verifying user:', error);
            toast.error('Internal server error');
        }
    };

    const handleBulkVerification = async (status: 'approved' | 'rejected', reason?: string) => {
        if (!supabase || selectedPendingUserIds.length === 0) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/admin/verify-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'user',
                    ids: selectedPendingUserIds,
                    action: status === 'approved' ? 'approve' : 'reject',
                    reason: reason
                })
            });

            const json = await response.json();
            if (json.success) {
                toast.success(`${selectedPendingUserIds.length} users ${status} successfully`);
                loadPendingUsers();
                loadStats(currentTemple);
                setSelectedPendingUserIds([]);
            } else {
                toast.error(json.error || 'Failed to update users status');
            }
        } catch (error) {
            console.error('Error bulk verifying users:', error);
            toast.error('Internal server error');
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
    // --- Approvals Logic (Simplified from ProfileApprovalsPage) ---
    const loadRequests = useCallback(async () => {
        if (!supabase) return;
        setLoadingRequests(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) return;

            const response = await fetch(`/api/profile-requests?status=${approvalStatus}&temple=${encodeURIComponent(currentTemple)}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                // API now handles filtering and joining efficiently
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
    }, [approvalStatus, currentTemple]);

    // 0. Fetch Assignments
    useEffect(() => {
        if (!userData || !isMD || !supabase) return;

        const fetchAssignments = async () => {
            if (!supabase) return;
            setLoadingAssignments(true);
            const { data, error } = await supabase
                .from('temples')
                .select('*')
                .or(`managing_director_id.eq.${userData.id},director_id.eq.${userData.id},central_voice_manager_id.eq.${userData.id},yp_id.eq.${userData.id}`);

            if (data && data.length > 0) {
                setAssignedTemples(data);

                // Only set the default selectedTemple if one hasn't been set yet
                // This prevents the temple from resetting to default when switching tabs
                // IF the user has already manually selected a different temple.
                setSelectedTemple((prev: any) => {
                    if (prev) return prev; // Keep current selection if it exists

                    // Preference: If current profile temple is in assigned list, use it. Otherwise use first.
                    const profileTempleName = (userData.hierarchy as any)?.currentTemple?.name || (userData as any).current_temple;
                    const match = data.find(t => t.name === profileTempleName);
                    return match || data[0];
                });
            } else {
                // Fallback for transition period if no assignments yet but they have the role
                setSelectedTemple((prev: any) => {
                    if (prev) return prev;
                    const profileTempleName = (userData.hierarchy as any)?.currentTemple?.name || (userData as any).current_temple;
                    return profileTempleName ? { name: profileTempleName } : null;
                });
            }
            setLoadingAssignments(false);
        };

        fetchAssignments();
    }, [userData, isMD]);

    // 1. Load initial metadata and stats (only once or on temple change)
    useEffect(() => {
        if (!userData || !isMD || !selectedTemple) return;

        const tName = selectedTemple.name;
        setSelectedCenter(''); // Reset center filter when temple changes
        setUsers([]); // Clear users to prevent stale data in modals
        setCenters([]); // Clear centers to show loading state instead of old data

        if (tName) {
            // Load Temple Details
            const loadTempleDetailsData = async () => {
                if (!supabase) return;
                const { data, error } = await supabase
                    .from('temples')
                    .select('*')
                    .eq('name', tName)
                    .single();
                if (data) setTempleDetails(data);
            };
            loadTempleDetailsData();

            // Load Stats
            loadStats(tName);
        }

    }, [userData, isMD, selectedTemple, loadStats]);

    // 2. Load Tab Specific Data
    useEffect(() => {
        if (!userData || !isMD || !selectedTemple) {
            if (!isMD && userData) router.push('/dashboard');
            return;
        }

        if (activeTab === 'centers' || activeTab === 'user-management') loadCenters();
        if (activeTab === 'user-management') loadUsers();
        if (activeTab === 'approvals') loadRequests();
        if (activeTab === 'registrations') loadPendingUsers(selectedTemple.name);

    }, [activeTab, userData, isMD, approvalStatus, selectedTemple, router, loadCenters, loadUsers, loadRequests, loadPendingUsers]);

    // 3. Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [userSearch, selectedCenter, selectedCamp, selectedRole, itemsPerPage]);

    // 4. Load users when Add/Edit Center modal opens
    useEffect(() => {
        if ((showAddCenterModal || showEditCenterModal) && users.length === 0) {
            loadUsers();
        }
    }, [showAddCenterModal, showEditCenterModal, users.length, loadUsers]);

    // Final Filtered & Paged users for the management tab
    const filteredUsersList = users.filter(u => {
        const userRoles = Array.isArray(u.role) ? u.role : [u.role];
        const searchMatch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase());
        const uH = u.hierarchy as any;
        const uCenter = uH?.currentCenter || uH?.center || u.center || '';
        const centerMatch = !selectedCenter || uCenter === selectedCenter;
        const campMatch = !selectedCamp || (
            selectedCamp === 'royal'
                ? userRoles.some((r: any) => [17, 22, 23, 24, 25, 26].includes(getRoleHierarchyNumber(r)))
                : u[selectedCamp as keyof typeof u]
        );
        const roleMatch = !selectedRole || userRoles.some((r: any) => getRoleHierarchyNumber(r) === selectedRole);
        return searchMatch && centerMatch && campMatch && roleMatch;
    });

    const totalPages = Math.ceil(filteredUsersList.length / itemsPerPage);
    const pagedUsers = filteredUsersList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleApprovalAction = async (id: string, status: 'approved' | 'rejected', bulkIds?: string[]) => {
        if (!supabase) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) {
                toast.error('Session expired. Please login again.');
                return;
            }

            // Bulk Action logic
            if (bulkIds && bulkIds.length > 0) {
                const response = await fetch('/api/profile-requests/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        requestIds: bulkIds,
                        status,
                        feedback: status === 'rejected' ? (feedback || 'Bulk rejection') : undefined
                    })
                });

                const result = await response.json();
                if (result.success) {
                    toast.success(result.message || `Bulk ${status} successful`);
                    setRequests(prev => prev.filter(r => !bulkIds.includes(r.id)));
                    setSelectedRequestIds([]);
                    setFeedback('');
                    loadStats(currentTemple);
                } else {
                    toast.error(result.error || 'Bulk action failed');
                }
                return;
            }

            // Single Action logic
            const response = await fetch(`/api/profile-requests/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: status,
                    feedback: feedback,
                    approvedFields: status === 'approved' ? selectedFields[id] : undefined
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`Request ${status}`);
                setRequests(prev => prev.filter(r => r.id !== id));
                setFeedback('');
                setExpandedRequestId(null);
                loadStats(currentTemple);
            } else {
                toast.error(result.error || 'Action failed');
            }
        } catch (error) {
            console.error('Error processing request:', error);
            toast.error('Error processing request');
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

    // Main Render
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-20 relative overflow-x-hidden">
            {/* Premium Mesh Gradient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-[20%] right-[-5%] w-[35%] h-[35%] bg-amber-400/20 blur-[100px] rounded-full animate-pulse delay-700" />
                <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-rose-400/10 blur-[140px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Custom Confirmation Modal */}
            {confirmation.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className={`p-8 ${confirmation.type === 'approved' ? 'bg-gradient-to-br from-emerald-50 to-teal-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className={`p-4 rounded-2xl ${confirmation.type === 'approved' ? 'bg-[#fffdfa] text-emerald-600 shadow-emerald-100' : 'bg-[#fffdfa] text-red-600 shadow-red-100'} shadow-xl`}>
                                    {confirmation.type === 'approved' ? <Check className="h-8 w-8 stroke-[2.5px]" /> : <AlertCircle className="h-8 w-8 stroke-[2.5px]" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                        {confirmation.type === 'approved' ? 'Approve Updates?' : 'Reject Updates?'}
                                    </h3>
                                    <p className="text-gray-500 font-medium mt-1">
                                        You are about to {confirmation.type} <span className="text-gray-900 font-bold underline decoration-2 decoration-amber-400">{confirmation.count}</span> profiled {confirmation.count === 1 ? 'request' : 'requests'}.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-[#fffdfa] space-y-4">
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
                                    onClick={confirmAction}
                                    disabled={confirmation.type === 'rejected' && !feedback.trim()}
                                    className={`w-full py-4 text-sm font-black text-white rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale ${confirmation.type === 'approved'
                                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 shadow-emerald-200'
                                        : 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 shadow-red-200'
                                        }`}
                                >
                                    Confirm Action
                                </button>
                                <button
                                    onClick={() => setConfirmation({ isOpen: false, type: null, count: 0 })}
                                    className="w-full py-4 text-sm font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Header / Command Center */}
            <div className="relative z-10">
                <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 sm:p-3 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl shadow-lg shadow-primary-200 text-white flex-shrink-0">
                                    <Shield className="h-6 w-6 stroke-[2.5px]" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-tight">Administration</h1>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {assignedTemples.length > 1 ? (
                                            <select
                                                value={selectedTemple?.id || ''}
                                                onChange={(e) => {
                                                    const temple = assignedTemples.find(t => t.id === e.target.value);
                                                    if (temple) setSelectedTemple(temple);
                                                }}
                                                className="text-xs font-black text-primary-600 bg-transparent border-none focus:ring-0 cursor-pointer uppercase tracking-widest p-0 pr-6"
                                            >
                                                {assignedTemples.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                                                <Building2 className="h-3 w-3" /> {selectedTemple?.name || 'Loading...'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tab Switcher - Pill Design */}
                            <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50 backdrop-blur-sm shadow-inner overflow-x-auto no-scrollbar scroll-smooth">
                                <div className="flex min-w-max sm:min-w-0 p-0.5 gap-1">
                                    {(['centers', 'user-management', 'approvals', 'registrations'] as const).map(tab => {
                                        const isActive = activeTab === tab;
                                        return (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${isActive
                                                    ? 'bg-white text-primary-600 shadow-md transform scale-[1.02]'
                                                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'
                                                    }`}
                                            >
                                                {tab === 'user-management' ? 'Devotee Management' : tab === 'registrations' ? 'New Dev Approval' : tab === 'approvals' ? 'Profile Approval' : tab}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                    <div
                        onClick={() => setActiveTab('centers')}
                        className="bg-[#fffdfa]/90 backdrop-blur-xl border border-amber-200 p-5 rounded-[2rem] shadow-xl shadow-orange-100/50 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="p-3 bg-blue-50 text-blue-600 w-fit rounded-2xl mb-3 group-hover:rotate-12 transition-transform">
                            <Building2 className="h-5 w-5 stroke-[2.5px]" />
                        </div>
                        <div className={`text-2xl font-black text-gray-900 ${stats.loading ? 'animate-pulse bg-gray-200 h-8 w-16 rounded' : ''}`}>
                            {stats.loading ? '' : stats.centers}
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Centers</div>
                    </div>

                    <div
                        onClick={() => setActiveTab('user-management')}
                        className="bg-[#fffdfa]/90 backdrop-blur-xl border border-amber-200 p-5 rounded-[2rem] shadow-xl shadow-orange-100/50 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-2xl mb-3 group-hover:rotate-12 transition-transform">
                            <Users className="h-5 w-5 stroke-[2.5px]" />
                        </div>
                        <div className={`text-2xl font-black text-gray-900 ${stats.loading ? 'animate-pulse bg-gray-200 h-8 w-16 rounded' : ''}`}>
                            {stats.loading ? '' : stats.devotees}
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Devotees</div>
                    </div>

                    <div
                        onClick={() => setActiveTab('approvals')}
                        className="bg-[#fffdfa]/90 backdrop-blur-xl border border-amber-200 p-5 rounded-[2rem] shadow-xl shadow-orange-100/50 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden flex flex-col"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="p-3 bg-amber-50 text-amber-600 w-fit rounded-2xl group-hover:rotate-12 transition-transform">
                                <History className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            {stats.pendingBreakdown.length > 1 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/50 rounded-full border border-amber-200/50">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-tight">Multi-Temple</span>
                                </div>
                            )}
                        </div>
                        <div className={`text-2xl font-black text-gray-900 relative z-10 ${stats.loading ? 'animate-pulse bg-gray-200 h-8 w-16 rounded' : ''}`}>
                            {stats.loading ? '' : stats.pendingProfiles}
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 relative z-10">Pending Profile</div>

                        {!stats.loading && stats.pendingBreakdown.length > 0 && (
                            <div className="mt-auto pt-3 border-t border-amber-100/50 space-y-2 relative z-10">
                                {stats.pendingBreakdown.slice(0, 3).map((item, idx) => {
                                    const isCurrent = item.name === currentTemple;
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const temple = assignedTemples.find(t => t.name === item.name);
                                                if (temple) setSelectedTemple(temple);
                                                setActiveTab('approvals');
                                            }}
                                            className={`flex items-center justify-between p-2 rounded-xl transition-all ${isCurrent
                                                ? 'bg-amber-100/30 border border-amber-200/30'
                                                : 'hover:bg-amber-50/50 cursor-pointer active:scale-95'
                                                }`}
                                        >
                                            <span className={`text-[10px] font-bold truncate max-w-[100px] ${isCurrent ? 'text-amber-700' : 'text-gray-500 italic'}`}>
                                                {item.name}
                                            </span>
                                            <span className={`text-[10px] font-black ${isCurrent ? 'text-amber-800' : 'text-amber-600/70'}`}>
                                                {item.count}
                                            </span>
                                        </div>
                                    );
                                })}
                                {stats.pendingBreakdown.length > 3 && (
                                    <div className="text-[8px] font-black text-center text-amber-400 uppercase tracking-widest pt-1">
                                        + {stats.pendingBreakdown.length - 3} more temples
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div
                        onClick={() => setActiveTab('registrations')}
                        className="bg-[#fffdfa]/90 backdrop-blur-xl border border-amber-200 p-5 rounded-[2rem] shadow-xl shadow-orange-100/50 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden flex flex-col"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="p-3 bg-rose-50 text-rose-600 w-fit rounded-2xl group-hover:rotate-12 transition-transform">
                                <UserCheck className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            {stats.pendingRegBreakdown.length > 1 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/50 rounded-full border border-emerald-200/50">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tight">Multi-Temple</span>
                                </div>
                            )}
                        </div>
                        <div className={`text-2xl font-black text-gray-900 relative z-10 ${stats.loading ? 'animate-pulse bg-gray-200 h-8 w-16 rounded' : ''}`}>
                            {stats.loading ? '' : stats.newRequests}
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 relative z-10">New Requests</div>

                        {!stats.loading && stats.pendingRegBreakdown.length > 0 && (
                            <div className="mt-auto pt-3 border-t border-rose-100/50 space-y-2 relative z-10">
                                {stats.pendingRegBreakdown.slice(0, 3).map((item, idx) => {
                                    const isCurrent = item.name === currentTemple;
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const temple = assignedTemples.find(t => t.name === item.name);
                                                if (temple) setSelectedTemple(temple);
                                                setActiveTab('registrations');
                                            }}
                                            className={`flex items-center justify-between p-2 rounded-xl transition-all ${isCurrent
                                                ? 'bg-emerald-100/30 border border-emerald-200/30'
                                                : 'hover:bg-rose-50/50 cursor-pointer active:scale-95'
                                                }`}
                                        >
                                            <span className={`text-[10px] font-bold truncate max-w-[100px] ${isCurrent ? 'text-emerald-700' : 'text-gray-500 italic'}`}>
                                                {item.name}
                                            </span>
                                            <span className={`text-[10px] font-black ${isCurrent ? 'text-emerald-800' : 'text-rose-600/70'}`}>
                                                {item.count}
                                            </span>
                                        </div>
                                    );
                                })}
                                {stats.pendingRegBreakdown.length > 3 && (
                                    <div className="text-[8px] font-black text-center text-rose-400 uppercase tracking-widest pt-1">
                                        + {stats.pendingRegBreakdown.length - 3} more temples
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div
                        onClick={() => router.push('/dashboard/managing-director/sadhana-report')}
                        className="bg-[#fffdfa]/90 backdrop-blur-xl border border-amber-200 p-5 rounded-[2rem] shadow-xl shadow-orange-100/50 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="flex items-center justify-between mb-3 relative z-10 w-full">
                            <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 w-fit rounded-2xl group-hover:rotate-12 transition-transform shadow-sm">
                                <Activity className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-gray-900 relative z-10 leading-none">
                            Reports
                        </div>
                        <div className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mt-1.5 relative z-10 line-clamp-2">
                            Temple Sadhana
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Centers Tab */}
                {activeTab === 'centers' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Temple Centers</h2>
                                <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Manage physical locations</p>
                            </div>
                            <button
                                onClick={() => setShowAddCenterModal(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-600 to-blue-700 text-white rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-primary-200 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                            >
                                <Plus className="h-4 w-4 stroke-[3px]" /> Add Center
                            </button>
                        </div>

                        {loadingCenters ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white">
                                <div className="animate-spin h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full mb-4"></div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing centers...</p>
                            </div>
                        ) : centers.length === 0 ? (
                            <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white border-dashed">
                                <div className="bg-gray-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Building2 className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">No Centers Registered</h3>
                                <p className="text-gray-500 font-medium mt-2 max-w-sm mx-auto">Build your local network by adding your first center for {selectedTemple?.name || 'your temple'}.</p>
                                <button
                                    onClick={() => setShowAddCenterModal(true)}
                                    className="mt-6 px-6 py-3 bg-white text-primary-600 border-2 border-primary-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-50 transition-all"
                                >
                                    Get Started
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                {centers.map((center, index) => {
                                    // Spiritual Color Palette Cycling
                                    const palettes = [
                                        { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', shadow: 'shadow-blue-100/50', accent: 'from-blue-500 via-indigo-500 to-purple-500', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
                                        { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', shadow: 'shadow-emerald-100/50', accent: 'from-emerald-500 via-teal-500 to-cyan-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
                                        { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', shadow: 'shadow-amber-100/50', accent: 'from-amber-500 via-orange-500 to-red-500', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
                                        { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', shadow: 'shadow-rose-100/50', accent: 'from-rose-500 via-pink-500 to-purple-500', iconBg: 'bg-rose-100', iconText: 'text-rose-600' },
                                        { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', shadow: 'shadow-purple-100/50', accent: 'from-purple-500 via-violet-500 to-indigo-500', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
                                        { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', shadow: 'shadow-teal-100/50', accent: 'from-teal-500 via-emerald-500 to-green-500', iconBg: 'bg-teal-100', iconText: 'text-teal-600' },
                                    ];
                                    const theme = palettes[index % palettes.length];

                                    return (
                                        <div key={center.id} className={`group relative bg-[#fffdfa] rounded-3xl p-5 sm:p-6 shadow-xl ${theme.shadow} border ${theme.border} hover:shadow-2xl transition-all duration-500 overflow-hidden`}>
                                            {/* Vibrant Accent Bar */}
                                            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.accent} opacity-80 group-hover:h-2 transition-all`} />

                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`h-12 w-12 ${theme.iconBg} ${theme.iconText} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:brightness-110 transition-all duration-500`}>
                                                    <Building2 className="h-6 w-6 stroke-[2px]" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`px-2.5 py-0.5 ${theme.bg} ${theme.text} text-[9px] font-black uppercase tracking-widest rounded-full border border-white/50 shadow-sm`}>Active</span>
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-black text-gray-900 mb-1.5 group-hover:text-gray-700 transition-colors uppercase tracking-tight">{center.name}</h3>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2.5 text-gray-500">
                                                    <div className={`h-7 w-7 rounded-lg ${theme.bg} flex items-center justify-center ${theme.text}`}>
                                                        <MapPin className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Location</p>
                                                        <p className="text-xs font-bold text-gray-700">{center.city}, {center.state}</p>
                                                    </div>
                                                </div>

                                                {center.address && (
                                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed italic line-clamp-2">&quot;{center.address}&quot;</p>
                                                    </div>
                                                )}

                                                <div className="space-y-2 pt-2">
                                                    {center.project_manager_name && (
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Manager</span>
                                                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]">{center.project_manager_name}</span>
                                                        </div>
                                                    )}
                                                    {((center.mentor_names && center.mentor_names.length > 0) || center.mentor_name) && (
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mentors</span>
                                                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]">
                                                                {Array.isArray(center.mentor_names) && center.mentor_names.length > 0
                                                                    ? center.mentor_names.join(', ')
                                                                    : center.mentor_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {((center.frontliner_names && center.frontliner_names.length > 0) || center.frontliner_name) && (
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Frontliners</span>
                                                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]">
                                                                {Array.isArray(center.frontliner_names) && center.frontliner_names.length > 0
                                                                    ? center.frontliner_names.join(', ')
                                                                    : center.frontliner_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {(center.project_advisor_name || center.acting_manager_name) && (
                                                        <div className="flex gap-2">
                                                            {center.project_advisor_name && (
                                                                <div className="flex-1 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Advisor</div>
                                                                    <div className="text-[9px] font-bold text-gray-700 truncate">{center.project_advisor_name}</div>
                                                                </div>
                                                            )}
                                                            {center.acting_manager_name && (
                                                                <div className="flex-1 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Acting</div>
                                                                    <div className="text-[9px] font-bold text-gray-700 truncate">{center.acting_manager_name}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 pt-2 mt-2 border-t border-gray-100/50">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditCenterModal(center);
                                                        }}
                                                        className={`flex-1 py-2 ${theme.bg} ${theme.text} hover:bg-white border border-transparent hover:${theme.border} rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" /> Edit
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Decorative Background Elements */}
                                            <div className={`absolute -right-10 -bottom-10 w-24 h-24 ${theme.bg.replace('-50', '-500')}/5 rounded-full blur-2xl group-hover:${theme.bg.replace('-50', '-500')}/10 transition-colors`} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Staff / User Management Tab */}
                {activeTab === 'user-management' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Advanced Filter Command Bar */}
                        <div className="bg-[#fffdfa]/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl shadow-orange-100/40 border border-amber-200">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8 mb-6 sm:mb-8 border-b border-gray-100 pb-8">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Devotee Management</h2>
                                    <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Directory & Access Control</p>
                                </div>
                                <div className="relative w-full lg:w-[450px] group">
                                    <div className="absolute inset-0 bg-primary-500/5 blur-2xl group-focus-within:bg-primary-500/10 transition-colors rounded-[2rem]" />
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500 group-focus-within:scale-110 transition-transform stroke-[2.5px]" />
                                    <input
                                        type="text"
                                        placeholder="Search devotees..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="relative w-full pl-14 pr-6 py-3.5 sm:py-4 bg-gray-50/50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary-100 focus:ring-4 focus:ring-primary-500/5 outline-none text-sm sm:text-base font-medium transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Center Division</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <select
                                            value={selectedCenter}
                                            onChange={(e) => setSelectedCenter(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-amber-200 rounded-2xl focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none font-bold text-gray-700 transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="">All Locations</option>
                                            {centers.map(center => (
                                                <option key={center.id} value={center.name}>{center.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Camp Membership</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-50 text-emerald-500 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <select
                                            value={selectedCamp}
                                            onChange={(e) => setSelectedCamp(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-amber-200 rounded-2xl focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none font-bold text-gray-700 transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="">Any Status</option>
                                            {CAMP_OPTIONS.map(camp => (
                                                <option key={camp.value} value={camp.value}>{camp.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="group shadow-sm rounded-2xl">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Administrative Role</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-amber-50 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                            <UserCheck className="h-4 w-4" />
                                        </div>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value ? parseInt(e.target.value) : '')}
                                            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-amber-200 rounded-2xl focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none font-bold text-gray-700 transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="">All Categories</option>
                                            {MANAGEABLE_ROLES.map(role => (
                                                <option key={role.value} value={role.value}>{role.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {loadingUsers ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white">
                                <div className="relative">
                                    <div className="animate-spin h-14 w-14 border-4 border-primary-100 border-t-primary-600 rounded-full"></div>
                                    <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary-300" />
                                </div>
                                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-6">Indexing staff directory...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white border-dashed">
                                <div className="bg-gray-100/50 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <Users className="h-12 w-12 text-gray-300" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">No Results Found</h3>
                                <p className="text-gray-500 font-medium mt-3 max-w-sm mx-auto">We couldn&apos;t find any staff members matching your current filter configuration.</p>
                                <button
                                    onClick={() => {
                                        setUserSearch('');
                                        setSelectedCenter('');
                                        setSelectedCamp('');
                                        setSelectedRole('');
                                    }}
                                    className="mt-8 px-8 py-4 bg-white text-gray-900 font-black text-[10px] uppercase tracking-widest border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all shadow-md"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Mobile/Tablet View (Cards) */}
                                <div className="grid grid-cols-1 lg:hidden gap-4">
                                    {pagedUsers.map(user => {
                                        const uH = user.hierarchy as any;
                                        const uCenterLabel = uH?.currentCenter || uH?.center || user.center || 'No Center';

                                        return (
                                            <div key={user.id} className="bg-[#fffdfa] rounded-3xl p-5 border border-amber-200 shadow-lg shadow-orange-100/30">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-gray-900 truncate">{user.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 lowercase truncate">{user.email}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 mb-5">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="text-gray-400">Temple:</span> {uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '') || 'None'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                                                        <span className="text-gray-400">Center:</span> {uCenterLabel}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        <UserCheck className="h-3.5 w-3.5 text-primary-500" />
                                                        <span className="text-gray-400">Counselor:</span> {uH?.counselor || 'None'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        <Home className="h-3.5 w-3.5 text-amber-500" />
                                                        <span className="text-gray-400">Ashram:</span> {uH?.ashram || 'None'}
                                                    </div>
                                                </div>

                                                <div className="mb-5">
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

                                                <div className="mb-5">
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

                                                <div className="flex flex-wrap gap-1.5 mb-5">
                                                    {(Array.isArray(user.role) ? user.role : [user.role]).map((r: any, i: number) => (
                                                        <span key={i} className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${getRoleHierarchyNumber(r) >= 12
                                                            ? 'bg-primary-50 text-primary-700 border-primary-200'
                                                            : 'bg-gray-50 text-gray-500 border-gray-100'
                                                            }`}>
                                                            {getRoleDisplayName(r)}
                                                        </span>
                                                    ))}
                                                </div>

                                                {(() => {
                                                    const canManage = canAdminManageTarget(userData?.role || [], user.role || [], userData?.id, user.id);

                                                    if (!canManage) {
                                                        return (
                                                            <div className="w-full py-3 bg-gray-50 text-gray-400 border-2 border-transparent rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed shadow-sm">
                                                                <Lock className="h-3.5 w-3.5" /> Locked profile
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="flex flex-col gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setUserForView(user);
                                                                    setShowViewModal(true);
                                                                }}
                                                                className="w-full py-3 bg-white text-emerald-600 border-2 border-emerald-50 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" /> View Profile
                                                            </button>

                                                            {(() => {
                                                                const userRoles = Array.isArray(user.role) ? user.role : [user.role];
                                                                const isSpiritualAuthority = userRoles.some((r: any) => Number(r) === 2 || Number(r) === 20);
                                                                const devoteeTemple = uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '') || user.current_temple || uH?.currentTemple;
                                                                const isManagedTemple = assignedTemples.some(t => t.name.trim().toLowerCase() === (devoteeTemple || '').trim().toLowerCase());

                                                                if (isSpiritualAuthority) {
                                                                    return (
                                                                        <button
                                                                            onClick={() => {
                                                                                setCounselorActionUser(user);
                                                                                setCounselorActionType('revoke');
                                                                                setShowCounselorModal(true);
                                                                            }}
                                                                            className="w-full py-3 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
                                                                        >
                                                                            <ShieldAlert className="h-3.5 w-3.5" /> Revoke Role
                                                                        </button>
                                                                    );
                                                                } else if (isManagedTemple) {
                                                                    return (
                                                                        <button
                                                                            onClick={() => {
                                                                                setCounselorActionUser(user);
                                                                                setCounselorActionType('assign');
                                                                                setShowCounselorModal(true);
                                                                            }}
                                                                            className="w-full py-3 bg-primary-50 text-primary-600 border-2 border-primary-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
                                                                        >
                                                                            <ShieldCheck className="h-3.5 w-3.5" /> Assign Roles
                                                                        </button>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <div className="w-full py-3 bg-gray-50 text-gray-400 border-2 border-transparent rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed shadow-sm" title="Devotee must belong to one of your managed Temples">
                                                                            <Shield className="h-3.5 w-3.5" /> No Access
                                                                        </div>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop/Laptop View (Table) */}
                                <div className="hidden lg:block bg-[#fffdfa]/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-orange-100/50 border border-amber-200 overflow-hidden group">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="bg-gray-50/50">
                                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Profile</th>
                                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Temple & Center</th>
                                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Spiritual Identity</th>
                                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Privileges</th>
                                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-40">VOICE group level</th>
                                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-40">KC Status</th>
                                                    <th className="px-6 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100/50">
                                                {pagedUsers.map(user => {
                                                    const uH = user.hierarchy as any;
                                                    const uCenterLabel = uH?.currentCenter || uH?.center || user.center || 'No Center';

                                                    return (
                                                        <tr key={user.id} className="hover:bg-primary-50/30 transition-colors group/row">
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover/row:scale-110 transition-transform">
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-gray-900 group-hover/row:text-primary-600 transition-colors tracking-tight">{user.name}</p>
                                                                        <p className="text-xs font-bold text-gray-400 lowercase italic">{user.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-wider">
                                                                        <MapPin className="h-3 w-3 text-emerald-500" />
                                                                        {uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '') || 'None'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                        <Building2 className="h-3 w-3 text-blue-500" />
                                                                        {uCenterLabel}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        {user.is_smvd_volunteer && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-md border border-blue-100">SMVD</span>}
                                                                        {user.is_rns_volunteer && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-md border border-emerald-100">RNS</span>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <p className="flex items-center gap-2 text-[10px] font-black text-primary-600 uppercase tracking-widest bg-primary-50/50 px-2.5 py-1 rounded-lg border border-primary-100/50 self-start">
                                                                        <Home className="h-3 w-3" />
                                                                        {uH?.ashram || 'None'}
                                                                    </p>
                                                                    <p className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                                        <UserCheck className="h-3 w-3 text-emerald-500" />
                                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Counselor:</span>
                                                                        {uH?.counselor || 'None'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                                                    {(Array.isArray(user.role) ? user.role : [user.role]).map((r: any, i: number) => (
                                                                        <span key={i} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${getRoleHierarchyNumber(r) >= 12
                                                                            ? 'bg-primary-50 text-primary-700 border-primary-200'
                                                                            : 'bg-gray-100 text-gray-600 border-gray-200 group-hover/row:border-primary-200 group-hover/row:bg-white'
                                                                            }`}>
                                                                            {getRoleDisplayName(r)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
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
                                                            <td className="px-6 py-6">
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
                                                            <td className="px-6 py-6 text-right">
                                                                {(() => {
                                                                    const canManage = canAdminManageTarget(userData?.role || [], user.role || [], userData?.id, user.id);

                                                                    if (!canManage) {
                                                                        return (
                                                                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-400 border-2 border-transparent rounded-xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed">
                                                                                <Lock className="h-3 w-3" /> Locked
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setUserForView(user);
                                                                                    setShowViewModal(true);
                                                                                }}
                                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 border-2 border-emerald-50 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-100 transition-all active:scale-95"
                                                                                title="View Profile"
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </button>

                                                                            {(() => {
                                                                                const userRoles = Array.isArray(user.role) ? user.role : [user.role];
                                                                                const isSpiritualAuthority = userRoles.some((r: any) => Number(r) === 2 || Number(r) === 20);
                                                                                const devoteeTemple = uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '') || user.current_temple || uH?.currentTemple;
                                                                                const isManagedTemple = assignedTemples.some(t => t.name.trim().toLowerCase() === (devoteeTemple || '').trim().toLowerCase());

                                                                                if (isSpiritualAuthority) {
                                                                                    return (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setCounselorActionUser(user);
                                                                                                setCounselorActionType('revoke');
                                                                                                setShowCounselorModal(true);
                                                                                            }}
                                                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                                                                            title="Revoke Counselor Role"
                                                                                        >
                                                                                            <ShieldAlert className="h-4 w-4" />
                                                                                        </button>
                                                                                    );
                                                                                } else if (isManagedTemple) {
                                                                                    return (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setCounselorActionUser(user);
                                                                                                setCounselorActionType('assign');
                                                                                                setShowCounselorModal(true);
                                                                                            }}
                                                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 border-2 border-primary-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                                                                            title="Assign Counselor/Care Giver Role"
                                                                                        >
                                                                                            <ShieldCheck className="h-4 w-4" />
                                                                                        </button>
                                                                                    );
                                                                                } else {
                                                                                    return (
                                                                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed" title="Devotee must belong to one of your managed Temples">
                                                                                            <Shield className="h-4 w-4 text-gray-300" />
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            })()}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pagination Controls */}
                                {filteredUsersList.length > 0 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-[#fffdfa]/80 backdrop-blur-md p-5 sm:p-6 rounded-[2rem] border border-amber-200 shadow-xl shadow-orange-100/20">
                                        <div className="flex items-center gap-4">
                                            <div className="group">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 block">Per Page</label>
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                    className="bg-white border-2 border-amber-100 rounded-xl px-3 py-2 text-xs font-black text-gray-700 outline-none focus:border-primary-400 transition-all cursor-pointer"
                                                >
                                                    {[10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
                                                </select>
                                            </div>
                                            <div className="h-10 w-[1px] bg-gray-200 hidden sm:block" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                Showing {Math.min(filteredUsersList.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredUsersList.length, currentPage * itemsPerPage)} of {filteredUsersList.length}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                className="p-2 sm:p-3 bg-white text-gray-400 rounded-xl border-2 border-gray-50 hover:border-primary-200 hover:text-primary-600 disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                                            >
                                                <ChevronRight className="h-5 w-5 rotate-180" />
                                            </button>

                                            <div className="flex items-center gap-1.5 px-4">
                                                {(() => {
                                                    const pages = [];
                                                    const maxVisible = 5;
                                                    let start = Math.max(1, currentPage - 2);
                                                    let end = Math.min(totalPages, start + maxVisible - 1);
                                                    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

                                                    for (let i = start; i <= end; i++) {
                                                        pages.push(
                                                            <button
                                                                key={i}
                                                                onClick={() => setCurrentPage(i)}
                                                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${currentPage === i ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-110' : 'bg-white text-gray-500 border-2 border-gray-50 hover:border-primary-100 hover:text-primary-500'}`}
                                                            >
                                                                {i}
                                                            </button>
                                                        );
                                                    }
                                                    return pages;
                                                })()}
                                            </div>

                                            <button
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                className="p-2 sm:p-3 bg-white text-gray-400 rounded-xl border-2 border-gray-50 hover:border-primary-200 hover:text-primary-600 disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Approvals Tab */}
                {activeTab === 'approvals' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col items-stretch lg:flex-row lg:items-center justify-between gap-6 bg-[#fffdfa]/80 backdrop-blur-md p-4 sm:p-6 rounded-[2rem] border border-amber-200 shadow-xl shadow-orange-100/20">
                            <div className="flex bg-gray-200/50 p-1 rounded-2xl border border-gray-100/50 items-center overflow-x-auto no-scrollbar">
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
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isActive
                                                    ? 'bg-white text-gray-900 shadow-lg transform scale-[1.05]'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {approvalStatus === 'pending' && selectedRequestIds.length > 0 && (
                                <div className="flex items-center justify-between gap-4 bg-primary-600 p-2 pl-4 sm:pl-6 rounded-2xl shadow-xl shadow-primary-200 animate-in zoom-in-95 duration-300">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedRequestIds.length} Selected</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openConfirmation('rejected')}
                                            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => openConfirmation('approved')}
                                            className="px-3 sm:px-4 py-2 bg-white text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loadingRequests ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white">
                                <div className="animate-spin h-12 w-12 border-4 border-primary-100 border-t-primary-600 rounded-full mb-6"></div>
                                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving audit trail...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white border-dashed">
                                <div className="bg-gray-100/50 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                                    <History className="h-12 w-12 text-gray-300" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Queue Clear</h3>
                                <p className="text-gray-500 font-medium mt-3 max-w-sm mx-auto">No {approvalStatus} profile update requests currently require your attention.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {approvalStatus === 'pending' && requests.length > 0 && (
                                    <div className="flex items-center gap-4 px-8 py-4 bg-[#fffdfa]/90 backdrop-blur-md rounded-2xl border border-amber-200 shadow-xl shadow-orange-100/40">
                                        <div
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedRequestIds.length === requests.length && requests.length > 0 ? 'bg-primary-600 border-primary-600 shadow-lg' : 'border-gray-200 hover:border-primary-400'}`}
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedRequestIds.length === requests.length && requests.length > 0 && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                        </div>
                                        <span className="text-xs font-black text-gray-600 uppercase tracking-widest">
                                            {selectedRequestIds.length === 0 ? 'Select All Requests' : `Batch Management (${selectedRequestIds.length})`}
                                        </span>
                                    </div>
                                )}

                                {requests.map(request => {
                                    const isExpanded = expandedRequestId === request.id;
                                    const changeCount = Object.keys(request.requested_changes).length;

                                    return (
                                        <div key={request.id} className={`group bg-[#fffdfa]/90 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-primary-300 shadow-2xl shadow-primary-100 ring-4 ring-primary-500/10' : 'border-amber-200 shadow-xl shadow-orange-100/30 hover:border-amber-300'}`}>
                                            <div
                                                className={`p-5 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/30' : 'hover:bg-primary-50/20'}`}
                                                onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                                            >
                                                <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                                                    {approvalStatus === 'pending' && (
                                                        <div
                                                            className="flex-shrink-0"
                                                            onClick={(e) => { e.stopPropagation(); toggleSelection(request.id); }}
                                                        >
                                                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${selectedRequestIds.includes(request.id) ? 'bg-primary-600 border-primary-600 shadow-lg shadow-primary-200 rotate-0' : 'border-gray-200 hover:border-primary-400 bg-white rotate-12 hover:rotate-0'}`}>
                                                                {selectedRequestIds.includes(request.id) && <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white stroke-[3px]" />}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                                                        <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.25rem] shadow-inner flex-shrink-0 ${request.status === 'pending' ? 'bg-amber-100 text-amber-600' : request.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                            {request.status === 'pending' ? <Clock className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" /> : request.status === 'approved' ? <Check className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" /> : <X className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight group-hover:text-primary-600 transition-colors uppercase truncate">{request.user?.name || 'Unknown Identity'}</h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                                                <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Calendar className="h-3 w-3" /> {new Date(request.created_at).toLocaleDateString()}
                                                                </p>
                                                                <div className="hidden xs:block h-1 w-1 rounded-full bg-gray-300" />
                                                                <p className="text-[9px] sm:text-[10px] font-black text-primary-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
                                                                    <Mail className="h-3 w-3" /> {request.user?.email || 'OFFLINE'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-gray-100 md:border-0 pt-4 md:pt-0">
                                                    <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100/80 rounded-xl border border-gray-200/50">
                                                        <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                                                            <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
                                                            {changeCount} Delta{changeCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all ${isExpanded ? 'bg-primary-600 border-primary-600 text-white rotate-180 shadow-lg shadow-primary-200' : 'bg-white border-gray-100 text-gray-400 group-hover:border-primary-200 group-hover:text-primary-500'}`}>
                                                        <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
                                                    </div>
                                                </div>
                                            </div>


                                            {
                                                isExpanded && (
                                                    <div className="p-5 sm:p-10 bg-gradient-to-b from-primary-50/30 to-white border-t border-primary-100 animate-in slide-in-from-top-4 duration-500">
                                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                                            <div>
                                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                                    <History className="h-4 w-4 text-primary-500" /> Modification Audit
                                                                </h4>
                                                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Review proposed schema changes for this security identity</p>
                                                            </div>
                                                            {approvalStatus === 'pending' && (
                                                                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
                                                                    <button
                                                                        onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: [] }))}
                                                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
                                                                    >
                                                                        Reject All
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: Object.keys(request.requested_changes) }))}
                                                                        className="px-4 py-2 bg-white text-[10px] font-black uppercase tracking-widest text-primary-600 rounded-lg shadow-sm hover:shadow-md transition-all"
                                                                    >
                                                                        Sync All
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-3 mb-10">
                                                            {Object.keys(request.requested_changes).map(key =>
                                                                renderFieldChange(request.id, key, request.requested_changes[key], request.current_values[key])
                                                            )}
                                                        </div>

                                                        {request.status === 'pending' ? (
                                                            <div className="bg-white/60 backdrop-blur-md p-8 rounded-[2rem] border border-white shadow-2xl shadow-gray-200/50 space-y-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Administrative Feedback & Rationale</label>
                                                                    <textarea
                                                                        className="w-full px-6 py-5 bg-gray-50/50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary-100 focus:ring-4 focus:ring-primary-500/5 outline-none font-medium transition-all shadow-inner resize-none text-gray-700"
                                                                        rows={3}
                                                                        placeholder="Specify requirements for rejection or notes for approval..."
                                                                        value={feedback}
                                                                        onChange={(e) => setFeedback(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col sm:flex-row justify-end gap-4">
                                                                    <button
                                                                        onClick={() => openConfirmation('rejected', request.id)}
                                                                        disabled={!feedback.trim()}
                                                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 group/btn ${!feedback.trim() ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white hover:shadow-xl hover:shadow-rose-100'}`}
                                                                    >
                                                                        <X className="h-4 w-4 stroke-[3px] group-hover/btn:scale-110 transition-transform" /> Reject Delta
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openConfirmation('approved', request.id)}
                                                                        disabled={selectedFields[request.id] && selectedFields[request.id].length === 0}
                                                                        className="px-8 py-4 bg-gradient-to-r from-primary-600 to-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-200 hover:shadow-2xl hover:scale-[1.02] transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                                                    >
                                                                        <Check className="h-4 w-4 stroke-[3px]" />
                                                                        {selectedFields[request.id]?.length === changeCount || !selectedFields[request.id]
                                                                            ? 'Approve Full Identity'
                                                                            : `Authorize ${selectedFields[request.id]?.length} Deltas`}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-[#fffdfa]/80 backdrop-blur-md p-8 rounded-[2rem] border border-amber-200 shadow-xl shadow-orange-100/40 group/status">
                                                                <div className="flex items-center gap-3 mb-6">
                                                                    <div className={`p-2 rounded-lg ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                                        <ShieldCheck className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Lifecycle Resolution</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${request.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                        <p className="text-2xl font-black text-gray-900 tracking-tight uppercase">{request.status}</p>
                                                                    </div>
                                                                </div>
                                                                {request.admin_feedback && (
                                                                    <div className="mt-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 italic text-sm text-gray-500 font-medium relative">
                                                                        <Quote className="h-8 w-8 text-gray-100 absolute -top-4 -left-2 rotate-12" />
                                                                        <span className="relative z-10">&quot;{request.admin_feedback}&quot;</span>
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

                {/* New User Registrations Tab */}
                {activeTab === 'registrations' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#fffdfa]/80 backdrop-blur-md p-6 rounded-[2rem] border border-amber-200 shadow-xl shadow-orange-100/20">
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <Users className="h-6 w-6 text-orange-600" />
                                New Dev Approvals
                            </h2>

                            {selectedPendingUserIds.length > 0 && (
                                <div className="flex items-center justify-between gap-4 bg-teal-600 p-2 pl-4 sm:pl-6 rounded-xl shadow-lg shadow-teal-200 animate-in zoom-in-95 duration-300">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedPendingUserIds.length} Selected</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setVerificationMode('bulk'); setVerificationAction('rejected'); setShowRejectionModal(true); }}
                                            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => { setVerificationMode('bulk'); setVerificationAction('approved'); handleBulkVerification('approved'); }}
                                            className="px-3 sm:px-4 py-2 bg-white text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loadingPendingUsers ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white">
                                <div className="animate-spin h-12 w-12 border-4 border-primary-100 border-t-primary-600 rounded-full mb-6"></div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Authenticating identities...</p>
                            </div>
                        ) : pendingUsers.length === 0 ? (
                            <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white border-dashed">
                                <div className="bg-emerald-50 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <ShieldCheck className="h-12 w-12 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Security Cleared</h3>
                                <p className="text-gray-500 font-medium mt-3 max-w-sm mx-auto">All new devotee registrations for {currentTemple} have been processed.</p>
                            </div>
                        ) : (
                            <div className="bg-[#fffdfa]/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-orange-100/50 border border-amber-200 overflow-hidden group">
                                {/* Desktop/Laptop View */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-12">
                                                    <div
                                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedPendingUserIds.length === pendingUsers.length && pendingUsers.length > 0 ? 'bg-primary-600 border-primary-600 shadow-lg' : 'border-gray-200 hover:border-primary-400'}`}
                                                        onClick={() => {
                                                            if (selectedPendingUserIds.length === pendingUsers.length) {
                                                                setSelectedPendingUserIds([]);
                                                            } else {
                                                                setSelectedPendingUserIds(pendingUsers.map(u => u.id));
                                                            }
                                                        }}
                                                    >
                                                        {selectedPendingUserIds.length === pendingUsers.length && pendingUsers.length > 0 && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                                    </div>
                                                </th>
                                                <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                                <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Hierarchy</th>
                                                <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Counselor & Ashram</th>
                                                <th className="px-6 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100/50">
                                            {pendingUsers.map(user => {
                                                const uH = user.hierarchy as any;
                                                const isCenterOther = uH?.currentCenter === 'Other';
                                                const isCenterNone = !uH?.currentCenter || uH?.currentCenter === 'None';
                                                const centerName = isCenterOther ? `Other: ${user.other_center || 'Unspecified'}` : (uH?.currentCenter || 'None');

                                                const isCounselorOther = uH?.counselor === 'Other';
                                                const isCounselorNone = !uH?.counselor || uH?.counselor === 'None' || uH?.counselor === 'Not Assigned';
                                                const counselorName = isCounselorOther ? `Other: ${user.other_counselor || 'Unspecified'}` : (uH?.counselor || 'None');

                                                const isHighlighted = isCenterOther || isCenterNone || isCounselorOther || isCounselorNone;

                                                return (
                                                    <tr key={user.id} className={`${isHighlighted ? 'bg-rose-50/50 hover:bg-rose-100/40' : 'hover:bg-primary-50/30'} transition-colors group/row`}>
                                                        <td className="px-6 py-6">
                                                            <div
                                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedPendingUserIds.includes(user.id) ? 'bg-primary-600 border-primary-600 shadow-lg' : 'border-gray-200 hover:border-primary-400 bg-white'}`}
                                                                onClick={() => setSelectedPendingUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                                                            >
                                                                {selectedPendingUserIds.includes(user.id) && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-gray-900 tracking-tight">{user.name}</span>
                                                                <span className="text-xs font-bold text-gray-400">{user.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                                    <span className="text-[10px] font-black text-gray-500 tracking-tight">
                                                                        {user.other_temple || uH?.otherTemple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '') || 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                                    <span className="text-[10px] font-bold text-gray-600 tracking-tight italic">{(isCenterOther || isCenterNone) ? centerName : (uH?.currentCenter || 'N/A')}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                                                    <span className="text-[10px] font-black text-gray-500 tracking-tight">
                                                                        {(isCounselorOther || isCounselorNone) ? counselorName : (uH?.counselor || 'N/A')}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                                    <span className="text-[10px] font-bold text-gray-600 tracking-tight italic">{uH?.ashram || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 text-right">
                                                            <div className="flex items-center justify-end gap-3 translate-x-2 group-hover/row:translate-x-0 transition-transform duration-300">
                                                                <button
                                                                    onClick={() => { setUserToVerify(user); setVerificationAction('rejected'); setVerificationMode('single'); setShowRejectionModal(true); }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black transition-all active:scale-95"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUserVerification(user.id, 'approved')}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black transition-all active:scale-95"
                                                                >
                                                                    <Check className="h-3 w-3" />
                                                                    Approve
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile/Tablet Card View */}
                                <div className="lg:hidden divide-y divide-gray-100">
                                    {pendingUsers.map(user => {
                                        const uH = user.hierarchy as any;
                                        const isCenterOther = uH?.currentCenter === 'Other';
                                        const isCenterNone = !uH?.currentCenter || uH?.currentCenter === 'None';
                                        const centerName = isCenterOther ? `Other: ${user.other_center || 'Unspecified'}` : (uH?.currentCenter || 'None');

                                        const isCounselorOther = uH?.counselor === 'Other';
                                        const isCounselorNone = !uH?.counselor || uH?.counselor === 'None' || uH?.counselor === 'Not Assigned';
                                        const counselorName = isCounselorOther ? `Other: ${user.other_counselor || 'Unspecified'}` : (uH?.counselor || 'None');

                                        const isHighlighted = isCenterOther || isCenterNone || isCounselorOther || isCounselorNone;

                                        return (
                                            <div key={user.id} className={`p-5 space-y-4 ${isHighlighted ? 'bg-rose-50/50' : 'bg-white'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedPendingUserIds.includes(user.id) ? 'bg-primary-600 border-primary-600 shadow-lg' : 'border-gray-200 bg-white'}`}
                                                            onClick={() => setSelectedPendingUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                                                        >
                                                            {selectedPendingUserIds.includes(user.id) && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                                        </div>
                                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md ${isHighlighted ? 'bg-rose-600' : 'bg-gray-900'}`}>
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`font-black tracking-tight text-xs uppercase truncate ${isHighlighted ? 'text-rose-900' : 'text-gray-900'}`}>{user.name}</p>
                                                            <p className={`text-[9px] font-bold lowercase italic truncate ${isHighlighted ? 'text-rose-400' : 'text-gray-400'}`}>{user.email}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex flex-col gap-1 p-2.5 rounded-xl border bg-gray-50 border-gray-100">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Temple</span>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight truncate text-gray-700">
                                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                                            {user.other_temple || uH?.otherTemple || uH?.currentTemple?.name || (typeof uH?.currentTemple === 'string' ? uH?.currentTemple : '') || 'None'}
                                                        </div>
                                                    </div>
                                                    <div className={`flex flex-col gap-1 p-2.5 rounded-xl border ${isHighlighted && (isCenterOther || isCenterNone) ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Center</span>
                                                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight truncate ${isCenterOther || isCenterNone ? 'text-rose-600' : 'text-gray-700'}`}>
                                                            <Building2 className="h-3 w-3 flex-shrink-0" />
                                                            {centerName}
                                                        </div>
                                                    </div>
                                                    <div className={`flex flex-col gap-1 p-2.5 rounded-xl border ${isHighlighted && (isCounselorOther || isCounselorNone) ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Counselor</span>
                                                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight truncate ${isCounselorOther || isCounselorNone ? 'text-rose-600' : 'text-gray-700'}`}>
                                                            <UserCheck className="h-3 w-3 flex-shrink-0" />
                                                            {counselorName}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 p-2.5 rounded-xl border bg-gray-50 border-gray-100">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Ashram</span>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight truncate text-gray-700">
                                                            <Home className="h-3 w-3 flex-shrink-0" />
                                                            {uH?.ashram || 'None'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setUserToVerify(user); setVerificationAction('rejected'); setVerificationMode('single'); setShowRejectionModal(true); }}
                                                        className="flex-1 py-2.5 bg-white border-2 border-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <X className="h-4 w-4 stroke-[3px]" /> Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserVerification(user.id, 'approved')}
                                                        className={`flex-[1.5] py-2.5 ${isHighlighted ? 'bg-rose-600' : 'bg-emerald-600'} text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2`}
                                                    >
                                                        <Check className="h-4 w-4 stroke-[3px]" /> Verify Identity
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals Section */}

            {/* Counselor Action Modal */}
            {showCounselorModal && counselorActionUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 animate-in zoom-in-95 duration-200 overflow-hidden border border-amber-100">
                        {/* Header */}
                        <div className={`p-6 flex flex-col items-center text-center gap-3 bg-gradient-to-br ${counselorActionType === 'assign' ? 'from-primary-500 to-orange-600' : 'from-rose-500 to-red-600'}`}>
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                                {counselorActionType === 'assign' ? <ShieldCheck className="h-8 w-8" /> : <ShieldAlert className="h-8 w-8" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                                    {counselorActionType === 'assign' ? 'Appoint Authority' : 'Revoke Authority'}
                                </h2>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">
                                    {counselorActionUser.name}
                                </p>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            {counselorActionType === 'assign' ? (
                                <>
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold text-gray-600 text-center">Select the spiritual role for this devotee:</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setSelectedCounselorRole('counselor')}
                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedCounselorRole === 'counselor' ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-500/10' : 'border-gray-100 bg-gray-50 hover:border-primary-200'}`}
                                            >
                                                <UserCheck className={`h-6 w-6 ${selectedCounselorRole === 'counselor' ? 'text-primary-600' : 'text-gray-400'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedCounselorRole === 'counselor' ? 'text-primary-700' : 'text-gray-500'}`}>Counselor</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCounselorRole('care_giver')}
                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedCounselorRole === 'care_giver' ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10' : 'border-gray-100 bg-gray-50 hover:border-blue-200'}`}
                                            >
                                                <Heart className={`h-6 w-6 ${selectedCounselorRole === 'care_giver' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedCounselorRole === 'care_giver' ? 'text-blue-700' : 'text-gray-500'}`}>Care Giver</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 border-dashed">
                                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed text-center italic">
                                            &quot;Appointing a devotee as an authority will synchronize their role and identity in the database.&quot;
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex items-start gap-4">
                                        <AlertTriangle className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-black text-rose-900 uppercase tracking-tight">Revocation Warning</p>
                                            <p className="text-xs font-bold text-rose-700/80 mt-1 leading-relaxed">
                                                This will remove all spiritual authority roles from this user and delete their record from the counselors directory.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 text-center uppercase tracking-widest">Are you sure you want to proceed?</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCounselorModal(false)}
                                    className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCounselorAction}
                                    disabled={isProcessingCounselor}
                                    className={`flex-[2] py-3.5 ${counselorActionType === 'assign' ? 'bg-primary-600 shadow-primary-200' : 'bg-rose-600 shadow-rose-200'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2`}
                                >
                                    {isProcessingCounselor ? <Activity className="h-4 w-4 animate-spin" /> : (counselorActionType === 'assign' ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />)}
                                    {isProcessingCounselor ? 'Processing...' : (counselorActionType === 'assign' ? 'Confirm Role' : 'Confirm Revocation')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Center Modal */}
            {
                showAddCenterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-[90%] sm:w-[80%] md:w-full md:max-w-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-gray-100">

                            {/* Colorful Header */}
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Add New Center</h2>
                                    <p className="text-orange-100 text-sm mt-1">Enter the details for the new ISKCON center.</p>
                                </div>
                                <button
                                    onClick={() => setShowAddCenterModal(false)}
                                    className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddCenter} className="p-6 space-y-6">
                                {/* Center Details Section */}
                                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 space-y-4">
                                    <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Center Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Center Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={newCenter.name}
                                                onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                                                placeholder="e.g. Bhaktivedanta Youth Post"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Associated Temple *</label>
                                            <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium">
                                                {selectedTemple?.name || 'Loading...'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Management Team Section */}
                                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 space-y-4">
                                    <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Management Team
                                    </h3>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Manager *</label>
                                        <SearchableSelect
                                            options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                            value={newCenter.projectManagerId}
                                            onChange={(val) => setNewCenter({ ...newCenter, projectManagerId: val })}
                                            placeholder="Search & Select Project Manager..."
                                            valueProperty="id"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Advisor (Optional)</label>
                                            <SearchableSelect
                                                options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                value={newCenter.projectAdvisorId}
                                                onChange={(val) => setNewCenter({ ...newCenter, projectAdvisorId: val })}
                                                placeholder="Search Advisor..."
                                                valueProperty="id"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Acting Manager (Optional)</label>
                                            <SearchableSelect
                                                options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                value={newCenter.actingManagerId}
                                                onChange={(val) => setNewCenter({ ...newCenter, actingManagerId: val })}
                                                placeholder="Search Manager..."
                                                valueProperty="id"
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* Service Team Section */}
                                <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-200/50 space-y-4">
                                    <h3 className="text-sm font-bold text-teal-900 flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" />
                                        Service Team / Operational Roles
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { label: 'OC', key: 'ocId', placeholder: 'Select OC...' },
                                            { label: 'Internal Manager', key: 'internalManagerId', placeholder: 'Select Internal Manager...' },
                                            { label: 'Morning Program In-charge', key: 'morningProgramInChargeId', placeholder: 'Select In-charge...' },
                                            { label: 'Accountant', key: 'accountantId', placeholder: 'Select Accountant...' },
                                            { label: 'Kitchen Head', key: 'kitchenHeadId', placeholder: 'Select Kitchen Head...' },
                                            { label: 'Study In-charge', key: 'studyInChargeId', placeholder: 'Select Study In-charge...' }
                                        ].map((role) => (
                                            <div key={role.key} className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{role.label}</label>
                                                <SearchableSelect
                                                    options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                    value={newCenter[role.key as keyof typeof newCenter] as string}
                                                    onChange={(val) => setNewCenter({ ...newCenter, [role.key]: val })}
                                                    placeholder={role.placeholder}
                                                    valueProperty="id"
                                                />
                                            </div>
                                        ))}

                                        {/* Multi-user Roles (Mentor & Frontliner) */}
                                        {[
                                            { label: 'Preaching Coordinators', key: 'preachingCoordinatorIds' as const },
                                            { label: 'Grihstha Counselors', key: 'grihsthaCounselorIds' as const },
                                            { label: 'Easy Incharges', key: 'easyInchargeIds' as const },
                                            { label: 'Prerna Incharges', key: 'prernaInchargeIds' as const },
                                            { label: 'Mentors', key: 'mentorIds' as const },
                                            { label: 'Frontliners', key: 'frontlinerIds' as const }
                                        ].map((role) => (
                                            <div key={role.key} className="space-y-1.5 col-span-full">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{role.label}</label>
                                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                                                    {/* Search Input for these specific roles */}
                                                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                                        <SearchableSelect
                                                            options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                            value=""
                                                            onChange={(val) => {
                                                                if (val && !newCenter[role.key].includes(val)) {
                                                                    setNewCenter({ ...newCenter, [role.key]: [...newCenter[role.key], val] });
                                                                }
                                                            }}
                                                            placeholder={`Search to add ${role.label}...`}
                                                            valueProperty="id"
                                                        />
                                                    </div>
                                                    {/* Selected Users Chips */}
                                                    <div className="p-3 flex flex-wrap gap-2 min-h-[44px]">
                                                        {newCenter[role.key].length === 0 ? (
                                                            <span className="text-xs text-gray-400 italic">No users selected</span>
                                                        ) : (
                                                            newCenter[role.key].map(uid => {
                                                                const user = users.find(u => u.id === uid);
                                                                return (
                                                                    <div key={uid} className="flex items-center gap-1.5 bg-teal-100 text-teal-800 px-2 py-1 rounded-md text-[10px] font-bold border border-teal-200">
                                                                        {user?.name || 'Unknown'}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setNewCenter({
                                                                                ...newCenter,
                                                                                [role.key]: newCenter[role.key].filter(id => id !== uid)
                                                                            })}
                                                                            className="text-teal-600 hover:text-teal-800"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Location & Contact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <textarea
                                                value={newCenter.address}
                                                onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm min-h-[42px] resize-none overflow-hidden"
                                                placeholder="Street, Area..."
                                                rows={1}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={newCenter.contact}
                                                onChange={(e) => setNewCenter({ ...newCenter, contact: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                                                placeholder="+91..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCenterModal(false)}
                                        className="px-6 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-medium rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Center'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Center Modal */}
            {
                showEditCenterModal && editingCenter && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-[90%] md:max-w-3xl lg:max-w-4xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-gray-100">

                            {/* Colorful Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Edit Center</h2>
                                    <p className="text-blue-100 text-sm mt-1">Update center details and management team.</p>
                                </div>
                                <button
                                    onClick={() => setShowEditCenterModal(false)}
                                    className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleEditCenter} className="p-6 space-y-6">
                                {/* Center Details Section */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-4">
                                    <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Center Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Center Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={editingCenter.name}
                                                onChange={(e) => setEditingCenter({ ...editingCenter, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="e.g. Bhaktivedanta Youth Post"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Associated Temple *</label>
                                            <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium">
                                                {selectedTemple?.name || 'Loading...'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                                            <input
                                                type="text"
                                                value={editingCenter.address}
                                                onChange={(e) => setEditingCenter({ ...editingCenter, address: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="Street Address, Area"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</label>
                                            <input
                                                type="text"
                                                value={editingCenter.contact}
                                                onChange={(e) => setEditingCenter({ ...editingCenter, contact: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                                placeholder="Phone or Email"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Management Team Section */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-4">
                                    <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Management Team
                                    </h3>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Manager *</label>
                                        <SearchableSelect
                                            options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                            value={editingCenter.projectManagerId}
                                            onChange={(val) => setEditingCenter({ ...editingCenter, projectManagerId: val })}
                                            placeholder="Search & Select Project Manager..."
                                            valueProperty="id"
                                        />
                                        <p className="text-[10px] text-gray-400 italic">This user will be assigned the Project Manager role.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Advisor</label>
                                            <SearchableSelect
                                                options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                value={editingCenter.projectAdvisorId}
                                                onChange={(val) => setEditingCenter({ ...editingCenter, projectAdvisorId: val })}
                                                placeholder="Select Advisor..."
                                                valueProperty="id"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Acting Manager</label>
                                            <SearchableSelect
                                                options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                value={editingCenter.actingManagerId}
                                                onChange={(val) => setEditingCenter({ ...editingCenter, actingManagerId: val })}
                                                placeholder="Select Acting Manager..."
                                                valueProperty="id"
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* Service Team Section */}
                                <div className="bg-violet-50/70 p-4 rounded-xl border border-violet-200/50 space-y-4">
                                    <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" />
                                        Service Team / Operational Roles
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { label: 'OC', key: 'ocId', placeholder: 'Select OC...' },
                                            { label: 'Internal Manager', key: 'internalManagerId', placeholder: 'Select Internal Manager...' },
                                            { label: 'Morning Program In-charge', key: 'morningProgramInChargeId', placeholder: 'Select In-charge...' },
                                            { label: 'Accountant', key: 'accountantId', placeholder: 'Select Accountant...' },
                                            { label: 'Kitchen Head', key: 'kitchenHeadId', placeholder: 'Select Kitchen Head...' },
                                            { label: 'Study In-charge', key: 'studyInChargeId', placeholder: 'Select Study In-charge...' }
                                        ].map((role) => (
                                            <div key={role.key} className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{role.label}</label>
                                                <SearchableSelect
                                                    options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                    value={editingCenter[role.key as keyof typeof editingCenter] as string || ''}
                                                    onChange={(val) => setEditingCenter({ ...editingCenter, [role.key]: val })}
                                                    placeholder={role.placeholder}
                                                    valueProperty="id"
                                                />
                                            </div>
                                        ))}

                                        {/* Multi-user Roles (Mentor & Frontliner) */}
                                        {[
                                            { label: 'Preaching Coordinators', key: 'preachingCoordinatorIds' as const },
                                            { label: 'Grihstha Counselors', key: 'grihsthaCounselorIds' as const },
                                            { label: 'Easy Incharges', key: 'easyInchargeIds' as const },
                                            { label: 'Prerna Incharges', key: 'prernaInchargeIds' as const },
                                            { label: 'Mentors', key: 'mentorIds' as const },
                                            { label: 'Frontliners', key: 'frontlinerIds' as const }
                                        ].map((role) => (
                                            <div key={role.key} className="space-y-1.5 col-span-full">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{role.label}</label>
                                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                                                    {/* Search Input for these specific roles */}
                                                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                                        <SearchableSelect
                                                            options={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
                                                            value=""
                                                            onChange={(val) => {
                                                                if (val && !editingCenter[role.key].includes(val)) {
                                                                    setEditingCenter({ ...editingCenter, [role.key]: [...editingCenter[role.key], val] });
                                                                }
                                                            }}
                                                            placeholder={`Search to add ${role.label}...`}
                                                            valueProperty="id"
                                                        />
                                                    </div>
                                                    {/* Selected Users Chips */}
                                                    <div className="p-3 flex flex-wrap gap-2 min-h-[44px]">
                                                        {editingCenter[role.key].length === 0 ? (
                                                            <span className="text-xs text-gray-400 italic">No users selected</span>
                                                        ) : (
                                                            editingCenter[role.key].map(uid => {
                                                                const user = users.find(u => u.id === uid);
                                                                return (
                                                                    <div key={uid} className="flex items-center gap-1.5 bg-violet-100 text-violet-800 px-2 py-1 rounded-md text-[10px] font-bold border border-violet-200">
                                                                        {user?.name || 'Unknown'}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingCenter({
                                                                                ...editingCenter,
                                                                                [role.key]: editingCenter[role.key].filter(id => id !== uid)
                                                                            })}
                                                                            className="text-violet-600 hover:text-violet-800"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditCenterModal(false)}
                                        className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            'Update Center'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Role Assignment Modal */}
            {
                showAssignModal && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-[92%] sm:w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col h-[80vh] sm:h-auto sm:max-h-[90vh]">
                            <div className="p-6 sm:p-10 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative flex-shrink-0">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl" />
                                <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-xl flex-shrink-0">
                                        {selectedUser.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">{selectedUser.name}</h3>
                                        <p className="text-indigo-100 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5">Capability Management</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAssignModal(false)}
                                        className="p-1.5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 sm:p-10 space-y-6 sm:y-8 bg-[#fffdfa] scroll-smooth no-scrollbar">
                                {/* Administrative Section */}
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 border-b border-indigo-50 pb-2">
                                        <Shield className="h-3 w-3" /> Admin Authorization
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {((): any[] => {
                                            const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
                                            const isSuperAdmin = userRoles.some(r => Number(r) === 8 || String(r) === 'super_admin');

                                            const userRoleNum = userRoles.some(r => Number(r) === 11 || String(r) === 'managing_director') ? 11 :
                                                userRoles.some(r => Number(r) === 12 || String(r) === 'director') ? 12 :
                                                    userRoles.some(r => Number(r) === 13 || String(r) === 'central_voice_manager') ? 13 : 99;

                                            return MANAGEABLE_ROLES.filter(role => {
                                                if (isSuperAdmin) return true;
                                                if (role.value === 1) return true;
                                                if (typeof role.value === 'number') {
                                                    return role.value > userRoleNum;
                                                }
                                                return true;
                                            });
                                        })().map((role: any) => (
                                            <button
                                                key={role.value}
                                                onClick={() => setPendingAdminRole(role.value)}
                                                className={`flex items-center justify-between p-3.5 sm:p-4 px-5 rounded-2xl border-2 transition-all group ${pendingAdminRole === role.value ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-4 ring-indigo-500/5' : 'bg-gray-50 border-transparent hover:border-indigo-200 hover:bg-white'}`}
                                            >
                                                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${pendingAdminRole === role.value ? 'text-indigo-700' : 'text-gray-500 group-hover:text-indigo-600'}`}>
                                                    {role.label}
                                                </span>
                                                {pendingAdminRole === role.value && (
                                                    <div className="h-5 w-5 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                        <Check className="h-3 w-3 stroke-[3px]" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Center Allocation */}
                                {[14, 15, 16, 17].includes(Number(pendingAdminRole)) && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1 border-b border-amber-50 pb-2">
                                            <Building2 className="h-3 w-3" /> Assigned Centers
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {centers.length > 0 ? (
                                                centers.map((center) => (
                                                    <button
                                                        key={center.id}
                                                        onClick={() => {
                                                            if (pendingCenters.includes(center.id)) {
                                                                setPendingCenters(pendingCenters.filter(id => id !== center.id));
                                                            } else {
                                                                setPendingCenters([...pendingCenters, center.id]);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 p-3 px-4 rounded-xl border transition-all text-left ${pendingCenters.includes(center.id) ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-gray-50 border-transparent hover:border-amber-200 hover:bg-white'}`}
                                                    >
                                                        <div className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${pendingCenters.includes(center.id) ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-300'}`}>
                                                            {pendingCenters.includes(center.id) && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                                                        </div>
                                                        <span className={`text-[10px] sm:text-[11px] font-bold truncate ${pendingCenters.includes(center.id) ? 'text-amber-800' : 'text-gray-600'}`}>
                                                            {center.name}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="col-span-full py-6 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No centers found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Spiritual Section */}
                                {(() => {
                                    const currentAdminRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
                                    const canManageSpiritual = currentAdminRoles.some(r => [8, 11, 12, 13].includes(Number(r)) || ['super_admin', 'managing_director', 'director', 'central_voice_manager'].includes(String(r)));

                                    if (!canManageSpiritual) return null;

                                    return (
                                        <div className="space-y-4">
                                            <h4 className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 border-b border-emerald-50 pb-2">
                                                <Award className="h-3 w-3" /> Spiritual Rank
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { label: 'None / Remove Authority', value: 'none' },
                                                    { label: 'Spiritual Counselor', value: 2 },
                                                    { label: 'Care Giver', value: 20 }
                                                ].map((role) => (
                                                    <button
                                                        key={role.value}
                                                        onClick={() => setPendingSpiritualRole(role.value as any)}
                                                        className={`flex items-center justify-between p-3.5 sm:p-4 px-5 rounded-2xl border-2 transition-all group ${pendingSpiritualRole === role.value ? (role.value === 'none' ? 'bg-gray-100 border-gray-400 shadow-sm' : 'bg-emerald-50 border-emerald-500 shadow-sm ring-4 ring-emerald-500/5') : 'bg-gray-50 border-transparent hover:border-emerald-200 hover:bg-white'}`}
                                                    >
                                                        <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${pendingSpiritualRole === role.value ? (role.value === 'none' ? 'text-gray-700' : 'text-emerald-700') : 'text-gray-500 group-hover:text-emerald-600'}`}>
                                                            {role.label}
                                                        </span>
                                                        {pendingSpiritualRole === role.value && (
                                                            <div className={`h-5 w-5 ${role.value === 'none' ? 'bg-gray-400' : 'bg-emerald-500'} text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                                <Check className="h-3.5 w-3.5 stroke-[3px]" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="p-5 sm:p-10 pt-0 bg-[#fffdfa] flex-shrink-0 border-t border-gray-100 sm:border-0">
                                <div className="flex flex-col gap-2.5 sm:gap-3 pt-4 sm:pt-0">
                                    <button
                                        onClick={handleAssignRole}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck className="h-4 w-4" /> Save Authority
                                    </button>
                                    <button
                                        onClick={() => setShowAssignModal(false)}
                                        className="w-full py-3.5 bg-white text-gray-400 font-black text-[10px] uppercase tracking-widest border-2 border-gray-50 rounded-2xl hover:bg-gray-50 hover:text-gray-600 transition-all"
                                    >
                                        Discard Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Rejection Reason Modal */}
            {
                showRejectionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                            <div className="p-8 sm:p-10 bg-gradient-to-br from-rose-600 to-red-700 text-white relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl" />
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl">
                                        <AlertTriangle className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Access Denied</h3>
                                        <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mt-0.5">Identity Verification Failed</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 sm:p-10 space-y-8 bg-[#fffdfa]">
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
                                            if (verificationMode === 'single' && userToVerify) {
                                                handleUserVerification(userToVerify.id, 'rejected', rejectionReason);
                                            } else {
                                                handleBulkVerification('rejected', rejectionReason);
                                            }
                                            setShowRejectionModal(false);
                                            setRejectionReason('');
                                            setUserToVerify(null);
                                        }}
                                        disabled={!rejectionReason.trim()}
                                        className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        Confirm Rejection
                                    </button>
                                    <button
                                        onClick={() => setShowRejectionModal(false)}
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

            {/* User Details Modal */}
            <UserDetailModal
                isOpen={showViewModal}
                user={userForView}
                onClose={() => {
                    setShowViewModal(false);
                    setUserForView(null);
                }}
            />
        </div >
    );
}



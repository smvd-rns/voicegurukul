'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getUsersByCounselorEmail } from '@/lib/supabase/counselors';
import { fetchSadhanaHistory, fetchBulkSadhanaReports } from '@/lib/api/sadhana-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { User, SadhanaReport } from '@/types';
import {
  Users, Loader2, Mail, Phone, MapPin, Building2, UserCircle,
  TrendingUp, Sparkles, ChevronLeft, ChevronRight, ChevronDown, FileCheck,
  Check, X, AlertCircle, Calendar, ShieldCheck, Search, Filter,
  Clock, Award, History, ArrowRight, ShieldAlert, Lock, Shield, Edit, Plus, Trash2, Heart,
  User as UserIcon, CheckCircle, XCircle, Eye, Activity,
  ArrowDownAZ, ArrowUpZA, ArrowUpDown, RotateCcw, Compass, BarChart3
} from 'lucide-react';
import { getRoleDisplayName, getHighestRole } from '@/lib/utils/roles';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/config';
import UserDetailModal from '@/components/dashboard/UserDetailModal';

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

interface StudentWithProgress extends User {
  avgSoulPercent?: number;
  avgBodyPercent?: number; // Added for new table
  progressRating?: string;
  progressColor?: string;
  progressBgColor?: string;
  totalReports?: number;
}

export default function CounselorPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data Mapping Loader (MD Parity)
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

    return {
      ...user,
      birthDate: user.birth_date,
      role: normalizedRole,
      hierarchy: hierarchy,
      createdAt: user.created_at ? new Date(user.created_at) : undefined,
      updatedAt: user.updated_at ? new Date(user.updated_at) : undefined,
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
      // Health fields
      healthChronicDisease: user.health_chronic_disease,
      introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
    } as User;
  };

  const [activeTab, setActiveTab] = useState<'spiritual-approvals' | 'new-dev-approvals' | 'sadhana-reports'>('sadhana-reports');
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart & Aggregated State
  const [aggregatedStats, setAggregatedStats] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Profile Requests State
  const [profileRequests, setProfileRequests] = useState<ProfileRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // New Dev Approvals State
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const PROFILE_ASHRAMS = [
    'Student and Not decided',
    'Working and Not Decided',
    'Gauranga Sabha',
    'Nityananda Sabha',
    'Brahmachari',
    'Grihastha',
    'Staying Single (Not planning to marry)',
  ] as const;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
  const [selectedAshram, setSelectedAshram] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'soul-desc' | 'soul-asc' | 'reports-desc'>('name-asc');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [showChart, setShowChart] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // New state for items per page
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    devotees: 0,
    pendingSpiritual: 0,
    pendingRegistrations: 0,
    loading: true
  });

  // Bulk Selection State
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedPendingUserIds, setSelectedPendingUserIds] = useState<string[]>([]);

  // Modal State
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Individual Request State
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState('');

  // Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: 'approved' | 'rejected' | null;
    count: number;
    requestId?: string | null;
    mode: 'single' | 'bulk';
    source: 'spiritual' | 'registration';
  }>({ isOpen: false, type: null, count: 0, requestId: null, mode: 'single', source: 'spiritual' });

  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [targetForRejection, setTargetForRejection] = useState<{ id: string, name: string } | null>(null);

  // Check if user has counselor role
  // userData.role may be string names (after normalization) or numeric IDs - handle both
  const rawUserRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = rawUserRoles.some((r: any) => {
    const numR = Number(r);
    // Numeric: 2 = counselor, 3 = senior_counselor, 20 = care_giver
    if (!isNaN(numR)) return numR === 2 || numR === 3 || numR === 20;
    // String names
    const roleStr = String(r).toLowerCase();
    return roleStr === 'counselor' || roleStr === 'senior_counselor' || roleStr === 'care_giver';
  });

  const loadDashboardData = useCallback(async (customRange?: { from: string; to: string }) => {
    if (!userData?.email || !hasCounselorRole) {
      setLoading(false);
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const activeRange = customRange || dateRange;
    setLoading(true);
    setIsAnalyzing(true);
    setStats(prev => ({ ...prev, loading: true }));

    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const res = await fetch(`/api/counselor/dashboard?from=${activeRange.from}&to=${activeRange.to}&_t=${Date.now()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load counselor dashboard');
      }

      // 1. Update stats
      if (json.stats) {
        setStats({
          devotees: json.stats.devotees || 0,
          pendingRegistrations: json.stats.pendingRegistrations || 0,
          pendingSpiritual: json.stats.pendingSpiritual || 0,
          loading: false,
        });
      }

      // 2. Update pending devotees list
      if (json.pendingStudents) {
        setPendingUsers(json.pendingStudents.map(mapUserData));
      }

      // 3. Process approved devotees and sadhana reports
      const assignedStudents = json.approvedStudents || [];
      const allReports = json.reports || [];

      if (assignedStudents.length === 0) {
        setStudents([]);
        setAggregatedStats([]);
        return;
      }

      const totalDaysToDivide = Math.max(1, differenceInCalendarDays(parseISO(activeRange.to), parseISO(activeRange.from)) + 1);

      // Group reports by userId
      const reportsByUser = allReports.reduce((acc: any, report: any) => {
        const uId = report.user_id || report.userId;
        if (!acc[uId]) acc[uId] = [];
        acc[uId].push({
          ...report,
          userId: uId,
          soulPercent: Number(report.soul_percent ?? report.soulPercent ?? 0),
          bodyPercent: Number(report.body_percent ?? report.bodyPercent ?? 0),
        });
        return acc;
      }, {} as Record<string, any[]>);

      const studentsWithProgress: StudentWithProgress[] = assignedStudents.map((student: any) => {
        const reports = reportsByUser[student.id] || [];

        const totalSoulPoints = reports.reduce((sum: number, r: any) => sum + (r.soulPercent || 0), 0);
        const avgSoulPercentNum = reports.length > 0 ? parseFloat((totalSoulPoints / reports.length).toFixed(1)) : 0;

        const totalBodyPoints = reports.reduce((sum: number, r: any) => sum + (r.bodyPercent || 0), 0);
        const avgBodyPercentNum = reports.length > 0 ? parseFloat((totalBodyPoints / reports.length).toFixed(1)) : 0;

        let progressRating = 'No Reports';
        let progressColor = 'text-gray-600';
        let progressBgColor = 'bg-gray-100';

        if (reports.length > 0) {
          if (avgSoulPercentNum >= 80) {
            progressRating = 'Excellent';
            progressColor = 'text-green-600';
            progressBgColor = 'bg-green-100';
          } else if (avgSoulPercentNum >= 50) {
            progressRating = 'Good Progress';
            progressColor = 'text-blue-600';
            progressBgColor = 'bg-blue-100';
          } else if (avgSoulPercentNum > 0) {
            progressRating = 'Needs Improvement';
            progressColor = 'text-orange-600';
            progressBgColor = 'bg-orange-100';
          } else {
            progressRating = 'No Progress';
            progressColor = 'text-gray-600';
            progressBgColor = 'bg-gray-100';
          }
        }

        return {
          ...mapUserData(student),
          avgSoulPercent: avgSoulPercentNum,
          avgBodyPercent: avgBodyPercentNum,
          progressRating,
          progressColor,
          progressBgColor,
          totalReports: reports.length,
        };
      });

      setStudents(studentsWithProgress);

      // 4. Aggregate Data for Chart (Daily average of group)
      const dataByDate = allReports.reduce((acc: any, report: any) => {
        const reportDate = typeof report.date === 'string' ? parseISO(report.date) : report.date;
        const dateKey = format(reportDate, 'MM/dd');
        if (!acc[dateKey]) acc[dateKey] = { date: dateKey, soul: 0, body: 0, count: 0 };
        acc[dateKey].soul += Number(report.soul_percent ?? report.soulPercent ?? 0);
        acc[dateKey].body += Number(report.body_percent ?? report.bodyPercent ?? 0);
        acc[dateKey].count += 1;
        return acc;
      }, {} as Record<string, any>);

      const chartData = Object.values(dataByDate)
        .map((d: any) => ({
          name: d.date,
          'Avg Soul %': Math.round(d.soul / d.count),
          'Avg Body %': Math.round(d.body / d.count),
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setAggregatedStats(chartData);

    } catch (error) {
      console.error('Error loading counselor dashboard:', error);
      toast.error('Failed to load group progress');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [userData, hasCounselorRole, dateRange]);

  const loadStudents = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  const loadPendingUsers = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  const loadStats = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  const loadProfileRequests = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole) return;
    setLoadingRequests(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const response = await fetch(`/api/profile-requests?status=${approvalStatus}&_t=${Date.now()}`, {
        headers: token ? { ...(token ? { "Authorization": `Bearer ${token}` } : {}) } : undefined,
        cache: 'no-store'
      });
      const json = await response.json();
      if (json.success) {
        setProfileRequests(json.data);
      }
    } catch (error) {
      console.error('Error loading profile requests:', error);
      toast.error('Failed to load profile requests');
    } finally {
      setLoadingRequests(false);
    }
  }, [userData?.email, hasCounselorRole, approvalStatus]);

  // LOAD BASE DATA ONCE
  useEffect(() => {
    if (authLoading) return;
    if (userData && hasCounselorRole) {
      loadDashboardData();
    } else if (!authLoading && userData && !hasCounselorRole) {
      router.replace('/dashboard');
    }
  }, [userData, hasCounselorRole, authLoading, router, loadDashboardData]);

  // LOAD TAB-SPECIFIC DATA
  useEffect(() => {
    if (userData && hasCounselorRole) {
      if (activeTab === 'spiritual-approvals') loadProfileRequests();
    }
  }, [activeTab, loadProfileRequests, userData, hasCounselorRole]);

  // Approval Handlers
  const handleProfileApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const response = await fetch(`/api/profile-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: action,
          feedback: feedback,
          approvedFields: action === 'approved' ? selectedFields[requestId] : undefined
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`Request ${action} successfully`);
        setProfileRequests(prev => prev.filter(r => r.id !== requestId));
        setFeedback('');
        setExpandedRequestId(null);
        loadStats();
      } else {
        toast.error(json.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing profile request:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDevoteeApproval = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!supabase) return;
    setIsProcessing(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/admin/verify-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'user',
          id: userId,
          action: action,
          reason: reason
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`User ${action === 'approve' ? 'verified' : 'rejected'} successfully`);
        loadPendingUsers();
        loadStats();
      } else {
        toast.error(json.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error processing devotee verification:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkProfileApproval = async (action: 'approved' | 'rejected', reason?: string) => {
    if (selectedRequestIds.length === 0) return;
    setIsProcessing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const response = await fetch('/api/profile-requests/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          requestIds: selectedRequestIds,
          status: action,
          feedback: action === 'rejected' ? (feedback || 'Bulk rejection from counselor') : undefined
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`${selectedRequestIds.length} requests ${action} successfully`);
        setSelectedRequestIds([]);
        loadProfileRequests();
        loadStats();
      } else {
        toast.error(json.error || 'Failed to process bulk requests');
      }
    } catch (error) {
      console.error('Error in bulk profile approval:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDevoteeApproval = async (action: 'approve' | 'reject', reason?: string) => {
    if (selectedPendingUserIds.length === 0 || !supabase) return;
    setIsProcessing(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/admin/verify-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'user',
          ids: selectedPendingUserIds,
          action: action,
          reason: reason
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`${selectedPendingUserIds.length} users ${action === 'approve' ? 'verified' : 'rejected'} successfully`);
        setSelectedPendingUserIds([]);
        loadPendingUsers();
        loadStats();
      } else {
        toast.error(json.error || 'Failed to update users status');
      }
    } catch (error) {
      console.error('Error in bulk devotee verification:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };


  // Alphabet listing for quick jumping
  const ALPHABET = ['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] as const;

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      const firstChar = (s.name || '').trim().charAt(0).toUpperCase();
      if (firstChar >= 'A' && firstChar <= 'Z') {
        set.add(firstChar);
      }
    });
    return set;
  }, [students]);

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-amber-500 to-orange-600 text-white',
      'from-violet-500 to-purple-600 text-white',
      'from-rose-500 to-pink-600 text-white',
      'from-emerald-500 to-teal-600 text-white',
      'from-sky-500 to-blue-600 text-white',
      'from-indigo-500 to-cyan-600 text-white',
      'from-fuchsia-500 to-rose-600 text-white',
    ];
    let sum = 0;
    for (let i = 0; i < (name || '').length; i++) {
      sum += (name || '').charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const sName = student.name || '';
        const sEmail = student.email || '';
        const sPhone = student.phone || '';
        const sInitiated = student.hierarchy?.initiatedName || '';

        const matchesSearch = sName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sPhone.includes(searchTerm) ||
          sInitiated.toLowerCase().includes(searchTerm.toLowerCase());

        // A-Z letter filter
        let matchesLetter = true;
        if (selectedLetter !== 'all') {
          const firstChar = sName.trim().charAt(0).toUpperCase();
          matchesLetter = firstChar === selectedLetter.toUpperCase();
        }

        // Ashram filter logic
        let matchesAshram = true;
        if (selectedAshram !== 'all') {
          const sAshram = (student.hierarchy?.ashram || (student as any).ashram || '').trim().toLowerCase();
          const sel = selectedAshram.trim().toLowerCase();
          if (sel === 'student and not decided') {
            matchesAshram = sAshram === 'student and not decided' || sAshram === 'student';
          } else if (sel === 'working and not decided') {
            matchesAshram = sAshram === 'working and not decided' || sAshram === 'working';
          } else if (sel === 'brahmachari') {
            matchesAshram = sAshram.includes('brahmachari');
          } else if (sel === 'grihastha') {
            matchesAshram = sAshram.includes('grihastha');
          } else {
            matchesAshram = sAshram === sel || sAshram.includes(sel);
          }
        }

        // Camp filter logic
        let matchesCamp = true;
        if (selectedCampFilter !== 'all') {
          switch (selectedCampFilter) {
            case 'DYS':
              matchesCamp = student.campDys === true;
              break;
            case 'Sankalpa':
              matchesCamp = student.campSankalpa === true;
              break;
            case 'Sphurti':
              matchesCamp = student.campSphurti === true;
              break;
            case 'Utkarsh':
              matchesCamp = student.campUtkarsh === true;
              break;
            case 'SRCGD Workshop':
              matchesCamp = student.campSrcgdWorkshop === true;
              break;
            case 'Nishtha':
              matchesCamp = student.campNishtha === true;
              break;
            case 'FTEC':
              matchesCamp = student.campFtec === true;
              break;
            case 'Ashraya':
              matchesCamp = student.campAshraya === true;
              break;
            case 'MTEC':
              matchesCamp = student.campMtec === true;
              break;
            case 'Sharanagati':
              matchesCamp = student.campSharanagati === true;
              break;
            case 'IDC':
              matchesCamp = student.campIdc === true;
              break;
            default:
              matchesCamp = true;
          }
        }

        return matchesSearch && matchesLetter && matchesAshram && matchesCamp;
      })
      .sort((a, b) => {
        if (sortOrder === 'name-asc') {
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortOrder === 'name-desc') {
          return (b.name || '').localeCompare(a.name || '');
        } else if (sortOrder === 'soul-desc') {
          return (b.avgSoulPercent || 0) - (a.avgSoulPercent || 0);
        } else if (sortOrder === 'soul-asc') {
          return (a.avgSoulPercent || 0) - (b.avgSoulPercent || 0);
        } else if (sortOrder === 'reports-desc') {
          return (b.totalReports || 0) - (a.totalReports || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [students, searchTerm, selectedLetter, selectedCampFilter, selectedAshram, sortOrder]);

  // Dynamic statistics recomputed as per active filters
  const isFiltered = selectedLetter !== 'all' || searchTerm !== '' || selectedCampFilter !== 'all' || selectedAshram !== 'all';

  const dynamicStats = useMemo(() => {
    const total = filteredStudents.length;
    const activeReporters = filteredStudents.filter(s => (s.totalReports || 0) > 0).length;
    const totalReportsSum = filteredStudents.reduce((acc, s) => acc + (s.totalReports || 0), 0);
    const avgReports = total > 0 ? (totalReportsSum / total).toFixed(1) : '0';

    const soulSum = filteredStudents.reduce((acc, s) => acc + (s.avgSoulPercent || 0), 0);
    const avgSoul = total > 0 ? Math.round(soulSum / total) : 0;
    const excellentCount = filteredStudents.filter(s => (s.avgSoulPercent || 0) >= 80).length;

    const bodySum = filteredStudents.reduce((acc, s) => acc + (s.avgBodyPercent || 0), 0);
    const avgBody = total > 0 ? Math.round(bodySum / total) : 0;

    const needsGuidanceCount = filteredStudents.filter(s => (s.totalReports || 0) === 0 || (s.avgSoulPercent || 0) < 50).length;
    const zeroReportsCount = filteredStudents.filter(s => (s.totalReports || 0) === 0).length;

    return {
      total,
      activeReporters,
      avgReports,
      avgSoul,
      excellentCount,
      avgBody,
      needsGuidanceCount,
      zeroReportsCount
    };
  }, [filteredStudents]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const confirmAction = async () => {
    if (confirmation.type) {
      if (confirmation.source === 'spiritual') {
        if (confirmation.mode === 'single' && confirmation.requestId) {
          await handleProfileApproval(confirmation.requestId, confirmation.type);
        } else if (confirmation.mode === 'bulk') {
          await handleBulkProfileApproval(confirmation.type, feedback);
        }
      } else if (confirmation.source === 'registration') {
        if (confirmation.mode === 'single' && confirmation.requestId) {
          await handleDevoteeApproval(confirmation.requestId, confirmation.type === 'approved' ? 'approve' : 'reject');
        } else if (confirmation.mode === 'bulk') {
          await handleBulkDevoteeApproval(confirmation.type === 'approved' ? 'approve' : 'reject');
        }
      }
      setConfirmation({ isOpen: false, type: null, count: 0, requestId: null, mode: 'single', source: 'spiritual' });
    }
  };

  const toggleSelectAllProfiles = () => {
    if (selectedRequestIds.length === profileRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(profileRequests.map(r => r.id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const renderFieldChange = (requestId: string, key: string, newValue: any, oldValue: any) => {
    // Skip internal technical ID fields (show names instead)
    if (key === 'counselorId' || key === 'counselor_id') return null;

    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    const displayOld = (oldValue === null || oldValue === undefined || oldValue === '') ? 'Not Set' : oldValue.toString();
    const displayNew = (newValue === null || newValue === undefined || newValue === '') ? 'Cleared' : newValue.toString();

    // If both are functionally empty, skip
    if (displayOld === 'Not Set' && (displayNew === 'Cleared' || displayNew === '')) return null;
    if (displayOld === displayNew) return null;

    const isSelected = selectedFields[requestId]?.includes(key) ?? true;

    const toggleField = () => {
      setSelectedFields(prev => {
        const current = prev[requestId] || Object.keys(profileRequests.find(r => r.id === requestId)?.requested_changes || {});
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCampFilter, selectedAshram, itemsPerPage, sortOrder, selectedLetter]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-50 via-gray-50 to-amber-50/30 py-4 sm:py-6 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header - Compact & Colorful for 13"-14" Laptops */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-orange-200/70">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 rounded-xl shadow-md text-white flex-shrink-0">
              <Activity className="h-5 w-5 stroke-[2.5px]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Counselor Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-orange-100 text-orange-800 border border-orange-300">
                  Counselor Sangha
                </span>
              </div>
              <p className="text-[10.5px] sm:text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <Shield className="h-3 w-3 text-orange-500" />
                <span className="truncate max-w-[280px] sm:max-w-none">{userData?.email}</span>
                <span className="text-slate-300">•</span>
                <span className="text-orange-700 font-extrabold">{students.length} Total Devotees</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
            {(['sadhana-reports', 'spiritual-approvals', 'new-dev-approvals'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const tabLabels: Record<string, string> = {
                'sadhana-reports': 'Sadhana Reports',
                'spiritual-approvals': 'Spiritual Delta',
                'new-dev-approvals': 'Registrations'
              };
              const countBadge = tab === 'sadhana-reports' ? stats.devotees : tab === 'spiritual-approvals' ? stats.pendingSpiritual : stats.pendingRegistrations;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'spiritual-approvals') setApprovalStatus('pending');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  <span>{tabLabels[tab]}</span>
                  {countBadge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-extrabold ${isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800'}`}>
                      {countBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic & Colorful Stats Cards - High Contrast on Small Screens */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Sadhana Reports */}
          <div
            onClick={() => setActiveTab('sadhana-reports')}
            className={`group cursor-pointer p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden bg-gradient-to-br from-orange-50/90 via-white to-amber-50/40 ${activeTab === 'sadhana-reports'
              ? 'border-orange-400 ring-2 ring-orange-200/70 shadow-sm'
              : 'border-slate-200/90 hover:border-orange-300 shadow-2xs hover:shadow-xs'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sadhana Reports</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">
                      {stats.loading ? '...' : stats.devotees}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                      Active
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === 'sadhana-reports' ? 'text-orange-600 translate-x-0' : 'text-slate-300 opacity-60 group-hover:opacity-100 group-hover:text-orange-500'}`} />
            </div>
          </div>

          {/* Card 2: Spiritual Delta */}
          <div
            onClick={() => {
              setActiveTab('spiritual-approvals');
              setApprovalStatus('pending');
            }}
            className={`group cursor-pointer p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/40 ${activeTab === 'spiritual-approvals'
              ? 'border-purple-400 ring-2 ring-purple-200/70 shadow-sm'
              : 'border-slate-200/90 hover:border-purple-300 shadow-2xs hover:shadow-xs'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Spiritual Delta</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">
                      {stats.loading ? '...' : stats.pendingSpiritual}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-extrabold border ${stats.pendingSpiritual > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                      {stats.pendingSpiritual > 0 ? 'Pending' : 'Clear'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === 'spiritual-approvals' ? 'text-purple-600 translate-x-0' : 'text-slate-300 opacity-60 group-hover:opacity-100 group-hover:text-purple-500'}`} />
            </div>
          </div>

          {/* Card 3: Registrations */}
          <div
            onClick={() => setActiveTab('new-dev-approvals')}
            className={`group cursor-pointer p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 ${activeTab === 'new-dev-approvals'
              ? 'border-emerald-400 ring-2 ring-emerald-200/70 shadow-sm'
              : 'border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-xs'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registrations</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">
                      {stats.loading ? '...' : stats.pendingRegistrations}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-extrabold border ${stats.pendingRegistrations > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                      {stats.pendingRegistrations > 0 ? 'Pending' : 'Clear'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === 'new-dev-approvals' ? 'text-emerald-600 translate-x-0' : 'text-slate-300 opacity-60 group-hover:opacity-100 group-hover:text-emerald-500'}`} />
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Mobile Only (Compact) */}
        <div className="md:hidden flex gap-1 p-1 bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-sm overflow-x-auto no-scrollbar">
          {(['sadhana-reports', 'spiritual-approvals', 'new-dev-approvals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'spiritual-approvals') setApprovalStatus('pending');
              }}
              className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeTab === tab
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
            >
              {tab.split('-')[0].toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === 'sadhana-reports' && (
            <div className="space-y-3 sm:space-y-3.5 animate-in fade-in duration-300">
              {/* Dynamic Filter-Responsive Stat Cards - Values update live with filters */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                {/* Card 1: Total / Filtered Devotees */}
                <div className="relative overflow-hidden rounded-xl p-2.5 sm:p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all group">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-10 rounded-full blur-lg -mr-2 -mt-2" />
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xs">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {dynamicStats.total}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {isFiltered ? 'Filtered Devotees' : 'Total Devotees'}
                  </div>
                  <p className="text-[9.5px] font-bold text-indigo-600 truncate mt-0.5">
                    {isFiltered ? `of ${students.length} in sangha` : 'In your care'}
                  </p>
                </div>

                {/* Card 2: Active Consistency */}
                <div className="relative overflow-hidden rounded-xl p-2.5 sm:p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all group">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10 rounded-full blur-lg -mr-2 -mt-2" />
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xs">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {dynamicStats.activeReporters}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Active Reporters
                  </div>
                  <p className="text-[9.5px] font-bold text-emerald-600 truncate mt-0.5">
                    Avg {dynamicStats.avgReports} reports / devotee
                  </p>
                </div>

                {/* Card 3: Avg Soul Score */}
                <div className="relative overflow-hidden rounded-xl p-2.5 sm:p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all group">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10 rounded-full blur-lg -mr-2 -mt-2" />
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {dynamicStats.avgSoul}%
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Avg Soul Score
                  </div>
                  <p className="text-[9.5px] font-bold text-amber-600 truncate mt-0.5">
                    {dynamicStats.excellentCount} devotees ≥ 80%
                  </p>
                </div>

                {/* Card 4: Needs Guidance */}
                <div className="relative overflow-hidden rounded-xl p-2.5 sm:p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all group">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 opacity-10 rounded-full blur-lg -mr-2 -mt-2" />
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-2xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {dynamicStats.needsGuidanceCount}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Needs Attention
                  </div>
                  <p className="text-[9.5px] font-bold text-rose-600 truncate mt-0.5">
                    {dynamicStats.zeroReportsCount} without reports
                  </p>
                </div>
              </div>

              {/* Controls Panel: Compact, High-Contrast & Colorful */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
                {/* Row 1: Search, Official Ashram Filter, Camp, A-Z Sort & Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5 items-center">
                  {/* Search Devotee */}
                  <div className="relative group sm:col-span-2 lg:col-span-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search legal/initiated name, email, phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl focus:ring-2 focus:ring-orange-100 text-xs font-medium transition-all shadow-2xs"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Official Ashram Filter Dropdown */}
                  <div className="relative sm:col-span-1 lg:col-span-2">
                    <select
                      value={selectedAshram}
                      onChange={(e) => setSelectedAshram(e.target.value)}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors"
                    >
                      <option value="all">All Ashrams</option>
                      {PROFILE_ASHRAMS.map((ash) => (
                        <option key={ash} value={ash}>{ash}</option>
                      ))}
                    </select>
                    <Compass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />
                  </div>

                  {/* Camp Filter Dropdown */}
                  <div className="relative sm:col-span-1 lg:col-span-2">
                    <select
                      value={selectedCampFilter}
                      onChange={(e) => setSelectedCampFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors"
                    >
                      <option value="all">All Camps</option>
                      {['DYS', 'Sankalpa', 'Sphurti', 'Utkarsh', 'SRCGD Workshop', 'Nishtha', 'FTEC', 'Ashraya', 'MTEC', 'Sharanagati', 'IDC'].map(camp => (
                        <option key={camp} value={camp}>{camp}</option>
                      ))}
                    </select>
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  </div>

                  {/* A-Z Sort Dropdown */}
                  <div className="relative sm:col-span-1 lg:col-span-2">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors"
                    >
                      <option value="name-asc">🔤 Name: A to Z</option>
                      <option value="name-desc">🔤 Name: Z to A</option>
                      <option value="soul-desc">✨ Soul % High</option>
                      <option value="soul-asc">📉 Soul % Low</option>
                      <option value="reports-desc">📋 Most Reports</option>
                    </select>
                    {sortOrder === 'name-desc' ? (
                      <ArrowUpZA className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-600 pointer-events-none" />
                    ) : (
                      <ArrowDownAZ className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-600 pointer-events-none" />
                    )}
                  </div>

                  {/* Compact Date Range & Run Analysis */}
                  <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-3">
                    <div className="flex-1 flex items-center gap-1 bg-slate-50/70 border border-slate-300 rounded-xl px-2 py-1.5 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                        title="Start Date"
                      />
                      <span className="text-slate-400 text-[10px] font-bold">-</span>
                      <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                        title="End Date"
                      />
                    </div>
                    <button
                      onClick={loadStudents}
                      disabled={isAnalyzing}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-2xs active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      title="Run sadhana analysis"
                    >
                      {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Analyze</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: A-Z Alphabet Strip & Quick Controls */}
                <div className="pt-2 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  {/* Horizontal Scrollable Alphabet Bar */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-orange-500" /> A-Z:
                    </span>
                    {ALPHABET.map((letter) => {
                      const isSelected = selectedLetter === (letter === 'ALL' ? 'all' : letter);
                      const hasDevotees = letter === 'ALL' || availableLetters.has(letter);
                      return (
                        <button
                          key={letter}
                          onClick={() => setSelectedLetter(letter === 'ALL' ? 'all' : letter)}
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold uppercase transition-all duration-150 shrink-0 cursor-pointer ${isSelected
                            ? 'bg-slate-900 text-white shadow-2xs scale-105 ring-1 ring-slate-900'
                            : hasDevotees
                              ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50/40 shadow-2xs'
                              : 'bg-slate-50 text-slate-300 border border-slate-100 hover:text-slate-400'}`}
                          title={letter === 'ALL' ? 'Show All Devotees' : `Show devotees starting with ${letter}`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary & View Options */}
                  <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500">
                      Showing <strong className="text-orange-700 font-extrabold">{filteredStudents.length}</strong> of {students.length}
                    </span>

                    {isFiltered && (
                      <button
                        onClick={() => {
                          setSelectedLetter('all');
                          setSearchTerm('');
                          setSelectedCampFilter('all');
                          setSelectedAshram('all');
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs"
                        title="Reset all filters"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}

                    {aggregatedStats.length > 0 && (
                      <button
                        onClick={() => setShowChart(!showChart)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs"
                        title="Toggle Velocity Chart"
                      >
                        <BarChart3 className="w-3 h-3 text-orange-500" />
                        <span>{showChart ? 'Hide Chart' : 'Show Chart'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Chart Section - Compact & Colorful */}
              {aggregatedStats.length > 0 && showChart && (
                <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">Group Spiritual Velocity</h3>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Daily Average Across {students.length} Devotees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span className="text-slate-700">Soul Points</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span className="text-slate-700">Body Points</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[180px] sm:h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aggregatedStats} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9.5, fontWeight: 700, fill: '#64748b' }}
                          dy={5}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9.5, fontWeight: 700, fill: '#64748b' }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            borderRadius: '12px',
                            border: '1px solid #fed7aa',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            padding: '8px 12px',
                          }}
                          itemStyle={{ fontSize: '11px', fontWeight: 800 }}
                          cursor={{ fill: '#fff7ed', radius: 4 }}
                        />
                        <Bar
                          dataKey="Avg Soul %"
                          fill="#ea580c"
                          radius={[4, 4, 0, 0]}
                          barSize={14}
                        />
                        <Bar
                          dataKey="Avg Body %"
                          fill="#0284c7"
                          radius={[4, 4, 0, 0]}
                          barSize={14}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-orange-100 shadow-md">
                  <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Loading your devotees...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-8 sm:p-12 text-center">
                  <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No devotees found matching your search.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {/* Devotee Breakdown - Responsive Layout */}
                    <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/10 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                              Devotee Sadhana Directory
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Sorted by: <span className="font-extrabold text-orange-700">{
                                sortOrder === 'name-asc' ? 'Name (A to Z)' :
                                  sortOrder === 'name-desc' ? 'Name (Z to A)' :
                                    sortOrder === 'soul-desc' ? 'Highest Soul %' :
                                      sortOrder === 'soul-asc' ? 'Lowest Soul %' : 'Most Reports'
                              }</span>
                              {selectedLetter !== 'all' && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-extrabold">
                                  Letter: {selectedLetter.toUpperCase()}
                                </span>
                              )}
                              {selectedAshram !== 'all' && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 font-extrabold">
                                  Ashram: {selectedAshram}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-bold text-slate-500">
                            Page {currentPage} of {totalPages || 1}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Card View - Compact & Colorful */}
                      <div className="sm:hidden grid grid-cols-1 gap-2.5 p-3">
                        {paginatedStudents.map((student) => {
                          const totalDays = Math.max(1, differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1);
                          return (
                            <div key={student.id} className="bg-slate-50/70 hover:bg-white rounded-xl p-3 border border-slate-200/90 hover:border-orange-300 shadow-2xs space-y-2.5 transition-all">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center font-black text-xs shadow-2xs shrink-0`}>
                                    {student.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-black text-slate-900 truncate">{student.name}</div>
                                    {student.hierarchy?.initiatedName && (
                                      <div className="text-[10px] font-bold text-amber-700 italic truncate">{student.hierarchy.initiatedName}</div>
                                    )}
                                    <div className="text-[10px] font-medium text-slate-400 truncate">{student.email}</div>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${(student.avgSoulPercent || 0) >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                    (student.avgSoulPercent || 0) >= 50 ? 'bg-blue-50 text-blue-800 border border-blue-300' :
                                      (student.avgSoulPercent || 0) > 0 ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                                        'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                  {(student.avgSoulPercent || 0) >= 80 ? '⭐ Excellent' :
                                    (student.avgSoulPercent || 0) >= 50 ? '👍 Good' :
                                      (student.avgSoulPercent || 0) > 0 ? '⚠️ In Progress' : 'No Reports'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Consistency</span>
                                  <span className="font-extrabold text-orange-600 text-xs mt-0.5 block">{(student.totalReports || 0)}/{totalDays} Days</span>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                                  <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Soul & Body</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-extrabold text-amber-600">Soul: {student.avgSoulPercent}%</span>
                                    <span className="font-extrabold text-sky-600">Body: {student.avgBodyPercent}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 truncate max-w-[170px]">
                                  <Building2 className="h-3 w-3 text-orange-400 shrink-0" />
                                  <span className="truncate">{student.hierarchy?.currentCenter || student.hierarchy?.center || 'Not Assigned'}</span>
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedUserForDetail(student);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View - Compact, Crisp & Colorful */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="px-4 py-2.5 text-left">Devotee Profile</th>
                              <th className="px-3 py-2.5 text-left">Center & Temple</th>
                              <th className="px-3 py-2.5 text-center">Consistency</th>
                              <th className="px-3 py-2.5 text-center">Sadhana Progress (Soul / Body)</th>
                              <th className="px-3 py-2.5 text-center">Performance Rating</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedStudents.map((student) => {
                              const totalDays = Math.max(1, differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1);
                              return (
                                <tr key={student.id} className="hover:bg-orange-50/30 transition-colors group">
                                  {/* Devotee Profile */}
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center font-black text-xs shadow-2xs shrink-0 group-hover:scale-105 transition-transform`}>
                                        {student.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-black text-slate-900 group-hover:text-orange-700 transition-colors truncate">
                                            {student.name}
                                          </span>
                                          {student.hierarchy?.initiatedName && (
                                            <span className="text-[10px] font-bold text-amber-700 italic truncate">
                                              ({student.hierarchy.initiatedName})
                                            </span>
                                          )}
                                          {student.hierarchy?.ashram && (
                                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                              {student.hierarchy.ashram}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10.5px] font-medium text-slate-400 truncate">
                                          {student.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Center & Temple */}
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 text-slate-700">
                                      <Building2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                      <span className="text-xs font-semibold truncate max-w-[150px]" title={student.hierarchy?.currentCenter || student.hierarchy?.center || 'Not assigned'}>
                                        {student.hierarchy?.currentCenter || student.hierarchy?.center || 'Not assigned'}
                                      </span>
                                    </div>
                                    {student.hierarchy?.currentTemple && (
                                      <div className="text-[9.5px] font-medium text-slate-400 pl-5 truncate max-w-[150px]">
                                        {student.hierarchy.currentTemple}
                                      </div>
                                    )}
                                  </td>

                                  {/* Consistency */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${(student.totalReports || 0) === 0
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : (student.totalReports || 0) >= totalDays * 0.75
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}>
                                      {(student.totalReports || 0)}/{totalDays} Days
                                    </span>
                                  </td>

                                  {/* Sadhana Progress (Soul / Body) */}
                                  <td className="px-3 py-2.5">
                                    <div className="flex flex-col items-center gap-1 min-w-[120px] max-w-[140px] mx-auto">
                                      {/* Soul % */}
                                      <div className="flex items-center gap-1.5 w-full">
                                        <span className="text-[9px] font-bold text-amber-700 w-7">Soul</span>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-amber-100">
                                          <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, student.avgSoulPercent || 0)}%` }}
                                          />
                                        </div>
                                        <span className="text-[9.5px] font-black text-amber-800 w-7 text-right">
                                          {student.avgSoulPercent || 0}%
                                        </span>
                                      </div>
                                      {/* Body % */}
                                      <div className="flex items-center gap-1.5 w-full">
                                        <span className="text-[9px] font-bold text-sky-700 w-7">Body</span>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-sky-100">
                                          <div
                                            className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, student.avgBodyPercent || 0)}%` }}
                                          />
                                        </div>
                                        <span className="text-[9.5px] font-black text-sky-800 w-7 text-right">
                                          {student.avgBodyPercent || 0}%
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Performance Rating */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black border ${(student.avgSoulPercent || 0) >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                        (student.avgSoulPercent || 0) >= 50 ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                          (student.avgSoulPercent || 0) > 0 ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                            'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${(student.avgSoulPercent || 0) >= 80 ? 'bg-emerald-500' :
                                          (student.avgSoulPercent || 0) >= 50 ? 'bg-blue-500' :
                                            (student.avgSoulPercent || 0) > 0 ? 'bg-amber-500' :
                                              'bg-slate-400'
                                        }`} />
                                      {(student.avgSoulPercent || 0) >= 80 ? 'Excellent' :
                                        (student.avgSoulPercent || 0) >= 50 ? 'Good Progress' :
                                          (student.avgSoulPercent || 0) > 0 ? 'Needs Imp.' : 'No Reports'}
                                    </span>
                                  </td>

                                  {/* Action */}
                                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        setSelectedUserForDetail(student);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-400 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                                      title="View devotee details"
                                    >
                                      <Eye className="h-3 w-3 text-orange-500" />
                                      <span>Details</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls - Compact & Crisp */}
                      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Per Page:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold py-1 px-2 rounded-lg focus:border-orange-500 outline-none transition-colors cursor-pointer shadow-2xs"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                          </select>
                          <span className="text-[10.5px] font-bold text-slate-400">
                            (Total {filteredStudents.length} Devotees)
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10.5px] font-bold text-slate-500">
                            {filteredStudents.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all active:scale-95 shadow-2xs cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-xs font-bold text-slate-700 px-1">
                              {currentPage} / {totalPages || 1}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages || totalPages === 0}
                              className="px-2.5 py-1 bg-slate-900 border-none rounded-lg text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95 shadow-2xs cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'spiritual-approvals' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100/50 rounded-lg">
                    <FileCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Spiritual Update Requests</h2>
                </div>

                <div className="flex items-center gap-4">
                  {(['pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setApprovalStatus(status);
                        setSelectedRequestIds([]);
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalStatus === status
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {selectedRequestIds.length > 0 && approvalStatus === 'pending' && (
                  <div className="flex items-center justify-between gap-4 bg-amber-600 p-2 pl-4 sm:pl-6 rounded-xl shadow-lg shadow-amber-200 animate-in zoom-in-95 duration-300">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedRequestIds.length} Selected</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setConfirmation({
                            isOpen: true,
                            type: 'rejected',
                            count: selectedRequestIds.length,
                            mode: 'bulk',
                            source: 'spiritual'
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setConfirmation({
                            isOpen: true,
                            type: 'approved',
                            count: selectedRequestIds.length,
                            mode: 'bulk',
                            source: 'spiritual'
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-white text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingRequests ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-orange-100 shadow-md">
                  <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving spiritual requests...</p>
                </div>
              ) : profileRequests.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[2rem] border border-orange-100 shadow-md">
                  <div className="bg-amber-50 h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileCheck className="h-10 w-10 text-amber-200" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">No {approvalStatus} requests</h3>
                  <p className="text-gray-500 font-medium max-w-xs mx-auto mt-2 text-sm">Everything is processed for your students spiritual updates.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {approvalStatus === 'pending' && profileRequests.length > 0 && (
                    <div className="flex items-center gap-4 px-8 py-4 bg-[#fffdfa]/90 backdrop-blur-md rounded-2xl border border-amber-200 shadow-xl shadow-orange-100/40">
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedRequestIds.length === profileRequests.length && profileRequests.length > 0 ? 'bg-primary-600 border-primary-600 shadow-lg' : 'border-gray-200 hover:border-primary-400'}`}
                        onClick={toggleSelectAllProfiles}
                      >
                        {selectedRequestIds.length === profileRequests.length && profileRequests.length > 0 && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                      </div>
                      <span className="text-xs font-black text-gray-600 uppercase tracking-widest">
                        {selectedRequestIds.length === 0 ? 'Select All Requests' : `Batch Management (${selectedRequestIds.length})`}
                      </span>
                    </div>
                  )}

                  {profileRequests.map(request => {
                    const isExpanded = expandedRequestId === request.id;
                    const changeCount = Object.keys(request.requested_changes).length;

                    return (
                      <div key={request.id} className={`group bg-white/80 backdrop-blur-xl rounded-[1.5rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-orange-300 shadow-2xl shadow-orange-100 ring-4 ring-orange-500/5' : 'border-orange-100/50 shadow-sm hover:border-orange-200'}`}>
                        <div
                          className={`p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-orange-50/30' : 'hover:bg-orange-50/20'}`}
                          onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                        >
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            {approvalStatus === 'pending' && (
                              <div
                                className="flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(request.id); }}
                              >
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${selectedRequestIds.includes(request.id) ? 'bg-orange-600 border-orange-600 shadow-lg shadow-orange-200' : 'border-gray-200 hover:border-orange-400 bg-white'}`}>
                                  {selectedRequestIds.includes(request.id) && <Check className="h-3 h-3 sm:h-3.5 sm:w-3.5 text-white stroke-[4px]" />}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-600 font-black text-xs shadow-sm capitalize">
                                {request.user?.name?.charAt(0) || '?'}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight group-hover:text-orange-600 transition-colors uppercase truncate">{request.user?.name || 'Unknown Identity'}</h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                  <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" /> {new Date(request.created_at).toLocaleDateString()}
                                  </p>
                                  <p className="text-[8px] sm:text-[9px] font-black text-orange-500/80 uppercase tracking-widest flex items-center gap-1 truncate">
                                    <Mail className="h-2.5 w-2.5" /> {request.user?.email || 'OFFLINE'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-gray-100 md:border-0 pt-3 md:pt-0">
                            <span className="px-2 py-1 bg-gray-50 rounded-lg text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border border-gray-100">
                              {changeCount} MODIFICATION{changeCount !== 1 ? 'S' : ''}
                            </span>
                            <div className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-orange-600 border-orange-600 text-white rotate-180 shadow-lg shadow-orange-200' : 'bg-white border-gray-100 text-gray-400 group-hover:border-orange-200 group-hover:text-orange-500'}`}>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>


                        {isExpanded && (
                          <div className="p-4 sm:p-6 bg-gradient-to-b from-orange-50/20 to-white border-t border-orange-100 animate-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 gap-2 mb-6">
                              {Object.keys(request.requested_changes).map(key =>
                                renderFieldChange(request.id, key, request.requested_changes[key], request.current_values[key])
                              )}
                            </div>

                            {request.status === 'pending' ? (
                              <div className="space-y-4">
                                <textarea
                                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:border-orange-100 focus:ring-4 focus:ring-orange-500/5 outline-none font-bold text-[11px] transition-all placeholder:text-gray-300 resize-none text-gray-700"
                                  rows={2}
                                  placeholder="Add feedback or notes here..."
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setConfirmation({ isOpen: true, type: 'rejected', count: 1, requestId: request.id, mode: 'single', source: 'spiritual' })}
                                    disabled={!feedback.trim()}
                                    className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-rose-600 border border-rose-100 hover:bg-rose-50 disabled:opacity-30 transition-all font-sans"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => setConfirmation({ isOpen: true, type: 'approved', count: 1, requestId: request.id, mode: 'single', source: 'spiritual' })}
                                    disabled={selectedFields[request.id] && selectedFields[request.id].length === 0}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all font-sans"
                                  >
                                    {selectedFields[request.id]?.length === changeCount || !selectedFields[request.id] ? 'Approve' : `Approve ${selectedFields[request.id]?.length}`}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${request.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{request.status}</span>
                                </div>
                                {request.admin_feedback && <p className="text-[10px] text-gray-300 italic font-bold">&ldquo;{request.admin_feedback}&rdquo;</p>}
                              </div>
                            )}
                          </div>
                        )}</div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new-dev-approvals' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100/50 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">New Devotee Registrations</h2>
                </div>

                {selectedPendingUserIds.length > 0 && (
                  <div className="flex items-center justify-between gap-4 bg-emerald-600 p-1.5 pl-4 rounded-xl shadow-lg shadow-emerald-200 animate-in zoom-in-95 duration-300">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedPendingUserIds.length} Selected</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setConfirmation({ isOpen: true, type: 'rejected', count: selectedPendingUserIds.length, mode: 'bulk', source: 'registration' })}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setConfirmation({ isOpen: true, type: 'approved', count: selectedPendingUserIds.length, mode: 'bulk', source: 'registration' })}
                        className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingPending ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-emerald-100 shadow-md">
                  <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                  <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving registrations...</p>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-emerald-100 shadow-md">
                  <div className="bg-emerald-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-emerald-200" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">All clear!</h3>
                  <p className="text-gray-400 font-bold max-w-xs mx-auto mt-1 text-[10px] uppercase tracking-wider">No pending registrations at the moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mobile View */}
                  <div className="lg:hidden space-y-3">
                    {pendingUsers.map((pUser) => (
                      <div key={pUser.id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPendingUserIds.includes(pUser.id)}
                            onChange={() => setSelectedPendingUserIds(prev => prev.includes(pUser.id) ? prev.filter(id => id !== pUser.id) : [...prev, pUser.id])}
                            className="w-4 h-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600 font-black text-xs border border-emerald-100">
                            {pUser.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-gray-900 truncate uppercase">{pUser.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 truncate tracking-tight">{pUser.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-gray-50">
                          <div className="p-2 bg-gray-50/50 rounded-lg">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Temple/Center</p>
                            <p className="text-[10px] font-black text-gray-700 truncate">
                              {pUser.other_temple || pUser.hierarchy?.otherTemple || pUser.current_temple || pUser.hierarchy?.currentTemple || 'N/A'}
                            </p>
                            <p className="text-[9px] font-bold text-emerald-600 truncate italic">
                              {pUser.other_center || pUser.hierarchy?.otherCenter || pUser.current_center || pUser.hierarchy?.currentCenter || 'N/A'}
                            </p>
                          </div>
                          <div className="p-2 bg-gray-50/50 rounded-lg">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Counselor/Ashram</p>
                            <p className="text-[10px] font-black text-amber-600 truncate">{pUser.counselor?.name || pUser.counselor_name || pUser.hierarchy?.counselor || 'N/A'}</p>
                            <p className="text-[9px] font-bold text-gray-500 truncate italic">{pUser.hierarchy?.ashram || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmation({ isOpen: true, type: 'rejected', count: 1, requestId: pUser.id, mode: 'single', source: 'registration' })}
                            className="flex-1 py-2 bg-white text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-50 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setConfirmation({ isOpen: true, type: 'approved', count: 1, requestId: pUser.id, mode: 'single', source: 'registration' })}
                            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-colors"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-emerald-100/50 shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-50">
                      <thead className="bg-gray-50/30">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedPendingUserIds.length === pendingUsers.length && pendingUsers.length > 0}
                              onChange={() => {
                                if (selectedPendingUserIds.length === pendingUsers.length) setSelectedPendingUserIds([]);
                                else setSelectedPendingUserIds(pendingUsers.map(u => u.id));
                              }}
                              className="w-4 h-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Jurisdiction</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Assignment</th>
                          <th className="px-6 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50/50">
                        {pendingUsers.map((pUser) => (
                          <tr key={pUser.id} className="hover:bg-emerald-50/20 transition-all duration-300 group">
                            <td className="px-6 py-3">
                              <input
                                type="checkbox"
                                checked={selectedPendingUserIds.includes(pUser.id)}
                                onChange={() => setSelectedPendingUserIds(prev => prev.includes(pUser.id) ? prev.filter(id => id !== pUser.id) : [...prev, pUser.id])}
                                className="w-4 h-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{pUser.name}</span>
                                <span className="text-[10px] font-bold text-gray-400 tracking-tight">{pUser.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">
                                  {pUser.other_temple || pUser.hierarchy?.otherTemple || pUser.current_temple || pUser.hierarchy?.currentTemple || 'N/A'}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-600 tracking-tight italic">
                                  {pUser.other_center || pUser.hierarchy?.otherCenter || pUser.current_center || pUser.hierarchy?.currentCenter || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight">{pUser.counselor?.name || pUser.counselor_name || pUser.hierarchy?.counselor || 'N/A'}</span>
                                <span className="text-[9px] font-bold text-gray-500 tracking-tight italic">{pUser.hierarchy?.ashram || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 duration-300">
                                <button
                                  onClick={() => setConfirmation({ isOpen: true, type: 'rejected', count: 1, requestId: pUser.id, mode: 'single', source: 'registration' })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all active:scale-95"
                                >
                                  <X className="h-2.5 w-2.5 stroke-[3px]" />
                                  Reject
                                </button>
                                <button
                                  onClick={() => setConfirmation({ isOpen: true, type: 'approved', count: 1, requestId: pUser.id, mode: 'single', source: 'registration' })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95"
                                >
                                  <Check className="h-2.5 w-2.5 stroke-[3px]" />
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
        </div>

        {/* Confirmation Modal (Approvals) - MD Style */}
        {confirmation.isOpen && (
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
                      You are about to {confirmation.type} <span className="text-gray-900 font-bold underline decoration-2 decoration-orange-400">{confirmation.count}</span> {confirmation.source === 'registration' ? (confirmation.count === 1 ? 'user registration' : 'user registrations') : (confirmation.count === 1 ? 'spiritual request' : 'spiritual requests')}.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-white space-y-4">
                {confirmation.type === 'rejected' && confirmation.source === 'registration' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                    <textarea
                      className="w-full px-4 py-3 text-sm bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-red-400 focus:bg-white outline-none transition-all resize-none"
                      rows={3}
                      placeholder="Please provide constructive feedback..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (confirmation.source === 'registration') {
                        if (confirmation.mode === 'single' && confirmation.requestId) {
                          handleDevoteeApproval(confirmation.requestId, confirmation.type === 'approved' ? 'approve' : 'reject', rejectionReason);
                        } else {
                          handleBulkDevoteeApproval(confirmation.type === 'approved' ? 'approve' : 'reject', rejectionReason);
                        }
                      } else {
                        if (confirmation.mode === 'single' && confirmation.requestId) {
                          handleProfileApproval(confirmation.requestId, confirmation.type === 'approved' ? 'approved' : 'rejected');
                        } else {
                          handleBulkProfileApproval(confirmation.type === 'approved' ? 'approved' : 'rejected', feedback);
                        }
                      }
                      setConfirmation({ ...confirmation, isOpen: false });
                      setRejectionReason('');
                    }}
                    disabled={confirmation.type === 'rejected' && confirmation.source === 'registration' && !rejectionReason.trim()}
                    className={`w-full py-4 text-sm font-black text-white rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale ${confirmation.type === 'approved'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 shadow-emerald-200'
                      : 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 shadow-red-200'
                      }`}
                  >
                    {confirmation.type === 'approved' ? 'CONFIRM APPROVAL' : 'CONFIRM REJECTION'}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmation({ ...confirmation, isOpen: false });
                      setRejectionReason('');
                    }}
                    className="w-full py-4 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UserDetailModal integration */}
        <UserDetailModal
          user={selectedUserForDetail}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      </div>
    </div>
  );
}

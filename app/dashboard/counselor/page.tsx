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
  User as UserIcon, CheckCircle, XCircle, Eye, Activity
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
  const { user, userData } = useAuth();
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
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
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2) ||
    userRoles.includes('care_giver') || userRoles.includes(20) ||
    userRoles.includes('senior_counselor') || userRoles.includes(3);

  const loadStudents = useCallback(async () => {
    if (!userData?.email || !supabase) return;

    setLoading(true);
    setIsAnalyzing(true);
    try {
      const adminEmail = userData.email.trim().toLowerCase();

      // 1. Resolve counselor ID
      const { data: counselorData } = await supabase
        .from('counselors')
        .select('id, name')
        .eq('email', adminEmail)
        .maybeSingle();

      const counselorId = counselorData?.id;
      const counselorName = counselorData?.name?.trim().toLowerCase();

      // 2. Fetch all users for this counselor (Dual Lookup)
      // Mirroring the robust registration logic
      const { data: rawUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('verification_status', 'approved'); // Only approved students in progress tab

      if (usersError) throw usersError;

      const assignedStudents = (rawUsers || []).filter((u: any) => {
        const uH = u.hierarchy || {};
        const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
        const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
        const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
        const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

        const matchesId = counselorId && u.counselor_id === counselorId;
        const matchesLegacy = bE === adminEmail || gE === adminEmail ||
          (counselorName && (bN === counselorName || gN === counselorName));

        return matchesId || matchesLegacy;
      });

      if (assignedStudents.length === 0) {
        setStudents([]);
        setAggregatedStats([]);
        return;
      }

      // 3. Bulk Fetch Reports
      const userIds = (assignedStudents as any[]).map((s: any) => s.id);
      const allReports = await fetchBulkSadhanaReports(userIds, dateRange.from, dateRange.to);

      // 4. Map reports to students & calculate aggregate stats
      const totalDaysToDivide = Math.max(1, differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1);

      // Group reports by userId
      const reportsByUser = allReports.reduce((acc, report) => {
        if (!acc[report.userId]) acc[report.userId] = [];
        acc[report.userId].push(report);
        return acc;
      }, {} as Record<string, SadhanaReport[]>);

      const studentsWithProgress = (assignedStudents as any[]).map((student: any) => {
        const reports = reportsByUser[student.id] || [];

        // Manual aggregation for this specific student
        const totalSoulPoints = reports.reduce((sum, r) => sum + (r.soulPercent || 0), 0);
        const avgSoulPercentNum = reports.length > 0 ? parseFloat((totalSoulPoints / reports.length).toFixed(1)) : 0;

        const totalBodyPoints = reports.reduce((sum, r) => sum + (r.bodyPercent || 0), 0);
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
          avgBodyPercent: avgBodyPercentNum, // Added
          progressRating,
          progressColor,
          progressBgColor,
          totalReports: reports.length,
        };
      });

      setStudents(studentsWithProgress);

      // 5. Aggregate Data for Chart (Daily average of group)
      const dataByDate = allReports.reduce((acc, report) => {
        const reportDate = typeof report.date === 'string' ? parseISO(report.date) : report.date;
        const dateKey = format(reportDate, 'MM/dd');
        if (!acc[dateKey]) acc[dateKey] = { date: dateKey, soul: 0, body: 0, count: 0 };
        acc[dateKey].soul += (report.soulPercent || 0);
        acc[dateKey].body += (report.bodyPercent || 0);
        acc[dateKey].count += 1;
        return acc;
      }, {} as Record<string, any>);

      const chartData = Object.values(dataByDate)
        .map((d: any) => ({
          name: d.date,
          'Avg Soul %': Math.round(d.soul / d.count),
          'Avg Body %': Math.round(d.body / d.count),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAggregatedStats(chartData);

    } catch (error) {
      console.error('Error loading students and reports:', error);
      toast.error('Failed to load group progress');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  }, [userData?.email, dateRange]);

  const loadProfileRequests = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole) return;
    setLoadingRequests(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/profile-requests?status=${approvalStatus}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
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

  const loadPendingUsers = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole || !supabase) return;
    setLoadingPending(true);
    try {
      const adminEmail = userData.email.trim().toLowerCase();

      // Mirror MD logic: Fetch ALL pending users, filter in-memory
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('verification_status', 'pending');

      if (fetchError) throw fetchError;

      // 1. Identification
      const { data: adminCounselor } = await supabase
        .from('counselors')
        .select('id, name')
        .eq('email', adminEmail)
        .maybeSingle();

      const adminCounselorId = adminCounselor?.id;
      const adminCounselorName = adminCounselor?.name?.trim().toLowerCase();

      // 2. Filter Logic (Dual Visibility)
      const filtered = (users || []).filter((u: any) => {
        const uH = u.hierarchy || {};
        const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
        const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
        const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
        const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

        // Authority via Stable ID
        const matchesId = adminCounselorId && (u.counselor_id === adminCounselorId || uH.counselorId === adminCounselorId);

        // Authority via Legacy Match or Unified Name Match
        const matchesEmail = bE === adminEmail || gE === adminEmail;
        const matchesName = adminCounselorName && (
          bN === adminCounselorName ||
          gN === adminCounselorName ||
          (u.counselor || '').trim().toLowerCase() === adminCounselorName ||
          (uH.counselor || '').trim().toLowerCase() === adminCounselorName ||
          (u.other_counselor || '').trim().toLowerCase() === adminCounselorName ||
          (uH.otherCounselor || '').trim().toLowerCase() === adminCounselorName
        );

        return matchesId || matchesEmail || matchesName;
      });

      setPendingUsers(filtered.map(mapUserData));
    } catch (error) {
      console.error('Error loading pending users:', error);
      toast.error('Failed to load pending devotees');
    } finally {
      setLoadingPending(false);
    }
  }, [userData?.email, hasCounselorRole]);

  const loadStats = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole || !supabase) return;
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const adminEmail = userData.email.trim().toLowerCase();

      // 1. Resolve counselor ID and Name
      const { data: counselorData } = await supabase
        .from('counselors')
        .select('id, name')
        .eq('email', adminEmail)
        .maybeSingle();

      const adminCounselorId = counselorData?.id;
      const adminCounselorName = counselorData?.name?.trim().toLowerCase();

      // 2. Fetch ALL approved users to count devotees (Dual Lookup consistency)
      const { data: allUsers } = await supabase
        .from('users')
        .select('counselor_id, hierarchy')
        .eq('verification_status', 'approved');

      const studentsCount = (allUsers || []).filter((u: any) => {
        const uH = u.hierarchy || {};
        const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
        const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
        const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
        const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

        const matchesId = adminCounselorId && (u.counselor_id === adminCounselorId || uH.counselorId === adminCounselorId);
        const matchesLegacy = bE === adminEmail || gE === adminEmail ||
          (adminCounselorName && (
            bN === adminCounselorName ||
            gN === adminCounselorName ||
            (u.counselor || '').trim().toLowerCase() === adminCounselorName ||
            (uH.counselor || '').trim().toLowerCase() === adminCounselorName ||
            (u.other_counselor || '').trim().toLowerCase() === adminCounselorName ||
            (uH.otherCounselor || '').trim().toLowerCase() === adminCounselorName
          ));

        return matchesId || matchesLegacy;
      }).length;

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // 2. Fetch pending profile requests count via API for perfect parity
      let spiritualCount = 0;
      if (token) {
        const profileReqsResponse = await fetch(`/api/profile-requests?status=pending&_t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        const profileReqsJson = await profileReqsResponse.json();
        if (profileReqsJson.success) {
          spiritualCount = profileReqsJson.data.length;
        }
      }

      // 3. Get pending users count (Mirror loadPendingUsers logic)
      let regCount = 0;
      const { data: pendingUsersData } = await supabase
        .from('users')
        .select('id, counselor_id, hierarchy')
        .eq('verification_status', 'pending');

      if (pendingUsersData) {
        regCount = pendingUsersData.filter((u: any) => {
          const uH = u.hierarchy || {};
          const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
          const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
          const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
          const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

          const matchesId = adminCounselorId && u.counselor_id === adminCounselorId;
          const matchesEmail = bE === adminEmail || gE === adminEmail;
          const matchesName = adminCounselorName && (bN === adminCounselorName || gN === adminCounselorName);

          return matchesId || matchesEmail || matchesName;
        }).length;
      }

      setStats({
        devotees: studentsCount,
        pendingSpiritual: spiritualCount,
        pendingRegistrations: regCount,
        loading: false
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [userData?.email, hasCounselorRole]);

  // LOAD BASE DATA (Stats) ONCE
  useEffect(() => {
    if (userData && hasCounselorRole) {
      loadStats();
    } else if (!loading && !hasCounselorRole) {
      router.replace('/dashboard');
    }
  }, [userData, hasCounselorRole, loading, router, loadStats]);

  // LOAD TAB-SPECIFIC DATA
  useEffect(() => {
    if (userData && hasCounselorRole) {
      if (activeTab === 'sadhana-reports') loadStudents();
      if (activeTab === 'spiritual-approvals') loadProfileRequests();
      if (activeTab === 'new-dev-approvals') loadPendingUsers();
    }
  }, [activeTab, loadStudents, loadProfileRequests, loadPendingUsers, userData, hasCounselorRole]);

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
          'Authorization': `Bearer ${token}`
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
          'Authorization': `Bearer ${token}`
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
          'Authorization': `Bearer ${token}`
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
          'Authorization': `Bearer ${token}`
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


  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone && student.phone.includes(searchTerm));

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

      return matchesSearch && matchesCamp;
    });
  }, [students, searchTerm, selectedCampFilter]);

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
  }, [searchTerm, selectedCampFilter, itemsPerPage]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-50 via-gray-50 to-amber-50/30 py-4 sm:py-6 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header - Condensed & Premium */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl shadow-lg shadow-orange-200 rotation-3 hover:rotate-0 transition-all duration-500">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent tracking-tight">
                Counselor Dashboard
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-0.5">
                <Shield className="h-3 w-3 text-orange-400" />
                Secure Identity: {userData?.email}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 p-1 bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-sm">
            {(['sadhana-reports', 'spiritual-approvals', 'new-dev-approvals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'spiritual-approvals') setApprovalStatus('pending');
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 scale-105'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
              >
                {tab.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview - Premium Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'sadhana-reports',
              label: 'Sadhana Reports',
              value: stats.devotees,
              icon: Users,
              color: 'orange',
              status: 'Active'
            },
            {
              id: 'spiritual-approvals',
              label: 'Spiritual Delta',
              value: stats.pendingSpiritual,
              icon: FileCheck,
              color: 'amber',
              status: 'Pending',
              onClick: () => setApprovalStatus('pending')
            },
            {
              id: 'new-dev-approvals',
              label: 'Registrations',
              value: stats.pendingRegistrations,
              icon: ShieldCheck,
              color: 'emerald',
              status: 'Pending'
            }
          ].map((item) => {
            const isActive = activeTab === item.id;
            const colorClass = item.color === 'orange' ? 'orange' : item.color === 'amber' ? 'amber' : 'emerald';

            return (
              <div
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.onClick) item.onClick();
                }}
                className={`group cursor-pointer p-4 rounded-[2rem] border transition-all duration-500 relative overflow-hidden ${isActive
                  ? `bg-white border-${colorClass}-200 shadow-2xl shadow-${colorClass}-200/40 ring-4 ring-${colorClass}-500/10`
                  : `bg-white border-orange-100 hover:border-${colorClass}-200 shadow-sm hover:shadow-xl`
                  }`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl transition-all duration-500 ${isActive
                      ? `bg-${colorClass}-600 text-white shadow-lg`
                      : `bg-${colorClass}-50 text-${colorClass}-600 group-hover:bg-${colorClass}-600 group-hover:text-white`
                      }`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{item.label}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900 tracking-tight">
                          {stats.loading ? '...' : item.value}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? `text-${colorClass}-600` : 'text-gray-400'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-all duration-500 ${isActive ? `text-${colorClass}-600 translate-x-0` : 'text-gray-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                </div>

                {/* Decorative background circle */}
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full transition-all duration-700 opacity-[0.03] group-hover:opacity-[0.08] bg-${colorClass}-600 ${isActive ? 'scale-150 opacity-[0.05]' : 'scale-100'}`} />
              </div>
            );
          })}
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
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Date Filters & Analysis Controls - Condensed */}
              <div className="bg-white backdrop-blur-xl rounded-[1.5rem] p-4 sm:p-5 border border-orange-100 shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Period Start</label>
                      <div className="relative group/input">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400 group-focus-within/input:scale-110 transition-transform" />
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all font-bold text-xs text-gray-700 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Period End</label>
                      <div className="relative group/input">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400 group-focus-within/input:scale-110 transition-transform" />
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all font-bold text-xs text-gray-700 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={loadStudents}
                      disabled={isAnalyzing}
                      className="flex-1 lg:flex-none px-6 py-2.5 bg-gradient-to-br from-orange-500 to-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-orange-100 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                    >
                      {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />}
                      Run Analysis
                    </button>
                  </div>
                </div>

                {/* Search & Filter row - Compact */}
                <div className="mt-4 pt-4 border-t border-gray-100/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search devotees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-orange-300 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none text-xs font-bold shadow-sm"
                    />
                  </div>
                  <div className="relative group">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <select
                      value={selectedCampFilter}
                      onChange={(e) => setSelectedCampFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-orange-300 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none appearance-none text-xs font-bold text-gray-700 cursor-pointer shadow-sm"
                    >
                      <option value="all">Filter: All Camps</option>
                      {['DYS', 'Sankalpa', 'Sphurti', 'Utkarsh', 'SRCGD Workshop', 'Nishtha', 'FTEC', 'Ashraya', 'MTEC', 'Sharanagati', 'IDC'].map(camp => (
                        <option key={camp} value={camp}>{camp}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Group Chart Section - Premium & Responsive */}
              {aggregatedStats.length > 0 && (
                <div className="bg-white backdrop-blur-xl rounded-[2rem] p-5 sm:p-7 border border-orange-100 shadow-md animate-in fade-in zoom-in-95 duration-700">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Group Spiritual Velocity</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Aggregate score: {students.length} devotees</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-orange-50 rounded-2xl">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>

                  <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aggregatedStats} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fontWeight: 800, fill: '#9ca3af' }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fontWeight: 800, fill: '#9ca3af' }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '16px',
                            border: '1px solid #fee2e2',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            padding: '10px',
                            backdropFilter: 'blur(10px)'
                          }}
                          itemStyle={{ fontSize: '10px', fontWeight: 800 }}
                          cursor={{ fill: '#fff7ed', radius: 4 }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        />
                        <Bar
                          dataKey="Avg Soul %"
                          fill="#f97316"
                          radius={[4, 4, 0, 0]}
                          barSize={16}
                          animationDuration={1500}
                        />
                        <Bar
                          dataKey="Avg Body %"
                          fill="#fda4af"
                          radius={[4, 4, 0, 0]}
                          barSize={16}
                          animationDuration={1500}
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
                      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-xl">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Group Breakdown</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Quick search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-orange-300 focus:outline-none transition-all text-xs font-bold shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Mobile Card View */}
                      <div className="sm:hidden grid grid-cols-1 gap-3 p-4">
                        {paginatedStudents.map((student) => {
                          const totalDays = differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1;
                          return (
                            <div key={student.id} className="bg-orange-50/20 rounded-2xl p-4 border border-orange-100/50 space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-600 font-black text-sm shadow-sm capitalize">
                                  {student.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{student.name}</div>
                                  <div className="text-[10px] font-bold text-gray-400 truncate uppercase">{student.email}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2 bg-white rounded-lg border border-orange-50">
                                  <p className="font-black text-gray-400 uppercase tracking-widest mb-1">Reports</p>
                                  <p className="font-bold text-orange-600">{student.totalReports}/{totalDays}</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-orange-50">
                                  <p className="font-black text-gray-400 uppercase tracking-widest mb-1">Soul & Body</p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-amber-600">{student.avgSoulPercent}%</span>
                                    <span className="font-black text-blue-600">{student.avgBodyPercent}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-2">
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                  <Building2 className="h-3 w-3" />
                                  {student.hierarchy?.currentCenter || student.hierarchy?.center || 'NOT SET'}
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedUserForDetail(student);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="px-3 py-2 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50/20 border-b border-gray-100">
                              <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Devotee</th>
                              <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                              <th className="px-6 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Consistency</th>
                              <th className="px-6 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Progress (S/B)</th>
                              <th className="px-6 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {paginatedStudents.map((student) => {
                              const totalDays = differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1;
                              return (
                                <tr key={student.id} className="hover:bg-orange-50/30 transition-all group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-600 font-black text-xs shadow-sm capitalize group-hover:scale-110 transition-transform">
                                        {student.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-black text-gray-900 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{student.name}</div>
                                        <div className="text-[10px] font-bold text-gray-400 truncate tracking-wide uppercase">{student.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                      <Building2 className="h-3 w-3 text-gray-400" />
                                      {student.hierarchy?.currentCenter || student.hierarchy?.center || 'NOT SET'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${student.totalReports === 0 ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                                      }`}>
                                      {student.totalReports}/{totalDays} Reports
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className="flex items-center gap-2 w-24">
                                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-amber-500" style={{ width: `${student.avgSoulPercent}%` }} />
                                        </div>
                                        <span className="text-[9px] font-black text-amber-600 w-5">{student.avgSoulPercent}%</span>
                                      </div>
                                      <div className="flex items-center gap-2 w-24">
                                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-500" style={{ width: `${student.avgBodyPercent}%` }} />
                                        </div>
                                        <span className="text-[9px] font-black text-blue-600 w-5">{student.avgBodyPercent}%</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => {
                                        setSelectedUserForDetail(student);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 text-gray-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-orange-400 hover:text-orange-600 transition-all active:scale-95 shadow-sm"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls - Compact & Premium */}
                      <div className="px-4 py-4 sm:px-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rows</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="bg-white border border-gray-100 text-gray-700 text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg focus:border-amber-400 outline-none transition-all cursor-pointer shadow-sm"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-6">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            {startIndex + 1} - {Math.min(endIndex, filteredStudents.length)} <span className="text-gray-300 mx-1">/</span> {filteredStudents.length}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="p-2 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-orange-600 hover:border-orange-200 disabled:opacity-30 disabled:hover:scale-100 transition-all hover:scale-110 active:scale-90 shadow-sm"
                            >
                              <ChevronLeft className="h-3.5 w-3.5 stroke-[3px]" />
                            </button>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="p-2 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-orange-600 hover:border-orange-200 disabled:opacity-30 disabled:hover:scale-100 transition-all hover:scale-110 active:scale-90 shadow-sm"
                            >
                              <ChevronRight className="h-3.5 w-3.5 stroke-[3px]" />
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
                {confirmation.type === 'rejected' && (
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
                          handleBulkProfileApproval(confirmation.type === 'approved' ? 'approved' : 'rejected', rejectionReason);
                        }
                      }
                      setConfirmation({ ...confirmation, isOpen: false });
                      setRejectionReason('');
                    }}
                    disabled={confirmation.type === 'rejected' && !rejectionReason.trim()}
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

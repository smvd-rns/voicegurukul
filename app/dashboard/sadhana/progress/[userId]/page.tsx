'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { getUserData } from '@/lib/supabase/auth';
import { SadhanaReport, User } from '@/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, BookOpen, Clock, Filter, ChevronLeft, ChevronRight, ArrowLeft, UserCircle, X, Briefcase, GraduationCap, CheckCircle2, BookOpenCheck, Tent, Image as ImageIcon, ExternalLink, Share2, ClipboardCopy } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { getUsersByCounselorEmail } from '@/lib/supabase/counselors';
import { getBCVoiceManagerRequestByUserId } from '@/lib/supabase/bc-voice-manager-requests';
import { supabase } from '@/lib/supabase/config';

export default function StudentProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { userData } = useAuth();
  const userId = params?.userId as string;

  const [student, setStudent] = useState<User | null>(null);
  const [reports, setReports] = useState<SadhanaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const reportsPerPage = 10;
  const maxPages = 10;

  // Mappings for Camps and Books
  const CAMP_MAPPING: { key: keyof User; label: string }[] = [
    { key: 'campDys', label: 'DYS' },
    { key: 'campSankalpa', label: 'Sankalpa' },
    { key: 'campSphurti', label: 'Sphurti' },
    { key: 'campUtkarsh', label: 'Utkarsh' },
    { key: 'campSrcgdWorkshop', label: 'SRCGD Workshop' },
    { key: 'campNishtha', label: 'Nishtha' },
    { key: 'campFtec', label: 'FTEC' },
    { key: 'campAshraya', label: 'Ashraya' },
    { key: 'campMtec', label: 'MTEC' },
    { key: 'campSharanagati', label: 'Sharanagati' },
    { key: 'campIdc', label: 'IDC' },
  ];

  const BOOK_MAPPING: { key: keyof User; label: string }[] = [
    // Semester 3
    { key: 'spbookThirdSsr15', label: 'SSR 1-5' },
    { key: 'spbookThirdComingBack', label: 'Coming Back' },
    { key: 'spbookThirdPqpa', label: 'PQPA' },
    { key: 'spbookThirdMatchlessGift', label: 'Matchless Gift' },
    { key: 'spbookThirdRajaVidya', label: 'Raja Vidya' },
    { key: 'spbookThirdElevationKc', label: 'Elevation to KC' },
    { key: 'spbookThirdBeyondBirthDeath', label: 'Beyond Birth & Death' },
    { key: 'spbookThirdKrishnaReservoir', label: 'Krishna Reservoir' },
    // Semester 4
    { key: 'spbookFourthSsr68', label: 'SSR 6-8' },
    { key: 'spbookFourthLawsOfNature', label: 'Laws of Nature' },
    { key: 'spbookFourthDharma', label: 'Dharma' },
    { key: 'spbookFourthSecondChance', label: 'Second Chance' },
    { key: 'spbookFourthIsopanishad110', label: 'Isopanishad 1-10' },
    { key: 'spbookFourthQueenKuntiVideo', label: 'Queen Kunti (Video)' },
    { key: 'spbookFourthEnlightenmentNatural', label: 'Enlightenment' },
    { key: 'spbookFourthKrishnaBook121', label: 'KB 1-21' },
    // Semester 5
    { key: 'spbookFifthLifeFromLife', label: 'Life from Life' },
    { key: 'spbookFifthPrahladTeachings', label: 'Prahlad Teachings' },
    { key: 'spbookFifthJourneySelfDiscovery', label: 'Journey of Self Disc.' },
    { key: 'spbookFifthQueenKuntiHearing', label: 'Queen Kunti (Hear)' },
    { key: 'spbookFifthLordKapila', label: 'Lord Kapila' },
    { key: 'spbookFifthNectar16', label: 'Nectar 1-6' },
    { key: 'spbookFifthGita16', label: 'Gita 1-6' },
    { key: 'spbookFifthKrishnaBook2428', label: 'KB 24-28' },
    // Semester 6
    { key: 'spbookSixthNectar711', label: 'Nectar 7-11' },
    { key: 'spbookSixthPathPerfection', label: 'Path of Perfection' },
    { key: 'spbookSixthCivilisationTranscendence', label: 'Civil. & Transcendence' },
    { key: 'spbookSixthHareKrishnaChallenge', label: 'HK Challenge' },
    { key: 'spbookSixthGita712', label: 'Gita 7-12' },
    { key: 'spbookSixthSb1stCanto16', label: 'SB 1.1-6' },
    { key: 'spbookSixthKrishnaBook3559', label: 'KB 35-59' },
    // Semester 7
    { key: 'spbookSeventhGita1318', label: 'Gita 13-18' },
    { key: 'spbookSeventhSb1stCanto713', label: 'SB 1.7-13' },
    { key: 'spbookSeventhKrishnaBook6378', label: 'KB 63-78' },
    // Semester 8
    { key: 'spbookEighthSb1stCanto1419', label: 'SB 1.14-19' },
    { key: 'spbookEighthKrishnaBook7889', label: 'KB 78-89' },
  ];

  // Check if current user is a counselor or BC Voice Manager and has access to this student
  useEffect(() => {
    const checkAccess = async () => {
      if (!userData || !userId) return;

      // Load student data first to check center/assignment
      const studentData = await getUserData(userId);
      if (!studentData) {
        // Handle not found
        return;
      }
      setStudent(studentData);

      const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
      const normalizedUserRoles = userRoles.map((r: any) => Number(r));
      const isSuperAdmin = normalizedUserRoles.includes(8) || userRoles.includes('super_admin');
      const hasTempleAdminRole = normalizedUserRoles.some((r: number) => [11, 12, 13, 21].includes(r));
      const hasCenterAdminRole = normalizedUserRoles.some((r: number) => [14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(r));
      const hasCounselorRole = userRoles.includes('counselor') || normalizedUserRoles.includes(2) ||
        userRoles.includes('senior_counselor') || normalizedUserRoles.includes(3) || normalizedUserRoles.includes(20);

      let hasBCRole = userRoles.includes('bc_voice_manager') || normalizedUserRoles.includes(4);
      const hasVoiceManagerRole = userRoles.includes('voice_manager') || userRoles.includes('senior_counselor') || normalizedUserRoles.includes(3);
      const hasZonalAdminRole = userRoles.includes('zonal_admin') || normalizedUserRoles.includes(7);
      const hasStateAdminRole = userRoles.includes('state_admin') || normalizedUserRoles.includes(6);
      const hasCityAdminRole = userRoles.includes('city_admin') || normalizedUserRoles.includes(5);

      // Check request status if role is missing
      const bcRequest = await getBCVoiceManagerRequestByUserId(userData.id);
      if (!hasBCRole && bcRequest && bcRequest.status === 'approved') {
        hasBCRole = true;
      }

      if (!isSuperAdmin && !hasTempleAdminRole && !hasCenterAdminRole && !hasCounselorRole && !hasBCRole && !hasVoiceManagerRole && !hasZonalAdminRole && !hasStateAdminRole && !hasCityAdminRole) {
        router.push('/dashboard');
        return;
      }

      let isAuthorized = isSuperAdmin;

      if (!isAuthorized && hasCounselorRole) {
        // Check if this student is assigned to the counselor
        const counselorStudents = await getUsersByCounselorEmail(userData.email);
        isAuthorized = counselorStudents.some(s => s.id === userId);
      }

      if (!isAuthorized && (hasCenterAdminRole || hasVoiceManagerRole)) {
        // Query centers where manager is explicitly assigned in the database
        const { data: assignedCenters } = await supabase
          .from('centers')
          .select('id, name')
          .or(`project_manager_id.eq.${userData.id},project_advisor_id.eq.${userData.id},acting_manager_id.eq.${userData.id},oc_id.eq.${userData.id},care_giver_id.eq.${userData.id},youth_preacher_id.eq.${userData.id},internal_manager_id.eq.${userData.id},preaching_coordinator_id.eq.${userData.id},morning_program_in_charge_id.eq.${userData.id},accountant_id.eq.${userData.id},kitchen_head_id.eq.${userData.id},study_in_charge_id.eq.${userData.id},event_admin_id.eq.${userData.id},grihstha_counselor_id.eq.${userData.id},easy_incharge_id.eq.${userData.id},prerna_incharge_id.eq.${userData.id}`);

        const assignedNames = (assignedCenters || []).map((c: any) => c.name?.trim().toLowerCase()).filter(Boolean);
        const assignedIds = (assignedCenters || []).map((c: any) => c.id).filter(Boolean);

        const sAny = studentData as any;
        const studentCenter = (sAny.current_center || studentData.hierarchy?.currentCenter || studentData.hierarchy?.center || '').trim().toLowerCase();
        const studentCenterId = sAny.center_id || studentData.hierarchy?.centerId;

        if ((studentCenter && assignedNames.includes(studentCenter)) ||
          (studentCenterId && assignedIds.includes(studentCenterId))) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && hasTempleAdminRole) {
        const { data: assignedTemples } = await supabase
          .from('temples')
          .select('name')
          .or(`managing_director_id.eq.${userData.id},director_id.eq.${userData.id},central_voice_manager_id.eq.${userData.id},yp_id.eq.${userData.id}`);

        const assignedTempleNames = (assignedTemples || []).map((t: any) => t.name?.trim().toLowerCase()).filter(Boolean);
        const sAny = studentData as any;
        const studentTemple = (sAny.current_temple || studentData.hierarchy?.currentTemple || studentData.hierarchy?.temple || '').trim().toLowerCase();

        if (studentTemple && assignedTempleNames.includes(studentTemple)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && hasZonalAdminRole) {
        // Zone Manager access: check if student is in the same zone
        const managerZone = userData.hierarchy?.assignedZone?.trim().toLowerCase();
        const studentZone = studentData.hierarchy?.zone?.trim().toLowerCase();

        if (managerZone && studentZone && managerZone === studentZone) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && hasStateAdminRole) {
        // State Manager access: check if student is in the same state
        const managerState = userData.hierarchy?.assignedState?.trim().toLowerCase();
        const studentState = studentData.hierarchy?.state?.trim().toLowerCase();

        if (managerState && studentState && managerState === studentState) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && hasCityAdminRole) {
        // City Manager access: check if student is in the same city
        const managerCity = userData.hierarchy?.assignedCity?.trim().toLowerCase();
        const studentCity = studentData.hierarchy?.city?.trim().toLowerCase();

        if (managerCity && studentCity && managerCity === studentCity) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && hasBCRole) {
        // Check if student's center is in BC Voice Manager's approved centers
        // Use the request we already fetched
        const request = bcRequest; // It might be null if we didn't fetch it above? No, we fetched it.

        if (request && request.approvedCenters && request.approvedCenters.length > 0) {
          // Check if student's center (or ID) matches any approved center
          const studentCenter = studentData.hierarchy?.center?.trim().toLowerCase();
          const studentCenterId = studentData.hierarchy?.centerId;

          isAuthorized = request.approvedCenters.some(approved => {
            const approvedLower = approved.trim().toLowerCase();
            return (studentCenter && studentCenter === approvedLower) ||
              (studentCenterId && studentCenterId === approved);
          });
        }
      }

      if (!isAuthorized) {
        if (hasStateAdminRole) {
          router.push('/dashboard/state-manager');
        } else if (hasZonalAdminRole) {
          router.push('/dashboard/zone-manager');
        } else if (hasCityAdminRole) {
          router.push('/dashboard/city-manager');
        } else if (hasBCRole) {
          router.push('/dashboard/bc-voice-manager-request'); // Redirect to request page/dashboard
        } else if (hasVoiceManagerRole) {
          router.push('/dashboard/voice-manager');
        } else {
          router.push('/dashboard/counselor');
        }
        return;
      }
    };

    checkAccess();
  }, [userData, userId, router]);

  const loadReports = useCallback(async () => {
    if (userId) {
      setLoading(true);
      try {
        const limit = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'custom' ? 365 : 180;
        const allReports = await fetchSadhanaHistory(limit, userId);

        if (timeRange === 'custom') {
          const filtered = allReports.filter((report: SadhanaReport) => {
            const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
            const fromDate = new Date(customDateRange.from);
            const toDate = new Date(customDateRange.to);
            return reportDate >= fromDate && reportDate <= toDate;
          });
          setReports(filtered);
        } else {
          setReports(allReports);
        }
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
        setCurrentPage(1);
      }
    }
  }, [userId, timeRange, customDateRange.from, customDateRange.to]);

  useEffect(() => {
    if (userId) {
      loadReports();
    }
  }, [userId, loadReports]);

  // Generate WhatsApp message
  const generateWhatsAppMessage = () => {
    if (reports.length === 0) return '';

    const sortedReports = [...reports].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const firstDate = sortedReports[0].date instanceof Date ? sortedReports[0].date : new Date(sortedReports[0].date);
    const lastDate = sortedReports[sortedReports.length - 1].date instanceof Date ? sortedReports[sortedReports.length - 1].date : new Date(sortedReports[sortedReports.length - 1].date);

    const totalJapa = reports.reduce((sum, r) => sum + (r.japa || 0), 0);
    const totalHearing = reports.reduce((sum, r) => sum + (r.hearing || 0), 0);
    const totalReading = reports.reduce((sum, r) => sum + (r.reading || 0), 0);
    const totalToBed = reports.reduce((sum, r) => sum + (r.toBed || 0), 0);
    const totalWakeUp = reports.reduce((sum, r) => sum + (r.wakeUp || 0), 0);
    const totalDailyFilling = reports.reduce((sum, r) => sum + (r.dailyFilling || 0), 0);
    const totalDaySleep = reports.reduce((sum, r) => sum + (r.daySleep || 0), 0);

    const bookName = sortedReports.reverse().find(r => r.bookName)?.bookName || 'N/A';

    const avgSoulPercent = reports.length > 0
      ? (reports.reduce((sum, r) => sum + (r.soulPercent || 0), 0) / reports.length).toFixed(1)
      : '0.0';
    const avgBodyPercent = reports.length > 0
      ? (reports.reduce((sum, r) => sum + (r.bodyPercent || 0), 0) / reports.length).toFixed(1)
      : '0.0';

    const maxMarks = reports.length * 10;

    const reportTitle = timeRange === 'week' ? 'Weekly' :
      timeRange === 'month' ? 'Monthly' :
        timeRange === 'custom' ? 'Custom Period' :
          'Overall';

    const message = `Hare Krishna
${reportTitle} Sadhana Report for ${student?.name || 'Student'} (${format(firstDate, 'd MMM yyyy')} - ${format(lastDate, 'd MMM yyyy')}):

Japa (${totalJapa}/${maxMarks})
Hearing (${totalHearing}/${maxMarks})
Reading (${totalReading}/${maxMarks})
Book Name: ${bookName}
To Bed (${totalToBed}/${maxMarks})
Wake Up (${totalWakeUp}/${maxMarks})
Daily Filling (${totalDailyFilling}/${maxMarks})
Day Sleep (${totalDaySleep}/${maxMarks})

Soul %: ${avgSoulPercent}%
Body %: ${avgBodyPercent}%`;

    return encodeURIComponent(message);
  };

  const handleShare = async () => {
    const message = decodeURIComponent(generateWhatsAppMessage());

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sadhana Report: ${student?.name}`,
          text: message,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(message);
        alert('Report copied to clipboard! You can now paste it in Email, WhatsApp, etc.');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (reports.length === 0) return;

    const headers = ['Date', 'Japa', 'Hearing', 'Reading', 'Book Name', 'To Bed', 'Wake Up', 'Daily Filling', 'Day Sleep', 'Body %', 'Soul %'];

    const csvData = reports.map(report => {
      const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
      return [
        format(reportDate, 'yyyy-MM-dd'),
        report.japa || 0,
        report.hearing || 0,
        report.reading || 0,
        report.bookName || '',
        report.toBed || 0,
        report.wakeUp || 0,
        report.dailyFilling || 0,
        report.daySleep || 0,
        report.bodyPercent ? report.bodyPercent.toFixed(1) : '0',
        report.soulPercent ? report.soulPercent.toFixed(1) : '0',
      ].join(',');
    });

    const csv = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sadhana_report_${student?.name || 'student'}_${customDateRange.from}_to_${customDateRange.to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const totalJapa = reports.reduce((sum, r) => sum + (r.japa || 0), 0);
  const avgJapa = reports.length > 0 ? (totalJapa / reports.length).toFixed(1) : '0';
  const avgSoulPercent = reports.length > 0
    ? (reports.reduce((sum, r) => sum + (r.soulPercent || 0), 0) / reports.length).toFixed(1)
    : '0.0';
  const avgBodyPercent = reports.length > 0
    ? (reports.reduce((sum, r) => sum + (r.bodyPercent || 0), 0) / reports.length).toFixed(1)
    : '0.0';

  // Calculate spiritual progress rating
  const avgSoulPercentNum = parseFloat(avgSoulPercent);
  let spiritualRating = '';
  let ratingColor = '';
  let ratingBgColor = '';

  if (avgSoulPercentNum >= 80) {
    spiritualRating = 'Excellent';
    ratingColor = 'text-green-600';
    ratingBgColor = 'bg-green-100';
  } else if (avgSoulPercentNum >= 50) {
    spiritualRating = 'Good Progress';
    ratingColor = 'text-blue-600';
    ratingBgColor = 'bg-blue-100';
  } else {
    spiritualRating = 'Needs Improvement';
    ratingColor = 'text-red-600';
    ratingBgColor = 'bg-red-100';
  }

  // Prepare chart data for daily view (Spiritual Practices)
  const spiritualPracticesData = timeRange === 'all'
    ? reports.slice(0, 30)
    : reports;

  const chartData = spiritualPracticesData
    .map((report) => {
      const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
      return {
        date: format(reportDate, 'MMM d'),
        japa: report.japa || 0,
        hearing: report.hearing || 0,
        reading: report.reading || 0,
        bodyPercent: report.bodyPercent || 0,
        soulPercent: report.soulPercent || 0,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Prepare weekly aggregated data for Body & Soul percentage chart
  const weeklyData: { [key: string]: { reports: SadhanaReport[], weekStart: Date, weekEnd: Date } } = {};

  reports.forEach((report) => {
    const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
    const weekStart = startOfWeek(reportDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(reportDate, { weekStartsOn: 1 }); // Sunday
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { reports: [], weekStart, weekEnd };
    }
    weeklyData[weekKey].reports.push(report);
  });

  const weeklyChartData = Object.values(weeklyData)
    .map(({ reports: weekReports, weekStart, weekEnd }) => {
      const avgBodyPercent = weekReports.length > 0
        ? weekReports.reduce((sum, r) => sum + (r.bodyPercent || 0), 0) / weekReports.length
        : 0;
      const avgSoulPercent = weekReports.length > 0
        ? weekReports.reduce((sum, r) => sum + (r.soulPercent || 0), 0) / weekReports.length
        : 0;

      return {
        week: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
        bodyPercent: Math.round(avgBodyPercent * 10) / 10,
        soulPercent: Math.round(avgSoulPercent * 10) / 10,
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.week.split(' - ')[0]);
      const dateB = new Date(b.week.split(' - ')[0]);
      return dateA.getTime() - dateB.getTime();
    });

  const stats = [
    {
      name: 'Spiritual Progress',
      value: spiritualRating,
      icon: TrendingUp,
      color: ratingColor,
      bgColor: ratingBgColor,
    },
    {
      name: 'Avg Japa/Day',
      value: avgJapa.toString(),
      icon: BookOpen,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      name: 'Avg Soul %',
      value: `${avgSoulPercent}%`,
      icon: Clock,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
    },
    {
      name: 'Avg Body %',
      value: `${avgBodyPercent}%`,
      icon: Calendar,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
  ];

  // Sort reports newest first for pagination
  const sortedReports = [...reports].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  const maxReportsToShow = 100;
  const paginatedReports = sortedReports.slice(0, maxReportsToShow);
  const totalPages = Math.min(Math.ceil(paginatedReports.length / reportsPerPage), maxPages);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const currentReports = paginatedReports.slice(startIndex, endIndex);

  if (loading && !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>
          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>
          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">
              Loading progress report...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 flex items-center justify-center px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-6 sm:p-8 text-center max-w-md w-full">
          <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-6">Student not found or you don&apos;t have access to view this student&apos;s progress.</p>
          <button
            onClick={() => router.push('/dashboard/counselor')}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg font-semibold"
          >
            Back to My Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">


          <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
            Progress Report: {student.name}
          </h1>
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
              {student.email}
            </p>
            {student.profileImage && (
              <button
                onClick={() => setShowProfilePhoto(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors border border-orange-200"
                title="View Profile Photo"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm font-medium">View Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {/* Time Range Filters */}
            <button
              onClick={() => { setTimeRange('week'); setShowCustomRange(false); }}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${timeRange === 'week'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
            >
              Week
            </button>
            <button
              onClick={() => { setTimeRange('month'); setShowCustomRange(false); }}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${timeRange === 'month'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
            >
              Month
            </button>
            <button
              onClick={() => { setTimeRange('all'); setShowCustomRange(false); }}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${timeRange === 'all'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setShowCustomRange(!showCustomRange);
                if (!showCustomRange) {
                  setTimeRange('custom');
                }
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${timeRange === 'custom'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              Custom
            </button>
          </div>

          {/* Export and Share Actions */}
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <button
              onClick={handleShare}
              className="px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-all flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {/* Custom Date Range Picker */}
          {showCustomRange && (
            <div className="mt-4 p-3 sm:p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">From Date</label>
                  <input
                    type="date"
                    value={customDateRange.from}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      setCustomDateRange(prev => ({ ...prev, from: e.target.value }));
                      setTimeRange('custom');
                    }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">To Date</label>
                  <input
                    type="date"
                    value={customDateRange.to}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      setCustomDateRange(prev => ({ ...prev, to: e.target.value }));
                      setTimeRange('custom');
                    }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium"
                  />
                </div>
              </div>
              <button
                onClick={() => { setTimeRange('custom'); loadReports(); }}
                className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2 text-sm sm:text-base rounded-xl font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg"
              >
                Apply Date Range
              </button>
            </div>
          )}
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Camps & Books */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 space-y-6">
            {/* Camps Attained */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-orange-700 mb-3 flex items-center gap-2">
                <Tent className="h-5 w-5" />
                Camps Attained
              </h3>
              <div className="flex flex-wrap gap-2">
                {CAMP_MAPPING.filter(camp => student[camp.key]).length > 0 ? (
                  CAMP_MAPPING.filter(camp => student[camp.key]).map(camp => (
                    <span key={camp.label} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {camp.label}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm italic">No camps recorded yet</span>
                )}
              </div>
            </div>

            {/* SP Books Reading */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-orange-700 mb-3 flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5" />
                SP Books Read
              </h3>
              <div className="flex flex-wrap gap-2">
                {BOOK_MAPPING.filter(book => student[book.key]).length > 0 ? (
                  BOOK_MAPPING.filter(book => student[book.key]).map(book => (
                    <span key={book.label} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {book.label}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm italic">No books recorded yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Education & Work */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 space-y-6">
            {/* Education */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-orange-700 mb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </h3>
              <div className="space-y-3">
                {student.education && student.education.length > 0 ? (
                  student.education.map((edu, idx) => (
                    <div key={idx} className="flex flex-col text-sm border-l-2 border-orange-200 pl-3">
                      <span className="font-semibold text-gray-800">{edu.institution}</span>
                      <span className="text-gray-600">{edu.degreeBranch}</span>
                      {(edu.startYear || edu.endYear) && (
                        <span className="text-gray-500 text-xs mt-1">
                          {edu.startYear ? edu.startYear : ''} {edu.startYear && edu.endYear ? '-' : ''} {edu.endYear ? edu.endYear : ''}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm italic">No education details added</span>
                )}
              </div>
            </div>

            {/* Work Experience */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-orange-700 mb-3 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </h3>
              <div className="space-y-3">
                {student.workExperience && student.workExperience.length > 0 ? (
                  student.workExperience.map((work, idx) => (
                    <div key={idx} className="flex flex-col text-sm border-l-2 border-orange-200 pl-3">
                      <span className="font-semibold text-gray-800">{work.company}</span>
                      <span className="text-gray-600">{work.position}</span>
                      {work.location && <span className="text-gray-500 text-xs italic">{work.location}</span>}
                      <span className="text-gray-500 text-xs mt-1">
                        {work.current ? 'Current' : `${work.startDate ? format(new Date(work.startDate), 'MMM yyyy') : ''} - ${work.endDate ? format(new Date(work.endDate), 'MMM yyyy') : ''}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm italic">No work experience added</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className={`${stat.bgColor} backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border-2 border-orange-200 p-3 sm:p-4 md:p-6`}>
                <div className="flex flex-col items-center text-center">
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 ${stat.color} mb-2`} />
                  <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">{stat.name}</p>
                  <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bars Section */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-orange-700 mb-3 sm:mb-4 flex items-center">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2" />
            Overall Progress
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {/* Soul Percentage Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base font-semibold text-gray-700">Soul Progress</span>
                <span className="text-sm sm:text-base font-bold text-orange-700">{avgSoulPercent}%</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-4 sm:h-6 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${avgSoulPercentNum >= 80
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : avgSoulPercentNum >= 50
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                  style={{ width: `${Math.min(100, Math.max(0, avgSoulPercentNum))}%` }}
                >
                  <div className="h-full bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {avgSoulPercentNum >= 80
                  ? 'Excellent spiritual practice!'
                  : avgSoulPercentNum >= 50
                    ? 'Good progress, keep it up!'
                    : 'Focus on Japa, Hearing, and Reading'}
              </p>
            </div>

            {/* Body Percentage Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base font-semibold text-gray-700">Body Progress</span>
                <span className="text-sm sm:text-base font-bold text-amber-700">{avgBodyPercent}%</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-4 sm:h-6 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(avgBodyPercent)))}%` }}
                >
                  <div className="h-full bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Based on To Bed, Wake Up, Daily Filling, and Day Sleep
              </p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Spiritual Practices Chart */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-xl md:text-2xl font-bold text-orange-700 mb-3 sm:mb-4 flex items-center">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2" />
              Spiritual Practices {timeRange === 'all' && '(6 Months)'}
            </h2>
            {chartData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: chartData.length > 15 ? `${chartData.length * 40}px` : '100%' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                      <XAxis dataKey="date" stroke="#9a3412" angle={-15} textAnchor="end" height={60} />
                      <YAxis stroke="#9a3412" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff7ed', border: '2px solid #fb923c', borderRadius: '12px', padding: '10px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#9a3412', marginBottom: '5px' }}
                        label="Date"
                      />
                      <Legend />
                      <Line type="monotone" dataKey="japa" stroke="#ea580c" strokeWidth={3} name="Japa" />
                      <Line type="monotone" dataKey="hearing" stroke="#3b82f6" strokeWidth={3} name="Hearing" />
                      <Line type="monotone" dataKey="reading" stroke="#10b981" strokeWidth={3} name="Reading" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Body & Soul Percentage */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-xl md:text-2xl font-bold text-orange-700 mb-3 sm:mb-4 flex items-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2" />
              Body & Soul % {timeRange === 'all' && '(6 Months)'}
            </h2>
            {weeklyChartData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: weeklyChartData.length > 10 ? `${weeklyChartData.length * 80}px` : '100%' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                      <XAxis dataKey="week" stroke="#9a3412" angle={-15} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} stroke="#9a3412" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff7ed', border: '2px solid #fb923c', borderRadius: '12px', padding: '10px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#9a3412', marginBottom: '5px' }}
                        label="Week"
                      />
                      <Legend />
                      <Bar dataKey="soulPercent" fill="#f59e0b" name="Soul %" />
                      <Bar dataKey="bodyPercent" fill="#8b5cf6" name="Body %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports Table with Pagination */}
        {paginatedReports.length > 0 && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-xl md:text-2xl font-bold text-orange-700 mb-3 sm:mb-4">Recent Reports</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-orange-200">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Japa
                    </th>
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Hearing
                    </th>
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Reading
                    </th>
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Soul %
                    </th>
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Body %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-orange-100">
                  {currentReports.map((report) => {
                    const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
                    return (
                      <tr key={report.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          {format(reportDate, 'MMM d, yyyy')}
                        </td>
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {report.japa || 0}
                        </td>
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {report.hearing || 0}
                        </td>
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {report.reading || 0}
                        </td>
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-orange-700">
                          {report.soulPercent ? `${report.soulPercent.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-orange-700">
                          {report.bodyPercent ? `${report.bodyPercent.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between border-t border-orange-200 pt-4 gap-4">
                <div className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, paginatedReports.length)}</span> of{' '}
                  <span className="font-semibold">{paginatedReports.length}</span> reports
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-lg font-semibold transition-all ${currentPage === page
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {reports.length === 0 && !loading && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-8 text-center">
            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">No reports found for the selected time range.</p>
          </div>
        )}
      </div>

      {/* Profile Photo Modal */}
      {
        showProfilePhoto && student?.profileImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowProfilePhoto(false)}>
            <div className="relative max-w-2xl w-full bg-white rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowProfilePhoto(false)}
                className="absolute -top-4 -right-4 bg-white text-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              {(() => {
                const getGoogleDriveImageUrl = (urlOrId: string) => {
                  if (!urlOrId) return '';
                  const cleanUrl = urlOrId.trim();

                  // 1. Pass-through for known working formats or direct image files
                  if (
                    cleanUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ||
                    cleanUrl.includes('lh3.googleusercontent.com') ||
                    cleanUrl.includes('drive.google.com/uc?')
                  ) {
                    return cleanUrl;
                  }

                  // 2. Try to extract ID using stronger regex
                  let fileId = '';
                  const idPatterns = [
                    /\/d\/([a-zA-Z0-9_-]+)/, // /d/ID
                    /id=([a-zA-Z0-9_-]+)/,   // id=ID
                    /^([a-zA-Z0-9_-]+)$/     // Is just ID
                  ];

                  for (const pattern of idPatterns) {
                    const match = cleanUrl.match(pattern);
                    if (match && match[1]) {
                      fileId = match[1];
                      break;
                    }
                  }

                  // 3. If ID found, return UC link
                  if (fileId) {
                    return `https://drive.google.com/uc?export=view&id=${fileId}`;
                  }

                  // 4. Fallback: If it's a URL but matched nothing, return original
                  if (cleanUrl.startsWith('http')) {
                    return cleanUrl;
                  }

                  // 5. Last resort, treat as ID
                  return `https://drive.google.com/uc?export=view&id=${cleanUrl}`;
                };

                const finalUrl = getGoogleDriveImageUrl(student.profileImage);

                return (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-full aspect-auto rounded-xl overflow-hidden shadow-2xl">
                      <Image
                        src={finalUrl}
                        alt={`${student.name}'s profile`}
                        width={800}
                        height={600}
                        className="w-full h-auto rounded-xl object-contain max-h-[80vh]"
                        unoptimized={true}
                      />
                    </div>
                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-orange-600 hover:text-orange-800 font-medium text-sm bg-orange-50 px-4 py-2 rounded-full transition-colors"
                    >
                      <span>Open original image in new tab</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        )
      }
    </div >
  );
}

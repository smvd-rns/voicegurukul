'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { SadhanaReport } from '@/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, BookOpen, Clock, Copy, Check, Download, Filter, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';

export default function ProgressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const rangeParam = searchParams?.get('range') || 'month';
  const pageParam = parseInt(searchParams?.get('page') || '1');

  const { userData } = useAuth();
  const [reports, setReports] = useState<SadhanaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all' | 'custom'>(
    (rangeParam === 'week' || rangeParam === 'month' || rangeParam === 'all' || rangeParam === 'custom') 
    ? rangeParam as any 
    : 'month'
  );
  const [customDateRange, setCustomDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [currentPage, setCurrentPage] = useState(pageParam);

  // Sync state with URL for back button support
  useEffect(() => {
    if (rangeParam && rangeParam !== timeRange) {
      setTimeRange(rangeParam as any);
    }
    if (pageParam && pageParam !== currentPage) {
      setCurrentPage(pageParam);
    }
  }, [rangeParam, pageParam, timeRange, currentPage]);

  const updateUrl = (newRange?: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newRange) params.set('range', newRange);
    if (newPage) params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const reportsPerPage = 10;
  const maxPages = 10;
  const [copied, setCopied] = useState(false);

  const loadReports = useCallback(async () => {
    if (userData) {
      setLoading(true);
      // For 'all', fetch 6 months of data (180 days)
      const limit = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'custom' ? 365 : 180;
      const allReports = await fetchSadhanaHistory(limit);

      // Filter by custom date range if selected
      if (timeRange === 'custom') {
        const filtered = allReports.filter(report => {
          const reportDateStr = typeof report.date === 'string' ? report.date.split('T')[0] : (report.date as Date).toISOString().split('T')[0];
          return reportDateStr >= customDateRange.from && reportDateStr <= customDateRange.to;
        });
        setReports(filtered);
      } else {
        setReports(allReports);
      }
      setLoading(false);
      setCurrentPage(1); // Reset to first page when data changes
    }
  }, [userData, timeRange, customDateRange.from, customDateRange.to]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Generate Share message
  const generateShareMessage = () => {
    if (reports.length === 0) return '';

    // Get date range
    const sortedReports = [...reports].sort((a, b) => {
      const da = typeof a.date === 'string' ? a.date.split('T')[0] : (a.date as Date).toISOString().split('T')[0];
      const db = typeof b.date === 'string' ? b.date.split('T')[0] : (b.date as Date).toISOString().split('T')[0];
      return da.localeCompare(db);
    });

    const firstDateRaw = sortedReports[0].date;
    const lastDateRaw = sortedReports[sortedReports.length - 1].date;
    const firstDate = typeof firstDateRaw === 'string' ? parseISO(firstDateRaw.split('T')[0]) : firstDateRaw as Date;
    const lastDate = typeof lastDateRaw === 'string' ? parseISO(lastDateRaw.split('T')[0]) : lastDateRaw as Date;

    // Calculate totals
    const totalJapa = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.japa || 0), 0);
    const totalHearing = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.hearing || 0), 0);
    const totalReading = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.reading || 0), 0);
    const totalToBed = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.toBed || 0), 0);
    const totalWakeUp = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.wakeUp || 0), 0);
    const totalDailyFilling = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.dailyFilling || 0), 0);
    const totalDaySleep = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.daySleep || 0), 0);

    // Get book name from most recent report
    const bookName = sortedReports.reverse().find(r => r.bookName)?.bookName || 'N/A';

    // Calculate percentages
    const avgSoulPercent = reports.length > 0
      ? (reports.reduce((sum: number, r: SadhanaReport) => sum + (r.soulPercent || 0), 0) / reports.length).toFixed(1)
      : '0.0';
    const avgBodyPercent = reports.length > 0
      ? (reports.reduce((sum: number, r: SadhanaReport) => sum + (r.bodyPercent || 0), 0) / reports.length).toFixed(1)
      : '0.0';

    const maxMarks = reports.length * 10;

    // Determine report title based on time range
    const reportTitle = timeRange === 'week' ? 'Weekly' :
      timeRange === 'month' ? 'Monthly' :
        timeRange === 'custom' ? 'Custom Period' :
          'Overall';

    const message = `Hare Krishna
${reportTitle} Sadhana Report (${format(firstDate, 'd MMM yyyy')} - ${format(lastDate, 'd MMM yyyy')}):

Japa (${totalJapa}/${maxMarks})
Hearing (${totalHearing}/${maxMarks})
Reading (${totalReading}/${maxMarks})
Book Name: ${bookName}
To Bed (${totalToBed}/${maxMarks})
Wake Up (${totalWakeUp}/${maxMarks})
Daily Filling (${totalDailyFilling}/${maxMarks})
Day Sleep (${totalDaySleep}/${maxMarks})

Soul %: ${avgSoulPercent}%
Body %: ${avgBodyPercent}%

Education Study:
${sortedReports.filter(r => r.study && r.study > 0).map(r => `- ${format(typeof r.date === 'string' ? parseISO(r.date.split('T')[0]) : r.date as Date, 'MMM d')}: ${r.study} hrs`).join('\n')}
`;

    return message;
  };

  const handleCopyShare = async () => {
    const text = generateShareMessage();
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (reports.length === 0) return;

    const headers = ['Date', 'Japa', 'Hearing', 'Reading', 'Book Name', 'Study', 'To Bed', 'Wake Up', 'Daily Filling', 'Day Sleep', 'Body %', 'Soul %'];

    const csvData = reports.map((report: SadhanaReport) => {
      const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
      return [
        format(reportDate, 'yyyy-MM-dd'),
        report.japa || 0,
        report.hearing || 0,
        report.reading || 0,
        report.bookName || '',
        report.study || 0,
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
    a.download = `sadhana_report_${customDateRange.from}_to_${customDateRange.to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
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
              Loading your progress...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalJapaStat = reports.reduce((sum: number, r: SadhanaReport) => sum + (r.japa || 0), 0);
  const avgJapa = reports.length > 0 ? (totalJapaStat / reports.length).toFixed(1) : 0;
  const avgBodyPercentStat = reports.length > 0
    ? (reports.reduce((sum: number, r: SadhanaReport) => sum + (r.bodyPercent || 0), 0) / reports.length).toFixed(1)
    : 0;
  const avgSoulPercentStat = reports.length > 0
    ? (reports.reduce((sum: number, r: SadhanaReport) => sum + (r.soulPercent || 0), 0) / reports.length).toFixed(1)
    : 0;

  // Calculate spiritual progress rating based on average Soul %
  const avgSoulPercentNum = parseFloat(avgSoulPercentStat.toString());
  let spiritualRating = '';

  if (avgSoulPercentNum >= 80) {
    spiritualRating = 'Excellent';
  } else if (avgSoulPercentNum >= 50) {
    spiritualRating = 'Good Progress';
  } else {
    spiritualRating = 'Needs Improvement';
  }

  const sortedReports = [...reports].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  // Prepare chart data for daily view (Spiritual Practices)
  // For 'all' time range, show last 30 days only in the chart
  const spiritualPracticesData = timeRange === 'all'
    ? reports.slice(0, 30)
    : reports;

  const chartData = spiritualPracticesData
    .map((report: SadhanaReport) => {
      const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
      return {
        date: format(reportDate, 'MMM d'),
        japa: report.japa || 0,
        hearing: report.hearing || 0,
        reading: report.reading || 0,
        bodyPercent: report.bodyPercent || 0,
        soulPercent: report.soulPercent || 0,
      };
    });

  // Prepare weekly aggregated data for Body & Soul percentage chart
  // For 'all' time range, use all 6 months of data
  const weeklyData: { [key: string]: { reports: SadhanaReport[], weekStart: Date, weekEnd: Date } } = {};

  reports.forEach((report: SadhanaReport) => {
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
      // Calculate totals for the week
      const weeklyJapa = weekReports.reduce((sum, r) => sum + (r.japa || 0), 0);
      const weeklyHearing = weekReports.reduce((sum, r) => sum + (r.hearing || 0), 0);
      const weeklyReading = weekReports.reduce((sum, r) => sum + (r.reading || 0), 0);

      const weeklyToBed = weekReports.reduce((sum, r) => sum + (r.toBed || 0), 0);
      const weeklyWakeUp = weekReports.reduce((sum, r) => sum + (r.wakeUp || 0), 0);
      const weeklyDailyFilling = weekReports.reduce((sum, r) => sum + (r.dailyFilling || 0), 0);
      const weeklyDaySleep = weekReports.reduce((sum, r) => sum + (r.daySleep || 0), 0);

      // Weekly Soul Total Possible = 70 * 3 = 210
      const avgSoulPercent = ((weeklyJapa + weeklyHearing + weeklyReading) / 210) * 100;

      // Weekly Body Total Possible = 70 * 4 = 280
      const avgBodyPercent = ((weeklyToBed + weeklyWakeUp + weeklyDailyFilling + weeklyDaySleep) / 280) * 100;

      return {
        week: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
        bodyPercent: Math.min(100, Math.round(avgBodyPercent * 10) / 10),
        soulPercent: Math.min(100, Math.round(avgSoulPercent * 10) / 10),
      };
    })
    .sort((a, b) => {
      // Sort by week start date
      const dateA = new Date(a.week.split(' - ')[0]);
      const dateB = new Date(b.week.split(' - ')[0]);
      return dateA.getTime() - dateB.getTime();
    });

  const stats = [
    {
      name: 'Spiritual Progress',
      value: spiritualRating,
      icon: TrendingUp,
      bgColor: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
    },
    {
      name: 'Avg Japa/Day',
      value: avgJapa.toString(),
      icon: BookOpen,
      bgColor: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    },
    {
      name: 'Avg Soul %',
      value: `${avgSoulPercentStat}%`,
      icon: Clock,
      bgColor: 'bg-gradient-to-br from-orange-400 to-rose-400',
    },
    {
      name: 'Avg Body %',
      value: `${avgBodyPercentStat}%`,
      icon: Calendar,
      bgColor: 'bg-gradient-to-br from-sky-400 to-indigo-500',
    },
  ];

  // Pagination for recent reports - newest first, max 10 pages (100 reports)
  const maxReportsToShow = 100; // 10 pages * 10 per page
  const paginatedReports = sortedReports.slice(0, maxReportsToShow);
  const totalPages = Math.min(Math.ceil(paginatedReports.length / reportsPerPage), maxPages);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const currentReports = paginatedReports.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ── Tabs Navigation ── */}
        <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm max-w-fit mx-auto lg:mx-0">
          <button
            onClick={() => router.push('/dashboard/sadhana')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all text-gray-500 hover:text-gray-700 hover:bg-white/50"
          >
            <BookOpen className="h-4 w-4" />
            Daily Record
          </button>
          <button
            onClick={() => router.push('/dashboard/sadhana/progress')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-white text-orange-600 shadow-sm border border-orange-100"
          >
            <BarChart3 className="h-4 w-4" />
            My Progress
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <p className="text-base sm:text-lg md:text-xl font-serif text-purple-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
            Progress Dashboard
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
            Track your spiritual journey over time
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
            {/* Time Range Filters */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start">
              <button
                onClick={() => { setTimeRange('week'); setShowCustomRange(false); updateUrl('week', 1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${timeRange === 'week'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => { setTimeRange('month'); setShowCustomRange(false); updateUrl('month', 1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${timeRange === 'month'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
              >
                Month
              </button>
              <button
                onClick={() => { setTimeRange('all'); setShowCustomRange(false); updateUrl('all', 1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${timeRange === 'all'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${timeRange === 'custom'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                Custom
              </button>
            </div>

            {/* Share & Export Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyShare}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Export</span>
              </button>
            </div>
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
                    onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">To Date</label>
                  <input
                    type="date"
                    value={customDateRange.to}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium"
                  />
                </div>
              </div>
              <button
                onClick={() => { setTimeRange('custom'); loadReports(); updateUrl('custom', 1); }}
                className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2 text-sm sm:text-base rounded-xl font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg"
              >
                Apply Date Range
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className={`${stat.bgColor} rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 transform transition-all hover:scale-105 hover:shadow-2xl relative overflow-hidden group border-none`}>
                <div className="absolute -right-4 -top-4 opacity-20 group-hover:opacity-30 transition-opacity whitespace-nowrap overflow-visible">
                  <Icon className="w-24 h-24 sm:w-32 sm:h-32 text-white overflow-visible -z-10 absolute left-8 top-8" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between items-start text-left">
                  <div className="flex items-center space-x-2 text-white/90 mb-3 sm:mb-4">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <p className="text-xs sm:text-sm font-semibold tracking-wide uppercase shadow-sm">{stat.name}</p>
                  </div>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">{stat.value}</p>
                </div>
              </div>
            );
          })}
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
                    <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                      Study
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
                        <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 text-xs sm:text-sm font-bold text-gray-600">
                          {report.study ? `${report.study} hr` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-orange-200 pt-4">
                <div className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, paginatedReports.length)}</span> of{' '}
                  <span className="font-semibold">{paginatedReports.length}</span> reports
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { 
                      const next = Math.max(1, currentPage - 1);
                      setCurrentPage(next);
                      updateUrl(undefined, next);
                    }}
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
                        onClick={() => {
                          setCurrentPage(page);
                          updateUrl(undefined, page);
                        }}
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
                    onClick={() => {
                      const next = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(next);
                      updateUrl(undefined, next);
                    }}
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
      </div>
    </div>
  );
}

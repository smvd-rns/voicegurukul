'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Users, Globe, ShieldCheck, Heart, RefreshCw, ArrowLeft,
  Smartphone, Monitor, Tablet, Eye, Clock, Sparkles, Filter,
  CheckCircle2, Compass, ChevronRight, ChevronLeft, Activity, Zap,
  Database, Search, X, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VisitorStats {
  totalVisitors: number;
  guestVisitors: number;
  loggedInVisitors: number;
  totalPageviews: number;
  donateVisitors: number;
  campVisitors: number;
}

interface PageStat {
  path: string;
  views: number;
  visitors: number;
  guestVisitors: number;
  loggedInVisitors: number;
}

interface DeviceStat {
  device: string;
  count: number;
}

interface RecentVisit {
  id: string;
  created_at: string;
  visitor_id: string;
  page_path: string;
  page_title: string | null;
  is_logged_in: boolean;
  user_email: string | null;
  user_role: string | null;
  device_type: string;
  browser: string;
  referrer: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  guestCount?: number;
  memberCount?: number;
  totalPages: number;
}

export default function AdminVisitorsPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'guest' | 'member'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop' | 'tablet'>('all');
  const [pathFilter, setPathFilter] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [topPages, setTopPages] = useState<PageStat[]>([]);
  const [devices, setDevices] = useState<DeviceStat[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [tableSize, setTableSize] = useState<string>('under 1 MB');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    totalCount: 0,
    guestCount: 0,
    memberCount: 0,
    totalPages: 1,
  });

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(async (
    targetPage = page,
    targetLimit = limit,
    targetSearch = search,
    targetType = typeFilter,
    targetDevice = deviceFilter,
    targetPath = pathFilter
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        page: String(targetPage),
        limit: String(targetLimit),
      });

      if (targetSearch.trim()) params.append('search', targetSearch.trim());
      if (targetType !== 'all') params.append('type', targetType);
      if (targetDevice !== 'all') params.append('device', targetDevice);
      if (targetPath.trim()) params.append('path', targetPath.trim());

      const res = await fetch(`/api/admin/visitors?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load analytics');
      }
      setStats(data.stats);
      setTopPages(data.topPages || []);
      setDevices(data.devices || []);
      setRecentVisits(data.recentVisits || []);
      setTableSize(data.tableSize || 'under 1 MB');
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading visitor stats');
    } finally {
      setLoading(false);
    }
  }, [period, page, limit, search, typeFilter, deviceFilter, pathFilter]);

  // Initial and dependent load
  useEffect(() => {
    fetchAnalytics(page, limit, search, typeFilter, deviceFilter, pathFilter);
  }, [period, page, limit, typeFilter, deviceFilter, pathFilter, fetchAnalytics]);

  // Handle Search Input with Debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchAnalytics(1, limit, value, typeFilter, deviceFilter, pathFilter);
    }, 350);
  };

  const handleClearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setDeviceFilter('all');
    setPathFilter('');
    setPage(1);
    fetchAnalytics(1, limit, '', 'all', 'all', '');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
  };

  const handlePeriodChange = (newPeriod: 'today' | '7d' | '30d' | 'all') => {
    setPeriod(newPeriod);
    setPage(1);
  };

  const isFiltered = Boolean(search.trim() || typeFilter !== 'all' || deviceFilter !== 'all' || pathFilter.trim());

  const cards = [
    {
      title: 'Real Visitors',
      value: stats?.totalVisitors ?? 0,
      desc: 'Unique individual devices',
      icon: Users,
      gradient: 'from-blue-500 via-indigo-500 to-violet-600',
    },
    {
      title: 'Normal / Guests',
      value: stats?.guestVisitors ?? 0,
      desc: 'Public viewers & prospective donors',
      icon: Globe,
      gradient: 'from-amber-500 via-orange-500 to-amber-600',
    },
    {
      title: 'Logged-in Members',
      value: stats?.loggedInVisitors ?? 0,
      desc: 'Active devotees & counselors',
      icon: ShieldCheck,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    },
    {
      title: 'Donation Visitors',
      value: stats?.donateVisitors ?? 0,
      desc: 'Visited /donate contributions',
      icon: Heart,
      gradient: 'from-rose-500 via-pink-500 to-red-600',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/dashboard/admin"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-2xs border border-slate-200"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Website Visitors & Traffic
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Self-Hosted Live
                </span>
                {/* Real-time Storage Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200" title="Disk space used in your droplet PostgreSQL database">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  DB Space: <strong className="text-slate-900 font-bold">{tableSize}</strong>
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Real-time tracking of unique visitors, public guest interest (donations/camps), and active devotee members.
              </p>
            </div>
          </div>

          {/* Time Filter & Refresh Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              {(['today', '7d', '30d', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3.5 py-1.5 rounded-lg transition capitalize ${
                    period === p
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 font-semibold'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === '7d' ? 'Last 7 Days' : p === '30d' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAnalytics(page, limit)}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 High-Craft KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="relative overflow-hidden rounded-2xl p-5 bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
            >
              {/* Subtle Ambient Color Glow */}
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${c.gradient} opacity-10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:opacity-20 transition-opacity`}
              />

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {c.title}
                  </span>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {loading ? (
                      <span className="animate-pulse text-slate-300">...</span>
                    ) : (
                      c.value.toLocaleString()
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    {c.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Top Pages (2 cols) & Devices (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Visited Pages Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" />
                Most Visited Pages
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Visitor distribution between guests and logged-in devotees
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Total Pageviews: <span className="font-black text-slate-900">{stats?.totalPageviews || 0}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-y border-slate-200">
                <tr>
                  <th className="px-3.5 py-3 rounded-l-lg">Page Path</th>
                  <th className="px-3.5 py-3 text-right">Views</th>
                  <th className="px-3.5 py-3 text-right">Unique Visitors</th>
                  <th className="px-3.5 py-3 text-right rounded-r-lg">Guest vs Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topPages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-medium">
                      No visits recorded yet for this time window.
                    </td>
                  </tr>
                ) : (
                  topPages.map((page, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-3 font-mono text-xs font-bold text-slate-800">
                        <button
                          onClick={() => {
                            setPathFilter(page.path);
                            setPage(1);
                          }}
                          className="inline-block px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 max-w-[220px] sm:max-w-xs truncate transition text-left"
                          title={`Click to filter live stream by ${page.path}`}
                        >
                          {page.path}
                        </button>
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-slate-700">
                        {page.views}
                      </td>
                      <td className="px-3.5 py-3 text-right font-extrabold text-indigo-600">
                        {page.visitors}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            {page.guestVisitors} Guest
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            {page.loggedInVisitors} Member
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Visitor Devices
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Breakdown of mobile vs desktop users
              </p>
            </div>

            <div className="space-y-3.5">
              {devices.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center font-medium">No device data yet.</p>
              ) : (
                devices.map((d, i) => {
                  const total = devices.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  const pct = Math.round((d.count / total) * 100);
                  const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor;
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 transition hover:bg-slate-100/60"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="capitalize font-bold text-slate-700 flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          {d.device}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {d.count} <span className="text-slate-500 font-semibold">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed font-medium">
            <span className="font-bold text-amber-950 block mb-0.5">Classification Legend:</span>
            <strong>Guest:</strong> Public unauthenticated visitor (reading camps, home, or donations).<br />
            <strong>Member:</strong> Signed-in devotee account with active session.
          </div>
        </div>
      </div>

      {/* Live Visitor Activity Stream with Search & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Stream Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Live Visitor Activity Stream
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Paginated real-time log of visits with instant search and filters
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Rows per page selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Feed
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search page path (e.g. /donate), email, or referrer..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              {search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Visitor Type Filter */}
            <div className="flex items-center gap-1.5">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Visitors</option>
                <option value="guest">Guests Only (G)</option>
                <option value="member">Members Only (M)</option>
              </select>

              {/* Device Filter */}
              <select
                value={deviceFilter}
                onChange={(e) => {
                  setDeviceFilter(e.target.value as any);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
              </select>

              {/* Reset Button */}
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Page Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Quick Filter:
            </span>
            {[
              { label: 'All Pages', path: '' },
              { label: 'Donations (/donate)', path: '/donate' },
              { label: 'Camps (/camps)', path: '/camps' },
              { label: 'Home (/)', path: '/' },
              { label: 'Admin (/dashboard/admin)', path: '/dashboard/admin' },
            ].map(pill => (
              <button
                key={pill.label}
                onClick={() => {
                  setPathFilter(pill.path);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  pathFilter === pill.path
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Results Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">
              {pagination.totalCount.toLocaleString()} {pagination.totalCount === 1 ? 'visit' : 'visits'} matching
            </span>
            {isFiltered && (
              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-bold text-[10.5px]">
                Filtered
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 sm:mt-0 font-bold text-[11px]">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              {pagination.guestCount || 0} Guests
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {pagination.memberCount || 0} Members
            </span>
          </div>
        </div>

        {/* Visits Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-y border-slate-200">
              <tr>
                <th className="px-3.5 py-3 rounded-l-lg">Time</th>
                <th className="px-3.5 py-3">Visitor Type</th>
                <th className="px-3.5 py-3">Page Visited</th>
                <th className="px-3.5 py-3">Device & Browser</th>
                <th className="px-3.5 py-3 rounded-r-lg">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs font-medium">
                    No visits found matching your filter criteria. Try clearing search or changing filters.
                  </td>
                </tr>
              ) : (
                recentVisits.map((visit) => {
                  const visitDate = new Date(visit.created_at);
                  const timeFormatted = visitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateFormatted = visitDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/70 transition text-xs">
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{timeFormatted}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{dateFormatted}</span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {visit.is_logged_in ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Member
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 truncate max-w-[170px]" title={visit.user_email || ''}>
                              {visit.user_email || 'Logged In'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            <Globe className="w-3 h-3 text-amber-600" />
                            Guest Visitor
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-800">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-900">
                          {visit.page_path}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                        <span className="capitalize font-bold text-slate-800">{visit.device_type}</span>
                        <span className="text-slate-400 text-[11px] ml-1 font-medium">({visit.browser})</span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 truncate max-w-[200px]">
                        {visit.referrer ? (
                          <span title={visit.referrer} className="font-semibold text-blue-600 hover:underline">
                            {visit.referrer.replace(/^https?:\/\//, '').split('/')[0]}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-medium">Direct / Bookmarked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{recentVisits.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(page * limit, pagination.totalCount)}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.totalCount.toLocaleString()}</span> visits
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">
              Page {page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

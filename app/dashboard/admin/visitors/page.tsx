'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Globe, ShieldCheck, Heart, RefreshCw, ArrowLeft,
  Smartphone, Monitor, Tablet, Eye, Clock, Sparkles, Filter,
  CheckCircle2, AlertCircle, Compass, ChevronRight
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

export default function AdminVisitorsPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [topPages, setTopPages] = useState<PageStat[]>([]);
  const [devices, setDevices] = useState<DeviceStat[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/visitors?period=${period}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load analytics');
      }
      setStats(data.stats);
      setTopPages(data.topPages || []);
      setDevices(data.devices || []);
      setRecentVisits(data.recentVisits || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading visitor stats');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Website Visitors & Traffic</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Live Self-Hosted
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track real unique visitors, guest traffic (donations/camps), and logged-in members.
              </p>
            </div>
          </div>
        </div>

        {/* Time Filter & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold">
            {(['today', '7d', '30d', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition capitalize ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? 'Last 7 Days' : p === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
            title="Refresh Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unique Visitors */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Real Visitors
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : stats?.totalVisitors.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Unique individual devices
          </p>
        </div>

        {/* Guest / Public Visitors */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Normal / Guests
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : stats?.guestVisitors.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Public viewers & prospective donors
          </p>
        </div>

        {/* Logged-in Members */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Logged-in Members
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : stats?.loggedInVisitors.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Active devotees & counselors
          </p>
        </div>

        {/* Donation Interest */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Donation Visitors
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : stats?.donateVisitors.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Visited <span className="font-mono text-[11px] text-rose-700 dark:text-rose-300">/donate</span>
          </p>
        </div>
      </div>

      {/* Middle Grid: Top Pages & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Visited Pages (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" />
                Most Visited Pages
              </h2>
              <p className="text-xs text-gray-500">Breakdown of guest vs logged-in devotee views</p>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Total Pageviews: {stats?.totalPageviews || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Page Path</th>
                  <th className="px-3 py-2.5 text-right">Views</th>
                  <th className="px-3 py-2.5 text-right">Unique Visitors</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg">Guest vs Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {topPages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400 text-xs">
                      No visit data recorded yet for this period.
                    </td>
                  </tr>
                ) : (
                  topPages.map((page, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-3 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white">
                        <span className="inline-block max-w-[200px] sm:max-w-xs truncate" title={page.path}>
                          {page.path}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                        {page.views}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        {page.visitors}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-semibold text-[11px]">
                            {page.guestVisitors} G
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold text-[11px]">
                            {page.loggedInVisitors} M
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

        {/* Devices Breakdown (1 col) */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              Visitor Devices
            </h2>
            <p className="text-xs text-gray-500 mb-4">Mobile vs Desktop vs Tablet</p>

            <div className="space-y-3">
              {devices.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No device data yet.</p>
              ) : (
                devices.map((d, i) => {
                  const total = devices.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  const pct = Math.round((d.count / total) * 100);
                  const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor;
                  return (
                    <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="capitalize font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-gray-500" />
                          {d.device}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {d.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>G:</strong> Guest / Public Visitor<br />
            <strong>M:</strong> Logged-in Devotee Member
          </div>
        </div>
      </div>

      {/* Live Recent Visitor Activity Stream */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Live Visitor Activity Stream
            </h2>
            <p className="text-xs text-gray-500">Real-time log of the latest visits across the site</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-Time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2.5 rounded-l-lg">Time</th>
                <th className="px-3 py-2.5">Visitor Type</th>
                <th className="px-3 py-2.5">Page Visited</th>
                <th className="px-3 py-2.5">Device & Browser</th>
                <th className="px-3 py-2.5 rounded-r-lg">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                    No recent visits logged yet. Browse pages on the website to see them appear here live!
                  </td>
                </tr>
              ) : (
                recentVisits.map((visit) => {
                  const visitDate = new Date(visit.created_at);
                  const timeFormatted = visitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateFormatted = visitDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr key={visit.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition text-xs">
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{timeFormatted}</span>
                        <span className="block text-[10px] text-gray-400">{dateFormatted}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {visit.is_logged_in ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              Member
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                              {visit.user_email || 'Logged In'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-semibold text-[11px]">
                            <Globe className="w-3 h-3" />
                            Guest Visitor
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono font-medium text-gray-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          {visit.page_path}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <span className="capitalize font-semibold">{visit.device_type}</span>
                        <span className="text-gray-400 text-[11px] ml-1">({visit.browser})</span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 truncate max-w-[180px]">
                        {visit.referrer ? (
                          <span title={visit.referrer} className="text-blue-600 dark:text-blue-400">
                            {visit.referrer.replace(/^https?:\/\//, '').split('/')[0]}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Direct / Bookmarked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


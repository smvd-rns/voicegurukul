'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Tent,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
  Search,
  Filter,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Building2,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  UserCheck,
  UserX
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

export interface CampAttendee {
  id: string;
  participant_name: string;
  email: string;
  whatsapp: string;
  gender?: string;
  age?: number;
  current_center: string;
  voice_name?: string;
  current_temple?: string;
  counselor_name?: string;
  is_registered: boolean;
  camp_id?: string;
  camp_track?: string;
  accommodation?: string;
  passcode?: string;
  payment_status: 'completed' | 'processing' | 'pending' | 'not_registered' | string;
  payment_method?: string;
  total_cost?: number | string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  poc_name?: string;
  poc_contact?: string;
  group_id?: string;
  created_at?: string;
  camp_title?: string;
  camp_slug?: string;
  camp_start_date?: string;
  camp_end_date?: string;
  camp_venue?: string;
  camp_status?: string;
}

interface CenterCampRegistrationsViewProps {
  initialCenter?: string;
  sourceView?: 'project-manager' | 'camp';
  onCenterChange?: (centerName: string) => void;
}

export default function CenterCampRegistrationsView({
  initialCenter = '',
  sourceView = 'project-manager',
  onCenterChange
}: CenterCampRegistrationsViewProps) {
  const [selectedCenter, setSelectedCenter] = useState<string>(initialCenter);
  const [authorizedCenters, setAuthorizedCenters] = useState<{ id: string; name: string; temple?: string }[]>([]);
  const [registrations, setRegistrations] = useState<CampAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampId, setSelectedCampId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'unregistered' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [distinctCamps, setDistinctCamps] = useState<{ id: string; title: string; slug: string; startDate: string; endDate: string }[]>([]);

  // Real-time server stats
  const [stats, setStats] = useState({
    totalCenterDevotees: 0,
    registered: 0,
    unregistered: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    totalAmount: 0,
  });

  // Pagination State: 10 - 20 - 30
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever search, camp filter, status filter, center, or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCampId, statusFilter, selectedCenter, pageSize]);

  // Update selectedCenter when prop changes
  useEffect(() => {
    if (initialCenter && initialCenter !== selectedCenter) {
      setSelectedCenter(initialCenter);
    }
  }, [initialCenter]);

  const loadRegistrations = useCallback(async (centerToFetch: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = `/api/project-manager/camp-registrations?center=${encodeURIComponent(centerToFetch || '')}&_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load camp registrations');
      }

      setRegistrations(json.registrations || []);
      setDistinctCamps(json.distinctCamps || []);
      if (json.stats) {
        setStats({
          totalCenterDevotees: json.stats.totalCenterDevotees || json.stats.total || 0,
          registered: json.stats.registered || 0,
          unregistered: json.stats.unregistered || 0,
          confirmed: json.stats.confirmed || 0,
          pending: json.stats.pending || 0,
          cancelled: json.stats.cancelled || 0,
          totalAmount: json.stats.totalAmount || 0,
        });
      }

      if (json.authorizedCenters && json.authorizedCenters.length > 0) {
        setAuthorizedCenters(json.authorizedCenters);
        if (!centerToFetch && json.currentCenter) {
          setSelectedCenter(json.currentCenter);
          if (onCenterChange) onCenterChange(json.currentCenter);
        }
      }
    } catch (err: any) {
      console.error('Error fetching center camp registrations:', err);
      setErrorMsg(err.message || 'Failed to fetch camp registrations');
    } finally {
      setLoading(false);
    }
  }, [onCenterChange]);

  useEffect(() => {
    loadRegistrations(selectedCenter);
  }, [selectedCenter, loadRegistrations]);

  const handleCenterSelect = (centerName: string) => {
    setSelectedCenter(centerName);
    if (onCenterChange) onCenterChange(centerName);
  };

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // 1. Camp Filter (if camp selected, unreg devotees are omitted or shown based on status filter)
      if (selectedCampId !== 'all') {
        if (!reg.is_registered || reg.camp_id !== selectedCampId) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'registered') {
        if (!reg.is_registered) return false;
      } else if (statusFilter === 'unregistered') {
        if (reg.is_registered) return false;
      } else if (statusFilter === 'confirmed') {
        if (!reg.is_registered || reg.is_cancelled || reg.payment_status !== 'completed') return false;
      } else if (statusFilter === 'pending') {
        if (!reg.is_registered || reg.is_cancelled || reg.payment_status === 'completed') return false;
      } else if (statusFilter === 'cancelled') {
        if (!reg.is_cancelled) return false;
      }

      // 3. Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (reg.participant_name || '').toLowerCase().includes(q);
        const matchesEmail = (reg.email || '').toLowerCase().includes(q);
        const matchesPhone = (reg.whatsapp || '').toLowerCase().includes(q) || (reg.poc_contact || '').toLowerCase().includes(q);
        const matchesPasscode = (reg.passcode || '').toLowerCase().includes(q);
        const matchesCamp = (reg.camp_title || '').toLowerCase().includes(q);
        const matchesCounselor = (reg.counselor_name || '').toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesPasscode && !matchesCamp && !matchesCounselor) {
          return false;
        }
      }

      return true;
    }).sort((a, b) =>
      (a.participant_name || '').localeCompare(b.participant_name || '', undefined, { sensitivity: 'base' })
    );
  }, [registrations, selectedCampId, statusFilter, searchTerm]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRegistrations.length);
  const paginatedRegistrations = useMemo(() => {
    return filteredRegistrations.slice(startIndex, endIndex);
  }, [filteredRegistrations, startIndex, endIndex]);

  const formatCampDates = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr || !endDateStr) return 'Dates TBD';
    try {
      const s = typeof startDateStr === 'string' ? parseISO(startDateStr) : startDateStr;
      const e = typeof endDateStr === 'string' ? parseISO(endDateStr) : endDateStr;
      return `${format(s, 'dd MMM yyyy')} → ${format(e, 'dd MMM yyyy')}`;
    } catch {
      return `${startDateStr.slice(0, 10)} → ${endDateStr.slice(0, 10)}`;
    }
  };

  const formatCampDatesCompact = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr || !endDateStr) return 'Dates TBD';
    try {
      const s = typeof startDateStr === 'string' ? parseISO(startDateStr) : startDateStr;
      const e = typeof endDateStr === 'string' ? parseISO(endDateStr) : endDateStr;
      return `${format(s, 'dd MMM')} → ${format(e, 'dd MMM yyyy')}`;
    } catch {
      return `${startDateStr.slice(5, 10)} → ${endDateStr.slice(0, 10)}`;
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-4 pb-12 sm:pb-4">
      {/* Top Banner & Center Switcher */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-emerald-500/10 border border-orange-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xs shrink-0">
            <Tent className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-xs sm:text-lg font-black text-slate-900 tracking-tight">
                Center Camp Registrations
              </h2>
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" /> Center Isolated
              </span>
            </div>
            <p className="text-[10.5px] sm:text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
              <span>Center:</span>
              <strong className="text-orange-900 font-bold truncate max-w-[200px] sm:max-w-none">
                {selectedCenter || 'Loading center...'}
              </strong>
            </p>
          </div>
        </div>

        {/* Center Selector (if multiple centers managed) & Source Link */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto shrink-0">
          {authorizedCenters.length > 1 && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedCenter}
                onChange={(e) => handleCenterSelect(e.target.value)}
                className="w-full pl-7 pr-7 py-1 sm:py-1.5 bg-white border border-orange-300 hover:border-orange-400 focus:border-orange-500 rounded-xl font-bold text-[11px] sm:text-xs text-slate-800 shadow-2xs cursor-pointer outline-none appearance-none transition-colors"
                title="Switch managed center"
              >
                {authorizedCenters.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.temple ? `(${c.temple})` : ''}
                  </option>
                ))}
              </select>
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => loadRegistrations(selectedCenter)}
            disabled={loading}
            className="p-1.5 sm:p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh registrations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          {sourceView === 'project-manager' ? (
            <Link
              href="/dashboard/camp"
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-300 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
              title="Open Camp Portal"
            >
              <span>Camp Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            <Link
              href="/dashboard/project-manager?tab=camp-registrations"
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-300 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
              title="Open Project Manager Dashboard"
            >
              <span>PM Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stat Cards: Compact on mobile, detailed on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2.5">
        {/* 1. Total Center Devotees */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`bg-white border rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xs transition-all cursor-pointer hover:-translate-y-0.5 ${
            statusFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Devotees</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900">
            {loading ? '...' : stats.totalCenterDevotees}
          </div>
          <p className="hidden sm:block text-[9.5px] sm:text-[10px] text-blue-600 font-bold mt-0.5 truncate">In {selectedCenter}</p>
        </div>

        {/* 2. Registered for Camps */}
        <div
          onClick={() => setStatusFilter('registered')}
          className={`bg-white border rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xs transition-all cursor-pointer hover:-translate-y-0.5 ${
            statusFilter === 'registered' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-700">
            {loading ? '...' : stats.registered}
          </div>
          <p className="hidden sm:block text-[9.5px] sm:text-[10px] text-emerald-600 font-bold mt-0.5 truncate">
            {stats.totalCenterDevotees > 0 ? `${Math.round((stats.registered / stats.totalCenterDevotees) * 100)}% registered` : 'Active camp passes'}
          </p>
        </div>

        {/* 3. Not Registered (Pending Registration) */}
        <div
          onClick={() => setStatusFilter('unregistered')}
          className={`bg-white border rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xs transition-all cursor-pointer hover:-translate-y-0.5 ${
            statusFilter === 'unregistered' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200/90 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Not Registered</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <UserX className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-rose-600">
            {loading ? '...' : stats.unregistered}
          </div>
          <p className="hidden sm:block text-[9.5px] sm:text-[10px] text-rose-600 font-bold mt-0.5 truncate">Follow-up Needed</p>
        </div>

        {/* 4. Confirmed Passes */}
        <div
          onClick={() => setStatusFilter('confirmed')}
          className={`bg-white border rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xs transition-all cursor-pointer hover:-translate-y-0.5 ${
            statusFilter === 'confirmed' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200/90 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirmed</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-teal-700">
            {loading ? '...' : stats.confirmed}
          </div>
          <p className="hidden sm:block text-[9.5px] sm:text-[10px] text-teal-600 font-bold mt-0.5 truncate">Pass Issued & Done</p>
        </div>

        {/* 5. Total Confirmed Fee */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xs hover:border-slate-300 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Fee</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900">
            ₹{loading ? '...' : stats.totalAmount.toLocaleString('en-IN')}
          </div>
          <p className="hidden sm:block text-[9.5px] sm:text-[10px] text-slate-400 font-bold mt-0.5 truncate">Net Contribution</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Devotees ({stats.totalCenterDevotees})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('registered')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'registered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Registered ({stats.registered})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unregistered')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              statusFilter === 'unregistered'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span>Not Registered ({stats.unregistered})</span>
            {stats.unregistered > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'confirmed'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            Confirmed ({stats.confirmed})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending Action ({stats.pending})
          </button>
        </div>

        {/* Search & Camp Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5 items-center pt-1 border-t border-slate-100">
          {/* Search Devotee */}
          <div className="relative group sm:col-span-2 lg:col-span-7">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search devotee name, phone, email, counselor, passcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl focus:ring-2 focus:ring-orange-100 text-xs font-medium transition-all shadow-2xs outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                ✕
              </button>
            )}
          </div>

          {/* Camp Filter Dropdown */}
          <div className="relative sm:col-span-1 lg:col-span-5">
            <select
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors outline-none"
            >
              <option value="all">All Camps ({distinctCamps.length})</option>
              {distinctCamps.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.title}
                </option>
              ))}
            </select>
            <Tent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100 flex-wrap gap-2">
          <span>
            Showing <strong className="text-slate-900 font-bold">{filteredRegistrations.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-900 font-bold">{filteredRegistrations.length}</strong> devotees from <strong className="text-orange-900 font-bold">{selectedCenter}</strong>
          </span>

          {(searchTerm || selectedCampId !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCampId('all');
                setStatusFilter('all');
              }}
              className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Registrations List / Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 shadow-2xs">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading center devotees for {selectedCenter}...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-bold text-sm">{errorMsg}</h3>
          <p className="text-xs text-rose-600">Please make sure you have assigned permissions for this center.</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-12 text-center border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-orange-500 mx-auto mb-3 flex items-center justify-center shadow-2xs">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Devotees Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || selectedCampId !== 'all' || statusFilter !== 'all'
              ? 'No center devotees match your selected filters. Try clearing filters to see all.'
              : `No devotees found for center "${selectedCenter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card View: Ultra-compact, clean, and elegant */}
          <div className="sm:hidden space-y-1.5">
            {paginatedRegistrations.map((reg) => {
              const isConfirmed = reg.is_registered && !reg.is_cancelled && reg.payment_status === 'completed';
              const cleanPhone = (reg.whatsapp || '').replace(/[^0-9]/g, '');

              return (
                <div
                  key={reg.id}
                  className={`bg-white border rounded-xl p-2 sm:p-2.5 shadow-2xs space-y-1.5 transition-all ${
                    !reg.is_registered
                      ? 'border-slate-200 hover:border-slate-300'
                      : isConfirmed
                      ? 'border-emerald-200/90 hover:border-emerald-300'
                      : 'border-slate-200 hover:border-orange-300'
                  }`}
                >
                  {/* Top Header: Devotee & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                        !reg.is_registered
                          ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                          : isConfirmed
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-orange-500 to-amber-600'
                      }`}>
                        {reg.participant_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {reg.participant_name}
                          </span>
                          {reg.passcode && (
                            <span className="px-1 py-0.2 rounded text-[8.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              #{reg.passcode}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {reg.gender || 'Devotee'}{reg.age ? ` • ${reg.age}y` : ''}{reg.counselor_name ? ` • ${reg.counselor_name}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge: Non-wrapping shrink-0 pill */}
                    <div className="shrink-0">
                      {!reg.is_registered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          <UserX className="w-2.5 h-2.5 text-rose-500 shrink-0" /> Not Registered
                        </span>
                      ) : reg.is_cancelled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-300 whitespace-nowrap">
                          <XCircle className="w-2.5 h-2.5 text-slate-500 shrink-0" /> Cancelled
                        </span>
                      ) : isConfirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" /> Pending Approval
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Camp Information Strip (for registered devotees) */}
                  {reg.is_registered && reg.camp_title && (
                    <div className="rounded-lg bg-orange-50/70 border border-orange-200/80 px-2 py-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1 min-w-0 font-bold text-orange-950 truncate">
                          <Tent className="w-3 h-3 text-orange-600 shrink-0" />
                          <span className="truncate">{reg.camp_title}</span>
                        </div>
                        {reg.camp_track && (
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-white text-orange-900 border border-orange-300 shadow-2xs whitespace-nowrap shrink-0">
                            {reg.camp_track}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 text-[9.5px] text-orange-900/80 font-medium">
                        <span className="flex items-center gap-0.5 font-semibold truncate">
                          <Calendar className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                          {formatCampDatesCompact(reg.camp_start_date, reg.camp_end_date)}
                        </span>
                        {reg.camp_venue && (
                          <span className="flex items-center gap-0.5 text-slate-500 truncate text-[9px]">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{reg.camp_venue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action & Fee Footer */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            reg.is_registered && reg.camp_title
                              ? `Hare Krishna Prabhuji, regarding your registration for ${reg.camp_title} from ${selectedCenter}:`
                              : `Hare Krishna Prabhuji, camp registrations are open for our center (${selectedCenter}). Please book your pass here: https://voicegurukul.com/dashboard/camp`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all flex items-center gap-1 text-[10px] font-bold shadow-2xs cursor-pointer"
                          title={reg.is_registered ? 'Message on WhatsApp' : 'Send Camp Invite on WhatsApp'}
                        >
                          <MessageCircle className="w-2.5 h-2.5 text-white" />
                          <span>{reg.is_registered ? 'WhatsApp' : 'WhatsApp Invite'}</span>
                        </a>
                      )}
                      {reg.whatsapp && (
                        <a
                          href={`tel:${reg.whatsapp}`}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          title="Call devotee"
                        >
                          <Phone className="w-2.5 h-2.5 text-slate-500" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>

                    <div className="text-right flex items-baseline gap-1">
                      {reg.is_registered ? (
                        <>
                          <span className="text-[9px] font-medium text-slate-400 uppercase">{reg.payment_method || 'Online'}</span>
                          <span className="font-black text-slate-900 text-xs">
                            ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <span className="text-[9.5px] text-slate-400 font-medium">Pending Camp Pass</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Devotee</th>
                    <th className="px-3 py-3">Contact</th>
                    <th className="px-3 py-3">Camp & Venue</th>
                    <th className="px-3 py-3">Camp Dates</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-right">Fee</th>
                    <th className="px-4 py-3 text-center">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedRegistrations.map((reg) => {
                    const isConfirmed = reg.is_registered && !reg.is_cancelled && reg.payment_status === 'completed';
                    const cleanPhone = (reg.whatsapp || '').replace(/[^0-9]/g, '');

                    return (
                      <tr
                        key={reg.id}
                        className={`transition-colors ${
                          !reg.is_registered
                            ? 'hover:bg-rose-50/40'
                            : 'hover:bg-orange-50/30'
                        }`}
                      >
                        {/* Devotee */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 ${
                              !reg.is_registered
                                ? 'bg-slate-400'
                                : isConfirmed
                                ? 'bg-emerald-600'
                                : 'bg-gradient-to-br from-orange-400 to-amber-500'
                            }`}>
                              {reg.participant_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                <span className="truncate">{reg.participant_name}</span>
                                {reg.passcode && (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                                    #{reg.passcode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-slate-400 truncate">
                                {reg.counselor_name ? `Counselor: ${reg.counselor_name}` : reg.gender || 'Devotee'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-700 text-xs">{reg.whatsapp || '—'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{reg.email || '—'}</div>
                        </td>

                        {/* Camp & Venue */}
                        <td className="px-3 py-3">
                          {reg.is_registered && reg.camp_title ? (
                            <>
                              <div className="font-bold text-slate-900 truncate max-w-[170px]" title={reg.camp_title}>
                                {reg.camp_title}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[170px]">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{reg.camp_venue || 'Venue confirmed'}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No camp pass booked</span>
                          )}
                        </td>

                        {/* Camp Dates */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {reg.is_registered && reg.camp_start_date && reg.camp_end_date ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-900 font-bold text-[11px] border border-orange-200">
                              <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                              <span>{formatCampDates(reg.camp_start_date, reg.camp_end_date)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {!reg.is_registered ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              <UserX className="w-3 h-3 text-rose-500" /> Not Registered
                            </span>
                          ) : reg.is_cancelled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-300">
                              <XCircle className="w-3 h-3" /> Cancelled
                            </span>
                          ) : isConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3" /> Pending Approval
                            </span>
                          )}
                        </td>

                        {/* Fee */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {reg.is_registered ? (
                            <>
                              <div className="font-black text-slate-900 text-xs">
                                ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                              </div>
                              <div className="text-[9.5px] text-slate-400 capitalize">
                                {reg.payment_method || 'Online'}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Follow-up Action */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                                  reg.is_registered && reg.camp_title
                                    ? `Hare Krishna Prabhuji, regarding your registration for ${reg.camp_title} from ${selectedCenter}:`
                                    : `Hare Krishna Prabhuji, camp registrations are open for our center (${selectedCenter}). Please book your pass here: https://voicegurukul.com/dashboard/camp`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title={reg.is_registered ? 'Chat on WhatsApp' : 'Send Camp Invite on WhatsApp'}
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{reg.is_registered ? 'WhatsApp' : 'Invite'}</span>
                              </a>
                            ) : null}
                            {reg.whatsapp && (
                              <a
                                href={`tel:${reg.whatsapp}`}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                                title="Call attendee"
                              >
                                <Phone className="w-3 h-3 text-slate-500" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls Bar */}
          {filteredRegistrations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-3 flex items-center justify-between gap-2 flex-wrap shadow-2xs">
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Page <strong className="text-slate-900 font-bold">{safePage}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{totalPages}</strong> ({filteredRegistrations.length} total)
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                {/* Per Page Dropdown */}
                <div className="relative inline-flex items-center">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold rounded-lg pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1 sm:py-1.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white cursor-pointer transition-all shadow-2xs"
                    aria-label="Items per page"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={30}>30 / page</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {/* Page number buttons */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          return (
                            <div key={p} className="flex items-center gap-1">
                              {prev && p - prev > 1 && (
                                <span className="text-slate-400 px-0.5 sm:px-1 text-[11px] sm:text-xs">...</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(p)}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                  safePage === p
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                {p}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

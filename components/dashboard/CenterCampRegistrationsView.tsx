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
  AlertCircle
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
  camp_id: string;
  camp_track?: string;
  accommodation?: string;
  passcode?: string;
  payment_status: 'completed' | 'processing' | 'pending' | string;
  payment_method?: string;
  total_cost?: number | string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  poc_name?: string;
  poc_contact?: string;
  group_id?: string;
  created_at: string;
  camp_title: string;
  camp_slug?: string;
  camp_start_date: string;
  camp_end_date: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [distinctCamps, setDistinctCamps] = useState<{ id: string; title: string; slug: string; startDate: string; endDate: string }[]>([]);

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
      // 1. Camp Filter
      if (selectedCampId !== 'all' && reg.camp_id !== selectedCampId) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter === 'confirmed') {
        if (reg.is_cancelled || reg.payment_status !== 'completed') return false;
      } else if (statusFilter === 'pending') {
        if (reg.is_cancelled || reg.payment_status === 'completed') return false;
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
        const matchesPoc = (reg.poc_name || '').toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesPasscode && !matchesCamp && !matchesPoc) {
          return false;
        }
      }

      return true;
    });
  }, [registrations, selectedCampId, statusFilter, searchTerm]);

  // Overall Stats for selected center
  const stats = useMemo(() => {
    let total = registrations.length;
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    let totalAmount = 0;

    for (const r of registrations) {
      if (r.is_cancelled) {
        cancelled++;
      } else if (r.payment_status === 'completed') {
        confirmed++;
        totalAmount += Number(r.total_cost || 0);
      } else {
        pending++;
      }
    }

    return { total, confirmed, pending, cancelled, totalAmount };
  }, [registrations]);

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
    <div className="space-y-4">
      {/* Top Banner & Center Switcher */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-emerald-500/10 border border-orange-200/90 rounded-2xl p-2.5 sm:p-4 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xs shrink-0">
            <Tent className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
                Center Camp Registrations
              </h2>
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" /> Center Isolated
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
              <span>Current Center:</span>
              <strong className="text-orange-900 font-bold underline decoration-orange-300">
                {selectedCenter || 'Loading center...'}
              </strong>
            </p>
          </div>
        </div>

        {/* Center Selector (if multiple centers managed) & Source Link */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 flex-wrap">
          {authorizedCenters.length > 1 && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedCenter}
                onChange={(e) => handleCenterSelect(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-orange-300 hover:border-orange-400 focus:border-orange-500 rounded-xl font-bold text-xs text-slate-800 shadow-2xs cursor-pointer outline-none appearance-none transition-colors"
                title="Switch managed center"
              >
                {authorizedCenters.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.temple ? `(${c.temple})` : ''}
                  </option>
                ))}
              </select>
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => loadRegistrations(selectedCenter)}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh registrations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          {sourceView === 'project-manager' ? (
            <Link
              href="/dashboard/camp"
              className="px-2.5 py-1.5 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
              title="Open Camp Portal"
            >
              <span>Camp Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            <Link
              href="/dashboard/project-manager?tab=camp-registrations"
              className="px-2.5 py-1.5 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
              title="Open Project Manager Dashboard"
            >
              <span>PM Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Total Registrations */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Devotees</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            {loading ? '...' : stats.total}
          </div>
          <p className="text-[9.5px] sm:text-[10px] text-blue-600 font-bold mt-0.5 truncate">From {selectedCenter}</p>
        </div>

        {/* Confirmed Passes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirmed Passes</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700">
            {loading ? '...' : stats.confirmed}
          </div>
          <p className="text-[9.5px] sm:text-[10px] text-emerald-600 font-bold mt-0.5 truncate">Pass Issued & Done</p>
        </div>

        {/* Pending Approval / Payment */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Action</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600">
            {loading ? '...' : stats.pending}
          </div>
          <p className="text-[9.5px] sm:text-[10px] text-amber-600 font-bold mt-0.5 truncate">Awaiting Action</p>
        </div>

        {/* Total Amount Paid */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Confirmed</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            ₹{loading ? '...' : stats.totalAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold mt-0.5 truncate">Net Contribution</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5 sm:space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5 items-center">
          {/* Search Devotee */}
          <div className="relative group sm:col-span-2 lg:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search devotee name, phone, email, passcode..."
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
          <div className="relative sm:col-span-1 lg:col-span-4">
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

          {/* Status Filter Dropdown */}
          <div className="relative sm:col-span-1 lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">🟢 Confirmed Passes</option>
              <option value="pending">🟡 Pending Action / Transfer</option>
              <option value="cancelled">⚪ Cancelled</option>
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <span>
            Showing <strong className="text-slate-900 font-bold">{filteredRegistrations.length}</strong> of {registrations.length} registrations from <strong className="text-orange-900 font-bold">{selectedCenter}</strong>
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
          <p className="text-sm font-bold text-slate-700">Loading registrations for {selectedCenter}...</p>
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
            <Tent className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Registrations Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || selectedCampId !== 'all' || statusFilter !== 'all'
              ? 'No devotee registrations match your selected filters. Try clearing filters to see all.'
              : `No devotees from "${selectedCenter}" have registered for camps yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-2">
            {filteredRegistrations.map((reg) => {
              const isConfirmed = !reg.is_cancelled && reg.payment_status === 'completed';
              const isPending = !reg.is_cancelled && reg.payment_status !== 'completed';
              const cleanPhone = (reg.whatsapp || '').replace(/[^0-9]/g, '');

              return (
                <div
                  key={reg.id}
                  className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-xl p-2.5 shadow-2xs space-y-2 transition-all"
                >
                  {/* Top Header: Devotee & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {reg.participant_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-slate-900 truncate">
                            {reg.participant_name}
                          </span>
                          {reg.passcode && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              #{reg.passcode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge: Non-wrapping shrink-0 pill */}
                    <div className="shrink-0">
                      {reg.is_cancelled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          <XCircle className="w-3 h-3 text-rose-500 shrink-0" /> Cancelled
                        </span>
                      ) : isConfirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Devotee Metadata Sub-row */}
                  <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5 flex-wrap pl-9 -mt-1 font-medium leading-tight">
                    <span>{reg.gender || 'Devotee'}</span>
                    {reg.age && <span>• Age {reg.age}</span>}
                    {reg.counselor_name && (
                      <span className="text-slate-600 truncate max-w-[220px]">
                        • Counselor: <span className="font-semibold text-slate-800">{reg.counselor_name}</span>
                      </span>
                    )}
                  </div>

                  {/* Compact Camp & Dates Strip */}
                  <div className="rounded-lg bg-orange-50/60 border border-orange-200/80 px-2.5 py-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tent className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="font-bold text-orange-950 truncate text-[11.5px]">{reg.camp_title}</span>
                      </div>
                      {reg.camp_track && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-white text-orange-900 border border-orange-300 shadow-2xs whitespace-nowrap shrink-0">
                          {reg.camp_track}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] text-orange-900/90 font-medium">
                      <span className="flex items-center gap-1 font-semibold truncate">
                        <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                        {formatCampDatesCompact(reg.camp_start_date, reg.camp_end_date)}
                      </span>
                      {reg.camp_venue && (
                        <span className="flex items-center gap-0.5 text-slate-500 truncate text-[9.5px]">
                          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{reg.camp_venue}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action & Fee Footer */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=Hare%20Krishna%20Prabhuji%2C%20regarding%20your%20registration%20for%20${encodeURIComponent(reg.camp_title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all flex items-center gap-1 text-[10.5px] font-bold shadow-2xs cursor-pointer"
                          title="Message on WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 text-white" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {reg.whatsapp && (
                        <a
                          href={`tel:${reg.whatsapp}`}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 transition-all flex items-center gap-1 text-[10.5px] font-bold cursor-pointer"
                          title="Call attendee"
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>

                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider">{reg.payment_method || 'Online'}</span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                      </span>
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
                  {filteredRegistrations.map((reg) => {
                    const isConfirmed = !reg.is_cancelled && reg.payment_status === 'completed';
                    const isPending = !reg.is_cancelled && reg.payment_status !== 'completed';
                    const cleanPhone = (reg.whatsapp || '').replace(/[^0-9]/g, '');

                    return (
                      <tr key={reg.id} className="hover:bg-orange-50/30 transition-colors">
                        {/* Devotee */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
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
                          <div className="font-bold text-slate-900 truncate max-w-[170px]" title={reg.camp_title}>
                            {reg.camp_title}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[170px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{reg.camp_venue || 'Venue confirmed'}</span>
                          </div>
                        </td>

                        {/* Camp Dates */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-900 font-bold text-[11px] border border-orange-200">
                            <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                            <span>{formatCampDates(reg.camp_start_date, reg.camp_end_date)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {reg.is_cancelled ? (
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
                          <div className="font-black text-slate-900 text-xs">
                            ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[9.5px] text-slate-400 capitalize">
                            {reg.payment_method || 'Online'}
                          </div>
                        </td>

                        {/* Follow-up Action */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=Hare%20Krishna%20Prabhuji%2C%20regarding%20your%20registration%20for%20${encodeURIComponent(reg.camp_title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
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
        </div>
      )}
    </div>
  );
}


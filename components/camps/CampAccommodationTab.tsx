'use client';

import React, { useState, useMemo } from 'react';
import {
  Home, Building, Building2, Hotel, Users, Bed, BedDouble,
  Calendar, Search, Filter, Download, CheckCircle2, Clock,
  AlertCircle, Eye, ExternalLink, FileSpreadsheet, RefreshCw,
  Ticket, UserCheck, ShieldCheck, ChevronRight, X, Phone,
  Sparkles, Layers, Info, Check, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Camp, CampRegistration } from '@/types';
import { formatParticipantMealDate } from '@/lib/camp-cost';

interface CampAccommodationTabProps {
  campId: string;
  camp?: Camp | null;
  registrations: CampRegistration[];
  onViewPass?: (regId: string) => void;
  onApproveWaitingList?: (regId: string) => Promise<void>;
  onRefresh?: () => void;
}

export type StayCategory = 'cv_floor' | 'outside_hotel' | 'ashram' | 'day_scholar';

interface CampDayDate {
  date: string;
  full_date?: string;
  label: string;
  rawDate?: Date;
  index: number;
}

export default function CampAccommodationTab({
  campId,
  camp,
  registrations,
  onViewPass,
  onApproveWaitingList,
  onRefresh
}: CampAccommodationTabProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [stayCategoryFilter, setStayCategoryFilter] = useState<'all' | StayCategory>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [waitingListOnly, setWaitingListOnly] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptModalReg, setReceiptModalReg] = useState<CampRegistration | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // 1. Resolve Camp Capacity Configuration
  const accPricing = (camp?.accommodation_pricing || {}) as any;
  const cvFloorCapacity = Number(accPricing.cv_floor_capacity) || 0;
  const batchCapacities: any[] = Array.isArray(accPricing.batch_capacities) ? accPricing.batch_capacities : [];
  const recommendedHotels: any[] = Array.isArray(accPricing.recommended_hotels) ? accPricing.recommended_hotels : [];

  // 2. Resolve Chronological List of Camp Dates
  const campDates: CampDayDate[] = useMemo(() => {
    if (camp?.meal_pricing && Array.isArray(camp.meal_pricing) && camp.meal_pricing.length > 0) {
      return camp.meal_pricing.map((m, idx) => ({
        date: String(m.date),
        full_date: m.full_date,
        label: m.label || `${m.date}`,
        index: idx
      }));
    }

    if (camp?.start_date && camp?.end_date) {
      const dates: CampDayDate[] = [];
      const cur = new Date(camp.start_date);
      const stop = new Date(camp.end_date);
      let idx = 0;
      while (cur <= stop) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        dates.push({
          date: String(cur.getDate()),
          full_date: dStr,
          label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          rawDate: new Date(cur),
          index: idx++
        });
        cur.setDate(cur.getDate() + 1);
      }
      return dates;
    }

    return [];
  }, [camp?.meal_pricing, camp?.start_date, camp?.end_date]);

  // Helper: Match a date string to our camp dates index
  const matchDateToIndex = (target?: string | null): number => {
    if (!target) return -1;
    const t = String(target).trim().toLowerCase();
    if (!t) return -1;

    for (let i = 0; i < campDates.length; i++) {
      const cd = campDates[i];
      const dStr = String(cd.date).trim().toLowerCase();
      const lStr = String(cd.label).trim().toLowerCase();
      const fStr = String(cd.full_date || '').trim().toLowerCase();

      if (dStr === t || lStr === t || fStr === t) return i;

      const cleanT = t.replace(/[\s\-_]/g, '');
      if (dStr.replace(/[\s\-_]/g, '') === cleanT || lStr.replace(/[\s\-_]/g, '') === cleanT) return i;

      const tNum = t.match(/^\d+/)?.[0];
      if (tNum) {
        if (fStr.endsWith(`-${tNum.padStart(2, '0')}`)) return i;
        const dNum = dStr.match(/^\d+/)?.[0];
        const lNum = lStr.match(/^\d+/)?.[0];
        if (dNum === tNum || lNum === tNum) {
          const tMonth = t.replace(/^\d+[\s\-_]*/, '').slice(0, 3);
          if (tMonth) {
            const dayText = (dStr + ' ' + lStr).toLowerCase();
            if (dayText.includes(tMonth)) return i;
          } else {
            return i;
          }
        }
      }
    }
    return -1;
  };

  // 3. Classify Each Registration & Pre-compute Stay Ranges
  const classifiedRegistrations = useMemo(() => {
    return registrations.map((reg) => {
      const pStatus = String(reg.payment_status || '').toLowerCase();
      const isCancelled = Boolean(
        reg.is_cancelled ||
        pStatus === 'refunded' ||
        pStatus === 'cancelled' ||
        pStatus === 'rejected' ||
        pStatus === 'failed'
      );

      const pType = String(reg.participant_type || '').toLowerCase();
      const isBrahmachari = pType.includes('brahmachari');
      const accStr = String(reg.accommodation || '').trim().toLowerCase();
      const hasCvStay = accStr === 'yes' || accStr.includes('cv');

      let category: StayCategory = 'day_scholar';
      if (hasCvStay) {
        category = isBrahmachari ? 'ashram' : 'cv_floor';
      } else {
        const hasHotelProof = Boolean(
          reg.hotel_receipt_url ||
          (reg.hotel_name && reg.hotel_name.trim().length > 0) ||
          accStr.includes('hotel') ||
          accStr.includes('outside')
        );
        category = hasHotelProof ? 'outside_hotel' : 'day_scholar';
      }

      const startIdx = matchDateToIndex(reg.first_meal_date);
      const endIdx = matchDateToIndex(reg.last_meal_date);
      const validStart = startIdx >= 0 ? startIdx : 0;
      const validEnd = endIdx >= 0 ? endIdx : Math.max(0, campDates.length - 1);

      return {
        ...reg,
        isCancelled,
        stayCategory: category,
        isBrahmachari,
        startIdx: validStart,
        endIdx: validEnd,
        nightsCount: Math.max(1, validEnd - validStart + 1)
      };
    });
  }, [registrations, campDates]);

  // Active bookings only (excluding cancelled/refunded)
  const activeBookings = useMemo(() => {
    return classifiedRegistrations.filter((r) => !r.isCancelled);
  }, [classifiedRegistrations]);

  // 4. Overall Key Metrics
  const metrics = useMemo(() => {
    const totalActive = activeBookings.length;
    const cvFloorCount = activeBookings.filter((r) => r.stayCategory === 'cv_floor').length;
    const outsideHotelCount = activeBookings.filter((r) => r.stayCategory === 'outside_hotel').length;
    const ashramCount = activeBookings.filter((r) => r.stayCategory === 'ashram').length;
    const dayScholarCount = activeBookings.filter((r) => r.stayCategory === 'day_scholar').length;
    const waitingListCount = activeBookings.filter((r) => r.is_waiting_list && !r.waiting_list_approved_at).length;

    const remainingCvSpots = cvFloorCapacity > 0 ? Math.max(0, cvFloorCapacity - cvFloorCount) : 0;
    const cvOccupancyPercent = cvFloorCapacity > 0 ? Math.min(100, Math.round((cvFloorCount / cvFloorCapacity) * 100)) : 0;
    const isCvFull = cvFloorCapacity > 0 && cvFloorCount >= cvFloorCapacity;

    return {
      totalActive,
      cvFloorCount,
      cvFloorCapacity,
      remainingCvSpots,
      cvOccupancyPercent,
      isCvFull,
      outsideHotelCount,
      ashramCount,
      dayScholarCount,
      waitingListCount
    };
  }, [activeBookings, cvFloorCapacity]);

  // 5. Day-Wise Occupancy Matrix
  const dayWiseStats = useMemo(() => {
    return campDates.map((cd) => {
      let cvCount = 0;
      let outsideCount = 0;
      let ashramCount = 0;
      let dayScholarCount = 0;

      for (const reg of activeBookings) {
        if (cd.index >= reg.startIdx && cd.index <= reg.endIdx) {
          if (reg.stayCategory === 'cv_floor') cvCount++;
          else if (reg.stayCategory === 'outside_hotel') outsideCount++;
          else if (reg.stayCategory === 'ashram') ashramCount++;
          else dayScholarCount++;
        }
      }

      const totalOvernight = cvCount + outsideCount + ashramCount;
      const cvDayPercent = cvFloorCapacity > 0 ? Math.round((cvCount / cvFloorCapacity) * 100) : 0;
      const isCvFull = cvFloorCapacity > 0 && cvCount >= cvFloorCapacity;

      return {
        ...cd,
        cvCount,
        outsideCount,
        ashramCount,
        dayScholarCount,
        totalOvernight,
        cvDayPercent,
        isCvFull
      };
    });
  }, [campDates, activeBookings, cvFloorCapacity]);

  // 6. Outside Hotels Grouping Summary
  const hotelsSummary = useMemo(() => {
    const map = new Map<string, { hotelName: string; count: number; devotees: any[] }>();
    for (const reg of activeBookings) {
      if (reg.stayCategory === 'outside_hotel') {
        const rawName = (reg.hotel_name || 'Unspecified Hotel / Lodge').trim();
        const key = rawName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { hotelName: rawName, count: 0, devotees: [] });
        }
        const item = map.get(key)!;
        item.count++;
        item.devotees.push(reg);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [activeBookings]);

  // 7. Evaluated Batch Capacities (if camp configured with split batches)
  const evaluatedBatches = useMemo(() => {
    return batchCapacities.map((b) => {
      const bCap = Number(b.capacity) || 0;
      const startIdx = matchDateToIndex(b.start_date);
      const endIdx = matchDateToIndex(b.end_date);

      let bookedCount = 0;
      for (const reg of activeBookings) {
        if (reg.stayCategory === 'cv_floor') {
          // Overlap check
          if (startIdx >= 0 && endIdx >= 0) {
            if (!(reg.endIdx < startIdx || reg.startIdx > endIdx)) {
              bookedCount++;
            }
          } else {
            bookedCount++;
          }
        }
      }

      const isFull = bCap > 0 && bookedCount >= bCap;
      const remaining = bCap > 0 ? Math.max(0, bCap - bookedCount) : 0;
      const percent = bCap > 0 ? Math.min(100, Math.round((bookedCount / bCap) * 100)) : 0;

      return {
        ...b,
        bCap,
        bookedCount,
        remaining,
        percent,
        isFull
      };
    });
  }, [batchCapacities, activeBookings, campDates]);

  // 8. Filtered Devotees for the Ledger Table
  const filteredDevotees = useMemo(() => {
    let list = classifiedRegistrations;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        return (
          r.participant_name?.toLowerCase().includes(q) ||
          r.whatsapp?.toLowerCase().includes(q) ||
          r.poc_contact?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.voice_name?.toLowerCase().includes(q) ||
          r.parent_temple?.toLowerCase().includes(q) ||
          r.hotel_name?.toLowerCase().includes(q) ||
          r.camp_track?.toLowerCase().includes(q)
        );
      });
    }

    // Date filter
    if (selectedDate !== 'all') {
      const targetIdx = campDates.findIndex((cd) => cd.date === selectedDate || cd.full_date === selectedDate);
      if (targetIdx >= 0) {
        list = list.filter((r) => targetIdx >= r.startIdx && targetIdx <= r.endIdx);
      }
    }

    // Stay category filter
    if (stayCategoryFilter !== 'all') {
      list = list.filter((r) => r.stayCategory === stayCategoryFilter);
    }

    // Specific hotel filter
    if (hotelFilter !== 'all') {
      const hLower = hotelFilter.toLowerCase().trim();
      list = list.filter((r) => (r.hotel_name || '').toLowerCase().trim() === hLower);
    }

    // Waiting list filter
    if (waitingListOnly) {
      list = list.filter((r) => r.is_waiting_list && !r.waiting_list_approved_at);
    }

    return list;
  }, [classifiedRegistrations, searchQuery, selectedDate, stayCategoryFilter, hotelFilter, waitingListOnly, campDates]);

  // Paginated List
  const totalPages = Math.ceil(filteredDevotees.length / pageSize) || 1;
  const paginatedDevotees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevotees.slice(start, start + pageSize);
  }, [filteredDevotees, currentPage, pageSize]);

  // 9. Excel Export Functionality
  const handleExportAccommodationExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Day-Wise Occupancy Summary
    const dayRows = dayWiseStats.map((d) => ({
      'Date': d.label,
      'Full Date': d.full_date || d.date,
      'CV Floor Bookings': d.cvCount,
      'CV Floor Capacity': cvFloorCapacity || 'Unlimited',
      'CV Floor Occupancy %': cvFloorCapacity > 0 ? `${d.cvDayPercent}%` : 'N/A',
      'Outside Hotel Bookings': d.outsideCount,
      'Ashram (Brahmachari)': d.ashramCount,
      'Day Attendees': d.dayScholarCount,
      'Total Overnight Stayers': d.totalOvernight,
      'CV Status': d.isCvFull ? 'FULL' : 'AVAILABLE'
    }));
    const wsDays = XLSX.utils.json_to_sheet(dayRows);
    XLSX.utils.book_append_sheet(wb, wsDays, 'Day-wise Occupancy');

    // Sheet 2: Complete Devotee Stay Roster
    const devoteeRows = filteredDevotees.map((r, idx) => ({
      'S.No': idx + 1,
      'Attendee Name': r.participant_name,
      'WhatsApp / Mobile': r.whatsapp || r.poc_contact || '-',
      'Email': r.email || '-',
      'Center / VOICE': r.voice_name || r.current_center || '-',
      'Temple': r.parent_temple || r.current_temple || '-',
      'Camp Track': r.camp_track || '-',
      'Stay Category':
        r.stayCategory === 'cv_floor'
          ? 'CV Floor Accommodation'
          : r.stayCategory === 'outside_hotel'
          ? 'Outside Hotel / Self-Arranged'
          : r.stayCategory === 'ashram'
          ? 'Brahmachari Ashram'
          : 'Day Scholar (No Stay)',
      'Arrival Date': formatParticipantMealDate(r.first_meal_date, camp?.start_date, camp?.meal_pricing),
      'Departure Date': formatParticipantMealDate(r.last_meal_date, camp?.start_date, camp?.meal_pricing),
      'Stay Nights': r.nightsCount,
      'Hotel / Lodge Name': r.hotel_name || '-',
      'Hotel Receipt Proof Link': r.hotel_receipt_url || '-',
      'Waiting List Status': r.is_waiting_list ? (r.waiting_list_approved_at ? 'Approved' : 'Pending Review') : 'Normal',
      'Payment Status': r.payment_status,
      'Registration Status': r.isCancelled ? 'Cancelled' : 'Active'
    }));
    const wsDevotees = XLSX.utils.json_to_sheet(devoteeRows);
    XLSX.utils.book_append_sheet(wb, wsDevotees, 'Attendee Accommodation Roster');

    // Sheet 3: Outside Hotels Summary
    const hotelRows = hotelsSummary.map((h, idx) => ({
      'Rank': idx + 1,
      'Hotel / Lodge Name': h.hotelName,
      'Devotees Count': h.count
    }));
    const wsHotels = XLSX.utils.json_to_sheet(hotelRows);
    XLSX.utils.book_append_sheet(wb, wsHotels, 'Outside Hotels Summary');

    const cleanTitle = (camp?.title || 'Camp').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `${cleanTitle}_Accommodation_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 10. Approve Waiting List Action
  const handleApproveWaitingList = async (regId: string) => {
    if (!onApproveWaitingList) return;
    setApprovingId(regId);
    try {
      await onApproveWaitingList(regId);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Title & Primary Actions */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-600/20 shrink-0">
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 leading-tight">
                Accommodation &amp; Housing Management
              </h2>
              {metrics.isCvFull && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                  CV Floor Full
                </span>
              )}
              {metrics.waitingListCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-700 text-white">
                  {metrics.waitingListCount} Waiting List
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
              Day-wise occupancy, CV floor capacity tracking, outside hotel bookings, and devotee housing roster.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 sm:px-3 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Refresh accommodation data"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportAccommodationExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-md"
            title="Download formatted Excel report with Day-wise Occupancy & Attendee Roster"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Export Roster (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: CV Floor Capacity & Utilization */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">CV Floor Stay</span>
            <div className={`p-1.5 rounded-lg ${metrics.isCvFull ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {metrics.cvFloorCount}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500">
                / {cvFloorCapacity > 0 ? cvFloorCapacity : '∞'} spots
              </span>
            </div>
            {cvFloorCapacity > 0 && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metrics.cvOccupancyPercent >= 100
                        ? 'bg-rose-600'
                        : metrics.cvOccupancyPercent >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, metrics.cvOccupancyPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>{metrics.cvOccupancyPercent}% full</span>
                  <span className={metrics.remainingCvSpots === 0 ? 'text-rose-600 font-black' : 'text-slate-600'}>
                    {metrics.remainingCvSpots > 0 ? `${metrics.remainingCvSpots} remaining` : 'FULL'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Outside Hotel / Self-Arranged */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Outside Hotels</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Hotel className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {metrics.outsideHotelCount}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500">
                devotees
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-2 font-medium flex items-center justify-between">
              <span>{hotelsSummary.length} hotels / lodges</span>
              {metrics.waitingListCount > 0 && (
                <span className="text-purple-700 font-bold">
                  {metrics.waitingListCount} on waiting list
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Card 3: Ashram (Brahmachari) */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Ashram Stay</span>
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {metrics.ashramCount}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500">
                Brahmacharis
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-2 font-medium">
              Arranged in temple ashram (exempt from CV floor cap)
            </p>
          </div>
        </div>

        {/* Card 4: Total Overnight Stayers */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Stayers</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {metrics.cvFloorCount + metrics.outsideHotelCount + metrics.ashramCount}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500">
                overnight
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-2 font-medium">
              {metrics.dayScholarCount} day attendees (no overnight stay)
            </p>
          </div>
        </div>
      </div>

      {/* Batch Capacities Card (if split camp batches configured) */}
      {evaluatedBatches.length > 0 && (
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                Batch Capacity Tracker ({evaluatedBatches.length} Batches)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Automated booking restrictions per camp batch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {evaluatedBatches.map((batch, bIdx) => (
              <div
                key={batch.id || bIdx}
                className={`p-3 rounded-xl border transition-all ${
                  batch.isFull
                    ? 'border-rose-300 bg-rose-50/50'
                    : batch.percent >= 80
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      {batch.name || `Batch ${bIdx + 1}`}
                    </h4>
                    <p className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{batch.start_date || 'Start'} → {batch.end_date || 'End'}</span>
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                      batch.isFull
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {batch.isFull ? 'Batch Full' : `${batch.remaining} Open`}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1">
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        batch.isFull ? 'bg-rose-600' : batch.percent >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${batch.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>{batch.bookedCount} / {batch.bCap} Booked</span>
                    <span>{batch.percent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: DAY-WISE OCCUPANCY BREAKDOWN */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                Day-Wise Accommodation Occupancy
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Click any date to filter the attendee roster below for devotees staying that night.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedDate !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDate('all')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
              >
                Clear Date Filter (Show All)
              </button>
            )}
          </div>
        </div>

        {/* Day-Wise Horizontal Scroll Grid */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
          <div className="flex items-stretch gap-2.5 min-w-max">
            {dayWiseStats.map((day) => {
              const isSelected = selectedDate === day.date || selectedDate === day.full_date;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? 'all' : day.date)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-w-[130px] sm:min-w-[145px] ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400 shadow-sm'
                      : day.isCvFull
                      ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-1.5">
                    <span className="text-xs font-black text-slate-900">{day.label}</span>
                    {day.isCvFull ? (
                      <span className="px-1 py-0.2 rounded text-[8.5px] font-black uppercase tracking-tight bg-rose-600 text-white">
                        Full
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500">
                        Day {day.index + 1}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[10.5px]">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Building2 className="w-3 h-3 text-amber-600" /> CV Floor:
                      </span>
                      <span className="font-bold text-slate-900">
                        {day.cvCount}
                        {cvFloorCapacity > 0 ? ` / ${cvFloorCapacity}` : ''}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Hotel className="w-3 h-3 text-indigo-600" /> Outside:
                      </span>
                      <span className="font-bold text-indigo-900">{day.outsideCount}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Sparkles className="w-3 h-3 text-orange-600" /> Ashram:
                      </span>
                      <span className="font-bold text-orange-900">{day.ashramCount}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-black text-slate-800">
                    <span>Total Stay:</span>
                    <span className="text-xs text-amber-700 font-black">{day.totalOvernight}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Outside Hotels Summary Bar (if hotels exist) */}
      {hotelsSummary.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hotel className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Outside Accommodations Breakdown ({hotelsSummary.length} Hotels Booked by Devotees)
              </h4>
            </div>
            {hotelFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setHotelFilter('all')}
                className="text-[11px] font-bold text-indigo-700 underline cursor-pointer"
              >
                Clear Hotel Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hotelsSummary.map((h) => {
              const isActive = hotelFilter.toLowerCase() === h.hotelName.toLowerCase();
              return (
                <button
                  key={h.hotelName}
                  type="button"
                  onClick={() => setHotelFilter(isActive ? 'all' : h.hotelName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-900 border-indigo-200'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-indigo-500" />
                  <span>{h.hotelName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${isActive ? 'bg-white text-indigo-700' : 'bg-indigo-200/80 text-indigo-900'}`}>
                    {h.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ATTENDEE HOUSING ROSTER & DIRECTORY */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
        {/* Filter Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 relative min-w-0 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, phone, center, hotel..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stay Category Filter */}
            <select
              value={stayCategoryFilter}
              onChange={(e) => {
                setStayCategoryFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">All Stay Types ({activeBookings.length})</option>
              <option value="cv_floor">CV Floor Stay ({metrics.cvFloorCount})</option>
              <option value="outside_hotel">Outside Hotel ({metrics.outsideHotelCount})</option>
              <option value="ashram">Ashram (Brahmachari) ({metrics.ashramCount})</option>
              <option value="day_scholar">Day Attendees ({metrics.dayScholarCount})</option>
            </select>

            {/* Date Filter Dropdown */}
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">All Dates of Camp</option>
              {campDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Waiting List Toggle */}
            <button
              type="button"
              onClick={() => {
                setWaitingListOnly(!waitingListOnly);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                waitingListOnly
                  ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Waiting List ({metrics.waitingListCount})</span>
            </button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-900">{filteredDevotees.length}</strong> attendees matching criteria
          </span>
          {(searchQuery || selectedDate !== 'all' || stayCategoryFilter !== 'all' || hotelFilter !== 'all' || waitingListOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDate('all');
                setStayCategoryFilter('all');
                setHotelFilter('all');
                setWaitingListOnly(false);
                setCurrentPage(1);
              }}
              className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Table of Devotee Accommodation */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Devotee</th>
                <th className="py-2.5 px-3">Center &amp; Contact</th>
                <th className="py-2.5 px-3">Stay Category</th>
                <th className="py-2.5 px-3">Stay Dates</th>
                <th className="py-2.5 px-3">Hotel / Proof</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDevotees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 font-medium">
                    No attendees match the selected accommodation filters.
                  </td>
                </tr>
              ) : (
                paginatedDevotees.map((reg) => {
                  const isWaiting = Boolean(reg.is_waiting_list && !reg.waiting_list_approved_at);
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Devotee */}
                      <td className="py-2.5 px-3">
                        <div className="font-black text-slate-900 leading-tight">
                          {reg.participant_name}
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{reg.gender || 'Male'}</span>
                          <span>&bull;</span>
                          <span>Age: {reg.age || '-'}</span>
                          {reg.camp_track && (
                            <>
                              <span>&bull;</span>
                              <span className="text-amber-800 font-bold">{reg.camp_track}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Center & Contact */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{reg.voice_name || reg.current_center || 'General'}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a
                            href={`tel:${reg.whatsapp || reg.poc_contact}`}
                            className="hover:text-amber-700 underline"
                          >
                            {reg.whatsapp || reg.poc_contact || '-'}
                          </a>
                        </div>
                      </td>

                      {/* Stay Category Pill */}
                      <td className="py-2.5 px-3">
                        {reg.stayCategory === 'cv_floor' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <Building2 className="w-3 h-3 text-amber-700" />
                            CV Floor Stay
                          </span>
                        ) : reg.stayCategory === 'outside_hotel' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                              <Hotel className="w-3 h-3 text-indigo-700" />
                              Outside Hotel
                            </span>
                            {isWaiting && (
                              <span className="block text-[9px] font-bold text-purple-700">
                                🟣 Waiting List Review
                              </span>
                            )}
                          </div>
                        ) : reg.stayCategory === 'ashram' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                            <Sparkles className="w-3 h-3 text-orange-700" />
                            Ashram (Brahmachari)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Day Scholar / No Stay
                          </span>
                        )}
                      </td>

                      {/* Stay Dates */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">
                          {formatParticipantMealDate(reg.first_meal_date, camp?.start_date, camp?.meal_pricing)} → {formatParticipantMealDate(reg.last_meal_date, camp?.start_date, camp?.meal_pricing)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {reg.nightsCount} {reg.nightsCount === 1 ? 'day' : 'days'}
                        </div>
                      </td>

                      {/* Hotel / Proof */}
                      <td className="py-2.5 px-3">
                        {reg.stayCategory === 'outside_hotel' ? (
                          <div className="space-y-1">
                            <div className="font-bold text-indigo-950 flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[140px]" title={reg.hotel_name || ''}>
                                {reg.hotel_name || 'Outside Stay'}
                              </span>
                            </div>
                            {reg.hotel_receipt_url ? (
                              <button
                                type="button"
                                onClick={() => setReceiptModalReg(reg)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-800 underline cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Receipt</span>
                              </button>
                            ) : (
                              <span className="text-[9.5px] text-slate-400 italic">No receipt attached</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10.5px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isWaiting && onApproveWaitingList && (
                            <button
                              type="button"
                              onClick={() => reg.id && handleApproveWaitingList(reg.id)}
                              disabled={approvingId === reg.id}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[10.5px] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                              title="Approve devotee from waiting list and send pass"
                            >
                              <Check className="w-3 h-3" />
                              <span>{approvingId === reg.id ? 'Approving...' : 'Approve'}</span>
                            </button>
                          )}

                          {onViewPass && (
                            <button
                              type="button"
                              onClick={() => reg.id && onViewPass(reg.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
                              title="View Prasadam Pass"
                            >
                              <Ticket className="w-3 h-3 text-amber-600" />
                              <span>Pass</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW RECEIPT MODAL */}
      {receiptModalReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold">
                  <Hotel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    Outside Hotel Booking Receipt
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {receiptModalReg.participant_name} &bull; {receiptModalReg.hotel_name || 'Hotel Stay'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalReg(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Attendee:</span>
                  <span className="font-bold text-slate-900">{receiptModalReg.participant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">WhatsApp:</span>
                  <span className="font-bold text-slate-900">{receiptModalReg.whatsapp || receiptModalReg.poc_contact || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Center:</span>
                  <span className="font-bold text-slate-900">{receiptModalReg.voice_name || receiptModalReg.current_center || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hotel Name:</span>
                  <span className="font-bold text-indigo-950">{receiptModalReg.hotel_name || 'Outside Stay'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dates of Stay:</span>
                  <span className="font-bold text-slate-900">
                    {formatParticipantMealDate(receiptModalReg.first_meal_date, camp?.start_date, camp?.meal_pricing)} → {formatParticipantMealDate(receiptModalReg.last_meal_date, camp?.start_date, camp?.meal_pricing)}
                  </span>
                </div>
              </div>

              {receiptModalReg.hotel_receipt_url ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center min-h-[220px] max-h-[360px]">
                    {receiptModalReg.hotel_receipt_url.toLowerCase().endsWith('.pdf') ? (
                      <div className="p-6 text-center space-y-2">
                        <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600 font-bold">PDF Document Attached</p>
                        <a
                          href={receiptModalReg.hotel_receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open PDF Document</span>
                        </a>
                      </div>
                    ) : (
                      <img
                        src={receiptModalReg.hotel_receipt_url}
                        alt="Booking Receipt"
                        className="max-h-[350px] w-auto object-contain mx-auto"
                        onError={(e) => {
                          // Fallback if image blocked or cross-origin
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="p-6 text-center space-y-2"><p class="text-xs text-slate-600 font-bold">External Google Drive File</p><a href="${receiptModalReg.hotel_receipt_url}" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Open File in Google Drive</a></div>`;
                          }
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href={receiptModalReg.hotel_receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open full proof in new tab</span>
                    </a>

                    {Boolean(receiptModalReg.is_waiting_list && !receiptModalReg.waiting_list_approved_at) && onApproveWaitingList && (
                      <button
                        type="button"
                        onClick={() => {
                          const id = receiptModalReg.id;
                          setReceiptModalReg(null);
                          if (id) handleApproveWaitingList(id);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Waiting List</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  No hotel receipt URL provided.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

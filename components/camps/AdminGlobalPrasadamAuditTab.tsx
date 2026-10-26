'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Utensils, Calendar, Clock, Filter, Search, Download,
  CheckCircle2, XCircle, Users, RefreshCw, QrCode,
  FileSpreadsheet, Building, Landmark, ChevronLeft, ChevronRight,
  PlusCircle, Edit2, ChevronDown, Check, HelpCircle, Layers,
  Coffee, Sun, Moon, AlertCircle, ArrowUpRight, CheckCheck,
  Share2, Copy, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getGlobalPrasadamAuditAction,
  saveCampKitchenExtraMealsAction,
  toggleManualDevoteeMealPunchAction
} from '@/app/dashboard/admin/camps/actions';

interface GlobalAuditTabProps {
  onOpenScanner?: () => void;
}

export default function AdminGlobalPrasadamAuditTab({ onOpenScanner }: GlobalAuditTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [campSummaries, setCampSummaries] = useState<any[]>([]);
  const [kitchenTally, setKitchenTally] = useState<any[]>([]);
  const [devotees, setDevotees] = useState<any[]>([]);
  const [attendeeLogs, setAttendeeLogs] = useState<any[]>([]);
  const [centerSummary, setCenterSummary] = useState<any[]>([]);
  const [templeSummary, setTempleSummary] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    camps: { id: string; title: string; status: string }[];
    tracks: string[];
    centers: string[];
    temples: string[];
    dates: string[];
  }>({
    camps: [],
    tracks: [],
    centers: [],
    temples: [],
    dates: []
  });

  // Top Section Switcher: 2 Distinct Sections
  const [activeSection, setActiveSection] = useState<'devotees' | 'kitchen'>('devotees');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [campFilter, setCampFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'TAKEN' | 'NOT_TAKEN'>('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const [templeFilter, setTempleFilter] = useState('all');

  // Pagination for Attendee Ledger
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Extra Guest Modal State
  const [guestModal, setGuestModal] = useState<{
    isOpen: boolean;
    campId: string;
    campTitle: string;
    mealDate: string;
    dateLabel: string;
    mealName: string;
    extraCount: number;
    extraServedCount: number;
    notes: string;
    saving: boolean;
  }>({
    isOpen: false,
    campId: '',
    campTitle: '',
    mealDate: '',
    dateLabel: '',
    mealName: '',
    extraCount: 0,
    extraServedCount: 0,
    notes: '',
    saving: false
  });

  const [copiedSlip, setCopiedSlip] = useState(false);
  const [togglingPunchId, setTogglingPunchId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGlobalPrasadamAuditAction();
      if (res.success) {
        setStats(res.stats);
        setCampSummaries(res.campSummaries || []);
        setKitchenTally(res.globalKitchenTally || []);
        setDevotees(res.allDevotees || []);
        setAttendeeLogs(res.allAttendeeLogs || []);
        setCenterSummary(res.centerSummary || []);
        setTempleSummary(res.templeSummary || []);
        if (res.filterOptions) {
          setFilterOptions(res.filterOptions);
          // Default date to 'all' so all active retreats & attendees are immediately visible
          if (!dateFilter) {
            setDateFilter('all');
          }
        }
      } else {
        setError(res.error || 'Failed to load global prasadam audit data');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('camp-attendance-updated', handleUpdate);
    return () => {
      window.removeEventListener('camp-attendance-updated', handleUpdate);
    };
  }, []);

  // Filtered Kitchen Tally rows
  const filteredKitchenTally = useMemo(() => {
    return kitchenTally.filter((row) => {
      if (campFilter !== 'all' && row.campId !== campFilter) return false;
      if (dateFilter && dateFilter !== 'all') {
        const matchesDate =
          row.date === dateFilter ||
          row.rawDate === dateFilter ||
          (row.dateLabel && row.dateLabel.toLowerCase().replace(/\s+/g, '') === dateFilter.toLowerCase().replace(/\s+/g, ''));
        if (!matchesDate) return false;
      }
      if (mealFilter !== 'all' && row.meal !== mealFilter) return false;
      return true;
    });
  }, [kitchenTally, campFilter, dateFilter, mealFilter]);

  // Extra Guest stats for active scope (reflecting across both sections)
  const guestCountForScope = useMemo(() => {
    return filteredKitchenTally.reduce((acc, r) => acc + (r.extraServedCount || 0), 0);
  }, [filteredKitchenTally]);

  const guestByMeal = useMemo(() => {
    let bf = 0, ln = 0, dn = 0;
    filteredKitchenTally.forEach((r) => {
      if (r.meal === 'Breakfast') bf += (r.extraServedCount || 0);
      else if (r.meal === 'Lunch') ln += (r.extraServedCount || 0);
      else if (r.meal === 'Dinner') dn += (r.extraServedCount || 0);
    });
    return { bf, ln, dn };
  }, [filteredKitchenTally]);

  // Dynamically computed Kitchen Stats based on selected filters
  const activeKitchenStats = useMemo(() => {
    const rows = filteredKitchenTally;
    const totalScheduled = rows.reduce((acc, r) => acc + (r.scheduledCount || 0), 0);
    const totalTaken = rows.reduce((acc, r) => acc + (r.takenCount || 0), 0);
    const totalNotTaken = rows.reduce(
      (acc, r) => acc + (r.notTakenCount ?? Math.max(0, (r.scheduledCount || 0) - (r.takenCount || 0))),
      0
    );
    const totalExtraGuests = rows.reduce((acc, r) => acc + (r.extraCount || 0), 0);
    const totalExtraServed = rows.reduce((acc, r) => acc + (r.extraServedCount || 0), 0);
    const totalPlatesHonored = totalTaken + totalExtraServed;
    const totalKitchenTarget = totalScheduled + totalExtraGuests;
    const clearancePercent = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;
    const notTakenPercent = totalScheduled > 0 ? Math.round((totalNotTaken / totalScheduled) * 100) : 0;

    return {
      totalScheduled,
      totalTaken,
      totalNotTaken,
      totalExtraGuests,
      totalExtraServed,
      totalPlatesHonored,
      totalKitchenTarget,
      clearancePercent,
      notTakenPercent,
      dateLabel: dateFilter !== 'all' ? dateFilter : 'All Dates',
    };
  }, [filteredKitchenTally, dateFilter]);

  // Dynamic Available Dates: filtered according to the selected Camp Title
  const availableDates = useMemo(() => {
    if (campFilter === 'all') {
      return filterOptions.dates || [];
    }
    const campDates = new Set<string>();
    kitchenTally.forEach((row) => {
      if (row.campId === campFilter) {
        if (row.date) campDates.add(row.date);
        if (row.rawDate) campDates.add(row.rawDate);
      }
    });
    devotees.forEach((d) => {
      if (d.campId === campFilter && d.dateMatrix) {
        d.dateMatrix.forEach((m: any) => {
          if (m.date) campDates.add(m.date);
          if (m.rawDate) campDates.add(m.rawDate);
        });
      }
    });
    const filtered = (filterOptions.dates || []).filter((d) => campDates.has(d));
    return filtered.length > 0 ? filtered : Array.from(campDates).sort();
  }, [campFilter, filterOptions.dates, kitchenTally, devotees]);

  // Dynamic available VOICE centers based on selected Current Temple
  const availableCenters = useMemo(() => {
    if (templeFilter === 'all') {
      return filterOptions.centers || [];
    }
    const matching = new Set<string>();
    devotees.forEach((d) => {
      if (d.temple === templeFilter && d.center) {
        matching.add(d.center);
      }
    });
    return (filterOptions.centers || []).filter((c) => matching.has(c));
  }, [templeFilter, filterOptions.centers, devotees]);

  // Reset centerFilter if it doesn't belong to the newly selected Current Temple
  useEffect(() => {
    if (centerFilter !== 'all' && availableCenters.length > 0 && !availableCenters.includes(centerFilter)) {
      setCenterFilter('all');
    }
  }, [templeFilter, availableCenters, centerFilter]);

  // Automatically reset dateFilter if it does not belong to the newly selected camp
  useEffect(() => {
    if (dateFilter !== 'all' && availableDates.length > 0 && !availableDates.includes(dateFilter)) {
      setDateFilter('all');
    }
  }, [campFilter, availableDates, dateFilter]);

  // Clean human-friendly date label (e.g., 28 Oct instead of 2026-10-28)
  const getDateLabel = (d: string) => {
    const match = kitchenTally.find((k) => k.date === d || k.rawDate === d);
    if (match && match.dateLabel) return match.dateLabel;
    try {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
    } catch {}
    return d;
  };

  // Filtered Devotees (1 ROW PER DEVOTEE)
  const filteredDevotees = useMemo(() => {
    return devotees.filter((d) => {
      if (campFilter !== 'all' && d.campId !== campFilter) return false;
      if (centerFilter !== 'all' && d.center !== centerFilter) return false;
      if (templeFilter !== 'all' && d.temple !== templeFilter) return false;
      if (trackFilter !== 'all' && d.track !== trackFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (d.name || '').toLowerCase().includes(q);
        const matchPhone = (d.phone || '').includes(q);
        const matchCamp = (d.campTitle || '').toLowerCase().includes(q);
        const matchCenter = (d.center || '').toLowerCase().includes(q);
        const matchTemple = (d.temple || '').toLowerCase().includes(q);
        const matchTrack = (d.track || '').toLowerCase().includes(q);
        const matchToken = String(d.token || '').includes(q);
        if (!matchName && !matchPhone && !matchCamp && !matchCenter && !matchTemple && !matchTrack && !matchToken) {
          return false;
        }
      }

      // Date & Meal Status filter
      if (dateFilter && dateFilter !== 'all') {
        const dayMatrix = d.dateMatrix?.find((m: any) => m.date === dateFilter || m.rawDate === dateFilter);
        if (!dayMatrix) return false;

        if (mealFilter !== 'all') {
          const mealObj =
            mealFilter === 'Breakfast'
              ? dayMatrix.breakfast
              : mealFilter === 'Lunch'
              ? dayMatrix.lunch
              : dayMatrix.dinner;

          if (!mealObj || !mealObj.eligible) return false;
          if (statusFilter === 'TAKEN' && !mealObj.punched) return false;
          if (statusFilter === 'NOT_TAKEN' && mealObj.punched) return false;
        } else {
          if (statusFilter === 'TAKEN') {
            const hasAnyTaken =
              (dayMatrix.breakfast.eligible && dayMatrix.breakfast.punched) ||
              (dayMatrix.lunch.eligible && dayMatrix.lunch.punched) ||
              (dayMatrix.dinner.eligible && dayMatrix.dinner.punched);
            if (!hasAnyTaken) return false;
          } else if (statusFilter === 'NOT_TAKEN') {
            const hasAnyNotTaken =
              (dayMatrix.breakfast.eligible && !dayMatrix.breakfast.punched) ||
              (dayMatrix.lunch.eligible && !dayMatrix.lunch.punched) ||
              (dayMatrix.dinner.eligible && !dayMatrix.dinner.punched);
            if (!hasAnyNotTaken) return false;
          }
        }
      } else {
        if (statusFilter === 'TAKEN' && d.takenCount === 0) return false;
        if (statusFilter === 'NOT_TAKEN' && d.takenCount >= d.eligibleCount) return false;
      }

      return true;
    });
  }, [
    devotees,
    campFilter,
    dateFilter,
    mealFilter,
    trackFilter,
    statusFilter,
    centerFilter,
    templeFilter,
    searchQuery
  ]);

  // Dynamically computed Devotee Attendance Stats for Global View
  const devoteeStats = useMemo(() => {
    let totalScheduledMeals = 0;
    let totalTakenMeals = 0;
    let totalRemainingMeals = 0;

    let bfEligible = 0, bfTaken = 0;
    let lnEligible = 0, lnTaken = 0;
    let dnEligible = 0, dnTaken = 0;

    let devoteesFullyHonored = 0;
    let devoteesPartiallyHonored = 0;
    let devoteesNotStarted = 0;

    filteredDevotees.forEach((d) => {
      let devoteeTotalForScope = 0;
      let devoteeTakenForScope = 0;

      if (dateFilter && dateFilter !== 'all') {
        const day = d.dateMatrix?.find((m: any) => m.date === dateFilter || m.rawDate === dateFilter);
        if (day) {
          if (mealFilter === 'all' || mealFilter === 'Breakfast') {
            if (day.breakfast?.eligible) {
              bfEligible++;
              devoteeTotalForScope++;
              totalScheduledMeals++;
              if (day.breakfast?.punched) {
                bfTaken++;
                devoteeTakenForScope++;
                totalTakenMeals++;
              }
            }
          }
          if (mealFilter === 'all' || mealFilter === 'Lunch') {
            if (day.lunch?.eligible) {
              lnEligible++;
              devoteeTotalForScope++;
              totalScheduledMeals++;
              if (day.lunch?.punched) {
                lnTaken++;
                devoteeTakenForScope++;
                totalTakenMeals++;
              }
            }
          }
          if (mealFilter === 'all' || mealFilter === 'Dinner') {
            if (day.dinner?.eligible) {
              dnEligible++;
              devoteeTotalForScope++;
              totalScheduledMeals++;
              if (day.dinner?.punched) {
                dnTaken++;
                devoteeTakenForScope++;
                totalTakenMeals++;
              }
            }
          }
        }
      } else {
        d.dateMatrix?.forEach((day: any) => {
          if (mealFilter === 'all' || mealFilter === 'Breakfast') {
            if (day.breakfast?.eligible) {
              bfEligible++;
              devoteeTotalForScope++;
              totalScheduledMeals++;
              if (day.breakfast?.punched) {
                bfTaken++;
                devoteeTakenForScope++;
                totalTakenMeals++;
              }
            }
          }
          if (mealFilter === 'all' || mealFilter === 'Lunch') {
            if (day.lunch?.eligible) {
              lnEligible++;
              devoteeTotalForScope++;
              totalScheduledMeals++;
              if (day.lunch?.punched) {
                lnTaken++;
                devoteeTakenForScope++;
                totalTakenMeals++;
              }
            }
          }
          if (mealFilter === 'all' || mealFilter === 'Dinner') {
            if (day.dinner?.eligible) {
              dnEligible++;
              devoteeTotalForScope++;
              totalScheduledMeals++;
              if (day.dinner?.punched) {
                dnTaken++;
                devoteeTakenForScope++;
                totalTakenMeals++;
              }
            }
          }
        });
      }

      if (devoteeTotalForScope > 0) {
        if (devoteeTakenForScope === devoteeTotalForScope) {
          devoteesFullyHonored++;
        } else if (devoteeTakenForScope > 0) {
          devoteesPartiallyHonored++;
        } else {
          devoteesNotStarted++;
        }
      }
    });

    totalRemainingMeals = Math.max(0, totalScheduledMeals - totalTakenMeals);
    const turnoutRate = totalScheduledMeals > 0 ? Math.round((totalTakenMeals / totalScheduledMeals) * 100) : 0;
    const pendingRate = totalScheduledMeals > 0 ? Math.round((totalRemainingMeals / totalScheduledMeals) * 100) : 0;

    return {
      totalScheduledMeals,
      totalTakenMeals,
      totalRemainingMeals,
      turnoutRate,
      pendingRate,
      devoteeCount: filteredDevotees.length,
      devoteesFullyHonored,
      devoteesPartiallyHonored,
      devoteesNotStarted,
      bf: { eligible: bfEligible, taken: bfTaken, remaining: Math.max(0, bfEligible - bfTaken) },
      ln: { eligible: lnEligible, taken: lnTaken, remaining: Math.max(0, lnEligible - lnTaken) },
      dn: { eligible: dnEligible, taken: dnTaken, remaining: Math.max(0, dnEligible - dnTaken) },
      dateLabel: dateFilter !== 'all' ? dateFilter : 'All Dates',
    };
  }, [filteredDevotees, dateFilter, mealFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    campFilter,
    dateFilter,
    mealFilter,
    trackFilter,
    statusFilter,
    centerFilter,
    templeFilter
  ]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredDevotees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDevotees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredDevotees.slice(start, start + pageSize);
  }, [filteredDevotees, safeCurrentPage, pageSize]);

  // Save guest count handler
  const handleSaveGuestCount = async () => {
    setGuestModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await saveCampKitchenExtraMealsAction({
        campId: guestModal.campId,
        mealDate: guestModal.mealDate,
        mealName: guestModal.mealName,
        extraCount: guestModal.extraCount,
        extraServedCount: guestModal.extraServedCount,
        notes: guestModal.notes
      });
      if (res.success) {
        setGuestModal((prev) => ({ ...prev, isOpen: false, saving: false }));
        await loadData();
      } else {
        alert(res.error || 'Failed to save guest count');
        setGuestModal((prev) => ({ ...prev, saving: false }));
      }
    } catch (e: any) {
      alert(e.message || 'Error occurred');
      setGuestModal((prev) => ({ ...prev, saving: false }));
    }
  };

  // Toggle Manual Punch
  const handleToggleManualPunch = async (
    regId: string,
    mealDate: string,
    mealName: string,
    currentlyPunched: boolean
  ) => {
    setTogglingPunchId(`${regId}_${mealDate}_${mealName}`);
    try {
      const res = await toggleManualDevoteeMealPunchAction(regId, mealDate, mealName, !currentlyPunched);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to toggle meal punch');
      }
    } catch (e: any) {
      alert(e.message || 'Error occurred');
    } finally {
      setTogglingPunchId(null);
    }
  };

  // Generate WhatsApp Slip
  const handleCopyKitchenSlip = () => {
    let slip = `*🥘 GLOBAL KITCHEN HEADCOUNT SLIP*\n`;
    slip += `📅 Date: ${dateFilter !== 'all' ? dateFilter : 'Today'}\n`;
    slip += `--------------------------------------\n`;

    const sessions = filteredKitchenTally;
    sessions.forEach(s => {
      slip += `🍽 *${s.campTitle} • ${s.meal.toUpperCase()}*:\n`;
      slip += `   • Registered: ${s.scheduledCount} devotees\n`;
      slip += `   • Extra Guests: +${s.extraCount}\n`;
      slip += `   👉 *Total Plates Target: ${s.totalKitchenTarget}*\n`;
      if (s.notes) slip += `   (Note: ${s.notes})\n`;
      slip += `\n`;
    });

    const totalPlates = sessions.reduce((acc, s) => acc + s.totalKitchenTarget, 0);
    slip += `--------------------------------------\n`;
    slip += `🍛 *Total Global Plates Target: ${totalPlates}*\n`;
    slip += `Sent via VOICE Gurukul System`;

    navigator.clipboard.writeText(slip);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (devotees.length === 0 && kitchenTally.length === 0) {
      alert('No data available to export.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Devotee Attendance Matrix (1 row per devotee)
    const devoteesExport = filteredDevotees.map((d, idx) => {
      const currentDay = d.dateMatrix?.find((m: any) => m.date === dateFilter || m.rawDate === dateFilter);
      return {
        '#': idx + 1,
        'Camp Title': d.campTitle,
        'Pass Token': d.token || '',
        'Devotee Name': d.name,
        'Phone / WhatsApp': d.phone,
        'Sub-Camp Track': d.track,
        'VOICE Center': d.center,
        'Current Temple': d.temple,
        'POC Name': d.pocName || '',
        'POC Contact': d.pocContact || '',
        'Date': dateFilter || 'All',
        'Breakfast': currentDay
          ? currentDay.breakfast.eligible
            ? currentDay.breakfast.punched ? `TAKEN (${currentDay.breakfast.punchedAt})` : 'NOT TAKEN'
            : 'NOT INCLUDED'
          : '',
        'Lunch': currentDay
          ? currentDay.lunch.eligible
            ? currentDay.lunch.punched ? `TAKEN (${currentDay.lunch.punchedAt})` : 'NOT TAKEN'
            : 'NOT INCLUDED'
          : '',
        'Dinner': currentDay
          ? currentDay.dinner.eligible
            ? currentDay.dinner.punched ? `TAKEN (${currentDay.dinner.punchedAt})` : 'NOT TAKEN'
            : 'NOT INCLUDED'
          : '',
        'Total Camp Meals Taken': `${d.takenCount} / ${d.eligibleCount}`
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(devoteesExport);
    XLSX.utils.book_append_sheet(wb, ws1, 'Devotee_Attendance_Ledger');

    // Sheet 2: Daily Kitchen Tally
    const tallyExport = filteredKitchenTally.map((row, idx) => ({
      '#': idx + 1,
      'Camp Title': row.campTitle,
      'Date': row.date,
      'Date Label': row.dateLabel,
      'Meal Session': row.meal,
      'Registered / Expected': row.scheduledCount,
      'Actually Honored (Punched)': row.takenCount,
      'Pending / Not Taken': row.notTakenCount,
      'Extra / Guest Count': row.extraCount,
      'Total Kitchen Target': row.totalKitchenTarget,
      'Audit Notes': row.notes || ''
    }));
    const ws2 = XLSX.utils.json_to_sheet(tallyExport);
    XLSX.utils.book_append_sheet(wb, ws2, 'Kitchen_Tally_Audit');

    const fileDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Global_Prasadam_Kitchen_Audit_${fileDate}.xlsx`, { bookType: 'xlsx' });
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    campFilter !== 'all' ||
    mealFilter !== 'all' ||
    trackFilter !== 'all' ||
    statusFilter !== 'all' ||
    centerFilter !== 'all' ||
    templeFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setCampFilter('all');
    setMealFilter('all');
    setTrackFilter('all');
    setStatusFilter('all');
    setCenterFilter('all');
    setTempleFilter('all');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Actions: Compact on Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg shadow-amber-600/15">
        <div className="space-y-0.5 sm:space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider">
            <Utensils className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-200" />
            <span>Super Admin &bull; Prasadam &amp; Kitchen Audit</span>
          </div>
          <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
            Global Kitchen Headcount &amp; Devotee Meal Ledger
          </h2>
          <p className="text-[11px] sm:text-xs text-amber-100 max-w-2xl hidden sm:block">
            Tally expected meals across all retreats, audit which devotees took prasadam at what time,
            and monitor extra guest buffers with center, temple, and track filters.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              type="button"
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
              title="Launch QR Pass Scanner"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Gate Scanner</span>
            </button>
          )}

          <button
            onClick={loadData}
            type="button"
            className="p-1.5 sm:p-2.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl sm:rounded-2xl transition-all shadow-xs cursor-pointer"
            title="Refresh Audit Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            type="button"
            className="inline-flex items-center gap-1 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* DISTINCT 2 SECTIONS SWITCHER: Compact on Mobile */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-3 gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setActiveSection('devotees')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'devotees'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Devotee Prasadam Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('kitchen')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'kitchen'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span>Daily Kitchen Headcount &amp; Tally</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: DAILY KITCHEN HEADCOUNT & TALLY               */}
      {/* ======================================================== */}
      {activeSection === 'kitchen' && (
        <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-150">
          {/* Kitchen Filter Bar with Camp, Meal Session and Dynamic Date Pills */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-3xl border border-slate-200/90 shadow-xs space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Camp Title
                </label>
                <select
                  value={campFilter}
                  onChange={(e) => setCampFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Camps ({filterOptions.camps.length})</option>
                  {filterOptions.camps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Meal Session
                </label>
                <select
                  value={mealFilter}
                  onChange={(e) => setMealFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Meals (BF, LN, DN)</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div className="flex items-end">
                {isAnyFilterActive && (
                  <button
                    onClick={resetFilters}
                    type="button"
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Meal Date Pills below other filters */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
                Meal Date:
              </span>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dateFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Dates
              </button>
              {availableDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDateFilter(d)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === d
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {getDateLabel(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Kitchen Stats Cards: Compact on Mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs transition-all hover:border-slate-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Scheduled Meals
              </span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
                {activeKitchenStats.totalScheduled.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate block">
                {activeKitchenStats.dateLabel}
              </span>
            </div>

            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs transition-all hover:border-emerald-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <span>Honored / Taken</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-emerald-800 mt-0.5 sm:mt-1">
                {activeKitchenStats.totalPlatesHonored.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-medium truncate block">
                {activeKitchenStats.totalTaken} QR + {activeKitchenStats.totalExtraServed} Guests
              </span>
            </div>

            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-amber-50/70 border border-amber-200/80 shadow-xs transition-all hover:border-amber-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                <span>Pending / Missed</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-amber-900 mt-0.5 sm:mt-1">
                {activeKitchenStats.totalNotTaken.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-amber-700 font-medium truncate block">
                {activeKitchenStats.notTakenPercent}% not yet punched
              </span>
            </div>

            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs transition-all hover:border-indigo-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                <span>Guests Honored</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-indigo-900 mt-0.5 sm:mt-1">
                +{activeKitchenStats.totalExtraServed.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-indigo-700 font-medium truncate block">
                Buffer: +{activeKitchenStats.totalExtraGuests.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-slate-900 text-white shadow-xs border border-slate-800 transition-all hover:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Target Prep
              </span>
              <div className="text-lg sm:text-2xl font-black text-white mt-0.5 sm:mt-1">
                {activeKitchenStats.totalKitchenTarget.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block">Total plates needed</span>
            </div>

            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs transition-all hover:border-slate-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Camp Retreats
              </span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
                {campFilter !== 'all' ? 1 : campSummaries.length}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate block">
                {campFilter !== 'all' ? 'Single Camp' : 'Under tracking'}
              </span>
            </div>
          </div>

          {/* Share WhatsApp Slip Action: Compact on Mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 sm:p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl sm:rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500 text-white">
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Kitchen WhatsApp Headcount Slip
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">
                  Copy aggregated kitchen targets for {dateFilter !== 'all' ? dateFilter : 'All Dates'}.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyKitchenSlip}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              {copiedSlip ? <CheckCheck className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSlip ? 'Slip Copied!' : 'Copy Kitchen Slip'}</span>
            </button>
          </div>

          {/* Kitchen Headcount Table: Compact on Mobile */}
          <div className="bg-white rounded-xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500 text-white shadow-xs">
                  <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Cross-Camp Kitchen Headcount &amp; Target Prepared Tally
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">
                    Expected attendee count based on registrations, actual punches recorded, and extra guest buffers per meal.
                  </p>
                </div>
              </div>

              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] sm:text-xs font-bold self-start sm:self-auto">
                {filteredKitchenTally.length} Meal Session(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead className="bg-slate-50 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4">Camp Title</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">Date &amp; Label</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">Meal Session</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Registered</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Punched (QR)</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Not Taken</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Guests</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Total Honored</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Buffer</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Target</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Action / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKitchenTally.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        No kitchen meal sessions match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredKitchenTally.map((row, idx) => {
                      const mealIcon =
                        row.meal === 'Breakfast' ? (
                          <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        ) : row.meal === 'Lunch' ? (
                          <Sun className="w-3.5 h-3.5 text-orange-500" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        );

                      const clearanceRate =
                        row.scheduledCount > 0 ? Math.round((row.takenCount / row.scheduledCount) * 100) : 0;

                      return (
                        <tr key={`${row.campId}_${row.date}_${row.meal}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={row.campTitle}>
                              {row.campTitle}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{row.dateLabel}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{row.date}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                              {mealIcon}
                              <span>{row.meal}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {row.scheduledCount}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-emerald-700">{row.takenCount}</span>
                            <span className="text-[10px] text-emerald-600 block">({clearanceRate}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-amber-700">{row.notTakenCount}</span>
                          </td>
                          {/* Extra Guests Taken Without QR */}
                          <td className="py-3 px-3 text-right">
                            {row.extraServedCount > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-black text-[11px] border border-indigo-200">
                                +{row.extraServedCount}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">0</span>
                            )}
                          </td>
                          {/* Total Honored (QR Scanned + No QR Guests) */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-emerald-800 text-sm">
                              {(row.takenCount || 0) + (row.extraServedCount || 0)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({row.takenCount} + {row.extraServedCount || 0})
                            </span>
                          </td>
                          {/* Extra Buffer Planned */}
                          <td className="py-3 px-3 text-right">
                            {row.extraCount > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                                +{row.extraCount}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-black text-slate-900">
                              {row.totalKitchenTarget}
                            </span>
                            <span className="text-[10px] text-slate-400 block">plates target</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setGuestModal({
                                  isOpen: true,
                                  campId: row.campId,
                                  campTitle: row.campTitle,
                                  mealDate: row.date,
                                  dateLabel: row.dateLabel,
                                  mealName: row.meal,
                                  extraCount: row.extraCount,
                                  extraServedCount: row.extraServedCount || 0,
                                  notes: row.notes || '',
                                  saving: false
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] transition-all cursor-pointer shadow-2xs"
                              title="Add or update extra guest servings"
                            >
                              <Edit2 className="w-3 h-3 text-amber-600" />
                              <span>{row.extraCount > 0 || row.extraServedCount > 0 ? 'Edit Guest' : '+ Add Guest'}</span>
                            </button>
                            {row.notes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[120px]" title={row.notes}>
                                {row.notes}
                              </div>
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
      )}

      {/* ======================================================== */}
      {/* SECTION 2: DEVOTEE PRASADAM ATTENDANCE (1 ROW PER USER) */}
      {/* ======================================================== */}
      {activeSection === 'devotees' && (
        <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-150">
          {/* 1. MULTI-FILTER BAR WITH CENTER, TEMPLE & DYNAMIC MEAL DATE PILLS */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-3xl border border-slate-200/90 shadow-xs space-y-2 sm:space-y-3">
            {/* Search Bar + Reset */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search devotee name, phone, pass token, center, temple, or track..."
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl text-xs outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isAnyFilterActive && (
                <button
                  onClick={resetFilters}
                  type="button"
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Dropdowns Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 sm:gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {/* Camp Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Camp Title
                </label>
                <select
                  value={campFilter}
                  onChange={(e) => setCampFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Camps ({filterOptions.camps.length})</option>
                  {filterOptions.camps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Camp Track Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Camp Track
                </label>
                <select
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Tracks ({filterOptions.tracks.length})</option>
                  {filterOptions.tracks.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Temple Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Current Temple
                </label>
                <select
                  value={templeFilter}
                  onChange={(e) => setTempleFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Temples ({filterOptions.temples.length})</option>
                  {filterOptions.temples.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* VOICE Center Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1">
                  VOICE Center
                </label>
                <select
                  value={centerFilter}
                  onChange={(e) => setCenterFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Centers ({availableCenters.length})</option>
                  {availableCenters.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meal Session Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Meal Session
                </label>
                <select
                  value={mealFilter}
                  onChange={(e) => setMealFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Meals (BF, LN, DN)</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              {/* Punch Status Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Punch Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="TAKEN">TAKEN (Honored)</option>
                  <option value="NOT_TAKEN">NOT TAKEN (Pending)</option>
                </select>
              </div>
            </div>

            {/* DYNAMIC MEAL DATE PILLS */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
                Meal Date:
              </span>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dateFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Dates
              </button>
              {availableDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDateFilter(d)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === d
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {getDateLabel(d)}
                </button>
              ))}
            </div>
          </div>

          {/* 2. DYNAMIC DEVOTEE SUMMARY CARDS: Compact on Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5">
            {/* Card 1: Total Expected Meals */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs transition-all hover:border-slate-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Meals Scheduled
              </span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
                {devoteeStats.totalScheduledMeals.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate block">
                {devoteeStats.devoteeCount} Devotees &bull; {devoteeStats.dateLabel}
              </span>
            </div>

            {/* Card 2: Prasadam Taken */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs transition-all hover:border-emerald-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <span>Prasadam Taken</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-emerald-800 mt-0.5 sm:mt-1">
                {(devoteeStats.totalTakenMeals + guestCountForScope).toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-medium truncate block">
                {devoteeStats.totalTakenMeals} Devotees + {guestCountForScope} Guests
              </span>
            </div>

            {/* Card 3: Guests Honored (No QR) */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs transition-all hover:border-indigo-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                <span>Guests Honored</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-indigo-900 mt-0.5 sm:mt-1">
                +{guestCountForScope}
              </div>
              <span className="text-[9px] sm:text-[10px] text-indigo-700 font-medium truncate block">
                Walk-ins, drivers &amp; VIPs honored
              </span>
            </div>

            {/* Card 4: Remaining / Pending */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-amber-50/80 border border-amber-200/80 shadow-xs transition-all hover:border-amber-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                <span>Remaining / Pending</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-amber-900 mt-0.5 sm:mt-1">
                {devoteeStats.totalRemainingMeals.toLocaleString('en-IN')}
              </div>
              <span className="text-[9px] sm:text-[10px] text-amber-700 font-medium truncate block">
                {devoteeStats.pendingRate}% pending honoring
              </span>
            </div>

            {/* Card 5: Session Breakdown */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-3xl bg-slate-900 text-white shadow-xs border border-slate-800 transition-all hover:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Session Headcounts
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-mono">
                  {devoteeStats.dateLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-amber-300 uppercase block">BF</span>
                  <span className="text-[11px] sm:text-xs font-black text-white" title={`${devoteeStats.bf.taken} Devotees + ${guestByMeal.bf} Guests`}>
                    {devoteeStats.bf.taken + guestByMeal.bf}/{devoteeStats.bf.eligible}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-orange-300 uppercase block">LN</span>
                  <span className="text-[11px] sm:text-xs font-black text-white" title={`${devoteeStats.ln.taken} Devotees + ${guestByMeal.ln} Guests`}>
                    {devoteeStats.ln.taken + guestByMeal.ln}/{devoteeStats.ln.eligible}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-indigo-300 uppercase block">DN</span>
                  <span className="text-[11px] sm:text-xs font-black text-white" title={`${devoteeStats.dn.taken} Devotees + ${guestByMeal.dn} Guests`}>
                    {devoteeStats.dn.taken + guestByMeal.dn}/{devoteeStats.dn.eligible}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ATTENDEE PRASADAM LEDGER: Compact on Mobile */}
          <div className="bg-white rounded-xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider">
                  Devotee Prasadam Matrix &bull; {dateFilter !== 'all' ? dateFilter : 'All Dates'}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">
                {filteredDevotees.length} Devotees Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead className="bg-slate-50 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">Token #</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4">Devotee Details</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">Camp Title</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">Sub-Camp Track</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3">Center &amp; Temple</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">Breakfast</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">Lunch</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">Dinner</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-right">Camp Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDevotees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        No devotees match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedDevotees.map((d) => {
                      const dayMatrix = dateFilter && dateFilter !== 'all'
                        ? d.dateMatrix?.find((m: any) => m.date === dateFilter || m.rawDate === dateFilter)
                        : null;

                      const renderMealPill = (mealName: 'Breakfast' | 'Lunch' | 'Dinner', mealData: any) => {
                        if (!mealData || !mealData.eligible) {
                          return (
                            <span className="text-slate-300 font-medium text-[11px]" title="Meal not in registered window">
                              —
                            </span>
                          );
                        }

                        const isPunched = mealData.punched;
                        const timeStr = mealData.punchedAt
                          ? new Date(mealData.punchedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })
                          : null;

                        return (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleManualPunch(
                                  d.regId,
                                  dateFilter,
                                  mealName,
                                  isPunched
                                )
                              }
                              disabled={togglingPunchId === `${d.regId}_${dateFilter}_${mealName}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                isPunched
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                              title={isPunched ? 'Click to Unmark' : 'Click to Mark Taken'}
                            >
                              {isPunched ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Taken</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Not Taken</span>
                                </>
                              )}
                            </button>
                            {timeStr && (
                              <span className="text-[9px] font-bold text-slate-500 font-mono">
                                {timeStr}
                              </span>
                            )}
                          </div>
                        );
                      };

                      // Calculate meal-specific tallies across all dates for this devotee
                      let bfEligible = 0, bfTaken = 0;
                      let lnEligible = 0, lnTaken = 0;
                      let dnEligible = 0, dnTaken = 0;

                      d.dateMatrix?.forEach((m: any) => {
                        if (m.breakfast?.eligible) {
                          bfEligible++;
                          if (m.breakfast?.punched) bfTaken++;
                        }
                        if (m.lunch?.eligible) {
                          lnEligible++;
                          if (m.lunch?.punched) lnTaken++;
                        }
                        if (m.dinner?.eligible) {
                          dnEligible++;
                          if (m.dinner?.punched) dnTaken++;
                        }
                      });

                      return (
                        <tr key={d.regId} className="hover:bg-slate-50/70 transition-colors">
                          {/* Token # */}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-xl bg-slate-100 font-black text-slate-800 text-xs">
                              #{d.token || '—'}
                            </span>
                          </td>

                          {/* Devotee Details */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{d.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              📞 {d.phone || 'No phone'}
                            </div>
                            {d.pocName && d.pocName !== d.name && (
                              <div className="text-[9px] text-slate-400 italic">
                                Reg by: {d.pocName}
                              </div>
                            )}
                          </td>

                          {/* Camp Title */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 truncate block max-w-[140px]" title={d.campTitle}>
                              {d.campTitle}
                            </span>
                          </td>

                          {/* Sub-Camp Track */}
                          <td className="py-3 px-3">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] whitespace-nowrap">
                              {d.track}
                            </span>
                          </td>

                          {/* Center & Temple (Resolved with POC Fallback) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 font-semibold text-slate-800 text-xs">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{d.center || 'None'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Landmark className="w-2.5 h-2.5 text-slate-400" />
                              <span>{d.temple || 'None'}</span>
                            </div>
                          </td>

                          {/* Breakfast */}
                          <td className="py-3 px-3 text-center">
                            {dateFilter && dateFilter !== 'all' ? (
                              renderMealPill('Breakfast', dayMatrix?.breakfast)
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${bfTaken > 0 ? 'text-emerald-700 font-black' : 'text-slate-700'}`}>
                                  {bfTaken} / {bfEligible}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {bfEligible > 0 ? `${Math.round((bfTaken / bfEligible) * 100)}%` : '—'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Lunch */}
                          <td className="py-3 px-3 text-center">
                            {dateFilter && dateFilter !== 'all' ? (
                              renderMealPill('Lunch', dayMatrix?.lunch)
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${lnTaken > 0 ? 'text-emerald-700 font-black' : 'text-slate-700'}`}>
                                  {lnTaken} / {lnEligible}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {lnEligible > 0 ? `${Math.round((lnTaken / lnEligible) * 100)}%` : '—'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Dinner */}
                          <td className="py-3 px-3 text-center">
                            {dateFilter && dateFilter !== 'all' ? (
                              renderMealPill('Dinner', dayMatrix?.dinner)
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${dnTaken > 0 ? 'text-emerald-700 font-black' : 'text-slate-700'}`}>
                                  {dnTaken} / {dnEligible}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {dnEligible > 0 ? `${Math.round((dnTaken / dnEligible) * 100)}%` : '—'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Camp Total */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-slate-900 block">
                              {d.takenCount} / {d.eligibleCount}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              {d.eligibleCount > 0 ? `${Math.round((d.takenCount / d.eligibleCount) * 100)}% Taken` : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXTRA GUEST BUFFER MODAL */}
      {guestModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Kitchen Extra Guest Headcount
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {guestModal.campTitle} &bull; {guestModal.dateLabel} ({guestModal.mealName})
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Buffer Planned (Target)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={guestModal.extraCount}
                    onChange={(e) =>
                      setGuestModal((prev) => ({
                        ...prev,
                        extraCount: Math.max(0, parseInt(e.target.value, 10) || 0)
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    placeholder="e.g. 15"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Preparation buffer.
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                    Actually Honored (No QR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={guestModal.extraServedCount}
                    onChange={(e) =>
                      setGuestModal((prev) => ({
                        ...prev,
                        extraServedCount: Math.max(0, parseInt(e.target.value, 10) || 0)
                      }))
                    }
                    className="w-full px-3 py-2 bg-indigo-50/60 border border-indigo-200 rounded-xl text-sm font-black text-indigo-950 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="e.g. 5"
                  />
                  <span className="text-[10px] text-indigo-700/80 mt-1 block">
                    Plates taken at gate.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Audit Notes / Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  value={guestModal.notes}
                  onChange={(e) =>
                    setGuestModal((prev) => ({
                      ...prev,
                      notes: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white"
                  placeholder="e.g. 10 Volunteers from Nigdi center + 5 Guests"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={guestModal.saving}
                onClick={() => setGuestModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={guestModal.saving}
                onClick={handleSaveGuestCount}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {guestModal.saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Save to Kitchen Ledger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

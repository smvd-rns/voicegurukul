'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils, Calendar, Clock, Filter, Search, Download,
  CheckCircle2, XCircle, Users, RefreshCw, QrCode,
  FileSpreadsheet, Building, Landmark, ChevronLeft, ChevronRight,
  PlusCircle, Edit2, ChevronDown, Check, HelpCircle, Eye,
  Coffee, Sun, Moon, Share2, Copy, CheckCheck, Sparkles, Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Camp } from '@/types';
import {
  getCampPrasadamLogsAction,
  saveCampKitchenExtraMealsAction,
  toggleManualDevoteeMealPunchAction
} from '@/app/dashboard/admin/camps/actions';

interface CampPrasadamTabProps {
  campId: string;
  camp?: Camp | null;
  onOpenScanner?: () => void;
  onViewPass?: (regId: string) => void;
}

export default function CampPrasadamTab({
  campId,
  camp,
  onOpenScanner,
  onViewPass
}: CampPrasadamTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states from backend
  const [stats, setStats] = useState<any>(null);
  const [kitchenTally, setKitchenTally] = useState<any[]>([]);
  const [devotees, setDevotees] = useState<any[]>([]);
  const [attendeeLogs, setAttendeeLogs] = useState<any[]>([]);
  const [centerSummary, setCenterSummary] = useState<any[]>([]);
  const [templeSummary, setTempleSummary] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    dates: { date: string; label: string }[];
    tracks: string[];
    centers: string[];
    temples: string[];
  }>({
    dates: [],
    tracks: [],
    centers: [],
    temples: []
  });

  // Top Section Switcher: 2 Distinct Sections as requested
  const [activeSection, setActiveSection] = useState<'kitchen' | 'devotees'>('devotees');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(''); // Default will be set to first available date or today
  const [selectedMeal, setSelectedMeal] = useState<'all' | 'Breakfast' | 'Lunch' | 'Dinner'>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedCenter, setSelectedCenter] = useState<string>('all');
  const [selectedTemple, setSelectedTemple] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'TAKEN' | 'NOT_TAKEN'>('all');

  // Pagination for Devotee Ledger
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Extra Guest Modal State
  const [guestModal, setGuestModal] = useState<{
    isOpen: boolean;
    mealDate: string;
    dateLabel: string;
    mealName: string;
    extraCount: number;
    extraServedCount: number;
    notes: string;
    saving: boolean;
  }>({
    isOpen: false,
    mealDate: '',
    dateLabel: '',
    mealName: '',
    extraCount: 0,
    extraServedCount: 0,
    notes: '',
    saving: false
  });

  // WhatsApp Slip Copied State
  const [copiedSlip, setCopiedSlip] = useState(false);
  const [togglingPunchId, setTogglingPunchId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCampPrasadamLogsAction(campId);
      if (res.success) {
        setStats(res.stats);
        setKitchenTally(res.kitchenTally || []);
        setDevotees(res.devotees || []);
        setAttendeeLogs(res.attendeeLogs || []);
        setCenterSummary(res.centerSummary || []);
        setTempleSummary(res.templeSummary || []);
        if (res.filterOptions) {
          setFilterOptions(res.filterOptions);
          // Set default date to first scheduled date if not set yet
          if (!selectedDate && res.filterOptions.dates?.length > 0) {
            setSelectedDate(res.filterOptions.dates[0].date);
          }
        }
      } else {
        setError(res.error || 'Failed to load prasadam logs');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading data');
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
  }, [campId]);

  // Active Date info
  const activeDateObj = useMemo(() => {
    if (!selectedDate || selectedDate === 'all') return null;
    return filterOptions.dates.find(d => d.date === selectedDate) || { date: selectedDate, label: selectedDate };
  }, [selectedDate, filterOptions.dates]);

  // Devotee Filtering (1 Row Per Devotee)
  const filteredDevotees = useMemo(() => {
    return devotees.filter((d) => {
      // 1. Center & Temple Filters
      if (selectedCenter !== 'all' && d.center !== selectedCenter) return false;
      if (selectedTemple !== 'all' && d.temple !== selectedTemple) return false;

      // 2. Track Filter
      if (selectedTrack !== 'all' && d.track !== selectedTrack) return false;

      // 3. Search Bar
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (d.name || '').toLowerCase().includes(q);
        const matchPhone = (d.phone || '').includes(q);
        const matchToken = String(d.token || '').includes(q);
        const matchCenter = (d.center || '').toLowerCase().includes(q);
        const matchTemple = (d.temple || '').toLowerCase().includes(q);
        const matchTrack = (d.track || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchToken && !matchCenter && !matchTemple && !matchTrack) {
          return false;
        }
      }

      // 4. Date & Meal Status Filter
      if (selectedDate && selectedDate !== 'all') {
        const dayMatrix = d.dateMatrix?.find((m: any) => m.date === selectedDate || m.rawDate === selectedDate);
        if (!dayMatrix) return false;

        // If specific meal is selected
        if (selectedMeal !== 'all') {
          const mealObj =
            selectedMeal === 'Breakfast'
              ? dayMatrix.breakfast
              : selectedMeal === 'Lunch'
              ? dayMatrix.lunch
              : dayMatrix.dinner;

          if (!mealObj || !mealObj.eligible) return false;
          if (selectedStatus === 'TAKEN' && !mealObj.punched) return false;
          if (selectedStatus === 'NOT_TAKEN' && mealObj.punched) return false;
        } else {
          // If All Meals selected, check status
          if (selectedStatus === 'TAKEN') {
            const hasAnyTaken =
              (dayMatrix.breakfast.eligible && dayMatrix.breakfast.punched) ||
              (dayMatrix.lunch.eligible && dayMatrix.lunch.punched) ||
              (dayMatrix.dinner.eligible && dayMatrix.dinner.punched);
            if (!hasAnyTaken) return false;
          } else if (selectedStatus === 'NOT_TAKEN') {
            const hasAnyNotTaken =
              (dayMatrix.breakfast.eligible && !dayMatrix.breakfast.punched) ||
              (dayMatrix.lunch.eligible && !dayMatrix.lunch.punched) ||
              (dayMatrix.dinner.eligible && !dayMatrix.dinner.punched);
            if (!hasAnyNotTaken) return false;
          }
        }
      } else {
        // All dates selected
        if (selectedStatus === 'TAKEN' && d.takenCount === 0) return false;
        if (selectedStatus === 'NOT_TAKEN' && d.takenCount >= d.eligibleCount) return false;
      }

      return true;
    });
  }, [
    devotees,
    selectedCenter,
    selectedTemple,
    selectedTrack,
    searchQuery,
    selectedDate,
    selectedMeal,
    selectedStatus
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedDate,
    selectedMeal,
    selectedTrack,
    selectedCenter,
    selectedTemple,
    selectedStatus
  ]);

  // Paginated Devotees
  const totalPages = Math.max(1, Math.ceil(filteredDevotees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDevotees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredDevotees.slice(start, start + pageSize);
  }, [filteredDevotees, safeCurrentPage, pageSize]);

  // Dynamic available VOICE centers based on selected Current Temple
  const availableCenters = useMemo(() => {
    if (selectedTemple === 'all') {
      return filterOptions.centers || [];
    }
    const matching = new Set<string>();
    devotees.forEach((d) => {
      if (d.temple === selectedTemple && d.center) {
        matching.add(d.center);
      }
    });
    return (filterOptions.centers || []).filter((c) => matching.has(c));
  }, [selectedTemple, filterOptions.centers, devotees]);

  // Reset selectedCenter if it doesn't belong to the newly selected Current Temple
  useEffect(() => {
    if (selectedCenter !== 'all' && availableCenters.length > 0 && !availableCenters.includes(selectedCenter)) {
      setSelectedCenter('all');
    }
  }, [selectedTemple, availableCenters, selectedCenter]);

  // Filtered Kitchen Tally Rows
  const filteredKitchenTally = useMemo(() => {
    return kitchenTally.filter((row) => {
      if (selectedDate && selectedDate !== 'all') {
        const matchesDate =
          row.date === selectedDate ||
          row.rawDate === selectedDate ||
          (row.dateLabel && row.dateLabel.toLowerCase().replace(/\s+/g, '') === selectedDate.toLowerCase().replace(/\s+/g, ''));
        if (!matchesDate) return false;
      }
      if (selectedMeal !== 'all' && row.meal !== selectedMeal) {
        return false;
      }
      return true;
    });
  }, [kitchenTally, selectedDate, selectedMeal]);

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

  // Dynamically computed Kitchen Stats based on selected date & meal
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
      dateLabel: activeDateObj?.label || (selectedDate === 'all' || !selectedDate ? 'All Dates' : selectedDate),
    };
  }, [filteredKitchenTally, activeDateObj, selectedDate]);

  // Dynamically computed Devotee Attendance Stats (Changes with Date & Filter Selection)
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

      if (selectedDate && selectedDate !== 'all') {
        const day = d.dateMatrix?.find((m: any) => m.date === selectedDate || m.rawDate === selectedDate);
        if (day) {
          if (selectedMeal === 'all' || selectedMeal === 'Breakfast') {
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
          if (selectedMeal === 'all' || selectedMeal === 'Lunch') {
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
          if (selectedMeal === 'all' || selectedMeal === 'Dinner') {
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
        // All dates
        d.dateMatrix?.forEach((day: any) => {
          if (selectedMeal === 'all' || selectedMeal === 'Breakfast') {
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
          if (selectedMeal === 'all' || selectedMeal === 'Lunch') {
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
          if (selectedMeal === 'all' || selectedMeal === 'Dinner') {
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
      dateLabel: activeDateObj?.label || (selectedDate === 'all' || !selectedDate ? 'All Dates' : selectedDate),
    };
  }, [filteredDevotees, selectedDate, selectedMeal, activeDateObj]);

  // Save Extra Guest Count
  const handleSaveGuestCount = async () => {
    setGuestModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await saveCampKitchenExtraMealsAction({
        campId,
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

  // Generate WhatsApp Slip for Kitchen
  const handleCopyKitchenSlip = () => {
    const dateLabel = activeDateObj?.label || selectedDate || 'Today';
    let slip = `*🥘 KITCHEN HEADCOUNT SLIP • ${camp?.title || 'CAMP'}*\n`;
    slip += `📅 Date: ${dateLabel}\n`;
    slip += `--------------------------------------\n`;

    const sessions = filteredKitchenTally;

    sessions.forEach(s => {
      slip += `🍽 *${s.meal.toUpperCase()}*:\n`;
      slip += `   • Registered: ${s.scheduledCount} devotees\n`;
      slip += `   • Honored (Taken): ${s.takenCount}\n`;
      slip += `   • Not Taken (Pending): ${s.notTakenCount}\n`;
      slip += `   • Extra Guests: +${s.extraCount}\n`;
      slip += `   👉 *Total Plates to Prepare: ${s.totalKitchenTarget}*\n`;
      if (s.notes) slip += `   (Note: ${s.notes})\n`;
      slip += `\n`;
    });

    const totalPlates = sessions.reduce((acc, s) => acc + s.totalKitchenTarget, 0);
    slip += `--------------------------------------\n`;
    slip += `🍛 *Total Day Plates Target: ${totalPlates}*\n`;
    slip += `Sent via VOICE Gurukul Prasadam System`;

    navigator.clipboard.writeText(slip);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (devotees.length === 0) {
      alert('No data to export.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Devotee Attendance Matrix
    const devoteesExport = filteredDevotees.map((d, idx) => {
      const currentDay = d.dateMatrix?.find((m: any) => m.date === selectedDate || m.rawDate === selectedDate);
      return {
        '#': idx + 1,
        'Pass Token': d.token || '',
        'Devotee Name': d.name,
        'Phone / WhatsApp': d.phone,
        'Sub-Camp Track': d.track,
        'VOICE Center': d.center,
        'Current Temple': d.temple,
        'POC Name': d.pocName || '',
        'POC Contact': d.pocContact || '',
        'Selected Date': activeDateObj?.label || selectedDate || 'All',
        'Breakfast Status': currentDay
          ? currentDay.breakfast.eligible
            ? currentDay.breakfast.punched ? `TAKEN (${currentDay.breakfast.punchedAt})` : 'NOT TAKEN'
            : 'NOT INCLUDED'
          : '',
        'Lunch Status': currentDay
          ? currentDay.lunch.eligible
            ? currentDay.lunch.punched ? `TAKEN (${currentDay.lunch.punchedAt})` : 'NOT TAKEN'
            : 'NOT INCLUDED'
          : '',
        'Dinner Status': currentDay
          ? currentDay.dinner.eligible
            ? currentDay.dinner.punched ? `TAKEN (${currentDay.dinner.punchedAt})` : 'NOT TAKEN'
            : 'NOT INCLUDED'
          : '',
        'Total Camp Meals Taken': `${d.takenCount} / ${d.eligibleCount}`
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(devoteesExport);
    XLSX.utils.book_append_sheet(wb, ws1, 'Devotee_Attendance');

    // Sheet 2: Kitchen Headcount Tally
    const kitchenExport = filteredKitchenTally.map((k, idx) => ({
      '#': idx + 1,
      'Date': k.date,
      'Date Label': k.dateLabel,
      'Meal Session': k.meal,
      'Registered Count': k.scheduledCount,
      'Actually Punched': k.takenCount,
      'Not Taken': k.notTakenCount,
      'Extra Guests': k.extraCount,
      'Total Kitchen Target': k.totalKitchenTarget,
      'Audit Notes': k.notes || ''
    }));
    const ws2 = XLSX.utils.json_to_sheet(kitchenExport);
    XLSX.utils.book_append_sheet(wb, ws2, 'Kitchen_Headcount_Tally');

    const fileDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${camp?.title || 'Camp'}_Prasadam_Audit_${fileDate}.xlsx`, { bookType: 'xlsx' });
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedMeal !== 'all' ||
    selectedTrack !== 'all' ||
    selectedCenter !== 'all' ||
    selectedTemple !== 'all' ||
    selectedStatus !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedMeal('all');
    setSelectedTrack('all');
    setSelectedCenter('all');
    setSelectedTemple('all');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Quick Actions: Compact on Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg shadow-amber-600/15">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider mb-1">
            <Utensils className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-200" />
            <span>Prasadam Attendance &bull; Kitchen Operations</span>
          </div>
          <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
            {camp?.title || 'Camp'} &bull; Prasadam &amp; Kitchen Tally
          </h2>
          <p className="text-[11px] sm:text-xs text-amber-100 max-w-2xl mt-0.5 hidden sm:block">
            Track devotee prasadam clearances, audit center &amp; temple headcounts, and give exact meal targets to the kitchen team.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
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
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
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

        {/* Date Selector Pills (Global to both views) */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline shrink-0">
            Meal Date:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate('all')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedDate === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Dates
          </button>
          {filterOptions.dates.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelectedDate(d.date)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedDate === d.date
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: DAILY KITCHEN HEADCOUNT & TALLY               */}
      {/* ======================================================== */}
      {activeSection === 'kitchen' && (
        <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-150">
          {/* Kitchen Stats Cards: Compact on Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5">
            {/* 1. Registered Expected */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs transition-all hover:border-slate-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Registered Expected
              </span>
              <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
                {activeKitchenStats.totalScheduled}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate block">
                Plates for {activeKitchenStats.dateLabel}
              </span>
            </div>

            {/* 2. Actually Honored */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs transition-all hover:border-emerald-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Actually Honored</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-emerald-800 mt-0.5 sm:mt-1">
                {activeKitchenStats.totalPlatesHonored}
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-medium truncate block">
                {activeKitchenStats.totalTaken} QR + {activeKitchenStats.totalExtraServed} Guests
              </span>
            </div>

            {/* 3. Not Taken (Pending) */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs transition-all hover:border-amber-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Not Taken</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-amber-900 mt-0.5 sm:mt-1">
                {activeKitchenStats.totalNotTaken}
              </div>
              <span className="text-[9px] sm:text-[10px] text-amber-700 font-medium truncate block">
                {activeKitchenStats.notTakenPercent}% pending
              </span>
            </div>

            {/* 4. Extra Guests (Without QR) */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs transition-all hover:border-indigo-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Guests (No QR)</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-indigo-900 mt-0.5 sm:mt-1">
                +{activeKitchenStats.totalExtraServed}
              </div>
              <span className="text-[9px] sm:text-[10px] text-indigo-700 font-medium truncate block">
                Target buffer: +{activeKitchenStats.totalExtraGuests}
              </span>
            </div>

            {/* 5. Total Kitchen Target: span 2 cols on mobile */}
            <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 text-white shadow-xs border border-slate-800 transition-all hover:border-slate-700 col-span-2 sm:col-span-1 flex sm:block items-center justify-between">
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Total Kitchen Target
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 block sm:hidden">Total plates to prepare</span>
              </div>
              <div className="text-right sm:text-left">
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">
                  {activeKitchenStats.totalKitchenTarget}
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">Total plates to prepare</span>
              </div>
            </div>
          </div>

          {/* Quick Meal Session Switcher for Kitchen: Compact on Mobile */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Session:
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {(['all', 'Breakfast', 'Lunch', 'Dinner'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMeal(m)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                      selectedMeal === m
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {m === 'all' ? 'All (BF, LN, DN)' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">
              Date: <span className="text-slate-900 font-bold">{activeKitchenStats.dateLabel}</span> &bull;{' '}
              Meal: <span className="text-amber-700 font-bold">{selectedMeal === 'all' ? 'All Meals' : selectedMeal}</span>
            </div>
          </div>

          {/* Kitchen Action Bar: Share WhatsApp Slip: Compact on Mobile */}
          <div className="flex items-center justify-between p-2.5 sm:p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl sm:rounded-2xl gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500 text-white shrink-0">
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate">
                  Kitchen Coordinator WhatsApp Summary
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">
                  Copy formatted meal slip for {activeDateObj?.label || 'All Dates'} to send to kitchen head.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyKitchenSlip}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              {copiedSlip ? <CheckCheck className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSlip ? 'Copied!' : 'Copy Slip'}</span>
            </button>
          </div>

          {/* Kitchen Headcount Table: Compact on Mobile */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kitchen Daily Headcount &amp; Target Prepared Tally
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500">
                {filteredKitchenTally.length} Sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead className="bg-slate-50 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4">Date &amp; Label</th>
                    <th className="py-3 px-3">Meal Session</th>
                    <th className="py-3 px-3 text-right">Registered</th>
                    <th className="py-3 px-3 text-right">Punched (QR)</th>
                    <th className="py-3 px-3 text-right">Not Taken</th>
                    <th className="py-3 px-3 text-right">Guests (No QR)</th>
                    <th className="py-3 px-3 text-right">Total Honored</th>
                    <th className="py-3 px-3 text-right">Buffer Planned</th>
                    <th className="py-3 px-4 text-right">Kitchen Target</th>
                    <th className="py-3 px-4 text-center">Action / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKitchenTally.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        No meal sessions match the selected date.
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
                        <tr key={`${row.date}_${row.meal}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <div>{row.dateLabel}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{row.date}</div>
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

                          <td className="py-3 px-3 text-right font-bold text-amber-700">
                            {row.notTakenCount}
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
                            <span className="text-[10px] text-slate-400 block">plates</span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setGuestModal({
                                  isOpen: true,
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
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Devotee Prasadam Summary Cards (Dynamic by Date & Filters - Includes Devotees & Extra Guests) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Expected Meals */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm transition-all hover:border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Meals Scheduled
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {devoteeStats.totalScheduledMeals}
              </div>
              <span className="text-[10px] text-slate-500 font-medium truncate block">
                {devoteeStats.devoteeCount} Devotees &bull; {devoteeStats.dateLabel}
              </span>
            </div>

            {/* Card 2: Prasadam Taken (Honored Devotees + Extra Guests) */}
            <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 shadow-sm transition-all hover:border-emerald-300">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Prasadam Taken</span>
              </span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {devoteeStats.totalTakenMeals + guestCountForScope}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium truncate block">
                {devoteeStats.totalTakenMeals} Devotees + {guestCountForScope} Guests (No QR)
              </span>
            </div>

            {/* Card 3: Guests Honored (No QR) - ADDED FOR VISIBILITY IN BOTH SECTIONS */}
            <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-200/80 shadow-sm transition-all hover:border-indigo-300">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Guests Honored (No QR)</span>
              </span>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                +{guestCountForScope}
              </div>
              <span className="text-[10px] text-indigo-700 font-medium truncate block">
                Walk-ins, drivers &amp; VIPs honored
              </span>
            </div>

            {/* Card 4: Remaining / Pending */}
            <div className="p-4 rounded-3xl bg-amber-50/80 border border-amber-200/80 shadow-sm transition-all hover:border-amber-300">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Remaining / Pending</span>
              </span>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {devoteeStats.totalRemainingMeals}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">
                {devoteeStats.pendingRate}% pending honoring
              </span>
            </div>

            {/* Card 5: Session Breakdown */}
            <div className="p-4 rounded-3xl bg-slate-900 text-white shadow-sm border border-slate-800 transition-all hover:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Session Headcounts
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {devoteeStats.dateLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-amber-300 uppercase block">BF</span>
                  <span className="text-xs font-black text-white" title={`${devoteeStats.bf.taken} Devotees + ${guestByMeal.bf} Guests`}>
                    {devoteeStats.bf.taken + guestByMeal.bf}/{devoteeStats.bf.eligible}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-orange-300 uppercase block">LN</span>
                  <span className="text-xs font-black text-white" title={`${devoteeStats.ln.taken} Devotees + ${guestByMeal.ln} Guests`}>
                    {devoteeStats.ln.taken + guestByMeal.ln}/{devoteeStats.ln.eligible}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-indigo-300 uppercase block">DN</span>
                  <span className="text-xs font-black text-white" title={`${devoteeStats.dn.taken} Devotees + ${guestByMeal.dn} Guests`}>
                    {devoteeStats.dn.taken + guestByMeal.dn}/{devoteeStats.dn.eligible}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FILTER BAR WITH CENTER & TEMPLE DROPDOWNS: Compact on Mobile */}
          <div className="p-2.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search devotee name, token #, phone, center, temple..."
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer self-end sm:self-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Dropdowns Row: Camp Track -> Current Temple -> VOICE Center -> Meal Session -> Punch Status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2.5 pt-1.5 sm:pt-2 border-t border-slate-100 text-xs">
              {/* Camp Track Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Camp Track
                </label>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="w-full px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
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
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Current Temple
                </label>
                <select
                  value={selectedTemple}
                  onChange={(e) => setSelectedTemple(e.target.value)}
                  className="w-full px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
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
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  VOICE Center
                </label>
                <select
                  value={selectedCenter}
                  onChange={(e) => setSelectedCenter(e.target.value)}
                  className="w-full px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
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
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Meal Session
                </label>
                <select
                  value={selectedMeal}
                  onChange={(e) => setSelectedMeal(e.target.value as any)}
                  className="w-full px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Meals (BF, LN, DN)</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              {/* Punch Status Filter */}
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Punch Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="TAKEN">Taken (Honored)</option>
                  <option value="NOT_TAKEN">Not Taken (Pending)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ATTENDEE PRASADAM LEDGER: Compact on Mobile */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider">
                  Devotee Prasadam Matrix &bull; {activeDateObj?.label || 'All Dates'}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500">
                {filteredDevotees.length} Devotees
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Token #</th>
                    <th className="py-2.5 px-3 sm:px-4">Devotee Details</th>
                    <th className="py-2.5 px-3">Sub-Camp Track</th>
                    <th className="py-2.5 px-3">Center &amp; Temple</th>
                    <th className="py-2.5 px-3 text-center">Breakfast</th>
                    <th className="py-2.5 px-3 text-center">Lunch</th>
                    <th className="py-2.5 px-3 text-center">Dinner</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Pass &amp; Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDevotees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        No devotees match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedDevotees.map((d) => {
                      const dayMatrix = selectedDate && selectedDate !== 'all'
                        ? d.dateMatrix?.find((m: any) => m.date === selectedDate || m.rawDate === selectedDate)
                        : null;

                      // Helper render function for meal pill
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
                                  selectedDate,
                                  mealName,
                                  isPunched
                                )
                              }
                              disabled={togglingPunchId === `${d.regId}_${selectedDate}_${mealName}`}
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
                            <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 font-black text-slate-800 text-xs">
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
                            {selectedDate && selectedDate !== 'all' ? (
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
                            {selectedDate && selectedDate !== 'all' ? (
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
                            {selectedDate && selectedDate !== 'all' ? (
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

                          {/* Pass & Action */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(!selectedDate || selectedDate === 'all') && (
                                <div className="text-right hidden sm:block">
                                  <span className="text-[11px] font-black text-slate-800 block">
                                    {d.takenCount} / {d.eligibleCount}
                                  </span>
                                  <span className="text-[9px] text-emerald-700 font-semibold block">
                                    {d.eligibleCount > 0 ? `${Math.round((d.takenCount / d.eligibleCount) * 100)}% total` : ''}
                                  </span>
                                </div>
                              )}
                              {onViewPass && (
                                <button
                                  type="button"
                                  onClick={() => onViewPass(d.regId)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  <span>View Pass</span>
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
                    {guestModal.dateLabel} ({guestModal.mealName})
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

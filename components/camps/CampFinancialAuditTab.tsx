'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Search, Filter, RefreshCw, AlertTriangle,
  CheckCircle, ShieldCheck, Clock, CreditCard, Landmark,
  ExternalLink, Eye, ArrowRight, Banknote, Tag, Undo2,
  X, Check, Copy, Utensils, Home, UserCheck, ShieldAlert
} from 'lucide-react';
import { Camp, CampAuditTransaction } from '@/types';
import {
  getAllCampTransactionsAction,
  reconcileAndCreateCampBookingAction,
  markCampPaymentReconciledAction
} from '@/app/dashboard/admin/camps/actions';
import { calculateDynamicCampCost } from '@/lib/camp-cost';

interface CampFinancialAuditTabProps {
  camp: Camp;
  userAccess: {
    isSuperAdmin?: boolean;
    canPaymentApprovals?: boolean;
  };
}

export default function CampFinancialAuditTab({ camp, userAccess }: CampFinancialAuditTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CampAuditTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing_booking' | 'confirmed' | 'failed' | 'abandoned'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Inspection & Reconcile Modals State
  const [selectedTxn, setSelectedTxn] = useState<CampAuditTransaction | null>(null);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);
  const [isSubmittingReconcile, setIsSubmittingReconcile] = useState(false);

  // Settle Externally Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleNotes, setSettleNotes] = useState('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);

  const [reconcileForm, setReconcileForm] = useState({
    campId: camp.id,
    participantName: '',
    whatsapp: '',
    email: '',
    campTrack: '',
    gender: 'Male - Bachelor',
    participantType: 'Camp Participant',
    firstMealDate: '',
    firstMealType: 'Breakfast',
    lastMealDate: '',
    lastMealType: 'Dinner',
    accommodation: 'No',
    currentCenter: 'Central VOICE',
    currentTemple: 'ISKCON NVCC • PUNE',
    notes: '',
  });

  const loadAuditData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllCampTransactionsAction(camp.id);
      if (!res.success) {
        setError(res.error || 'Failed to load camp financial audit data');
      } else {
        setTransactions(res.transactions || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching audit records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (camp?.id) {
      loadAuditData();
    }
  }, [camp?.id]);

  // Compute camp meal date options
  const campDateOptions = useMemo(() => {
    if (Array.isArray(camp.meal_pricing) && camp.meal_pricing.length > 0) {
      return camp.meal_pricing.map((m, idx) => ({
        value: String(m.date || m.full_date || `Day ${idx + 1}`),
        label: `${m.label || m.date}${m.full_date ? ` (${m.full_date})` : ''}`,
        fullDate: String(m.full_date || m.date || '')
      }));
    }
    if (camp.start_date) {
      const list: { value: string; label: string; fullDate: string }[] = [];
      const start = new Date(camp.start_date);
      const end = camp.end_date ? new Date(camp.end_date) : start;
      const curr = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const stop = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      let dayNum = 1;
      while (curr <= stop && dayNum <= 31) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        const formatted = curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
        list.push({
          value: iso,
          label: `${formatted} (Day ${dayNum})`,
          fullDate: iso
        });
        curr.setDate(curr.getDate() + 1);
        dayNum++;
      }
      return list;
    }
    return [];
  }, [camp]);

  // Ensure devotee early arrival / late departure dates are included
  const reconcileCampDateOptions = useMemo(() => {
    const dates = [...campDateOptions];
    if (reconcileForm.firstMealDate && !dates.some((d: any) => String(d.value) === String(reconcileForm.firstMealDate))) {
      dates.unshift({
        value: reconcileForm.firstMealDate,
        label: `${reconcileForm.firstMealDate} (Devotee Selected Arrival)`,
        fullDate: reconcileForm.firstMealDate
      });
    }
    if (reconcileForm.lastMealDate && !dates.some((d: any) => String(d.value) === String(reconcileForm.lastMealDate))) {
      dates.push({
        value: reconcileForm.lastMealDate,
        label: `${reconcileForm.lastMealDate} (Devotee Selected Departure)`,
        fullDate: reconcileForm.lastMealDate
      });
    }
    return dates;
  }, [campDateOptions, reconcileForm.firstMealDate, reconcileForm.lastMealDate]);

  // Live dynamic cost calculation
  const calculatedReconcileCost = useMemo(() => {
    if (!reconcileModalOpen) return null;
    try {
      return calculateDynamicCampCost(camp, {
        firstMealDate: reconcileForm.firstMealDate,
        firstMealType: reconcileForm.firstMealType,
        lastMealDate: reconcileForm.lastMealDate,
        lastMealType: reconcileForm.lastMealType,
        accommodation: reconcileForm.accommodation,
        participantType: reconcileForm.participantType || 'Camp Participant',
        campTrack: reconcileForm.campTrack
      });
    } catch (err) {
      console.warn('Reconcile cost calculation warning:', err);
      return null;
    }
  }, [
    reconcileModalOpen,
    camp,
    reconcileForm.firstMealDate,
    reconcileForm.firstMealType,
    reconcileForm.lastMealDate,
    reconcileForm.lastMealType,
    reconcileForm.accommodation,
    reconcileForm.participantType,
    reconcileForm.campTrack
  ]);

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (statusFilter !== 'all') {
        const bStatus = t.booking_status || 'confirmed';
        if (bStatus !== statusFilter) return false;
      }
      if (methodFilter !== 'all') {
        if ((t.payment_method || '').toUpperCase() !== methodFilter.toUpperCase()) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (t.poc_name || '').toLowerCase().includes(q);
        const matchContact = (t.poc_contact || '').toLowerCase().includes(q);
        const matchEmail = (t.email || '').toLowerCase().includes(q);
        const matchTxn = (t.txn_id || '').toLowerCase().includes(q);
        const matchPayId = (t.payment_id || '').toLowerCase().includes(q);
        const matchOrderId = (t.order_id || '').toLowerCase().includes(q);
        const matchParticipants = (t.participants || []).some((p: any) =>
          (p.participant_name || '').toLowerCase().includes(q) ||
          (p.whatsapp || '').toLowerCase().includes(q)
        );
        return matchName || matchContact || matchEmail || matchTxn || matchPayId || matchOrderId || matchParticipants;
      }
      return true;
    });
  }, [transactions, statusFilter, methodFilter, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalGross = 0;
    let netCashReceived = 0;
    let rzpInflow = 0;
    let rzpGrossPaid = 0;
    let rzpSurchargeTotal = 0;
    let transfersInflow = 0;
    let missingBookingsCount = 0;
    let missingBookingsAmount = 0;
    let confirmedCount = 0;

    for (const t of transactions) {
      const amt = Number(t.total_amount || 0);
      const isMissing = t.booking_status === 'missing_booking';
      const isConfirmed = t.booking_status === 'confirmed';

      if (isMissing) {
        missingBookingsCount++;
        missingBookingsAmount += amt;
      }
      if (isConfirmed) {
        confirmedCount++;
        totalGross += Number(t.gross_amount || amt);
        netCashReceived += amt;
        if (t.payment_method === 'RAZORPAY') {
          rzpInflow += amt;
          const gross = Number(t.gross_paid_amount || (amt + (t.gateway_surcharge || 0)));
          const surcharge = Number(t.gateway_surcharge || Math.max(0, gross - amt));
          rzpGrossPaid += gross;
          rzpSurchargeTotal += surcharge;
        } else if (t.payment_method === 'INTER_TEMPLE_TRANSFER' || t.payment_method === 'IDT') {
          transfersInflow += amt;
        }
      }
    }

    return {
      totalGross,
      netCashReceived,
      rzpInflow,
      rzpGrossPaid,
      rzpSurchargeTotal,
      transfersInflow,
      missingBookingsCount,
      missingBookingsAmount,
      confirmedCount
    };
  }, [transactions]);

  // Open Reconcile Modal
  const openReconcileModal = (txn: CampAuditTransaction) => {
    setSelectedTxn(txn);
    const firstEntry = (txn as any).entries_payload?.[0] || txn.participants?.[0] || null;
    const tracks = (camp?.tracks && Array.isArray(camp.tracks) && camp.tracks.length > 0)
      ? camp.tracks.map((t: any) => typeof t === 'string' ? t : t.name)
      : ['GS Camp - 1st Timer', 'Senior Boys', 'Graduates', 'General Track'];

    const chosenTrack = firstEntry?.camp_track || firstEntry?.campTrack || tracks[0] || 'GS Camp - 1st Timer';

    const trackFeeObj = camp.special_waivers?.track_fees?.find(
      (tf: any) => (tf.track || '').trim().toLowerCase() === (chosenTrack || '').trim().toLowerCase()
    );

    let defaultFirstDate = campDateOptions[0]?.value || '';
    let defaultLastDate = campDateOptions[campDateOptions.length - 1]?.value || defaultFirstDate;
    let defaultFirstType = 'Breakfast';
    let defaultLastType = 'Dinner';

    if (trackFeeObj) {
      if (trackFeeObj.start_date) defaultFirstDate = trackFeeObj.start_date;
      if (trackFeeObj.end_date) defaultLastDate = trackFeeObj.end_date;
      if (trackFeeObj.start_meal_type) defaultFirstType = trackFeeObj.start_meal_type;
      if (trackFeeObj.end_meal_type) defaultLastType = trackFeeObj.end_meal_type;
    }

    // Preserve devotee's custom dates if present
    const initialFirstDate = firstEntry?.first_meal_date || firstEntry?.firstMealDate || defaultFirstDate;
    const initialLastDate = firstEntry?.last_meal_date || firstEntry?.lastMealDate || defaultLastDate;
    const initialFirstType = firstEntry?.first_meal_type || firstEntry?.firstMealType || defaultFirstType;
    const initialLastType = firstEntry?.last_meal_type || firstEntry?.lastMealType || defaultLastType;

    setReconcileForm({
      campId: camp.id,
      participantName: firstEntry?.participant_name || firstEntry?.participantName || txn.poc_name || 'Devotee',
      whatsapp: firstEntry?.whatsapp || firstEntry?.phone || txn.poc_contact || '',
      email: firstEntry?.email || txn.email || '',
      campTrack: chosenTrack,
      gender: firstEntry?.gender || 'Male - Bachelor',
      participantType: firstEntry?.participant_type || firstEntry?.participantType || 'Camp Participant',
      firstMealDate: initialFirstDate,
      firstMealType: initialFirstType,
      lastMealDate: initialLastDate,
      lastMealType: initialLastType,
      accommodation: firstEntry?.accommodation || 'No',
      currentCenter: firstEntry?.current_center || firstEntry?.currentCenter || firstEntry?.voice_name || 'Central VOICE',
      currentTemple: firstEntry?.current_temple || firstEntry?.currentTemple || firstEntry?.parent_temple || 'ISKCON NVCC • PUNE',
      notes: `Reconciled from gateway payment ${txn.payment_id || txn.txn_id}`,
    });

    setReconcileError(null);
    setReconcileSuccess(null);
    setReconcileModalOpen(true);
  };

  const submitReconcileForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTxn) return;

    if (!reconcileForm.participantName.trim()) {
      setReconcileError('Participant name is required');
      return;
    }
    if (!reconcileForm.firstMealDate || !reconcileForm.lastMealDate) {
      setReconcileError('Both first meal date and last meal date are required');
      return;
    }

    setIsSubmittingReconcile(true);
    setReconcileError(null);
    setReconcileSuccess(null);

    try {
      const res = await reconcileAndCreateCampBookingAction({
        campId: camp.id,
        paymentId: selectedTxn.payment_id || selectedTxn.txn_id,
        orderId: selectedTxn.order_id,
        payerName: reconcileForm.participantName,
        payerContact: reconcileForm.whatsapp,
        email: reconcileForm.email,
        amount: Number(selectedTxn.total_amount),
        entries: [{
          participant_name: reconcileForm.participantName,
          whatsapp: reconcileForm.whatsapp,
          email: reconcileForm.email,
          camp_track: reconcileForm.campTrack,
          gender: reconcileForm.gender,
          participant_type: reconcileForm.participantType,
          first_meal_date: reconcileForm.firstMealDate,
          first_meal_type: reconcileForm.firstMealType,
          last_meal_date: reconcileForm.lastMealDate,
          last_meal_type: reconcileForm.lastMealType,
          accommodation: reconcileForm.accommodation,
          current_center: reconcileForm.currentCenter,
          current_temple: reconcileForm.currentTemple,
          total_cost: calculatedReconcileCost?.totalCost || Number(selectedTxn.total_amount),
          meal_cost: calculatedReconcileCost?.mealCost || 0,
          acc_cost: calculatedReconcileCost?.accCost || 0,
          ac_cost: calculatedReconcileCost?.acCost || 0,
          entry_cost: calculatedReconcileCost?.baseCost || calculatedReconcileCost?.entryCost || 0,
        }],
        notes: reconcileForm.notes,
      });

      if (!res.success) {
        setReconcileError(res.error || 'Failed to reconcile booking');
      } else {
        setReconcileSuccess(res.message || 'Camp booking confirmed and devotee account registered!');
        await loadAuditData();
        setTimeout(() => {
          setReconcileModalOpen(false);
        }, 1500);
      }
    } catch (err: any) {
      setReconcileError(err.message || 'Unexpected error during reconciliation');
    } finally {
      setIsSubmittingReconcile(false);
    }
  };

  const handleSettleSubmit = async () => {
    if (!selectedTxn) return;
    setIsSubmittingSettle(true);
    try {
      const res = await markCampPaymentReconciledAction({
        paymentId: selectedTxn.payment_id || selectedTxn.txn_id,
        orderId: selectedTxn.order_id,
        notes: settleNotes.trim() || undefined,
        campId: camp.id
      });
      if (res.success) {
        setSettleModalOpen(false);
        setSettleNotes('');
        await loadAuditData();
      } else {
        alert(res.error || 'Failed to update record');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update record');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxnId(id);
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <span>Financial Audit &amp; Reconciliation</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
              {camp.title}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified ledger comparing bank/gateway receipts against Gurukul camp registrations for complete accountability.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAuditData}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Action Needed Banner: High Visibility Alert for Missing Bookings */}
      {metrics.missingBookingsCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-rose-950 flex items-center gap-2">
                <span>Action Needed: {metrics.missingBookingsCount} Gateway Payment(s) Received Without Registration!</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                  ₹{metrics.missingBookingsAmount.toLocaleString('en-IN')} Total
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                Devotees paid successfully on Razorpay, but Gurukul registration was not created (e.g. browser closed prematurely). Please review and confirm bookings below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter('missing_booking')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Filter Missing Bookings ({metrics.missingBookingsCount})
          </button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Cash Received</span>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            ₹{metrics.netCashReceived.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {metrics.confirmedCount} Confirmed Bookings
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-600" />
              <span>Razorpay Online</span>
            </span>
            <span className="text-[8.5px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
              Gateway
            </span>
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
            ₹{metrics.rzpInflow.toLocaleString('en-IN')}
          </div>
          <div className="text-[9.5px] sm:text-[10px] text-slate-500 font-semibold mt-0.5 space-y-0.5 leading-tight">
            <div>Paid: <strong className="text-indigo-950 font-bold">₹{metrics.rzpGrossPaid.toLocaleString('en-IN')}</strong></div>
            <div className="text-emerald-700 font-bold">Camp: ₹{metrics.rzpInflow.toLocaleString('en-IN')} &bull; Fee: +₹{metrics.rzpSurchargeTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block flex items-center gap-1">
            <Landmark className="w-3 h-3 text-teal-600" />
            <span>Transfers (ITT / IDT)</span>
          </span>
          <div className="text-base sm:text-lg font-black text-teal-700 mt-0.5">
            ₹{metrics.transfersInflow.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Offline Bank Transfers
          </span>
        </div>

        <div className={`p-3 rounded-xl border shadow-2xs ${metrics.missingBookingsCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${metrics.missingBookingsCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            Missing Bookings
          </span>
          <div className={`text-base sm:text-lg font-black mt-0.5 ${metrics.missingBookingsCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {metrics.missingBookingsCount}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {metrics.missingBookingsCount > 0 ? `₹${metrics.missingBookingsAmount.toLocaleString('en-IN')} unconfirmed` : 'All payments reconciled'}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by devotee name, phone, email, payment ID, or order ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses ({transactions.length})</option>
            <option value="missing_booking">⚠️ Missing Booking ({metrics.missingBookingsCount})</option>
            <option value="confirmed">Confirmed Bookings ({metrics.confirmedCount})</option>
            <option value="failed">Failed Attempts</option>
            <option value="abandoned">Abandoned Orders</option>
          </select>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Methods</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="INTER_TEMPLE_TRANSFER">ITT Transfer</option>
            <option value="IDT">IDT Transfer</option>
            <option value="FREE">Fee Waiver</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-xs font-bold">Loading camp transactions...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <div className="text-sm font-bold">{error}</div>
            <button
              onClick={loadAuditData}
              className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <DollarSign className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-600">No transactions match your search filter</div>
            <p className="text-xs text-slate-400">Try adjusting your search terms or filter selection.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((txn, idx) => {
              const isMissingBooking = txn.booking_status === 'missing_booking';
              const isConfirmed = txn.booking_status === 'confirmed';
              const isFailed = txn.booking_status === 'failed';

              return (
                <div
                  key={txn.txn_id || idx}
                  className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isMissingBooking ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left: Devotee & Transaction Details */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">
                        {txn.poc_name || 'Devotee'}
                      </span>
                      {txn.participant_count > 1 && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {txn.participant_count} Devotees
                        </span>
                      )}

                      {/* Status Badges */}
                      {isMissingBooking && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1 shadow-2xs animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>MISSING BOOKING (ACTION NEEDED)</span>
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>CONFIRMED</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          FAILED ATTEMPT
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      {txn.poc_contact && <span>📞 {txn.poc_contact}</span>}
                      {txn.email && <span>✉️ {txn.email}</span>}
                      <span>📅 {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 pt-0.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-sans font-bold">
                        {txn.payment_method}
                      </span>
                      {txn.payment_id && (
                        <span>
                          Pay: <code className="text-slate-800">{txn.payment_id}</code>
                        </span>
                      )}
                      {txn.order_id && (
                        <span>
                          Order: <code className="text-slate-800">{txn.order_id}</code>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(txn.payment_id || txn.txn_id, txn.txn_id)}
                        className="text-[10px] text-amber-600 hover:text-amber-800 cursor-pointer flex items-center gap-0.5"
                      >
                        {copiedTxnId === txn.txn_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTxnId === txn.txn_id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Amount & Action Buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          ₹{Number(txn.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          Camp Fee
                        </span>
                      </div>
                      {txn.payment_method === 'RAZORPAY' && Boolean((txn.gross_paid_amount || 0) > Number(txn.total_amount || 0) || txn.gateway_surcharge) ? (
                        <div className="text-[10px] text-indigo-700 font-extrabold mt-0.5" title="Total amount charged at Razorpay gateway">
                          Paid: ₹{(txn.gross_paid_amount || (Number(txn.total_amount) + (txn.gateway_surcharge || 0))).toLocaleString('en-IN')} <span className="font-medium text-slate-500">(incl. ₹{txn.gateway_surcharge ?? Math.max(0, (txn.gross_paid_amount || 0) - Number(txn.total_amount))} fee)</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 block">
                          {isMissingBooking ? 'Razorpay Received' : 'Net Received'}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {isMissingBooking && (
                        <>
                          <button
                            type="button"
                            onClick={() => openReconcileModal(txn)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve &amp; Confirm Booking</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxn(txn);
                              setSettleModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Settle Externally
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECONCILE MODAL DIALOG */}
      {reconcileModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-snug">
                    Confirm Missing Camp Registration
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Payment ID: <code className="font-mono text-slate-800 font-bold">{selectedTxn.payment_id || selectedTxn.txn_id}</code> &bull; ₹{Number(selectedTxn.total_amount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReconcileModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={submitReconcileForm} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {reconcileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{reconcileError}</span>
                </div>
              )}

              {reconcileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{reconcileSuccess}</span>
                </div>
              )}

              {/* Devotee Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Participant Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reconcileForm.participantName}
                    onChange={e => setReconcileForm(prev => ({ ...prev, participantName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={reconcileForm.whatsapp}
                    onChange={e => setReconcileForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={reconcileForm.email}
                    onChange={e => setReconcileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Camp Track *
                  </label>
                  <select
                    value={reconcileForm.campTrack}
                    onChange={e => setReconcileForm(prev => ({ ...prev, campTrack: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {(() => {
                      const tracks = (camp?.tracks && Array.isArray(camp.tracks) && camp.tracks.length > 0)
                        ? camp.tracks.map((t: any) => typeof t === 'string' ? t : t.name)
                        : ['GS Camp - 1st Timer', 'Senior Boys', 'Graduates', 'General Track'];
                      return tracks.map((tr: string) => (
                        <option key={tr} value={tr}>{tr}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              {/* Dates & Meals Dropdowns */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span>Camp Dates &amp; Prasadam Schedule</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold lowercase">
                    {reconcileCampDateOptions.length} valid camp days
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      First Meal Date *
                    </label>
                    <select
                      required
                      value={reconcileForm.firstMealDate}
                      onChange={e => setReconcileForm(prev => ({ ...prev, firstMealDate: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      {reconcileCampDateOptions.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      First Meal Type
                    </label>
                    <select
                      value={reconcileForm.firstMealType}
                      onChange={e => setReconcileForm(prev => ({ ...prev, firstMealType: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Last Meal Date *
                    </label>
                    <select
                      required
                      value={reconcileForm.lastMealDate}
                      onChange={e => setReconcileForm(prev => ({ ...prev, lastMealDate: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      {reconcileCampDateOptions.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Last Meal Type
                    </label>
                    <select
                      value={reconcileForm.lastMealType}
                      onChange={e => setReconcileForm(prev => ({ ...prev, lastMealType: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Cost Calculation vs Payment Received */}
              {(() => {
                const surchargePercent = Number(
                  camp?.payment_config?.surcharge_percent ??
                  (camp as any)?.online_payment_surcharge_percent ??
                  0
                );
                const campFee = calculatedReconcileCost?.totalCost || 0;
                const gatewayFee = surchargePercent > 0 && campFee > 0
                  ? Math.round((campFee * surchargePercent) / 100)
                  : 0;
                const grandTotalWithGateway = campFee + gatewayFee;
                const paidGross = Number(selectedTxn.gross_paid_amount || selectedTxn.total_amount);
                const paidNet = Number(selectedTxn.net_camp_fee || selectedTxn.total_amount);
                const paidAmount = paidGross;

                const isExactMatchWithGateway = grandTotalWithGateway === paidGross || grandTotalWithGateway === paidNet;
                const isExactMatchDirect = campFee === paidNet || campFee === paidGross;
                const isMatch = isExactMatchWithGateway || isExactMatchDirect;
                const effectiveDiff = isMatch ? 0 : Math.min(Math.abs(grandTotalWithGateway - paidGross), Math.abs(campFee - paidNet));

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fee Calculation vs Paid Amount</span>
                      </span>
                      {calculatedReconcileCost && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1 ${
                          isMatch ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {isMatch ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Exact Match: ₹{paidAmount.toLocaleString('en-IN')} {isExactMatchWithGateway && surchargePercent > 0 ? `(Inc. ${surchargePercent}% Gateway)` : ''}</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Difference: ₹{effectiveDiff.toLocaleString('en-IN')}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Side-by-side comparison cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Paid Amount</div>
                        <div className="text-xl font-black text-slate-900 mt-0.5">
                          ₹{paidAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10.5px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Razorpay Captured</span>
                        </div>
                      </div>

                      <div className={`p-3 bg-white rounded-xl border shadow-2xs ${isMatch ? 'border-emerald-300/80' : 'border-amber-300/80'}`}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {surchargePercent > 0 ? `Calculated Total (Inc. ${surchargePercent}% Gateway)` : 'Calculated Camp Fee'}
                        </div>
                        <div className="text-xl font-black text-amber-800 mt-0.5">
                          ₹{calculatedReconcileCost ? (surchargePercent > 0 ? grandTotalWithGateway.toLocaleString('en-IN') : campFee.toLocaleString('en-IN')) : '—'}
                        </div>
                        <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                          Camp ₹{campFee.toLocaleString('en-IN')} {gatewayFee > 0 ? `+ ₹${gatewayFee} Gateway (${surchargePercent}%)` : ''} &bull; {reconcileForm.accommodation === 'Yes' ? 'With Stay' : 'No Stay'}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown details */}
                    {calculatedReconcileCost && (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/60 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md font-semibold">
                          Base/Track: <strong>₹{calculatedReconcileCost.baseCost || calculatedReconcileCost.entryCost || 0}</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md font-semibold">
                          Meals ({calculatedReconcileCost.mealCount}): <strong>₹{calculatedReconcileCost.mealCost}</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md font-semibold">
                          Stay ({calculatedReconcileCost.daysOfStay}d): <strong>₹{calculatedReconcileCost.accCost}</strong>
                        </span>
                        {calculatedReconcileCost.acCost > 0 && (
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md font-semibold">
                            Facility/AC: <strong>₹{calculatedReconcileCost.acCost}</strong>
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md font-bold text-amber-900">
                          Camp Fee: ₹{campFee}
                        </span>
                        {gatewayFee > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md font-bold text-blue-900">
                            + Gateway Fee ({surchargePercent}%): ₹{gatewayFee}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Match confirmation */}
                    {calculatedReconcileCost && isMatch ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] leading-relaxed flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Perfect Match!</strong> Devotee paid <strong>₹{paidAmount.toLocaleString('en-IN')}</strong>, matching Camp Registration Fee (₹{campFee}) {gatewayFee > 0 ? `+ ${surchargePercent}% online gateway fee (₹${gatewayFee})` : ''}.
                        </span>
                      </div>
                    ) : (
                      calculatedReconcileCost && (
                        <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] leading-relaxed">
                          💡 <strong>Correction Tip:</strong> Devotee paid <strong>₹{paidAmount.toLocaleString('en-IN')}</strong>, but current selection calculates to <strong>₹{grandTotalWithGateway.toLocaleString('en-IN')}</strong>. Try toggling <em>Accommodation</em> or adjusting <em>Dates</em> above to align.
                        </div>
                      )
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Accommodation / Room Stay
                  </label>
                  <select
                    value={reconcileForm.accommodation}
                    onChange={e => setReconcileForm(prev => ({ ...prev, accommodation: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    <option value="No">No Stay (Day Scholar)</option>
                    <option value="Yes">Yes (With Room Stay)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Gender
                  </label>
                  <select
                    value={reconcileForm.gender}
                    onChange={e => setReconcileForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    <option value="Male - Bachelor">Male - Bachelor</option>
                    <option value="Male - Married">Male - Married</option>
                    <option value="Female - Married">Female - Married</option>
                    <option value="Female - Unmarried">Female - Unmarried</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReconcileModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReconcile}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReconcile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming &amp; Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm Booking &amp; Send Pass Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE EXTERNALLY MODAL */}
      {settleModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Mark Payment Settled Externally</h3>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Mark this orphaned gateway transaction as resolved (e.g. refunded via Razorpay Dashboard or settled offline).
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes / Reason *</label>
              <textarea
                rows={3}
                value={settleNotes}
                onChange={e => setSettleNotes(e.target.value)}
                placeholder="e.g. Refunded to devotee via Razorpay dashboard reference #12345"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleSubmit}
                disabled={isSubmittingSettle}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingSettle ? 'Saving...' : 'Save & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Search, Download, Users, DollarSign,
  Filter, Phone, Mail, CheckCircle, Clock, Utensils,
  Home, RefreshCw, Loader2, AlertCircle, FileSpreadsheet,
  Building, UserCheck, ShieldCheck, CreditCard,
  Landmark, ExternalLink, Eye, CheckCircle2, X, Image as ImageIcon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check,
  Undo2, Banknote, AlertTriangle, CheckCheck, RotateCcw, Ticket, QrCode
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Camp, CampRegistration, CampRefundRequest } from '@/types';
import CampPrasadamCard from '@/components/camps/CampPrasadamCard';
import AdminCampQrScannerModal from '@/components/camps/AdminCampQrScannerModal';
import CampPrasadamTab from '@/components/camps/CampPrasadamTab';
import {
  getCampRegistrationsAction,
  verifyAndApproveCampRegistrationAction,
  getCampRefundRequestsAction,
  processCampRefundAction,
  getCampUserAccessAction
} from '../../actions';

function formatDisplayDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  const s = String(val).trim();
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  return s;
}

export default function CampRegistrationsAdminPage() {
  const params = useParams();
  const campId = String(params.campId || '');
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialViewParam = searchParams.get('view');

  const [camp, setCamp] = useState<Camp | null>(null);
  const [registrations, setRegistrations] = useState<CampRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Access & Role Permissions for this specific camp
  const [userAccess, setUserAccess] = useState<{
    loaded: boolean;
    isSuperAdmin: boolean;
    permission: 'super_admin' | 'attendance' | 'refunds' | 'prasadam' | 'both' | 'scan_pass' | 'payment_approvals' | null;
    permissions: string[];
    canAttendance: boolean;
    canRefunds: boolean;
    canPrasadam: boolean;
    canScan: boolean;
    canPaymentApprovals: boolean;
  }>({
    loaded: false,
    isSuperAdmin: false,
    permission: null,
    permissions: [],
    canAttendance: false,
    canRefunds: false,
    canPrasadam: false,
    canScan: false,
    canPaymentApprovals: false,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // ITT Verification Modal State
  const [verifyingReg, setVerifyingReg] = useState<CampRegistration | null>(null);
  const [verifyTxnId, setVerifyTxnId] = useState('');
  const [verifyDate, setVerifyDate] = useState(new Date().toISOString().split('T')[0]);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // ITT Details View Modal State (Uniform table view)
  const [viewDetailsReg, setViewDetailsReg] = useState<CampRegistration | null>(null);
  const [copiedUtr, setCopiedUtr] = useState(false);

  // Prasadam & Delegate Pass View Modal State
  const [viewPassReg, setViewPassReg] = useState<any | null>(null);

  // QR Scanner Modal State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Full Screenshot Modal State
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);

  // Top View Switcher: 'registrations' vs 'refunds' vs 'prasadam'
  const [activeView, setActiveView] = useState<'registrations' | 'refunds' | 'prasadam'>('registrations');
  const [refundRequests, setRefundRequests] = useState<CampRefundRequest[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);

  // Payout / Process Refund Modal State
  const [payoutModal, setPayoutModal] = useState<{
    isOpen: boolean;
    refund: CampRefundRequest | null;
    actionType: 'refund' | 'reject';
    txnRef: string;
    payoutDate: string;
    notes: string;
    saving: boolean;
    error: string | null;
  }>({
    isOpen: false,
    refund: null,
    actionType: 'refund',
    txnRef: '',
    payoutDate: new Date().toISOString().split('T')[0],
    notes: '',
    saving: false,
    error: null
  });

  // View Receipt Modal State
  const [viewRefundReceipt, setViewRefundReceipt] = useState<CampRefundRequest | null>(null);
  const [copiedRefundInfo, setCopiedRefundInfo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Camp details
      const campRes = await fetch(`/api/db-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'camps',
          method: 'select',
          filters: [{ type: 'eq', col: 'id', val: campId }],
          singleRow: true
        })
      });
      const campJson = await campRes.json();
      if (campJson.data) {
        setCamp(campJson.data);
      }

      // 2. Fetch User Access Permission for this camp
      const accessRes = await getCampUserAccessAction(campId);
      const isSuper = !!accessRes.isSuperAdmin;
      const perm = accessRes.permission;
      const canAttendance = isSuper || !!accessRes.canAttendance;
      const canRefunds = isSuper || !!accessRes.canRefunds;
      const canPrasadam = isSuper || !!accessRes.canPrasadam;
      const canScan = isSuper || !!accessRes.canScan;
      const canPaymentApprovals = isSuper || !!(accessRes as any).canPaymentApprovals;

      setUserAccess({
        loaded: true,
        isSuperAdmin: isSuper,
        permission: (perm as any) || null,
        permissions: accessRes.permissions || [],
        canAttendance,
        canRefunds,
        canPrasadam,
        canScan,
        canPaymentApprovals,
      });

      // If user has no access or only scan_pass, redirect to staff duty desk
      if (!isSuper && !canAttendance && !canRefunds && !canPrasadam && !canPaymentApprovals) {
        router.replace('/dashboard/camp?tab=staff');
        return;
      }

      // Check URL query parameters for payment filter or default for payment_approvals role
      const paymentParam = searchParams.get('payment');
      if (paymentParam) {
        setSelectedPayment(paymentParam);
      } else if (!canAttendance && canPaymentApprovals) {
        setSelectedPayment('PROCESSING');
      }

      // Automatically initialize allowed activeView
      if (initialViewParam === 'prasadam' && canPrasadam) {
        setActiveView('prasadam');
      } else if (initialViewParam === 'refunds' && canRefunds) {
        setActiveView('refunds');
      } else if (initialViewParam === 'registrations' && (canAttendance || canPaymentApprovals)) {
        setActiveView('registrations');
      } else if (canAttendance || canPaymentApprovals) {
        setActiveView('registrations');
      } else if (canPrasadam) {
        setActiveView('prasadam');
      } else if (canRefunds) {
        setActiveView('refunds');
      } else {
        setActiveView('registrations');
      }

      // 3. Fetch Registrations (if super admin, attendance, or payment approvals permission)
      if (canAttendance || canPaymentApprovals) {
        const res = await getCampRegistrationsAction(campId, searchTerm);
        if (res.success && res.registrations) {
          setRegistrations(res.registrations);
        } else if (res.error) {
          setError(res.error);
        }
      }

      // 4. Fetch Refund Requests (only if super admin or refunds permission)
      if (canRefunds) {
        const refundRes = await getCampRefundRequestsAction(campId);
        if (refundRes.success && refundRes.requests) {
          setRefundRequests(refundRes.requests);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading registration records');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayoutModal = (refund: CampRefundRequest, actionType: 'refund' | 'reject' = 'refund') => {
    setPayoutModal({
      isOpen: true,
      refund,
      actionType,
      txnRef: '',
      payoutDate: new Date().toISOString().split('T')[0],
      notes: '',
      saving: false,
      error: null
    });
  };

  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModal.refund) return;

    if (payoutModal.actionType === 'refund') {
      if (!payoutModal.txnRef.trim()) {
        setPayoutModal(prev => ({ ...prev, error: 'Bank UTR / Transaction Reference ID is required.' }));
        return;
      }
      if (!payoutModal.payoutDate.trim()) {
        setPayoutModal(prev => ({ ...prev, error: 'Payment Date is required.' }));
        return;
      }
    }

    setPayoutModal(prev => ({ ...prev, saving: true, error: null }));
    try {
      const res = await processCampRefundAction(payoutModal.refund.id, {
        status: payoutModal.actionType === 'refund' ? 'refunded' : 'rejected',
        payout_txn_ref: payoutModal.txnRef.trim(),
        payout_date: payoutModal.payoutDate.trim(),
        admin_notes: payoutModal.notes.trim()
      });

      if (res.success && res.refundRequest) {
        setRefundRequests(prev =>
          prev.map(r => r.id === payoutModal.refund!.id ? res.refundRequest! : r)
        );
        // Refresh registrations
        loadData();
        setPayoutModal(prev => ({ ...prev, isOpen: false }));
      } else {
        setPayoutModal(prev => ({ ...prev, error: res.error || 'Failed to process refund request.' }));
      }
    } catch (err: any) {
      setPayoutModal(prev => ({ ...prev, error: err.message || 'Error occurred.' }));
    } finally {
      setPayoutModal(prev => ({ ...prev, saving: false }));
    }
  };

  const handleReopenRefund = async (refund: CampRefundRequest) => {
    if (!confirm(`Reopen refund request for ${refund.poc_name}? Status will return to Pending.`)) {
      return;
    }
    try {
      const res = await processCampRefundAction(refund.id, {
        status: 'pending'
      });
      if (res.success && res.refundRequest) {
        setRefundRequests(prev => prev.map(r => r.id === refund.id ? res.refundRequest! : r));
        loadData();
      } else {
        alert(res.error || 'Failed to reopen refund request');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reopen refund request');
    }
  };

  useEffect(() => {
    if (campId) {
      loadData();
    }
  }, [campId]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTrack, selectedPayment, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Financial calculation helper for any attendee registration
  const getRegFinancials = (r: CampRegistration) => {
    const grossCost = Number(r.total_cost || 0);
    const isFreeMethod = r.payment_method === 'COUPON' || r.payment_method === 'ROLE_WAIVER' || r.payment_method === 'FREE';
    const isProcessing = r.payment_status === 'processing';

    // Discount amount: explicit discount_amount or 100% of gross if coupon/waiver
    const discount = r.discount_amount != null && Number(r.discount_amount) > 0
      ? Number(r.discount_amount)
      : (isFreeMethod ? grossCost : 0);

    // Actual received amount (only confirmed if completed / approved)
    const netReceived = (isFreeMethod || isProcessing) ? 0 : Math.max(0, grossCost - discount);
    const pendingAmount = isProcessing ? Math.max(0, grossCost - discount) : 0;

    return { grossCost, discount, netReceived, isFreeMethod, isProcessing, pendingAmount };
  };

  // Open Verification Modal
  const handleOpenVerifyModal = (reg: CampRegistration) => {
    setVerifyingReg(reg);
    const defaultTxn = reg.transaction_ref || reg.payment_id || (reg.payment_method === 'IDT' ? `IDT-${(reg.deduction_source || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}` : '');
    setVerifyTxnId(defaultTxn);
    setVerifyDate(new Date().toISOString().split('T')[0]);
    setVerifyRemarks(reg.payment_method === 'IDT' ? `IDT approved from ${reg.deduction_source || 'Dept'}` : '');
    setVerifyError(null);
  };

  // Confirm Verification & Approval
  const handleConfirmApproval = async () => {
    if (!verifyingReg?.id) return;
    if (!verifyTxnId.trim()) {
      setVerifyError('Please enter the received Transaction ID / UTR.');
      return;
    }
    if (!verifyDate) {
      setVerifyError('Please enter the date payment was received.');
      return;
    }

    setIsApproving(true);
    setVerifyError(null);

    try {
      const res = await verifyAndApproveCampRegistrationAction(verifyingReg.id, {
        transactionId: verifyTxnId.trim(),
        receivedDate: verifyDate,
        remarks: verifyRemarks.trim() || undefined
      });

      if (res.success && res.registration) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === verifyingReg.id ? res.registration! : r))
        );
        setVerifyingReg(null);
      } else {
        setVerifyError(res.error || 'Failed to approve registration');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Error occurred while approving');
    } finally {
      setIsApproving(false);
    }
  };

  // Filtered List
  const filteredRegistrations = registrations.filter((reg) => {
    if (selectedTrack !== 'all' && reg.camp_track !== selectedTrack) return false;
    if (selectedPayment !== 'all') {
      if (selectedPayment === 'PROCESSING') {
        if (reg.payment_status !== 'processing') return false;
      } else if (selectedPayment === 'REFUNDED') {
        if (!reg.is_cancelled) return false;
      } else if (selectedPayment === 'INTER_TEMPLE_TRANSFER') {
        if (reg.payment_method !== 'INTER_TEMPLE_TRANSFER' && reg.payment_method !== 'ITT') return false;
      } else if (reg.payment_method !== selectedPayment) {
        return false;
      }
    }
    return true;
  });

  // Helper to get refund details (status & amount) for a specific registration
  const getRegRefundInfo = (regId?: string) => {
    if (!regId) return { amount: 0, status: null as 'pending' | 'refunded' | 'rejected' | null };
    const match = refundRequests.find(r => {
      if (r.registration_id === regId) return true;
      if (Array.isArray(r.cancelled_registrations)) {
        return r.cancelled_registrations.some((cr: any) => cr.reg_id === regId);
      }
      return false;
    });
    if (!match) return { amount: 0, status: null };

    let amt = Number(match.refund_amount || 0);
    if (Array.isArray(match.cancelled_registrations)) {
      const item = match.cancelled_registrations.find((cr: any) => cr.reg_id === regId);
      if (item && item.refund_amount != null) amt = Number(item.refund_amount);
    }
    return { amount: amt, status: match.status };
  };

  // Helper to get officially completed refunded amount for a specific registration
  const getRegRefund = (regId?: string) => {
    const info = getRegRefundInfo(regId);
    return info.status === 'refunded' ? info.amount : 0;
  };

  // Metrics
  const totalDevotees = filteredRegistrations.length;
  const cancelledDevoteesCount = filteredRegistrations.filter((r) => r.is_cancelled).length;
  const activeDevoteesCount = Math.max(0, totalDevotees - cancelledDevoteesCount);

  const grossBilledTotal = filteredRegistrations.reduce((sum, r) => sum + getRegFinancials(r).grossCost, 0);
  const totalNetReceived = filteredRegistrations.reduce((sum, r) => sum + getRegFinancials(r).netReceived, 0);
  const totalDiscounts = filteredRegistrations.reduce((sum, r) => sum + getRegFinancials(r).discount, 0);
  const totalPendingAmount = filteredRegistrations.reduce((sum, r) => sum + getRegFinancials(r).pendingAmount, 0);

  const completedRefunds = refundRequests.filter(r => r.status === 'refunded');
  const completedRefundsCount = completedRefunds.length;
  const completedRefundAmount = completedRefunds.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);
  const netAvailableAmount = Math.max(0, totalNetReceived - completedRefundAmount);

  const pendingRefunds = refundRequests.filter(r => r.status === 'pending');
  const pendingRefundsCount = pendingRefunds.length;
  const pendingRefundAmount = pendingRefunds.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

  const rejectedRefunds = refundRequests.filter(r => r.status === 'rejected');
  const rejectedRefundsCount = rejectedRefunds.length;

  const processingCount = filteredRegistrations.filter((r) => r.payment_status === 'processing').length;
  const ittCount = filteredRegistrations.filter((r) => r.payment_method === 'INTER_TEMPLE_TRANSFER' || r.payment_method === 'ITT').length;
  const couponFreeCount = filteredRegistrations.filter((r) => r.payment_method === 'COUPON').length;
  const waiverCount = filteredRegistrations.filter((r) => r.payment_method === 'ROLE_WAIVER' || r.payment_method === 'FREE').length;
  const idtCount = filteredRegistrations.filter((r) => r.payment_method === 'IDT').length;
  const razorpayCount = filteredRegistrations.filter((r) => r.payment_method === 'RAZORPAY').length;
  const accommodationCount = filteredRegistrations.filter((r) => !r.is_cancelled && r.accommodation && r.accommodation.toLowerCase() !== 'no').length;

  const onlineReceived = filteredRegistrations
    .filter((r) => r.payment_method === 'RAZORPAY' && r.payment_status !== 'processing')
    .reduce((sum, r) => sum + getRegFinancials(r).netReceived, 0);
  const idtReceived = filteredRegistrations
    .filter((r) => r.payment_method === 'IDT' && r.payment_status !== 'processing')
    .reduce((sum, r) => sum + getRegFinancials(r).netReceived, 0);
  const ittReceived = filteredRegistrations
    .filter((r) => (r.payment_method === 'INTER_TEMPLE_TRANSFER' || r.payment_method === 'ITT') && r.payment_status === 'completed')
    .reduce((sum, r) => sum + getRegFinancials(r).netReceived, 0);

  // Pagination Calculations
  const totalFilteredCount = filteredRegistrations.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * (pageSize === -1 ? totalFilteredCount : pageSize);
  const endIndex = pageSize === -1 ? totalFilteredCount : Math.min(startIndex + pageSize, totalFilteredCount);
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, endIndex);

  // Refund Filter State & Metrics
  const [refundSearchTerm, setRefundSearchTerm] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('all');

  const filteredRefundRequests = refundRequests.filter(r => {
    if (refundStatusFilter !== 'all' && r.status !== refundStatusFilter) return false;
    if (refundSearchTerm.trim()) {
      const q = refundSearchTerm.toLowerCase();
      const matchPoc = (r.poc_name || '').toLowerCase().includes(q);
      const matchContact = (r.poc_contact || '').includes(q);
      const matchEmail = (r.email || '').toLowerCase().includes(q);
      const matchUpi = (r.upi_id || '').toLowerCase().includes(q);
      const matchBank = (r.account_number || '').includes(q);
      const matchAttendees = Array.isArray(r.cancelled_registrations) && r.cancelled_registrations.some((cr: any) => (cr.participant_name || '').toLowerCase().includes(q));
      if (!matchPoc && !matchContact && !matchEmail && !matchUpi && !matchBank && !matchAttendees) return false;
    }
    return true;
  });

  // Export to Excel (attendance role is protected from sensitive financials)
  const handleExportExcel = () => {
    if (filteredRegistrations.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const isAttendanceOnly = !userAccess.isSuperAdmin && !userAccess.canRefunds;

    const excelData = filteredRegistrations.map((reg, idx) => {
      const { grossCost, discount, netReceived, isProcessing, pendingAmount } = getRegFinancials(reg);
      const regRefund = getRegRefund(reg.id);
      const row: Record<string, any> = {
        'S.No': idx + 1,
        'Participant Name': reg.participant_name,
        'Registration Status': reg.is_cancelled ? 'Cancelled' : 'Active',
        'WhatsApp': reg.whatsapp,
        'Email': reg.email,
        'Gender': reg.gender,
        'Age': reg.age ?? '',
        'Married Since (Year)': reg.married_since_year ?? '',
        'Camp Track': reg.camp_track,
        'Participant Type': reg.participant_type,
        'VOICE Name': reg.voice_name ?? '',
        'Parent Temple': reg.parent_temple ?? '',
        'Counselor Name': reg.counselor_name ?? '',
        'POC Name': reg.poc_name,
        'POC Contact': reg.poc_contact,
        'First Meal': `${reg.first_meal_date} - ${reg.first_meal_type}`,
        'Last Meal': `${reg.last_meal_date} - ${reg.last_meal_type}`,
        'Dinner Type': reg.dinner_type ?? 'Dinner Meal',
        'Accommodation': reg.accommodation,
      };

      // Only Super Admins and Full Coordinators see financial rupee totals
      if (!isAttendanceOnly) {
        row['Meals Cost (₹)'] = reg.meal_cost;
        row['Stay Cost (₹)'] = reg.acc_cost;
        row['AC Charges (₹)'] = reg.ac_cost;
        row['Base / Material Fee (₹)'] = (reg as any).base_cost ?? 0;
        row['Late Fee (₹)'] = reg.late_fee;
        row['Gross Calculated Fee (₹)'] = grossCost;
        row['Discount / Waived (₹)'] = discount;
        row['Net Actual Received (₹)'] = netReceived;
        row['Refunded Amount (₹)'] = regRefund;
        row['Net Available Retained (₹)'] = Math.max(0, netReceived - regRefund);
        row['Pending Amount (₹)'] = pendingAmount;
      }

      row['Payment Method'] = reg.payment_method;
      row['Payment Status'] = reg.payment_status || 'completed';
      row['Payment ID / Ref'] = reg.payment_id ?? '';
      row['Transaction UTR'] = reg.transaction_ref ?? '';
      row['Payment Date'] = formatDisplayDate(reg.payment_date);
      row['Registered At'] = reg.created_at ? new Date(reg.created_at).toLocaleString('en-IN') : '';

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const columnWidths = Object.keys(excelData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14)
    }));
    worksheet['!cols'] = columnWidths;

    const campSlug = camp?.slug || 'camp';
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${campSlug}_registrations_${dateStr}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#fafcff] p-3 sm:p-6 lg:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-3.5 sm:space-y-6">
        
        {/* Header: Compact on Mobile */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-200/80">
          <div>
            <Link
              href={userAccess.isSuperAdmin ? "/dashboard/admin/camps" : "/dashboard/camp?tab=staff"}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 hover:text-amber-600 mb-1 transition-colors font-semibold"
            >
              <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {userAccess.isSuperAdmin ? 'Back to Camps' : 'Back to Camp Staff Duty'}
            </Link>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-3">
              <span>{camp?.title || 'Camp Attendees'}</span>
              <span className={`text-[9px] sm:text-[11px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider ${
                camp?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {camp?.status || 'Active'}
              </span>
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Complete attendee ledger, Inter-Temple Transfer verification, fee contributions, and Excel (.xlsx) export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
            <button
              onClick={loadData}
              className="p-2 sm:p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl sm:rounded-2xl hover:bg-slate-50 transition-all shadow-xs cursor-pointer shrink-0"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {(userAccess.isSuperAdmin || userAccess.canScan) && (
              <button
                onClick={() => setIsQrScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                title="Scan Attendee Pass QR Code for Gate Entry & Meal Punch"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>Scan Pass</span>
              </button>
            )}
            {(userAccess.isSuperAdmin || userAccess.canAttendance) && (
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Export Excel</span>
                <span className="hidden sm:inline">(.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher: Registrations Ledger vs Refund Requests vs Prasadam Logs (Filtered by assigned role) */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200/90 pb-2 overflow-x-auto no-scrollbar">
          {(userAccess.isSuperAdmin || userAccess.canAttendance || userAccess.canPaymentApprovals) && (
            <button
              type="button"
              onClick={() => setActiveView('registrations')}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'registrations'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                {userAccess.canAttendance 
                  ? `Attendee Ledger (${registrations.length})` 
                  : `IDT & ITT Payment Approvals (${registrations.filter(r => r.payment_status === 'processing').length})`}
              </span>
            </button>
          )}

          {(userAccess.isSuperAdmin || userAccess.canRefunds) && (
            <button
              type="button"
              onClick={() => setActiveView('refunds')}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${
                activeView === 'refunds'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Refund Requests ({refundRequests.length})</span>
              {pendingRefundsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-black animate-pulse">
                  {pendingRefundsCount}
                </span>
              )}
            </button>
          )}

          {(userAccess.isSuperAdmin || userAccess.canPrasadam) && (
            <button
              type="button"
              onClick={() => setActiveView('prasadam')}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'prasadam'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Prasadam Logs &amp; Kitchen Tally</span>
            </button>
          )}
        </div>

        {/* VIEW 1: ATTENDEE REGISTRATIONS LEDGER */}
        {activeView === 'registrations' && (userAccess.isSuperAdmin || userAccess.canAttendance) && (
          <>
            {/* Metrics Row: Role-aware data viewing protection */}
            {!userAccess.canRefunds && !userAccess.isSuperAdmin ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Attendees</span>
                  <span className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 block">{totalDevotees}</span>
                  <span className="text-[9px] sm:text-[11px] text-slate-500 font-medium truncate block">
                    {activeDevoteesCount} Active • {cancelledDevoteesCount} Cancelled
                  </span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Active Devotees</span>
                  <span className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">{activeDevoteesCount}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 truncate block">Confirmed &amp; Attending</span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Accommodation</span>
                  <span className="text-lg sm:text-2xl font-black text-blue-600 mt-0.5 sm:mt-1 block">{accommodationCount}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 block truncate">CV Stay / Room Required</span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Inter-Temple ITT</span>
                  <span className="text-lg sm:text-2xl font-black text-indigo-600 mt-0.5 sm:mt-1 block">{ittCount}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 block truncate">Temple Transfer Entries</span>
                </div>

                <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs ${
                  processingCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200/80'
                }`}>
                  <span className="text-[9px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Pending Verify</span>
                    {processingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-amber-700 mt-0.5 sm:mt-1 block">{processingCount}</span>
                  <span className="text-[8px] sm:text-[10px] text-amber-800 font-semibold block truncate">Awaiting UTR Check</span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Cancelled Passes</span>
                  <span className="text-lg sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1 block">{cancelledDevoteesCount}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 block truncate">Withdrawn from camp</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Attendees</span>
                  <span className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 block">{totalDevotees}</span>
                  <span className="text-[9px] sm:text-[11px] text-slate-500 font-medium truncate block">
                    {activeDevoteesCount} Active • {cancelledDevoteesCount} Cancelled
                  </span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Gross Received</span>
                  <span className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block truncate">
                    ₹{totalNetReceived.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 truncate block">
                    UPI: ₹{onlineReceived} • IDT: ₹{idtReceived}
                  </span>
                </div>

                <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs ${
                  completedRefundAmount > 0 ? 'bg-purple-50/70 border-purple-200' : 'bg-white border-slate-200/80'
                }`}>
                  <span className="text-[9px] sm:text-[11px] font-bold text-purple-800 uppercase tracking-wider block">Refunded Given</span>
                  <span className="text-lg sm:text-2xl font-black text-purple-700 mt-0.5 sm:mt-1 block truncate">
                    ₹{completedRefundAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-purple-900 font-medium block truncate">
                    {completedRefundsCount} Payout(s) sent
                  </span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 border sm:border-2 border-emerald-400/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Net Available</span>
                  <span className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5 sm:mt-1 block truncate">
                    ₹{netAvailableAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-emerald-800 font-semibold block truncate">
                    Gross - Refunded
                  </span>
                </div>

                <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs ${
                  processingCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200/80'
                }`}>
                  <span className="text-[9px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Pending Verify</span>
                    {processingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-amber-700 mt-0.5 sm:mt-1 block truncate">
                    ₹{totalPendingAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-amber-800 font-semibold block truncate">
                    {processingCount} Transfer(s) pending
                  </span>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] sm:text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Discounts</span>
                  <span className="text-lg sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1 block truncate">
                    ₹{totalDiscounts.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 block truncate">
                    {couponFreeCount} Coupon • {waiverCount} Waiver
                  </span>
                </div>
              </div>
            )}

        {/* Filters & Search Bar: Compact on Mobile */}
        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-2 sm:gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search devotee name, phone, email, counselor, temple..."
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400 shadow-2xs hover:border-amber-400"
            />
          </form>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all"
            >
              <option value="all">All Tracks</option>
              {camp?.tracks?.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all"
            >
              <option value="all">All Payment &amp; Statuses</option>
              <option value="PROCESSING">⏳ Pending Verification ({processingCount})</option>
              <option value="REFUNDED">💸 Refunded / Cancelled ({cancelledDevoteesCount})</option>
              <option value="INTER_TEMPLE_TRANSFER">🏛️ Inter-Temple Transfer (ITT)</option>
              <option value="RAZORPAY">Razorpay / UPI</option>
              <option value="IDT">IDT Transfer (ISKCON NVCC)</option>
              <option value="COUPON">Promo / Coupon Code</option>
              <option value="ROLE_WAIVER">Complimentary Role Waiver</option>
            </select>
          </div>
        </div>

        {/* Table View: Clean, Uniform Row Heights */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
            <Loader2 className="w-7 h-7 text-amber-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading attendee records...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">No Registrations Found</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              {searchTerm || selectedTrack !== 'all' || selectedPayment !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'No attendees have registered for this camp yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider">Participant</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-xs uppercase tracking-wider">Contact</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-xs uppercase tracking-wider">Temple &amp; VOICE</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-xs uppercase tracking-wider">Counselor</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-xs uppercase tracking-wider">Camp Track</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-xs uppercase tracking-wider">Itinerary</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-xs uppercase tracking-wider text-center">Acc.</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap">Payment</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider text-right whitespace-nowrap">Fee &amp; Status (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRegistrations.map((reg) => {
                    const { grossCost, discount, netReceived, isFreeMethod, isProcessing, pendingAmount } = getRegFinancials(reg);
                    const isItt = reg.payment_method === 'INTER_TEMPLE_TRANSFER' || reg.payment_method === 'ITT';
                    const couponLabel = reg.coupon_code || (reg.deduction_source && reg.deduction_source.includes('Coupon:') ? reg.deduction_source.replace('Coupon:', '').trim() : '');
                    const regRefundInfo = getRegRefundInfo(reg.id);
                    const isRefunded = reg.is_cancelled && regRefundInfo.status === 'refunded';
                    const isRefundPending = reg.is_cancelled && regRefundInfo.status === 'pending';
                    const isCancelledNoRefund = reg.is_cancelled && (!regRefundInfo.status || regRefundInfo.status === 'rejected');

                    const rowHighlightClass = isRefunded
                      ? 'bg-purple-50/40 hover:bg-purple-50/70 border-l-4 border-l-purple-500'
                      : isRefundPending
                      ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                      : isCancelledNoRefund
                      ? 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-l-rose-500'
                      : isProcessing
                      ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                      : 'bg-white hover:bg-slate-50/70 border-l-4 border-l-emerald-500/40';

                    return (
                      <tr key={reg.id} className={`${rowHighlightClass} transition-colors`}>
                        {/* Participant */}
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{reg.participant_name}</span>
                            <button
                              type="button"
                              onClick={() => setViewPassReg({
                                ...reg,
                                camp_title: camp?.title,
                                camp_venue: camp?.venue,
                                camp_start_date: camp?.start_date,
                                camp_end_date: camp?.end_date,
                                camp_meal_pricing: camp?.meal_pricing
                              })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-bold transition-colors cursor-pointer shadow-2xs"
                              title="View & Print Prasadam Pass with Meal Matrix and QR Code"
                            >
                              <Ticket className="w-2.5 h-2.5 text-amber-700" />
                              <span>Pass &amp; QR</span>
                            </button>
                            {reg.is_cancelled && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${
                                  isRefunded
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                    : isRefundPending
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}
                              >
                                {isRefunded ? (
                                  <>
                                    <Undo2 className="w-2.5 h-2.5" />
                                    <span>Refunded</span>
                                  </>
                                ) : isRefundPending ? (
                                  <>
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Refund Pending</span>
                                  </>
                                ) : regRefundInfo.status === 'rejected' ? (
                                  <span>Refund Rejected</span>
                                ) : (
                                  <span>Cancelled</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400">
                            {reg.gender} {reg.age ? `• ${reg.age} yrs` : ''}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-2.5 px-2.5 sm:py-3 sm:px-3">
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{reg.whatsapp}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[140px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span title={reg.email}>{reg.email}</span>
                          </div>
                        </td>

                        {/* Temple & VOICE */}
                        <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-slate-700">
                          <div className="font-semibold text-slate-900">{reg.voice_name || '—'}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400">{reg.parent_temple || '—'}</div>
                        </td>

                        {/* Counselor */}
                        <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-slate-700">
                          <div className="font-semibold text-slate-900">{reg.counselor_name || '—'}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400">POC: {reg.poc_name}</div>
                        </td>

                        {/* Camp Track */}
                        <td className="py-2.5 px-2.5 sm:py-3 sm:px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
                            {reg.camp_track}
                          </span>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{reg.participant_type}</div>
                        </td>

                        {/* Meal Span */}
                        <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-[10px] sm:text-[11px] text-slate-600 whitespace-nowrap">
                          <div>Arr: {reg.first_meal_date} ({reg.first_meal_type})</div>
                          <div>Dep: {reg.last_meal_date} ({reg.last_meal_type})</div>
                        </td>

                        {/* Accommodation */}
                        <td className="py-2.5 px-2.5 sm:py-3 sm:px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${
                              reg.accommodation === 'Yes'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {reg.accommodation}
                          </span>
                        </td>

                        {/* Payment & Proof */}
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wide whitespace-nowrap ${
                                isItt
                                  ? 'bg-teal-50 text-teal-800 border border-teal-300'
                                  : reg.payment_method === 'RAZORPAY'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : reg.payment_method === 'COUPON'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : reg.payment_method === 'ROLE_WAIVER'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isItt && <Landmark className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                              {reg.payment_method === 'RAZORPAY' && <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              {reg.payment_method === 'IDT' && <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                              <span>{isItt ? 'Inter-Temple' : reg.payment_method}</span>
                            </span>

                            {isItt || reg.payment_method === 'IDT' ? (
                              isProcessing ? (
                                (userAccess.isSuperAdmin || userAccess.canPaymentApprovals) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVerifyModal(reg)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                                    title="Click to cross-verify & approve"
                                  >
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>Verify &amp; Approve</span>
                                  </button>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]"
                                    title="Pending verification by Payment Approval desk"
                                  >
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Pending Approval</span>
                                  </span>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewDetailsReg(reg)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer shadow-2xs ${
                                    reg.payment_method === 'IDT'
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                      : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                                  }`}
                                  title="Click to view transfer verification details"
                                >
                                  <Eye className={`w-3 h-3 ${reg.payment_method === 'IDT' ? 'text-amber-700' : 'text-teal-700'}`} />
                                  <span>View Details</span>
                                </button>
                              )
                            ) : couponLabel ? (
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                                🎟️ {couponLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Fee & Status: Prominent highlighted box per status for instant visibility */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isProcessing ? (
                            <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300/80 shadow-2xs">
                              <span className="text-xs font-black text-amber-950">
                                ₹{pendingAmount.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pending Approval
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                                Fee: ₹{grossCost.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : reg.is_cancelled ? (
                            isRefunded ? (
                              <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-purple-100/70 border-2 border-purple-300 shadow-2xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-slate-400 line-through">
                                    ₹{netReceived.toLocaleString('en-IN')}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider">
                                    <Undo2 className="w-2.5 h-2.5" /> Refunded: ₹{regRefundInfo.amount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="text-[11px] font-black text-emerald-700 mt-1 flex items-center gap-1">
                                  <span className="text-[10px] font-semibold text-slate-500">Net Retained:</span>
                                  <span>₹{Math.max(0, netReceived - regRefundInfo.amount).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            ) : isRefundPending ? (
                              <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  ₹{netReceived.toLocaleString('en-IN')}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider mt-0.5">
                                  <Clock className="w-2.5 h-2.5" /> Refund Pending: ₹{regRefundInfo.amount.toLocaleString('en-IN')}
                                </span>
                                <div className="text-[10px] font-bold text-amber-800 mt-0.5">
                                  Awaiting Transfer
                                </div>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  ₹{netReceived.toLocaleString('en-IN')}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider mt-0.5">
                                  {regRefundInfo.status === 'rejected' ? 'Refund Rejected' : 'Cancelled (No Refund)'}
                                </span>
                                <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                                  Retained: ₹{netReceived.toLocaleString('en-IN')}
                                </div>
                              </div>
                            )
                          ) : isFreeMethod ? (
                            <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-slate-100 border-2 border-slate-300 shadow-2xs">
                              <span className="text-xs font-black text-slate-800">
                                ₹0 Received
                              </span>
                              <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                                -₹{discount.toLocaleString('en-IN')} (Waived)
                              </span>
                            </div>
                          ) : discount > 0 ? (
                            <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-teal-50 border-2 border-teal-300 shadow-2xs">
                              <span className="text-xs font-black text-teal-950">
                                ₹{netReceived.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-teal-800 font-bold mt-0.5">
                                -₹{discount.toLocaleString('en-IN')} Discount
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-end px-3 py-1.5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 shadow-2xs">
                              <span className="text-xs font-black text-emerald-900">
                                ₹{netReceived.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Received in Full
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar (10 - 20 - 50 - 100 - All) */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong className="text-slate-900">{totalFilteredCount === 0 ? 0 : startIndex + 1}</strong> to{' '}
                  <strong className="text-slate-900">{endIndex}</strong> of{' '}
                  <strong className="text-slate-900">{totalFilteredCount}</strong> devotees
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px]">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold shadow-2xs outline-none cursor-pointer hover:border-amber-400 focus:border-amber-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>All</option>
                  </select>
                </div>
              </div>

              {/* Page Navigator */}
              {totalPages > 1 && pageSize !== -1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-slate-400">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                safeCurrentPage === p
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )}

    {/* VIEW 2: REFUND REQUESTS: Compact on Mobile */}
    {activeView === 'refunds' && (userAccess.isSuperAdmin || userAccess.canRefunds) && (
      <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-200">
        {/* Refund Metrics: Compact on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Refund Requests
            </span>
            <span className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 block">
              {refundRequests.length}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">
              {completedRefundsCount} Transferred • {pendingRefundsCount} Pending
            </span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/50 border border-amber-200/80 shadow-xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Pending Payout</span>
            </span>
            <span className="text-lg sm:text-2xl font-black text-amber-700 mt-0.5 sm:mt-1 block">
              ₹{pendingRefundAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-800 font-semibold block truncate">
              {pendingRefundsCount} Devotee(s) awaiting
            </span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/50 border border-emerald-200/80 shadow-xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
              <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Refunded / Paid</span>
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5 sm:mt-1 block">
              ₹{completedRefundAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-800 font-semibold block truncate">
              {completedRefundsCount} Payout(s) transferred
            </span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <Banknote className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Policy Calculation</span>
            </span>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2 sm:line-clamp-none">
              Computed on base fee, meals &amp; accommodation. Gateway fees (2%) are non-refundable.
            </p>
          </div>
        </div>

        {/* Search & Status Filter: Compact on Mobile */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={refundSearchTerm}
              onChange={(e) => setRefundSearchTerm(e.target.value)}
              placeholder="Search refunds by devotee name, phone, email, or UPI..."
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400 shadow-2xs hover:border-amber-400"
            />
          </div>

          <select
            value={refundStatusFilter}
            onChange={(e) => setRefundStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all w-full sm:w-auto"
          >
            <option value="all">All Statuses ({refundRequests.length})</option>
            <option value="pending">⏳ Pending Payout ({pendingRefundsCount})</option>
            <option value="refunded">✅ Money Transferred ({completedRefundsCount})</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>

        {/* Refunds Table: Compact on Mobile */}
        {filteredRefundRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            <Undo2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">No Refund Requests</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {refundSearchTerm || refundStatusFilter !== 'all'
                ? 'No requests match your search criteria.'
                : 'No devotees have requested cancellations or refunds for this camp retreat.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[9px] sm:text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-4">Devotee / POC</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-3">Cancellation Details</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-3">Reason</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-3">Payout Target</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-4 text-right">Refund Due (₹)</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-4 text-center">Status</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRefundRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isRefunded = req.status === 'refunded';
                    const isRejected = req.status === 'rejected';

                    const attendeeCount = Array.isArray(req.cancelled_registrations) ? req.cancelled_registrations.length : 1;
                    const attendeeNames = Array.isArray(req.cancelled_registrations)
                      ? req.cancelled_registrations.map((cr: any) => cr.participant_name).join(', ')
                      : req.poc_name;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Devotee / POC */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-4">
                          <div className="font-bold text-slate-900">{req.poc_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{req.poc_contact}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {req.email}
                          </div>
                        </td>

                        {/* Cancellation Details */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[10px] sm:text-[11px] font-bold whitespace-nowrap mb-0.5">
                            {req.cancellation_type === 'PARTIAL_ATTENDEES'
                              ? `${attendeeCount} Batch Devotee(s)`
                              : req.cancellation_type === 'PARTIAL_DAYS'
                              ? 'Modified Days / Itinerary'
                              : 'Full Cancellation'}
                          </span>
                          <div className="text-[11px] text-slate-600 font-medium line-clamp-2 max-w-[200px]" title={attendeeNames}>
                            {attendeeNames}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3">
                          <div className="text-[11px] text-slate-700 italic max-w-[180px] truncate" title={req.reason || 'No reason provided'}>
                            {req.reason || '—'}
                          </div>
                          {isRejected && (
                            <div className="text-[10px] text-rose-700 font-semibold mt-1 flex items-center gap-1" title={req.admin_notes || 'No remark given'}>
                              <AlertCircle className="w-3 h-3 shrink-0 text-rose-500" />
                              <span className="truncate max-w-[170px]">Remark: {req.admin_notes || 'None'}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : ''}
                          </div>
                        </td>

                        {/* Payout Target */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3">
                          {req.payout_type === 'UPI' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  UPI
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-900">{req.upi_id}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.upi_id || '');
                                    alert('Copied UPI ID: ' + req.upi_id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                                  title="Copy UPI ID"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                  Bank
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-900">{req.account_number}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.account_number || '');
                                    alert('Copied Account Number: ' + req.account_number);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-700 cursor-pointer"
                                  title="Copy Account Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                IFSC: <span className="font-mono font-bold text-slate-700">{req.ifsc_code}</span> • {req.account_name}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Refund Amount */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-4 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-amber-700 block">
                            ₹{Number(req.refund_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Orig: ₹{Number(req.original_total_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>Pending Payout</span>
                            </span>
                          ) : isRefunded ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Money Transferred</span>
                              </span>
                              {req.payout_date && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {formatDisplayDate(req.payout_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 font-bold text-[10px]">
                              <X className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-4 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPayoutModal(req, 'refund')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                                title="Record bank/UPI payout"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Record Payout</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPayoutModal(req, 'reject')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-all cursor-pointer"
                                title="Reject refund request"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : isRefunded ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewRefundReceipt(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>View Receipt</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewRefundReceipt(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>View Details</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReopenRefund(req)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] transition-colors cursor-pointer"
                                title="Reopen back to pending"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Reopen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPayoutModal(req, 'refund')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-all cursor-pointer"
                                title="Pay refund now"
                              >
                                <Banknote className="w-3 h-3" />
                                <span>Pay Out</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )}

    {/* VIEW 3: PRASADAM LOGS & KITCHEN TALLY */}
    {activeView === 'prasadam' && (userAccess.isSuperAdmin || userAccess.canPrasadam) && (
      <CampPrasadamTab
        campId={campId}
        camp={camp}
        onOpenScanner={() => setIsQrScannerOpen(true)}
        onViewPass={(regId) => {
          const found = registrations.find(r => r.id === regId);
          if (found) setViewPassReg(found);
        }}
      />
    )}
  </div>

  {/* RECORD REFUND PAYOUT MODAL */}
  {payoutModal.isOpen && payoutModal.refund && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {payoutModal.actionType === 'refund' ? 'Record Devotee Refund Payout' : 'Reject Refund Request'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Confirm payout transfer details for complete transparency
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPayoutModal(prev => ({ ...prev, isOpen: false }))}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {payoutModal.error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{payoutModal.error}</span>
          </div>
        )}

        {/* Devotee & Payout Summary Card */}
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Devotee (POC):</span>
            <span className="font-bold text-slate-900">{payoutModal.refund.poc_name} ({payoutModal.refund.poc_contact})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Calculated Refund Amount:</span>
            <span className="text-base font-black text-emerald-700">₹{Number(payoutModal.refund.refund_amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-2 border-t border-amber-200/60 flex items-start justify-between">
            <span className="text-slate-600">Transfer Target:</span>
            <div className="text-right">
              {payoutModal.refund.payout_type === 'UPI' ? (
                <span className="font-mono font-bold text-slate-900">{payoutModal.refund.upi_id}</span>
              ) : (
                <div>
                  <div className="font-mono font-bold text-slate-900">{payoutModal.refund.account_number}</div>
                  <div className="text-[10px] text-slate-500">IFSC: {payoutModal.refund.ifsc_code} • {payoutModal.refund.account_name}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleProcessPayout} className="space-y-4">
          {payoutModal.actionType === 'refund' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank Transaction ID / UTR *
                </label>
                <input
                  type="text"
                  required
                  value={payoutModal.txnRef}
                  onChange={(e) => setPayoutModal({ ...payoutModal, txnRef: e.target.value })}
                  placeholder="e.g. UPI/1234567890 or NEFT..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Transfer Date *
                </label>
                <input
                  type="date"
                  required
                  value={payoutModal.payoutDate}
                  onChange={(e) => setPayoutModal({ ...payoutModal, payoutDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {payoutModal.actionType === 'refund' ? 'Admin Notes / Remarks (Optional)' : 'Rejection Reason / Remarks (Required) *'}
            </label>
            <textarea
              rows={2}
              required={payoutModal.actionType === 'reject'}
              value={payoutModal.notes}
              onChange={(e) => setPayoutModal({ ...payoutModal, notes: e.target.value })}
              placeholder={payoutModal.actionType === 'refund' ? 'e.g. Transferred via HDFC Current Account...' : 'e.g. Devotee requested withdrawal, wrong bank details, duplicate, etc.'}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPayoutModal(prev => ({
                ...prev,
                actionType: prev.actionType === 'refund' ? 'reject' : 'refund'
              }))}
              className="text-xs font-semibold text-slate-500 hover:text-amber-700 transition-colors cursor-pointer"
            >
              {payoutModal.actionType === 'refund' ? 'Switch to Reject Mode' : 'Switch to Payout Mode'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPayoutModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={payoutModal.saving}
                className={`px-5 py-2 rounded-full text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  payoutModal.actionType === 'refund'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {payoutModal.saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{payoutModal.actionType === 'refund' ? 'Confirm & Mark as Refunded' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* VIEW REFUND RECEIPT / DETAILS AUDIT MODAL */}
  {viewRefundReceipt && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              viewRefundReceipt.status === 'refunded'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {viewRefundReceipt.status === 'refunded' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {viewRefundReceipt.status === 'refunded' ? 'Refund Payout Receipt' : 'Refund Request Details (Rejected)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {viewRefundReceipt.status === 'refunded' ? 'Verified payout record & audit trail' : 'Rejection details & admin remarks'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewRefundReceipt(null)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {viewRefundReceipt.status === 'refunded' ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 font-bold block uppercase tracking-wider">Refund Amount Transferred</span>
                <span className="text-xl font-black text-emerald-700 block mt-0.5">₹{Number(viewRefundReceipt.refund_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                Transferred
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-rose-800 font-bold block uppercase tracking-wider">Refund Status: Rejected</span>
                <span className="text-xl font-black text-rose-700 block mt-0.5">₹{Number(viewRefundReceipt.refund_amount || 0).toLocaleString('en-IN')} Due</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-300">
                Rejected
              </span>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Devotee (POC):</span>
              <span className="font-bold text-slate-900">{viewRefundReceipt.poc_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Contact / WhatsApp:</span>
              <span className="font-bold text-slate-900">{viewRefundReceipt.poc_contact}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payout Target:</span>
              <span className="font-mono font-bold text-slate-800">
                {viewRefundReceipt.payout_type === 'UPI' ? viewRefundReceipt.upi_id : `${viewRefundReceipt.account_number} (${viewRefundReceipt.ifsc_code})`}
              </span>
            </div>
            {viewRefundReceipt.status === 'refunded' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bank UTR / Transaction Ref:</span>
                  <span className="font-mono font-bold text-slate-900">{viewRefundReceipt.payout_txn_ref || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payout Date:</span>
                  <span className="font-bold text-slate-900">{formatDisplayDate(viewRefundReceipt.payout_date)}</span>
                </div>
              </>
            )}
            {viewRefundReceipt.processed_by && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Processed By:</span>
                <span className="font-mono text-[11px] text-slate-700">{viewRefundReceipt.processed_by}</span>
              </div>
            )}
            {viewRefundReceipt.status === 'rejected' && (
              <div className="pt-2 border-t border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-500 block mb-1">Admin Rejection Remarks:</span>
                <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 font-semibold text-rose-800 text-xs">
                  {viewRefundReceipt.admin_notes || 'No remarks provided.'}
                </p>
              </div>
            )}
            {viewRefundReceipt.status === 'refunded' && viewRefundReceipt.admin_notes && (
              <div className="pt-2 border-t border-slate-200/60 text-slate-600 italic">
                &ldquo;{viewRefundReceipt.admin_notes}&rdquo;
              </div>
            )}
          </div>

          {/* If rejected, allow one-click action inside modal */}
          {viewRefundReceipt.status === 'rejected' && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = viewRefundReceipt;
                  setViewRefundReceipt(null);
                  handleReopenRefund(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen as Pending</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewRefundReceipt;
                  setViewRefundReceipt(null);
                  handleOpenPayoutModal(target, 'refund');
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Record Payout Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

      {/* ITT / IDT VIEW DETAILS MODAL */}
      {viewDetailsReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  viewDetailsReg.payment_method === 'IDT' ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'
                }`}>
                  {viewDetailsReg.payment_method === 'IDT' ? <ShieldCheck className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {viewDetailsReg.payment_method === 'IDT' ? 'Inter-Department Transfer Details' : 'Inter-Temple Transfer Details'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {viewDetailsReg.payment_method === 'IDT' ? 'Verified department deduction audit record' : 'Verified bank payment & receipt records'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailsReg(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Devotee Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Devotee Name:</span>
                <span className="font-bold text-slate-900">{viewDetailsReg.participant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">WhatsApp / Email:</span>
                <span className="font-medium text-slate-800">{viewDetailsReg.whatsapp} • {viewDetailsReg.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">
                  {viewDetailsReg.payment_method === 'IDT' ? 'Deduction VOICE / Dept:' : 'Transferring Temple / Center:'}
                </span>
                <span className={`font-bold ${viewDetailsReg.payment_method === 'IDT' ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {viewDetailsReg.deduction_source || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Camp Track:</span>
                <span className="font-medium text-slate-800">{viewDetailsReg.camp_track}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-sm">
                <span className="text-slate-700">Total Contribution:</span>
                <span className={viewDetailsReg.payment_method === 'IDT' ? 'text-amber-600' : 'text-emerald-700'}>
                  ₹{viewDetailsReg.total_cost}
                </span>
              </div>
            </div>

            {/* Verification Audit */}
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              viewDetailsReg.payment_method === 'IDT' ? 'bg-amber-50/50 border-amber-200/80' : 'bg-teal-50/50 border-teal-200/80'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                <span className={`font-bold uppercase tracking-wider text-[11px] ${
                  viewDetailsReg.payment_method === 'IDT' ? 'text-amber-950' : 'text-teal-950'
                }`}>
                  {viewDetailsReg.payment_method === 'IDT' ? 'IDT Settlement Record' : 'Bank Verification Record'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-600">
                  {viewDetailsReg.payment_method === 'IDT' ? 'IDT Settlement Code:' : 'Verified Transaction ID / UTR:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-slate-900 text-sm select-all">
                    {viewDetailsReg.payment_id || viewDetailsReg.transaction_ref || '—'}
                  </span>
                  {(viewDetailsReg.payment_id || viewDetailsReg.transaction_ref) && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(viewDetailsReg.payment_id || viewDetailsReg.transaction_ref || '');
                        setCopiedUtr(true);
                        setTimeout(() => setCopiedUtr(false), 2000);
                      }}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copy UTR"
                    >
                      {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {viewDetailsReg.transaction_ref && viewDetailsReg.payment_id !== viewDetailsReg.transaction_ref && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Devotee-Submitted UTR:</span>
                  <span className="font-mono font-semibold">{viewDetailsReg.transaction_ref}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Payment Received Date:</span>
                <span className="font-semibold text-slate-800">{formatDisplayDate(viewDetailsReg.payment_date) || '—'}</span>
              </div>

              {viewDetailsReg.verified_at && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Verified On:</span>
                  <span className="text-slate-700">{new Date(viewDetailsReg.verified_at).toLocaleString('en-IN')}</span>
                </div>
              )}

              {viewDetailsReg.verified_by && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Approved By:</span>
                  <span className="text-slate-700">{viewDetailsReg.verified_by}</span>
                </div>
              )}
            </div>

            {/* Devotee Screenshot Proof */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-700">Uploaded Receipt Proof</span>
                {viewDetailsReg.payment_screenshot_url && (
                  <button
                    type="button"
                    onClick={() => setPreviewScreenshotUrl(viewDetailsReg.payment_screenshot_url || null)}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" /> Full View
                  </button>
                )}
              </div>

              {viewDetailsReg.payment_screenshot_url ? (
                <div
                  onClick={() => setPreviewScreenshotUrl(viewDetailsReg.payment_screenshot_url || null)}
                  className="border border-slate-200 rounded-2xl p-2 bg-slate-50 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <img
                    src={viewDetailsReg.payment_screenshot_url}
                    alt="Receipt Screenshot Proof"
                    referrerPolicy="no-referrer"
                    className="max-h-52 mx-auto rounded-xl object-contain shadow-xs border border-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Click to view full screen</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  No screenshot proof attached.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewDetailsReg(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY & APPROVE ITT / IDT MODAL */}
      {verifyingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  verifyingReg.payment_method === 'IDT' ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'
                }`}>
                  {verifyingReg.payment_method === 'IDT' ? <ShieldCheck className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {verifyingReg.payment_method === 'IDT' ? 'Verify Inter-Department Transfer (IDT)' : 'Verify Inter-Temple Transfer (ITT)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {verifyingReg.payment_method === 'IDT' ? 'Verify VOICE department deduction & approve registration' : 'Cross-verify bank receipt & confirm registration'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingReg(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {verifyError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Devotee & Transfer Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Participant Name:</span>
                <span className="font-bold text-slate-900">{verifyingReg.participant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">
                  {verifyingReg.payment_method === 'IDT' ? 'Deduction VOICE / Dept:' : 'Transferring Temple / Center:'}
                </span>
                <span className={`font-bold ${verifyingReg.payment_method === 'IDT' ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {verifyingReg.deduction_source || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Camp Track:</span>
                <span className="font-medium text-slate-800">{verifyingReg.camp_track}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-sm">
                <span className="text-slate-700">Amount Due to Verify:</span>
                <span className={verifyingReg.payment_method === 'IDT' ? 'text-amber-600' : 'text-emerald-700'}>
                  ₹{verifyingReg.total_cost}
                </span>
              </div>
            </div>

            {/* Screenshot Proof Preview (if present) */}
            {verifyingReg.payment_screenshot_url && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Devotee Uploaded Receipt Proof</span>
                  <a
                    href={verifyingReg.payment_screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 font-semibold"
                  >
                    Open Original <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50 text-center">
                  <img
                    src={verifyingReg.payment_screenshot_url}
                    alt="Receipt Screenshot Proof"
                    referrerPolicy="no-referrer"
                    className="max-h-48 mx-auto rounded-xl object-contain shadow-xs border border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Devotee Provided Ref */}
            {verifyingReg.transaction_ref && (
              <div className={`p-2.5 rounded-xl border text-xs ${
                verifyingReg.payment_method === 'IDT' ? 'bg-amber-50/60 border-amber-200' : 'bg-teal-50/60 border-teal-200'
              }`}>
                <span className={`text-[10px] uppercase font-bold block ${
                  verifyingReg.payment_method === 'IDT' ? 'text-amber-800' : 'text-teal-800'
                }`}>
                  {verifyingReg.payment_method === 'IDT' ? 'Devotee / Center IDT Reference' : 'Devotee Provided UTR / Reference'}
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs">{verifyingReg.transaction_ref}</span>
              </div>
            )}

            {/* Admin Verification Inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {verifyingReg.payment_method === 'IDT' ? 'IDT Settlement / Voucher Reference ID *' : 'Bank Transaction ID / UTR *'}
                </label>
                <input
                  type="text"
                  required
                  value={verifyTxnId}
                  onChange={(e) => setVerifyTxnId(e.target.value)}
                  placeholder={verifyingReg.payment_method === 'IDT' ? 'e.g. IDT-BAGESHREE-20261028 or Passcode' : 'e.g. 412389123456 or Bank UTR'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment / Settlement Date *
                </label>
                <input
                  type="date"
                  required
                  value={verifyDate}
                  onChange={(e) => setVerifyDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Admin Verification Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={verifyRemarks}
                  onChange={(e) => setVerifyRemarks(e.target.value)}
                  placeholder={verifyingReg.payment_method === 'IDT' ? 'e.g. Verified with Central VOICE ledger, passed' : 'e.g. Verified with SBI Statement, passed'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyingReg(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApproving}
                onClick={handleConfirmApproval}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-center ${
                  verifyingReg.payment_method === 'IDT'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                }`}
              >
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>
                  {verifyingReg.payment_method === 'IDT' ? 'Confirm & Approve IDT Transfer' : 'Confirm & Approve Payment Received'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREENSHOT MODAL */}
      {previewScreenshotUrl && (
        <div
          onClick={() => setPreviewScreenshotUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full p-4 shadow-2xl space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                Payment Proof Screenshot
              </span>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-2xl p-2">
              <img
                src={previewScreenshotUrl}
                alt="Full Payment Proof"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] object-contain rounded-xl shadow-xs"
              />
            </div>
            <div className="flex justify-end pt-1">
              <a
                href={previewScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Open in Full Window <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PRASADAM & DELEGATE PASS MODAL */}
      {viewPassReg && (
        <CampPrasadamCard
          registration={viewPassReg}
          onClose={() => setViewPassReg(null)}
        />
      )}

      {/* PASS QR SCANNER MODAL */}
      <AdminCampQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => {
          setIsQrScannerOpen(false);
          loadData(); // Refresh list to reflect check-ins
        }}
        defaultCampId={campId}
        defaultCampTitle={camp?.title}
      />
    </div>
  );
}

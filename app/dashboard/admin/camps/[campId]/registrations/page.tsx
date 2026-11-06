'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Search, Download, Users, DollarSign,
  Filter, Phone, Mail, CheckCircle, Clock, Utensils,
  Home, RefreshCw, Loader2, AlertCircle, FileSpreadsheet,
  Building, Building2, UserCheck, ShieldCheck, CreditCard,
  Landmark, ExternalLink, Eye, CheckCircle2, X, Image as ImageIcon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check,
  Undo2, Banknote, AlertTriangle, CheckCheck, RotateCcw, Ticket, QrCode,
  Edit2, Pencil, ShieldAlert, Calculator, Sparkles, KeyRound, XCircle,
  FileText, Tag, Calendar, MessageCircle, Share2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { Camp, CampRegistration, CampRefundRequest } from '@/types';
import CampPrasadamCard from '@/components/camps/CampPrasadamCard';
import AdminCampQrScannerModal from '@/components/camps/AdminCampQrScannerModal';
import CampPrasadamTab from '@/components/camps/CampPrasadamTab';
import CampAccommodationTab from '@/components/camps/CampAccommodationTab';
import { calculateDynamicCampCost, formatParticipantMealDate } from '@/lib/camp-cost';
import {
  approveCampWaitingListRegistrationAction,
  getCampRegistrationsAction,
  verifyAndApproveCampRegistrationAction,
  rejectCampRegistrationAction,
  getCampRefundRequestsAction,
  processCampRefundAction,
  getCampUserAccessAction,
  superAdminUpdateCampRegistrationAction,
  verifyAndApproveCampBatchAction,
  rejectCampBatchAction
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
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'coming' | 'cancelled'>('all');

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
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // ITT Details View Modal State (Uniform table view)
  const [viewDetailsReg, setViewDetailsReg] = useState<CampRegistration | null>(null);
  const [copiedUtr, setCopiedUtr] = useState(false);

  // Prasadam & Delegate Pass View Modal State
  const [viewPassReg, setViewPassReg] = useState<any | null>(null);

  // QR Scanner Modal State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Full Screenshot Modal State
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);

  // Top View Switcher: 'registrations' vs 'batches' vs 'refunds' vs 'prasadam' vs 'pocs'
  const [activeView, setActiveView] = useState<'registrations' | 'batches' | 'refunds' | 'prasadam' | 'accommodation' | 'pocs'>('registrations');
  const [refundRequests, setRefundRequests] = useState<CampRefundRequest[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [campPocs, setCampPocs] = useState<any[]>([]);
  const [copiedAllPocs, setCopiedAllPocs] = useState(false);
  const [copiedPocId, setCopiedPocId] = useState<string | null>(null);
  const [pocSearchTerm, setPocSearchTerm] = useState('');

  // IDT & ITT Batch Management State
  const [verifyingBatch, setVerifyingBatch] = useState<any | null>(null);
  const [batchVerifyTxnId, setBatchVerifyTxnId] = useState('');
  const [batchVerifyDate, setBatchVerifyDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchVerifyRemarks, setBatchVerifyRemarks] = useState('');
  const [isApprovingBatch, setIsApprovingBatch] = useState(false);
  const [batchVerifyError, setBatchVerifyError] = useState<string | null>(null);

  const [rejectingBatch, setRejectingBatch] = useState<any | null>(null);
  const [batchRejectReason, setBatchRejectReason] = useState('');
  const [isRejectingBatch, setIsRejectingBatch] = useState(false);

  const [inspectingBatch, setInspectingBatch] = useState<any | null>(null);
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchMethodFilter, setBatchMethodFilter] = useState<'all' | 'RAZORPAY' | 'ITT' | 'IDT' | 'DISCOUNT'>('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | 'processing' | 'completed' | 'rejected'>('all');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

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

  // Super Admin Emergency Edit Modal State
  const [editModalReg, setEditModalReg] = useState<CampRegistration | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const handleOpenSuperAdminEdit = (reg: CampRegistration) => {
    setEditModalReg(reg);
    setEditError(null);
    setEditSuccess(null);

    // Format created_at to YYYY-MM-DDTHH:mm for datetime-local input
    let formattedCreatedAt = '';
    if (reg.created_at) {
      try {
        const d = new Date(reg.created_at);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          formattedCreatedAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      } catch (e) {}
    }

    setEditFormData({
      participant_name: reg.participant_name || '',
      whatsapp: reg.whatsapp || '',
      email: reg.email || '',
      gender: reg.gender || 'Male',
      age: reg.age || '',
      married_since_year: reg.married_since_year || '',
      voice_name: reg.voice_name || '',
      parent_temple: reg.parent_temple || '',
      counselor_name: reg.counselor_name || '',
      poc_name: reg.poc_name || '',
      poc_contact: reg.poc_contact || '',
      camp_track: reg.camp_track || '',
      participant_type: reg.participant_type || '',
      first_meal_date: reg.first_meal_date || '',
      first_meal_type: reg.first_meal_type || 'Breakfast',
      last_meal_date: reg.last_meal_date || '',
      last_meal_type: reg.last_meal_type || 'Lunch',
      dinner_type: reg.dinner_type || 'Dinner Meal',
      accommodation: reg.accommodation || 'No',
      total_cost: Number(reg.total_cost || 0),
      meal_cost: Number(reg.meal_cost || 0),
      acc_cost: Number(reg.acc_cost || 0),
      discount_amount: Number(reg.discount_amount || 0),
      payment_method: reg.payment_method || 'RAZORPAY',
      payment_status: reg.payment_status || 'completed',
      transaction_ref: reg.transaction_ref || reg.payment_id || '',
      created_at: formattedCreatedAt,
      checked_in: Boolean(reg.checked_in)
    });
  };

  const handleRecalculateMealCost = () => {
    if (!camp) return;
    const calc = calculateDynamicCampCost(camp, {
      firstMealDate: editFormData.first_meal_date,
      firstMealType: editFormData.first_meal_type,
      lastMealDate: editFormData.last_meal_date,
      lastMealType: editFormData.last_meal_type,
      accommodation: editFormData.accommodation,
      participantType: editFormData.participant_type,
      campTrack: editFormData.camp_track,
    });

    const discount = Number(editFormData.discount_amount || 0);
    const newTotal = Math.max(0, calc.totalCost - discount);

    setEditFormData((prev: any) => ({
      ...prev,
      meal_cost: calc.mealCost,
      acc_cost: calc.accCost,
      total_cost: newTotal,
    }));
  };

  const handleSaveSuperAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalReg || !editModalReg.id) return;

    setEditSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const res = await superAdminUpdateCampRegistrationAction(editModalReg.id, editFormData);
      if (!res.success || !res.registration) {
        throw new Error(res.error || 'Failed to update attendee registration.');
      }

      // Update in local state
      const updatedReg = res.registration;
      setRegistrations((prev) =>
        prev.map((r) => (r.id === editModalReg.id ? { ...r, ...updatedReg } : r))
      );

      // If pass preview is open for this devotee, update it in live preview as well
      if (viewPassReg && viewPassReg.id === editModalReg.id) {
        setViewPassReg((prev: any) => (prev ? { ...prev, ...updatedReg } : null));
      }

      setEditSuccess('Attendee record updated successfully! Pass and QR code reflect new data.');
      setTimeout(() => {
        setEditModalReg(null);
      }, 1200);
    } catch (err: any) {
      console.error('Super Admin save error:', err);
      setEditError(err.message || 'Error updating registration.');
    } finally {
      setEditSaving(false);
    }
  };

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

      // Check URL query parameters for payment filter
      const paymentParam = searchParams.get('payment');
      if (paymentParam) {
        setSelectedPayment(paymentParam);
      }

      // Automatically initialize allowed activeView
      if (initialViewParam === 'accommodation') {
        setActiveView('accommodation');
      } else if (initialViewParam === 'prasadam' && canPrasadam) {
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

      // 3. Fetch Registrations (if super admin, attendance, payment approvals, or refunds permission)
      if (canAttendance || canPaymentApprovals || canRefunds) {
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

      // 5. Fetch Center POCs for this camp
      try {
        const pocRes = await fetch(`/api/camps/poc?campId=${campId}`);
        const pocJson = await pocRes.json();
        if (pocJson.success && Array.isArray(pocJson.pocs)) {
          setCampPocs(pocJson.pocs);
        }
      } catch (pocErr) {
        console.warn('Error fetching camp POCs:', pocErr);
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
        toast.success('Refund request reopened');
      } else {
        toast.error(res.error || 'Failed to reopen refund request');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reopen refund request');
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
  }, [searchTerm, selectedTrack, selectedPayment, selectedRole, attendanceFilter, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Financial calculation helper for any attendee registration
  const getRegFinancials = (r: CampRegistration) => {
    const grossCost = Number(r.total_cost || 0);
    const isFreeMethod = r.payment_method === 'COUPON' || r.payment_method === 'ROLE_WAIVER' || r.payment_method === 'FREE';
    const isProcessing = r.payment_status === 'processing';
    const isRejected = r.payment_status === 'rejected';

    // Discount amount: explicit discount_amount or 100% of gross if coupon/waiver
    const discount = r.discount_amount != null && Number(r.discount_amount) > 0
      ? Number(r.discount_amount)
      : (isFreeMethod ? grossCost : 0);

    // Money originally collected / paid by attendee for this registration (before any refunds)
    const paidAmount = (isFreeMethod || isProcessing || isRejected) ? 0 : Math.max(0, grossCost - discount);

    // Net received currently retained from active (non-cancelled) attendees
    const netReceived = r.is_cancelled ? 0 : paidAmount;
    const pendingAmount = isProcessing ? Math.max(0, grossCost - discount) : 0;

    return { grossCost, discount, paidAmount, netReceived, isFreeMethod, isProcessing, isRejected, pendingAmount };
  };

  // Open Verification Modal
  const handleOpenVerifyModal = (reg: CampRegistration) => {
    setVerifyingReg(reg);
    const defaultTxn = reg.transaction_ref || reg.payment_id || (reg.payment_method === 'IDT' ? `IDT-${(reg.deduction_source || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}` : '');
    setVerifyTxnId(defaultTxn);
    setVerifyDate(reg.transaction_date || new Date().toISOString().split('T')[0]);
    setVerifyRemarks(reg.payment_method === 'IDT' ? `IDT approved from ${reg.deduction_source || 'Dept'}` : '');
    setVerifyError(null);
    setShowRejectConfirm(false);
    setRejectReason(reg.payment_method === 'IDT' ? 'IDT deduction declined by administration' : 'Transfer verification declined');
  };

  // Approve Devotee from Accommodation Waiting List
  const handleApproveWaitingList = async (regId: string) => {
    if (!confirm('Are you sure you want to approve this devotee from the Waiting List? Their entry and prasadam pass will be unlocked and a confirmation email will be dispatched.')) {
      return;
    }
    try {
      const res = await approveCampWaitingListRegistrationAction(regId);
      if (res.success) {
        toast.success('Registration approved & pass released successfully!');
        loadData();
      } else {
        toast.error(res.error || 'Failed to approve registration.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error approving registration.');
    }
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
        setShowRejectConfirm(false);
      } else {
        setVerifyError(res.error || 'Failed to approve registration');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Error occurred while approving');
    } finally {
      setIsApproving(false);
    }
  };

  // Confirm Transfer Rejection
  const handleConfirmRejection = async () => {
    if (!verifyingReg?.id) return;
    setIsRejecting(true);
    setVerifyError(null);

    try {
      const res = await rejectCampRegistrationAction(
        verifyingReg.id,
        rejectReason.trim() || (verifyingReg.payment_method === 'IDT' ? 'IDT deduction rejected by administration' : 'Transfer verification rejected')
      );

      if (res.success && res.registration) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === verifyingReg.id ? res.registration! : r))
        );
        setVerifyingReg(null);
        setShowRejectConfirm(false);
      } else {
        setVerifyError(res.error || 'Failed to reject registration');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Error occurred while rejecting');
    } finally {
      setIsRejecting(false);
    }
  };

  // Role counts for understanding attendance distribution
  // Track counts (for track select dropdown)
  const trackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach((r) => {
      if (r.camp_track) {
        counts[r.camp_track] = (counts[r.camp_track] || 0) + 1;
      }
    });
    return counts;
  }, [registrations]);

  // Attendance base (matches track, role, and payment filters so coming/cancelled counts are accurate)
  const attendanceBaseRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      if (selectedTrack !== 'all' && reg.camp_track !== selectedTrack) return false;
      if (selectedRole !== 'all') {
        const regRole = (reg.participant_type || (reg as any).participantType || 'Camp Participant').trim().toLowerCase();
        if (regRole !== selectedRole.trim().toLowerCase()) return false;
      }
      if (selectedPayment !== 'all') {
        if (selectedPayment === 'WAITING_LIST') {
          if (!reg.is_waiting_list || reg.waiting_list_approved_at) return false;
        } else if (selectedPayment === 'PROCESSING') {
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
  }, [registrations, selectedTrack, selectedRole, selectedPayment]);

  const comingCount = useMemo(() => {
    return attendanceBaseRegistrations.filter(r => !r.is_cancelled).length;
  }, [attendanceBaseRegistrations]);

  const cancelledCount = useMemo(() => {
    return attendanceBaseRegistrations.filter(r => r.is_cancelled).length;
  }, [attendanceBaseRegistrations]);

  // Devotees matching all filters EXCEPT the role filter itself
  // (so when you change Track, Attendance Status, or Payment, the role counts update dynamically!)
  const roleBaseRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      if (attendanceFilter === 'coming' && reg.is_cancelled) return false;
      if (attendanceFilter === 'cancelled' && !reg.is_cancelled) return false;
      if (selectedTrack !== 'all' && reg.camp_track !== selectedTrack) return false;
      if (selectedPayment !== 'all') {
        if (selectedPayment === 'WAITING_LIST') {
          if (!reg.is_waiting_list || reg.waiting_list_approved_at) return false;
        } else if (selectedPayment === 'PROCESSING') {
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
  }, [registrations, selectedTrack, selectedPayment, attendanceFilter]);

  // Role counts within the active filter scope (e.g. within selected track "Nistha")
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    roleBaseRegistrations.forEach((r) => {
      const role = (r.participant_type || (r as any).participantType || 'Camp Participant').trim();
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [roleBaseRegistrations]);

  const allDistinctRoles: string[] = useMemo(() => {
    const standardRoles = ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari'];
    const rolesSet = new Set<string>();
    const configuredRoles = (camp?.participant_types && camp.participant_types.length > 0)
      ? camp.participant_types
      : standardRoles;
    configuredRoles.forEach((r: string) => rolesSet.add(r));
    registrations.forEach((r) => {
      const role = (r.participant_type || (r as any).participantType || '').trim();
      if (role) rolesSet.add(role);
    });
    return Array.from(rolesSet);
  }, [camp?.participant_types, registrations]);

  // Filtered List
  const filteredRegistrations = registrations.filter((reg) => {
    if (attendanceFilter === 'coming' && reg.is_cancelled) return false;
    if (attendanceFilter === 'cancelled' && !reg.is_cancelled) return false;
    if (selectedTrack !== 'all' && reg.camp_track !== selectedTrack) return false;
    if (selectedRole !== 'all') {
      const regRole = (reg.participant_type || (reg as any).participantType || 'Camp Participant').trim().toLowerCase();
      if (regRole !== selectedRole.trim().toLowerCase()) return false;
    }
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

  // Metrics: Approved and active bookings (excludes rejected registrations)
  const approvedRegistrations = useMemo(() => filteredRegistrations.filter(r => r.payment_status !== 'rejected' && r.payment_status !== 'failed'), [filteredRegistrations]);
  const totalDevotees = filteredRegistrations.length;
  const cancelledDevoteesCount = filteredRegistrations.filter((r) => r.is_cancelled).length;
  const activeDevoteesCount = Math.max(0, totalDevotees - cancelledDevoteesCount);

  // Financials: Sum only approved/completed/refunded bookings (identical to Super Admin Audit)
  const grossBilledTotal = approvedRegistrations.reduce((sum, r) => sum + getRegFinancials(r).grossCost, 0);
  const totalGrossReceived = approvedRegistrations.reduce((sum, r) => sum + getRegFinancials(r).paidAmount, 0);
  const totalNetReceived = approvedRegistrations.reduce((sum, r) => sum + getRegFinancials(r).netReceived, 0);
  const totalDiscounts = approvedRegistrations.reduce((sum, r) => sum + getRegFinancials(r).discount, 0);
  const totalPendingAmount = approvedRegistrations.reduce((sum, r) => sum + getRegFinancials(r).pendingAmount, 0);

  // Check if any attendee filter is active
  const isAttendeeFilterActive = Boolean(
    attendanceFilter !== 'all' ||
    selectedTrack !== 'all' ||
    selectedRole !== 'all' ||
    selectedPayment !== 'all' ||
    searchTerm.trim().length > 0
  );

  const completedRefunds = refundRequests.filter(r => r.status === 'refunded');
  const completedRefundsCount = completedRefunds.length;
  const completedRefundAmount = completedRefunds.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

  // Filtered attendee refunds: strictly sums refunds for attendees currently in approvedRegistrations
  const filteredDevoteeRefundAmount = useMemo(() => {
    return approvedRegistrations.reduce((s, r) => s + getRegRefund(r.id), 0);
  }, [approvedRegistrations, refundRequests]);

  const filteredDevoteeRefundsCount = useMemo(() => {
    return approvedRegistrations.filter(r => getRegRefund(r.id) > 0).length;
  }, [approvedRegistrations, refundRequests]);

  const displayAttendeeRefundAmount = isAttendeeFilterActive ? filteredDevoteeRefundAmount : completedRefundAmount;
  const displayAttendeeRefundCount = isAttendeeFilterActive ? filteredDevoteeRefundsCount : completedRefundsCount;
  const netAvailableAmount = Math.max(0, totalGrossReceived - displayAttendeeRefundAmount);

  const pendingRefunds = refundRequests.filter(r => r.status === 'pending');
  const pendingRefundsCount = pendingRefunds.length;
  const pendingRefundAmount = pendingRefunds.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

  const rejectedRefunds = refundRequests.filter(r => r.status === 'rejected');
  const rejectedRefundsCount = rejectedRefunds.length;

  const waitingListCount = registrations.filter((r) => r.is_waiting_list && !r.waiting_list_approved_at).length;
  const processingCount = filteredRegistrations.filter((r) => r.payment_status === 'processing').length;
  const ittCount = filteredRegistrations.filter((r) => r.payment_method === 'INTER_TEMPLE_TRANSFER' || r.payment_method === 'ITT').length;
  const couponFreeCount = approvedRegistrations.filter((r) => r.payment_method === 'COUPON').length;
  const waiverCount = approvedRegistrations.filter((r) => r.payment_method === 'ROLE_WAIVER' || r.payment_method === 'FREE').length;
  const idtCount = filteredRegistrations.filter((r) => r.payment_method === 'IDT').length;
  const razorpayCount = filteredRegistrations.filter((r) => r.payment_method === 'RAZORPAY').length;
  const accommodationCount = filteredRegistrations.filter((r) => !r.is_cancelled && r.accommodation && r.accommodation.toLowerCase() !== 'no').length;

  const onlineReceived = approvedRegistrations
    .filter((r) => r.payment_method === 'RAZORPAY' && r.payment_status !== 'processing')
    .reduce((sum, r) => sum + getRegFinancials(r).paidAmount, 0);
  const idtReceived = approvedRegistrations
    .filter((r) => r.payment_method === 'IDT' && r.payment_status !== 'processing')
    .reduce((sum, r) => sum + getRegFinancials(r).paidAmount, 0);
  const ittReceived = approvedRegistrations
    .filter((r) => (r.payment_method === 'INTER_TEMPLE_TRANSFER' || r.payment_method === 'ITT') && (r.payment_status === 'completed' || r.payment_status === 'refunded'))
    .reduce((sum, r) => sum + getRegFinancials(r).paidAmount, 0);

  // Pagination Calculations
  const totalFilteredCount = filteredRegistrations.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * (pageSize === -1 ? totalFilteredCount : pageSize);
  const endIndex = pageSize === -1 ? totalFilteredCount : Math.min(startIndex + pageSize, totalFilteredCount);
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, endIndex);

  // Original Payment Details Helper for Refunds (IDT, ITT, Razorpay, Cash, etc.)
  const getRefundOriginalPayment = (req: CampRefundRequest) => {
    let paymentMethod = req.payment_method;
    let deductionSource = req.deduction_source;
    let passcode = req.passcode;
    let paymentId = req.payment_id;
    let orderId = req.order_id;
    let txnRef = req.transaction_ref;
    let screenshotUrl = req.payment_screenshot_url;
    let paymentDate = req.orig_payment_date;
    let couponCode = req.orig_coupon_code;
    let parentTemple = req.orig_parent_temple;
    let voiceName = req.orig_voice_name;

    const cancelledRegIds = Array.isArray(req.cancelled_registrations)
      ? req.cancelled_registrations.map((cr: any) => cr.reg_id).filter(Boolean)
      : [];

    const matchedReg = registrations.find(r => 
      (req.registration_id && r.id === req.registration_id) ||
      (r.cancellation_id && r.cancellation_id === req.id) ||
      (cancelledRegIds.length > 0 && r.id && cancelledRegIds.includes(r.id)) ||
      (req.group_id && r.group_id === req.group_id) ||
      (r.poc_contact && req.poc_contact && r.poc_contact.replace(/\D/g, '').slice(-10) === req.poc_contact.replace(/\D/g, '').slice(-10))
    );

    if (matchedReg) {
      if (!paymentMethod) paymentMethod = matchedReg.payment_method;
      if (!deductionSource) deductionSource = matchedReg.deduction_source;
      if (!passcode) passcode = matchedReg.passcode;
      if (!paymentId) paymentId = matchedReg.payment_id;
      if (!orderId) orderId = matchedReg.order_id;
      if (!txnRef) txnRef = matchedReg.transaction_ref;
      if (!screenshotUrl) screenshotUrl = matchedReg.payment_screenshot_url;
      if (!paymentDate) paymentDate = matchedReg.payment_date || matchedReg.created_at;
      if (!couponCode) couponCode = matchedReg.coupon_code;
      if (!parentTemple) parentTemple = matchedReg.parent_temple;
      if (!voiceName) voiceName = matchedReg.voice_name;
    }

    const methodUpper = String(paymentMethod || '').toUpperCase().trim();
    const isIdt = methodUpper === 'IDT';
    const isItt = methodUpper === 'ITT' || methodUpper === 'INTER_TEMPLE_TRANSFER';
    const isRazorpay = methodUpper === 'RAZORPAY';
    const isCash = methodUpper === 'CASH';
    const isCoupon = methodUpper === 'COUPON' || methodUpper === 'FREE' || methodUpper === 'ROLE_WAIVER';

    return {
      rawMethod: paymentMethod,
      methodUpper,
      isIdt,
      isItt,
      isRazorpay,
      isCash,
      isCoupon,
      deductionSource,
      passcode,
      paymentId,
      orderId,
      txnRef,
      screenshotUrl,
      paymentDate,
      couponCode,
      parentTemple,
      voiceName,
      matchedReg
    };
  };

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
      
      const origPay = getRefundOriginalPayment(r);
      const matchMethod = (origPay.rawMethod || '').toLowerCase().includes(q);
      const matchDeduction = (origPay.deductionSource || '').toLowerCase().includes(q);
      const matchPasscode = (origPay.passcode || '').toLowerCase().includes(q);
      const matchTxnRef = (origPay.txnRef || '').toLowerCase().includes(q);
      const matchPayId = (origPay.paymentId || '').toLowerCase().includes(q);

      if (!matchPoc && !matchContact && !matchEmail && !matchUpi && !matchBank && !matchAttendees && !matchMethod && !matchDeduction && !matchPasscode && !matchTxnRef && !matchPayId) {
        return false;
      }
    }
    return true;
  });

  // Center POC Directory: Aggregated list of all center coordinators for this camp
  const allCampPocsCombined = useMemo(() => {
    const map = new Map<string, {
      id: string;
      centerName: string;
      pocName: string;
      pocPhone: string;
      attendeesCount: number;
      updatedAt?: string;
    }>();

    // 1. Add records from camp_center_pocs table
    campPocs.forEach((cp: any) => {
      const name = (cp.center_name || '').trim();
      const key = name.toLowerCase();
      if (key) {
        map.set(key, {
          id: cp.id || key,
          centerName: name,
          pocName: cp.poc_name || 'Coordinator',
          pocPhone: cp.poc_phone || '',
          attendeesCount: 0,
          updatedAt: cp.updated_at,
        });
      }
    });

    // 2. Count attendees and fill any missing center POC from registrations
    registrations.forEach((r) => {
      if (r.is_cancelled) return;
      const center = (r.voice_name || r.parent_temple || 'Central VOICE').trim();
      const key = center.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          centerName: center,
          pocName: r.poc_name || 'Coordinator',
          pocPhone: r.poc_contact || '',
          attendeesCount: 0,
          updatedAt: r.created_at,
        });
      }
      const item = map.get(key)!;
      item.attendeesCount += 1;
      if (!item.pocPhone && r.poc_contact) {
        item.pocPhone = r.poc_contact;
      }
      if ((!item.pocName || item.pocName === 'Coordinator') && r.poc_name) {
        item.pocName = r.poc_name;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.attendeesCount - a.attendeesCount);
  }, [campPocs, registrations]);

  // Filtered Center POC Directory based on search
  const filteredCampPocs = useMemo(() => {
    if (!pocSearchTerm.trim()) return allCampPocsCombined;
    const q = pocSearchTerm.trim().toLowerCase();
    return allCampPocsCombined.filter(
      (p) =>
        p.centerName.toLowerCase().includes(q) ||
        p.pocName.toLowerCase().includes(q) ||
        p.pocPhone.toLowerCase().includes(q)
    );
  }, [allCampPocsCombined, pocSearchTerm]);

  // 1-Click Copy entire POC Directory formatted for WhatsApp/Email sharing
  const handleCopyAllPocs = () => {
    if (allCampPocsCombined.length === 0) return;
    const campTitle = camp?.title || 'Camp Retreat';
    const lines = [
      `🏕️ *${campTitle.toUpperCase()} - CENTER POC DIRECTORY*`,
      `📅 Date: ${new Date().toLocaleDateString('en-IN')}`,
      `👥 Total Centers: ${allCampPocsCombined.length} | Active Attendees: ${activeDevoteesCount}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...allCampPocsCombined.map((p, idx) =>
        `${idx + 1}. *${p.centerName}* (${p.attendeesCount} Devotee${p.attendeesCount !== 1 ? 's' : ''})\n   👤 *POC:* ${p.pocName}\n   📞 *Phone:* ${p.pocPhone || 'Not provided'}`
      ),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Hare Krishna! Please reach out to your respective center coordinator for camp travel and sadhana schedule.`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAllPocs(true);
    setTimeout(() => setCopiedAllPocs(false), 2500);
  };

  const getWhatsAppPocsShareLink = () => {
    const campTitle = camp?.title || 'Camp Retreat';
    const lines = [
      `🏕️ *${campTitle.toUpperCase()} - CENTER POC DIRECTORY*`,
      `👥 Total Centers: ${allCampPocsCombined.length} | Attendees: ${activeDevoteesCount}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...allCampPocsCombined.map((p, idx) =>
        `${idx + 1}. *${p.centerName}* (${p.attendeesCount})\n   👤 POC: ${p.pocName} • 📞 ${p.pocPhone || 'No contact'}`
      ),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`
    ];
    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  // All Transactions & Transfer Batches Grouping (Razorpay, ITT, IDT, Discounts, Free, etc.)
  const transferBatches = useMemo(() => {
    const map = new Map<string, any>();

    registrations.forEach(r => {
      const methodUpper = (r.payment_method || '').toUpperCase();
      const isRazorpay = methodUpper === 'RAZORPAY' || methodUpper === 'ONLINE' || Boolean(r.payment_id && r.payment_id.startsWith('pay_'));
      const isItt = methodUpper === 'INTER_TEMPLE_TRANSFER' || methodUpper === 'ITT';
      const isIdt = methodUpper === 'IDT';
      const isDiscountOrFree = Number(r.discount_amount || 0) > 0 || !!r.coupon_code || ['FREE', 'COUPON', 'ROLE_WAIVER'].includes(methodUpper);

      // Grouping key: group_id is primary (bulk checkout or multi-seat registration).
      // For Razorpay, if group_id is missing, group by payment_id or order_id so attendees in the same transaction form 1 batch.
      const batchKey: string = (r.group_id && r.group_id.trim())
        ? r.group_id.trim()
        : (isRazorpay && r.payment_id && r.payment_id.trim())
        ? r.payment_id.trim()
        : (isRazorpay && r.order_id && r.order_id.trim())
        ? r.order_id.trim()
        : (r.transaction_ref && r.transaction_ref.trim())
        ? `${r.payment_method}_${r.transaction_ref.trim()}`
        : (r.id || `reg_${Math.random().toString(36).substring(2, 9)}`);

      if (!map.has(batchKey)) {
        map.set(batchKey, {
          batchId: r.group_id || r.payment_id || r.id || batchKey,
          key: batchKey,
          paymentMethod: isRazorpay
            ? 'RAZORPAY'
            : isItt
            ? 'INTER_TEMPLE_TRANSFER'
            : isIdt
            ? 'IDT'
            : isDiscountOrFree
            ? 'COUPON'
            : (r.payment_method || 'OTHER'),
          isRazorpay,
          isItt,
          isIdt,
          isDiscountOrFree,
          status: (r.payment_status as any) || 'processing',
          createdAt: r.created_at,
          transactionDate: r.transaction_date || r.payment_date || r.created_at,
          transactionRef: r.payment_id || r.transaction_ref || r.order_id || '',
          paymentId: r.payment_id,
          orderId: r.order_id,
          screenshotUrl: r.payment_screenshot_url,
          deductionSource: r.deduction_source,
          passcode: r.passcode,
          couponCode: r.coupon_code,
          discountAmount: 0,
          pocName: r.poc_name || r.participant_name || 'Anonymous',
          pocContact: r.poc_contact || r.whatsapp || '',
          centerName: r.voice_name || r.parent_temple || 'Central VOICE',
          parentTemple: r.parent_temple || '',
          grossAmount: 0,
          totalAmount: 0,
          mealCost: 0,
          accCost: 0,
          acCost: 0,
          lateFee: 0,
          entryCost: 0,
          activeAmount: 0,
          cancelledAmount: 0,
          activeAttendeesCount: 0,
          cancelledAttendeesCount: 0,
          attendeesCount: 0,
          totalRegisteredCount: 0,
          attendees: [],
          verifiedAt: r.verified_at,
          verifiedBy: r.verified_by,
          rejectionReason: r.cancellation_reason,
          refundAmount: 0,
          refundStatus: null as 'refunded' | 'pending' | 'rejected' | null,
        });
      }

      const batch = map.get(batchKey)!;
      const isCancelled = Boolean(r.is_cancelled);
      const regGross = Number(r.total_cost || 0);
      const isFree = isDiscountOrFree || ['COUPON', 'ROLE_WAIVER', 'FREE'].includes(methodUpper);
      const regDiscount = isFree ? regGross : Number(r.discount_amount || 0);
      const regPaid = isFree ? 0 : Math.max(0, regGross - regDiscount);

      // Financial transaction records the actual payment collected at transaction time
      batch.grossAmount = (batch.grossAmount || 0) + regGross;
      batch.totalAmount = (batch.totalAmount || 0) + regPaid;
      batch.mealCost = (batch.mealCost || 0) + Number(r.meal_cost || 0);
      batch.accCost = (batch.accCost || 0) + Number(r.acc_cost || 0);
      batch.acCost = (batch.acCost || 0) + Number(r.ac_cost || 0);
      batch.lateFee = (batch.lateFee || 0) + Number(r.late_fee || 0);
      batch.entryCost = (batch.entryCost || 0) + Number(r.entry_cost || 0);
      batch.discountAmount = (batch.discountAmount || 0) + regDiscount;

      if (!isCancelled) {
        batch.activeAttendeesCount = (batch.activeAttendeesCount || 0) + 1;
        batch.activeAmount = (batch.activeAmount || 0) + regPaid;
      } else {
        batch.cancelledAttendeesCount = (batch.cancelledAttendeesCount || 0) + 1;
        batch.cancelledAmount = (batch.cancelledAmount || 0) + regPaid;
      }
      batch.attendeesCount = (batch.activeAttendeesCount || 0);
      batch.totalRegisteredCount = (batch.totalRegisteredCount || 0) + 1;

      batch.attendees.push({
        id: r.id,
        name: r.participant_name,
        track: r.camp_track,
        cost: regGross,
        paid: regPaid,
        discount: regDiscount,
        mealCost: Number(r.meal_cost || 0),
        accCost: Number(r.acc_cost || 0),
        lateFee: Number(r.late_fee || 0),
        entryCost: Number(r.entry_cost || 0),
        whatsapp: r.whatsapp,
        email: r.email,
        isCancelled: isCancelled,
        cancellationReason: r.cancellation_reason,
      });

      if (!batch.screenshotUrl && r.payment_screenshot_url) batch.screenshotUrl = r.payment_screenshot_url;
      if (!batch.transactionRef && (r.payment_id || r.transaction_ref)) batch.transactionRef = r.payment_id || r.transaction_ref;
      if (!batch.paymentId && r.payment_id) batch.paymentId = r.payment_id;
      if (!batch.orderId && r.order_id) batch.orderId = r.order_id;
      if (!batch.deductionSource && r.deduction_source) batch.deductionSource = r.deduction_source;
      if (!batch.passcode && r.passcode) batch.passcode = r.passcode;
      if (!batch.couponCode && r.coupon_code) batch.couponCode = r.coupon_code;
      if (!batch.transactionDate && (r.transaction_date || r.payment_date)) batch.transactionDate = r.transaction_date || r.payment_date;
      if (r.payment_status === 'processing' && !isRazorpay) batch.status = 'processing';
      if (r.cancellation_reason && !batch.rejectionReason) batch.rejectionReason = r.cancellation_reason;
    });

    // Cross-reference refundRequests to attach accurate refund info to each batch
    Array.from(map.values()).forEach(batch => {
      let batchRefundAmt = 0;
      let batchRefundStatus: 'refunded' | 'pending' | 'rejected' | null = null;
      let hasPending = false;
      let hasRefunded = false;
      let hasRejected = false;

      // 1. Tally from individual attendee refunds
      batch.attendees.forEach((a: any) => {
        const info = getRegRefundInfo(a.id);
        if (info.status === 'refunded') {
          batchRefundAmt += Number(info.amount || 0);
          hasRefunded = true;
        } else if (info.status === 'pending') {
          hasPending = true;
        } else if (info.status === 'rejected') {
          hasRejected = true;
        }
      });

      // 2. Also check if there is a group-level refund request for this batch
      const matchingGroupRefunds = refundRequests.filter(r =>
        Boolean(r.group_id && (r.group_id === batch.batchId || r.group_id === batch.key))
      );

      for (const gr of matchingGroupRefunds) {
        if (gr.status === 'refunded') {
          hasRefunded = true;
          if (batchRefundAmt === 0 && gr.refund_amount) {
            batchRefundAmt = Number(gr.refund_amount);
          }
        } else if (gr.status === 'pending') {
          hasPending = true;
        } else if (gr.status === 'rejected') {
          hasRejected = true;
        }
      }

      batchRefundAmt = Math.min(batch.totalAmount, batchRefundAmt);

      if (hasRefunded) {
        batchRefundStatus = 'refunded';
      } else if (hasPending) {
        batchRefundStatus = 'pending';
      } else if (hasRejected) {
        batchRefundStatus = 'rejected';
      }

      batch.refundAmount = batchRefundAmt;
      batch.refundStatus = batchRefundStatus;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.status === 'processing' && b.status !== 'processing') return -1;
      if (b.status === 'processing' && a.status !== 'processing') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [registrations, refundRequests]);

  const filteredBatches = useMemo(() => {
    return transferBatches.filter(b => {
      if (batchMethodFilter === 'RAZORPAY' && !b.isRazorpay) return false;
      if (batchMethodFilter === 'ITT' && !b.isItt) return false;
      if (batchMethodFilter === 'IDT' && !b.isIdt) return false;
      if (batchMethodFilter === 'DISCOUNT' && !b.isDiscountOrFree && b.discountAmount === 0) return false;
      if (batchStatusFilter !== 'all' && b.status !== batchStatusFilter) return false;
      if (batchSearchTerm.trim()) {
        const q = batchSearchTerm.trim().toLowerCase();
        const matchPoc = b.pocName.toLowerCase().includes(q);
        const matchContact = b.pocContact.includes(q);
        const matchCenter = b.centerName.toLowerCase().includes(q);
        const matchTemple = b.parentTemple.toLowerCase().includes(q);
        const matchRef = (b.transactionRef || '').toLowerCase().includes(q);
        const matchPayId = (b.paymentId || '').toLowerCase().includes(q);
        const matchOrderId = (b.orderId || '').toLowerCase().includes(q);
        const matchDed = (b.deductionSource || '').toLowerCase().includes(q);
        const matchPass = (b.passcode || '').toLowerCase().includes(q);
        const matchCoupon = (b.couponCode || '').toLowerCase().includes(q);
        const matchAttendees = b.attendees.some((a: any) => a.name.toLowerCase().includes(q) || a.whatsapp.includes(q));
        if (!matchPoc && !matchContact && !matchCenter && !matchTemple && !matchRef && !matchPayId && !matchOrderId && !matchDed && !matchPass && !matchCoupon && !matchAttendees) {
          return false;
        }
      }
      return true;
    });
  }, [transferBatches, batchMethodFilter, batchStatusFilter, batchSearchTerm]);

  // Total catalog counts (unfiltered) for dropdown options
  const totalRazorpayBatchesCount = useMemo(() => transferBatches.filter(b => b.isRazorpay).length, [transferBatches]);
  const totalIttBatchesCount = useMemo(() => transferBatches.filter(b => b.isItt).length, [transferBatches]);
  const totalIdtBatchesCount = useMemo(() => transferBatches.filter(b => b.isIdt).length, [transferBatches]);
  const totalDiscountBatchesCount = useMemo(() => transferBatches.filter(b => b.isDiscountOrFree || b.discountAmount > 0).length, [transferBatches]);
  const totalPendingBatchesCount = useMemo(() => transferBatches.filter(b => b.status === 'processing').length, [transferBatches]);
  const totalPendingBatchesAmount = useMemo(() => transferBatches.filter(b => b.status === 'processing').reduce((s, b) => s + b.totalAmount, 0), [transferBatches]);
  const totalApprovedBatchesCount = useMemo(() => transferBatches.filter(b => b.status === 'completed' || b.status === 'refunded').length, [transferBatches]);
  const totalRejectedBatchesCount = useMemo(() => transferBatches.filter(b => b.status === 'rejected').length, [transferBatches]);

  // Is any filter currently active on Transactions & Batches?
  const isBatchFilterActive = Boolean(
    batchMethodFilter !== 'all' || 
    batchStatusFilter !== 'all' || 
    batchSearchTerm.trim().length > 0
  );

  // Filtered metrics for dynamic financial summary cards
  const pendingBatchesCount = useMemo(() => filteredBatches.filter(b => b.status === 'processing').length, [filteredBatches]);
  const pendingBatchesAmount = useMemo(() => filteredBatches.filter(b => b.status === 'processing').reduce((s, b) => s + b.totalAmount, 0), [filteredBatches]);
  const approvedBatchesCount = useMemo(() => filteredBatches.filter(b => b.status === 'completed' || b.status === 'refunded').length, [filteredBatches]);
  const grossBatchesAmount = useMemo(() => {
    return filteredBatches.filter(b => b.status === 'completed' || b.status === 'refunded').reduce((s, b) => s + (b.grossAmount || 0), 0);
  }, [filteredBatches]);
  const approvedBatchesAmount = useMemo(() => filteredBatches.filter(b => b.status === 'completed' || b.status === 'refunded').reduce((s, b) => s + b.totalAmount, 0), [filteredBatches]);
  const totalDevoteesInBatches = useMemo(() => filteredBatches.reduce((s, b) => s + (b.totalRegisteredCount || b.attendeesCount), 0), [filteredBatches]);
  const activeDevoteesInBatches = useMemo(() => filteredBatches.reduce((s, b) => s + (b.activeAttendeesCount || 0), 0), [filteredBatches]);

  const razorpayBatchesCount = useMemo(() => filteredBatches.filter(b => b.isRazorpay).length, [filteredBatches]);
  const razorpayAmount = useMemo(() => filteredBatches.filter(b => b.isRazorpay && (b.status === 'completed' || b.status === 'refunded')).reduce((s, b) => s + b.totalAmount, 0), [filteredBatches]);
  const ittBatchesCount = useMemo(() => filteredBatches.filter(b => b.isItt).length, [filteredBatches]);
  const ittAmount = useMemo(() => filteredBatches.filter(b => b.isItt && (b.status === 'completed' || b.status === 'refunded')).reduce((s, b) => s + b.totalAmount, 0), [filteredBatches]);
  const idtBatchesCount = useMemo(() => filteredBatches.filter(b => b.isIdt).length, [filteredBatches]);
  const idtAmount = useMemo(() => filteredBatches.filter(b => b.isIdt && (b.status === 'completed' || b.status === 'refunded')).reduce((s, b) => s + b.totalAmount, 0), [filteredBatches]);
  const discountBatchesCount = useMemo(() => filteredBatches.filter(b => b.isDiscountOrFree || b.discountAmount > 0).length, [filteredBatches]);
  const totalDiscountAmount = useMemo(() => filteredBatches.reduce((s, b) => s + b.discountAmount, 0), [filteredBatches]);

  // Refund and Net calculations specifically for the currently visible / filtered batches
  const batchRefundAmount = useMemo(() => {
    return filteredBatches.reduce((s, b) => s + (b.refundAmount || 0), 0);
  }, [filteredBatches]);
  const batchRefundsCount = useMemo(() => {
    return filteredBatches.filter(b => (b.refundAmount || 0) > 0 || b.status === 'refunded' || b.refundStatus === 'refunded').length;
  }, [filteredBatches]);
  const batchNetAvailableAmount = useMemo(() => {
    return Math.max(0, approvedBatchesAmount - batchRefundAmount);
  }, [approvedBatchesAmount, batchRefundAmount]);

  const handleExportBatches = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!filteredBatches || filteredBatches.length === 0) return;

    const dataToExport = filteredBatches.map((b, idx) => ({
      '#': idx + 1,
      'Batch / Txn ID': b.batchId,
      'Date': b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN') : '',
      'Center': b.centerName,
      'Payer / POC Name': b.pocName,
      'Contact Phone': b.pocContact,
      'Devotees Count': b.attendeesCount,
      'Payment Mode': b.isRazorpay ? 'RAZORPAY' : (b.isItt ? 'ITT BANK TRANSFER' : (b.isIdt ? 'IDT DEPT TRANSFER' : (b.isDiscountOrFree ? 'COUPON / DISCOUNT' : b.paymentMethod))),
      'Transaction Ref / UTR / Payment ID': b.transactionRef || b.paymentId || '',
      'Order ID': b.orderId || '',
      'IDT Project': b.deductionSource || '',
      'IDT Passcode': b.passcode || '',
      'Status': b.status,
      'Meals Cost (₹)': b.mealCost,
      'Stay Cost (₹)': b.accCost,
      'Discount Subsidized (₹)': b.discountAmount,
      'Net Amount Paid (₹)': b.totalAmount,
      'Devotees List': b.attendees.map((a: any) => `${a.name} (${a.track})`).join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Camp_Transactions');
    const fileDate = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      XLSX.writeFile(wb, `${camp?.slug || 'camp'}_transactions_${fileDate}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `${camp?.slug || 'camp'}_transactions_${fileDate}.xlsx`, { bookType: 'xlsx' });
    }
  };

  const handleOpenBatchVerifyModal = (batch: any) => {
    setVerifyingBatch(batch);
    setBatchVerifyTxnId(batch.transactionRef || (batch.isIdt ? `IDT-${batch.deductionSource || batch.centerName}` : ''));
    setBatchVerifyDate(new Date().toISOString().split('T')[0]);
    setBatchVerifyRemarks('');
    setBatchVerifyError(null);
  };

  const handleApproveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingBatch) return;

    if (!batchVerifyTxnId.trim()) {
      setBatchVerifyError('Transaction ID / Bank UTR is required.');
      return;
    }
    if (!batchVerifyDate.trim()) {
      setBatchVerifyError('Payment Received Date is required.');
      return;
    }

    setIsApprovingBatch(true);
    setBatchVerifyError(null);

    try {
      const res = await verifyAndApproveCampBatchAction(verifyingBatch.batchId, {
        transactionId: batchVerifyTxnId.trim(),
        receivedDate: batchVerifyDate.trim(),
        remarks: batchVerifyRemarks.trim() || undefined,
      });

      if (res.success) {
        setRegistrations(prev =>
          prev.map(r => {
            const matches = (r.group_id && r.group_id === verifyingBatch.batchId) ||
              r.id === verifyingBatch.batchId ||
              verifyingBatch.attendees.some((a: any) => a.id === r.id);
            if (matches && !r.is_cancelled) {
              return {
                ...r,
                payment_status: 'completed',
                payment_id: batchVerifyTxnId.trim(),
                payment_date: batchVerifyDate.trim(),
                verified_at: new Date().toISOString(),
              };
            }
            return r;
          })
        );
        const count = verifyingBatch.activeAttendeesCount !== undefined ? verifyingBatch.activeAttendeesCount : verifyingBatch.attendeesCount;
        const amt = verifyingBatch.totalAmount;
        setVerifyingBatch(null);
        toast.success(`Successfully approved batch for ${count} devotee(s) (₹${amt.toLocaleString('en-IN')})!`);
      } else {
        setBatchVerifyError(res.error || 'Failed to approve batch');
      }
    } catch (err: any) {
      setBatchVerifyError(err.message || 'Error occurred while approving batch');
    } finally {
      setIsApprovingBatch(false);
    }
  };

  const handleOpenBatchRejectModal = (batch: any) => {
    setRejectingBatch(batch);
    setBatchRejectReason('');
  };

  const handleRejectBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBatch) return;
    if (!batchRejectReason.trim()) {
      toast.error('Please provide a reason for rejecting this transfer batch.');
      return;
    }

    setIsRejectingBatch(true);
    try {
      const res = await rejectCampBatchAction(rejectingBatch.batchId, batchRejectReason.trim());
      if (res.success) {
        setRegistrations(prev =>
          prev.map(r => {
            const matches = (r.group_id && r.group_id === rejectingBatch.batchId) ||
              r.id === rejectingBatch.batchId ||
              rejectingBatch.attendees.some((a: any) => a.id === r.id);
            if (matches) {
              return {
                ...r,
                payment_status: 'rejected',
                cancellation_reason: batchRejectReason.trim(),
              };
            }
            return r;
          })
        );
        const count = rejectingBatch.attendeesCount;
        setRejectingBatch(null);
        toast.success(`Batch rejected for ${count} devotee(s).`);
      } else {
        toast.error(res.error || 'Failed to reject batch');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setIsRejectingBatch(false);
    }
  };

  // Export to Excel (attendance role is protected from sensitive financials)
  const handleExportExcel = () => {
    if (filteredRegistrations.length === 0) {
      toast.error('No registrations available to export.');
      return;
    }

    const isAttendanceOnly = !userAccess.isSuperAdmin && !userAccess.canRefunds;

    const excelData = filteredRegistrations.map((reg, idx) => {
      const { grossCost, discount, paidAmount, netReceived, isProcessing, pendingAmount } = getRegFinancials(reg);
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
        row['Meals Cost (₹)'] = Number(reg.meal_cost || 0);
        row['Stay Cost (₹)'] = Number(reg.acc_cost || 0);
        row['AC Charges (₹)'] = Number(reg.ac_cost || 0);
        row['Base / Material Fee (₹)'] = Number((reg as any).base_cost ?? reg.entry_cost ?? 0);
        row['Late Fee (₹)'] = Number(reg.late_fee || 0);
        row['Gross Calculated Fee (₹)'] = grossCost;
        row['Discount / Waived (₹)'] = discount;
        row['Total Paid Amount (₹)'] = paidAmount;
        row['Refunded Amount (₹)'] = regRefund;
        row['Net Retained (₹)'] = Math.max(0, paidAmount - regRefund);
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
            <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>{camp?.title || 'Camp Attendees'}</span>
              <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                camp?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {camp?.status || 'Active'}
              </span>
            </h1>
            <p className="text-[10.5px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
              Complete attendee ledger, Inter-Temple Transfer verification, fee contributions, and Excel export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={loadData}
              className="p-1.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-xs cursor-pointer shrink-0"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {(userAccess.isSuperAdmin || userAccess.canScan) && (
              <button
                onClick={() => setIsQrScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                title="Scan Attendee Pass QR Code for Gate Entry & Meal Punch"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Scan Pass</span>
              </button>
            )}
            {(userAccess.isSuperAdmin || userAccess.canAttendance || userAccess.canPaymentApprovals) && (
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
                <span className="hidden sm:inline">(.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher: Registrations Ledger vs Refund Requests vs Prasadam Logs (Filtered by assigned role) */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200/90 pb-1.5 sm:pb-2 overflow-x-auto no-scrollbar">
          {(userAccess.isSuperAdmin || userAccess.canAttendance || userAccess.canPaymentApprovals) && (
            <button
              type="button"
              onClick={() => setActiveView('registrations')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'registrations'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Ledger ({registrations.length})</span>
              <span className="hidden sm:inline">
                {userAccess.canPaymentApprovals
                  ? `Attendee Ledger & Approvals (${registrations.length})`
                  : `Attendee Ledger (${registrations.length})`}
              </span>
              {(userAccess.isSuperAdmin || userAccess.canPaymentApprovals) && processingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[8.5px] sm:text-[10px] font-black animate-pulse">
                  {processingCount}
                </span>
              )}
            </button>
          )}

          {(userAccess.isSuperAdmin || userAccess.canPaymentApprovals) && (
            <button
              type="button"
              onClick={() => setActiveView('batches')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-2.5 rounded-full text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'batches'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Transactions ({transferBatches.length})</span>
              <span className="hidden sm:inline">Transactions &amp; Batches ({transferBatches.length})</span>
              {pendingBatchesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[8.5px] sm:text-[10px] font-black animate-pulse">
                  {pendingBatchesCount} Pending
                </span>
              )}
            </button>
          )}

          {(userAccess.isSuperAdmin || userAccess.canRefunds) && (
            <button
              type="button"
              onClick={() => setActiveView('refunds')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${
                activeView === 'refunds'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Refunds ({refundRequests.length})</span>
              <span className="hidden sm:inline">Refund Requests ({refundRequests.length})</span>
              {pendingRefundsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[8.5px] sm:text-[10px] font-black animate-pulse">
                  {pendingRefundsCount}
                </span>
              )}
            </button>
          )}

          {(userAccess.isSuperAdmin || userAccess.canPrasadam) && (
            <button
              type="button"
              onClick={() => setActiveView('prasadam')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'prasadam'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Utensils className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Prasadam</span>
              <span className="hidden sm:inline">Prasadam Logs &amp; Kitchen Tally</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveView('accommodation')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeView === 'accommodation'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Stay</span>
            <span className="hidden sm:inline">Accommodation &amp; Housing</span>
            {waitingListCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-700 text-white text-[8.5px] sm:text-[10px] font-black animate-pulse">
                {waitingListCount} Waiting
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('pocs')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-2.5 rounded-full text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeView === 'pocs'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">POC Directory ({allCampPocsCombined.length})</span>
            <span className="hidden sm:inline">Center POC Directory ({allCampPocsCombined.length})</span>
          </button>
        </div>

        {/* VIEW 1: ATTENDEE REGISTRATIONS LEDGER */}
        {activeView === 'registrations' && (userAccess.isSuperAdmin || userAccess.canAttendance || userAccess.canPaymentApprovals) && (
          <>
            {/* Metrics Row: Sleek & Compact on Laptop / Desktop */}
            {!userAccess.canRefunds && !userAccess.isSuperAdmin ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3">
                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Attendees</span>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-slate-900 mt-0.5 block">{totalDevotees}</span>
                  <span className="text-[8px] sm:text-[9.5px] text-slate-500 font-medium truncate block mt-0.5">
                    {activeDevoteesCount} Active • {cancelledDevoteesCount} Cancelled
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Active Devotees</span>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-emerald-600 mt-0.5 block">{activeDevoteesCount}</span>
                  <span className="text-[8px] sm:text-[9.5px] text-slate-400 truncate block mt-0.5">Confirmed &amp; Attending</span>
                </div>

                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Accommodation</span>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-blue-600 mt-0.5 block">{accommodationCount}</span>
                  <span className="text-[8px] sm:text-[9.5px] text-slate-400 block truncate mt-0.5">CV Stay / Room Required</span>
                </div>

                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Inter-Temple ITT</span>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-indigo-600 mt-0.5 block">{ittCount}</span>
                  <span className="text-[8px] sm:text-[9.5px] text-slate-400 block truncate mt-0.5">Temple Transfer Entries</span>
                </div>

                <div className={`p-2 sm:p-2.5 lg:p-3 rounded-xl border shadow-2xs ${
                  processingCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200/80'
                }`}>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Pending Verify</span>
                    {processingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  </span>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-amber-700 mt-0.5 block">{processingCount}</span>
                  <span className="text-[8px] sm:text-[9.5px] text-amber-800 font-semibold block truncate mt-0.5">Awaiting UTR Check</span>
                </div>

                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Cancelled Passes</span>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-rose-600 mt-0.5 block">{cancelledDevoteesCount}</span>
                  <span className="text-[8px] sm:text-[9.5px] text-slate-400 block truncate mt-0.5">Withdrawn from camp</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3">
                {/* 1. Gross Camp Value (Total Booking Value Before Waivers) */}
                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Camp Value</span>
                  <span className="text-sm sm:text-base lg:text-lg font-black text-slate-900 mt-0.5 block truncate">
                    ₹{grossBilledTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[9.5px] text-slate-500 font-medium truncate block mt-0.5">
                    {totalDevotees} Bookings ({activeDevoteesCount} Active • {cancelledDevoteesCount} Cancelled)
                  </span>
                </div>

                {/* 2. Coupons & Special Waivers */}
                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-orange-700 uppercase tracking-wider block flex items-center gap-1">
                    <Tag className="w-3 h-3 text-orange-600" />
                    <span>Coupons / Waivers</span>
                  </span>
                  <span className="text-sm sm:text-base lg:text-lg font-black text-orange-900 mt-0.5 block truncate">
                    -₹{totalDiscounts.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[9.5px] text-orange-800 font-medium block truncate mt-0.5">
                    {couponFreeCount} Coupon • {waiverCount} Waiver (₹0 Cash)
                  </span>
                </div>

                {/* 3. Net Cash Received (Actual Inflow in Bank & Gateway) */}
                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Cash Received</span>
                  <span className="text-sm sm:text-base lg:text-lg font-black text-emerald-700 mt-0.5 block truncate">
                    ₹{totalGrossReceived.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[9.5px] text-emerald-800 font-medium truncate block mt-0.5">
                    UPI: ₹{onlineReceived.toLocaleString('en-IN')} • ITT: ₹{ittReceived.toLocaleString('en-IN')} • IDT: ₹{idtReceived.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* 4. Total Cash Refunded Disbursed */}
                <div className={`p-2 sm:p-2.5 lg:p-3 rounded-xl border shadow-2xs ${
                  displayAttendeeRefundAmount > 0 ? 'bg-purple-50/70 border-purple-200' : 'bg-white border-slate-200/80'
                }`}>
                  <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Total Refunded</span>
                  <span className="text-sm sm:text-base lg:text-lg font-black text-purple-700 mt-0.5 block truncate">
                    ₹{displayAttendeeRefundAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[9.5px] text-purple-900 font-medium block truncate mt-0.5">
                    {displayAttendeeRefundCount} {isAttendeeFilterActive ? 'Refund(s)' : 'Payout(s) sent'}
                  </span>
                </div>

                {/* 5. Net Available Balance */}
                <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-slate-50 border border-indigo-300/80 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Net Balance</span>
                  <span className="text-sm sm:text-base lg:text-lg font-black text-indigo-700 mt-0.5 block truncate">
                    ₹{netAvailableAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[9.5px] text-indigo-800 font-semibold block truncate mt-0.5">
                    Cash Received - Refunded
                  </span>
                </div>

                {/* 6. Pending Verification */}
                <div className={`p-2 sm:p-2.5 lg:p-3 rounded-xl border shadow-2xs ${
                  processingCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200/80'
                }`}>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Pending Verify</span>
                    {processingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  </span>
                  <span className="text-sm sm:text-base lg:text-lg font-black text-amber-700 mt-0.5 block truncate">
                    ₹{totalPendingAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[8px] sm:text-[9.5px] text-amber-800 font-semibold block truncate mt-0.5">
                    {processingCount} Transfer(s) pending
                  </span>
                </div>
              </div>
            )}

        {/* Filters & Search Bar: Sleek & Compact */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search devotee name, phone, email, counselor, temple..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400 shadow-2xs hover:border-amber-400"
            />
          </form>

          <div className="grid grid-cols-2 md:flex md:flex-row items-stretch md:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            {/* Attendance Status Filter (Coming for Camp vs Cancelled) */}
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as any)}
              className="w-full md:w-auto px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] sm:text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all truncate"
            >
              <option value="all">All ({attendanceBaseRegistrations.length})</option>
              <option value="coming">🟢 Coming ({comingCount})</option>
              <option value="cancelled">🔴 Cancelled ({cancelledCount})</option>
            </select>

            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="w-full md:w-auto px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] sm:text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all truncate"
            >
              <option value="all">All Tracks ({registrations.length})</option>
              {camp?.tracks?.map((t) => (
                <option key={t} value={t}>{t} ({trackCounts[t] || 0})</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full md:w-auto px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] sm:text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all truncate"
            >
              <option value="all">All Roles ({roleBaseRegistrations.length})</option>
              {allDistinctRoles.map((role: string) => (
                <option key={role} value={role}>
                  {role} ({roleCounts[role] || 0})
                </option>
              ))}
            </select>

            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full md:w-auto px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] sm:text-xs font-bold text-slate-800 outline-none shadow-2xs hover:border-amber-400 focus:border-amber-500 cursor-pointer transition-all truncate"
            >
              <option value="all">All Payment &amp; Status</option>
              {waitingListCount > 0 && (
                <option value="WAITING_LIST">⏳ Waiting List ({waitingListCount})</option>
              )}
              <option value="PROCESSING">⏳ Pending ({processingCount})</option>
              <option value="REFUNDED">💸 Refunded ({cancelledDevoteesCount})</option>
              <option value="INTER_TEMPLE_TRANSFER">🏛️ ITT Transfer</option>
              <option value="RAZORPAY">Razorpay / UPI</option>
              <option value="IDT">IDT Transfer (NVCC)</option>
              <option value="COUPON">Promo / Coupon</option>
              <option value="ROLE_WAIVER">Role Waiver</option>
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
              {searchTerm || selectedTrack !== 'all' || selectedRole !== 'all' || selectedPayment !== 'all'
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
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-3 text-[10px] sm:text-[11px] uppercase tracking-wider">Participant</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider">Contact</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider">Temple &amp; VOICE</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider">Counselor</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider">Camp Track</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider">Itinerary</th>
                    <th className="py-2 px-1.5 sm:py-2.5 sm:px-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-center">Acc.</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap">Payment</th>
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-3 text-[10px] sm:text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Fee &amp; Status (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRegistrations.map((reg) => {
                    const { grossCost, discount, paidAmount, netReceived, isFreeMethod, isProcessing, pendingAmount } = getRegFinancials(reg);
                    const isItt = reg.payment_method === 'INTER_TEMPLE_TRANSFER' || reg.payment_method === 'ITT';
                    const couponLabel = reg.coupon_code || (reg.deduction_source && reg.deduction_source.includes('Coupon:') ? reg.deduction_source.replace('Coupon:', '').trim() : '');
                    const regRefundInfo = getRegRefundInfo(reg.id);
                    const isRefunded = reg.is_cancelled && regRefundInfo.status === 'refunded';
                    const isRefundPending = reg.is_cancelled && regRefundInfo.status === 'pending';
                    const isCancelledNoRefund = reg.is_cancelled && (!regRefundInfo.status || regRefundInfo.status === 'rejected');
                    const isTransferRejected = reg.payment_status === 'rejected';

                    const isIdtReg = (reg.payment_method || '').toUpperCase() === 'IDT';
                    const isDiscountOrFreeReg = Boolean(discount > 0 || isFreeMethod || reg.coupon_code);

                    const rowHighlightClass = isRefunded
                      ? 'bg-purple-100/80 hover:bg-purple-200/90 border-l-[6px] border-l-purple-600 text-slate-900'
                      : isRefundPending
                      ? 'bg-rose-100/80 hover:bg-rose-200/90 border-l-[6px] border-l-rose-600 text-slate-900'
                      : isTransferRejected
                      ? 'bg-rose-100/80 hover:bg-rose-200/90 border-l-[6px] border-l-rose-600 text-slate-900'
                      : isCancelledNoRefund
                      ? 'bg-rose-100/70 hover:bg-rose-200/80 border-l-[6px] border-l-rose-500 text-slate-900'
                      : isProcessing
                      ? 'bg-yellow-100/90 hover:bg-yellow-200 border-l-[6px] border-l-yellow-500 text-slate-900'
                      : isDiscountOrFreeReg
                      ? 'bg-orange-100/80 hover:bg-orange-200 border-l-[6px] border-l-orange-500 text-slate-900'
                      : isItt
                      ? 'bg-teal-100/75 hover:bg-teal-200 border-l-[6px] border-l-teal-600 text-slate-900'
                      : isIdtReg
                      ? 'bg-sky-100/75 hover:bg-sky-200 border-l-[6px] border-l-sky-600 text-slate-900'
                      : 'bg-emerald-100/75 hover:bg-emerald-200 border-l-[6px] border-l-emerald-600 text-slate-900';

                    return (
                      <tr key={reg.id} className={`${rowHighlightClass} transition-colors`}>
                        {/* Participant */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3">
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
                            {userAccess.isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenSuperAdminEdit(reg)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-[9px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105"
                                title="Super Admin Emergency Edit: Modify devotee details, meal counts, arrival/departure dates, or fees"
                              >
                                <Edit2 className="w-2.5 h-2.5 text-purple-700" />
                                <span>Edit</span>
                              </button>
                            )}
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
                        <td className="py-2 px-2 sm:py-2.5 sm:px-2.5">
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
                        <td className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-slate-700">
                          <div className="font-semibold text-slate-900">{reg.voice_name || '—'}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400">{reg.parent_temple || '—'}</div>
                        </td>

                        {/* Counselor & Center POC */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-slate-700">
                          <div className="font-semibold text-slate-900 leading-tight">{reg.counselor_name || '—'}</div>
                          {(reg.poc_name || reg.poc_contact) && (
                            <div className="mt-1 text-[10px] sm:text-[10.5px] leading-tight">
                              <div className="text-slate-500 font-medium truncate max-w-[130px]">
                                <span className="text-slate-400">POC: </span>
                                <span className="font-bold text-slate-800">{reg.poc_name || 'Coordinator'}</span>
                              </div>
                              {reg.poc_contact && (
                                <a
                                  href={`tel:${reg.poc_contact.replace(/[^0-9+]/g, '')}`}
                                  className="font-mono text-[9.5px] sm:text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                  title={`Call POC: ${reg.poc_name || ''}`}
                                >
                                  <Phone className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  <span>{reg.poc_contact}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Camp Track */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
                            {reg.camp_track}
                          </span>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{reg.participant_type}</div>
                        </td>

                        {/* Meal Span */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-2.5 text-[10px] sm:text-[11px] text-slate-600 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            <span className="text-slate-400 font-normal">Arr: </span>
                            {formatParticipantMealDate(reg.first_meal_date, camp?.start_date, camp?.meal_pricing)}
                            <span className="text-slate-500 font-normal"> ({reg.first_meal_type})</span>
                          </div>
                          <div className="font-semibold text-slate-800">
                            <span className="text-slate-400 font-normal">Dep: </span>
                            {formatParticipantMealDate(reg.last_meal_date, camp?.start_date, camp?.meal_pricing)}
                            <span className="text-slate-500 font-normal"> ({reg.last_meal_type})</span>
                          </div>
                        </td>

                        {/* Accommodation */}
                        <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 text-center">
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

                        {/* Payment & Proof: Compact, attractive 2-line layout */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-2.5 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            {/* Top Line: Method badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wide ${
                                isItt
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : reg.payment_method === 'RAZORPAY'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : reg.payment_method === 'IDT'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : reg.payment_method === 'COUPON'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : reg.payment_method === 'ROLE_WAIVER'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-50 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {isItt && <Landmark className="w-3 h-3 text-teal-700 shrink-0" />}
                              {reg.payment_method === 'RAZORPAY' && <CreditCard className="w-3 h-3 text-indigo-600 shrink-0" />}
                              {reg.payment_method === 'IDT' && <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />}
                              {reg.payment_method === 'COUPON' && <Tag className="w-3 h-3 text-emerald-600 shrink-0" />}
                              <span>{isItt ? 'Inter-Temple' : reg.payment_method}</span>
                            </span>

                            {/* Bottom Line: Date & Quick Actions */}
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {(reg.transaction_date || reg.payment_date) && (
                                <span className="inline-flex items-center gap-0.5 text-slate-500 font-mono font-medium" title={`Payment Date: ${formatDisplayDate(reg.transaction_date || reg.payment_date)}`}>
                                  <Calendar className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{formatDisplayDate(reg.transaction_date || reg.payment_date)}</span>
                                </span>
                              )}

                              {isItt || reg.payment_method === 'IDT' ? (
                                isProcessing ? (
                                  (userAccess.isSuperAdmin || userAccess.canPaymentApprovals) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenVerifyModal(reg)}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[9.5px] transition-colors cursor-pointer shadow-2xs"
                                      title="Click to cross-verify & approve"
                                    >
                                      <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                      <span>Verify</span>
                                    </button>
                                  ) : (
                                    <span className="text-amber-700 font-bold text-[9.5px] flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                                      <span>Pending</span>
                                    </span>
                                  )
                                ) : reg.payment_status === 'rejected' ? (
                                  <span className="text-rose-600 font-bold text-[9.5px] flex items-center gap-0.5">
                                    <XCircle className="w-2.5 h-2.5" />
                                    <span>Rejected</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setViewDetailsReg(reg)}
                                    className="inline-flex items-center gap-0.5 text-teal-700 hover:text-teal-900 hover:underline font-bold text-[10px] cursor-pointer"
                                    title="View transfer details & receipt"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Details</span>
                                  </button>
                                )
                              ) : couponLabel ? (
                                <span className="text-[9.5px] text-emerald-800 font-bold truncate max-w-[100px]" title={couponLabel}>
                                  🎟️ {couponLabel}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Fee & Status: Sleek, compact & fully visible */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3 text-right whitespace-nowrap">
                          {Boolean(reg.is_waiting_list && !reg.waiting_list_approved_at) ? (
                            <div className="inline-flex flex-col items-end px-2.5 py-1.5 rounded-xl bg-indigo-50/90 border border-indigo-300 shadow-2xs">
                              <span className="text-xs font-black text-indigo-950">
                                ₹{paidAmount.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[9.5px] text-indigo-800 font-extrabold flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5 text-indigo-600" /> Waiting List
                              </span>
                              {reg.hotel_name && (
                                <span className="text-[9px] text-slate-500 font-semibold max-w-[130px] truncate">
                                  {reg.hotel_name}
                                </span>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                {reg.hotel_receipt_url && (
                                  <a
                                    href={reg.hotel_receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200 text-[9px] font-bold inline-flex items-center gap-0.5 hover:bg-indigo-100 shadow-2xs"
                                    title="View Hotel Booking Receipt"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Receipt</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => reg.id && handleApproveWaitingList(reg.id)}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-extrabold flex items-center gap-0.5 shadow-2xs cursor-pointer"
                                  title="Approve accommodation & release pass to devotee"
                                >
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  <span>Approve Pass</span>
                                </button>
                              </div>
                            </div>
                          ) : isProcessing ? (
                            <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-amber-50/90 border border-amber-300 shadow-2xs">
                              <span className="text-xs font-black text-amber-950">
                                ₹{pendingAmount.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[9.5px] text-amber-800 font-bold flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" /> Pending Approval
                              </span>
                            </div>
                          ) : reg.payment_status === 'rejected' ? (
                            <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-300 shadow-2xs" title={reg.cancellation_reason || 'Rejected by Admin'}>
                              <span className="text-xs font-semibold text-slate-400 line-through">
                                ₹{grossCost.toLocaleString('en-IN')}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider mt-0.5">
                                <XCircle className="w-2.5 h-2.5" /> Rejected
                              </span>
                            </div>
                          ) : reg.is_cancelled ? (
                            isRefunded ? (
                              <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 shadow-2xs">
                                <div className="text-xs font-black text-purple-900">
                                  ₹{paidAmount.toLocaleString('en-IN')}
                                </div>
                                <span className="inline-flex items-center gap-1 text-[9.5px] text-purple-800 font-bold mt-0.5">
                                  <Undo2 className="w-2.5 h-2.5 text-purple-600" /> Refunded: ₹{regRefundInfo.amount.toLocaleString('en-IN')}
                                </span>
                                {paidAmount > regRefundInfo.amount && (
                                  <span className="text-[8.5px] text-purple-700 font-semibold mt-0.5">
                                    ₹{(paidAmount - regRefundInfo.amount).toLocaleString('en-IN')} Retained (Fee)
                                  </span>
                                )}
                              </div>
                            ) : isRefundPending ? (
                              <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 shadow-2xs">
                                <div className="text-xs font-black text-amber-900">
                                  ₹{paidAmount.toLocaleString('en-IN')}
                                </div>
                                <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-800 font-bold mt-0.5">
                                  <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" /> Refund Pending
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 shadow-2xs">
                                <span className="text-xs font-black text-rose-900">
                                  ₹{paidAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[9.5px] text-rose-700 font-bold mt-0.5">
                                  Cancelled (Non-refundable)
                                </span>
                              </div>
                            )
                          ) : isFreeMethod ? (
                            <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
                              <span className="text-xs font-black text-slate-800">
                                ₹0
                              </span>
                              <span className="text-[9.5px] text-purple-700 font-bold mt-0.5">
                                Waived
                              </span>
                            </div>
                          ) : discount > 0 ? (
                            <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 shadow-2xs">
                              <span className="text-xs font-black text-teal-950">
                                ₹{netReceived.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[9.5px] text-teal-700 font-bold flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" /> Full (-₹{discount})
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-xl bg-emerald-50/90 border border-emerald-300/90 shadow-2xs">
                              <span className="text-xs font-black text-emerald-900">
                                ₹{netReceived.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[9.5px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Received in Full
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
                    <th className="py-2 px-2.5 sm:py-2.5 sm:px-3">Original Payment</th>
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

                        {/* Original Payment */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3">
                          {(() => {
                            const origPay = getRefundOriginalPayment(req);
                            if (origPay.isIdt) {
                              return (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold">
                                    <Building2 className="w-3 h-3 text-amber-600" />
                                    <span>IDT</span>
                                  </span>
                                  <div className="text-[11px] font-bold text-slate-800 truncate max-w-[160px]" title={origPay.deductionSource ? `SERP: ${origPay.deductionSource}` : 'IDT Deduction'}>
                                    {origPay.deductionSource ? `SERP: ${origPay.deductionSource}` : 'IDT Deduction'}
                                  </div>
                                  {origPay.voiceName && (
                                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]" title={`Center: ${origPay.voiceName}`}>
                                      {origPay.voiceName}
                                    </div>
                                  )}
                                  {origPay.passcode && (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/70 border border-amber-200 text-[9.5px] font-mono font-bold text-amber-900" title="IDT Authorization Code Used">
                                      <KeyRound className="w-2.5 h-2.5 text-amber-700" />
                                      <span>{origPay.passcode}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            if (origPay.isItt) {
                              return (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-300 text-[10px] font-bold">
                                    <Landmark className="w-3 h-3 text-indigo-600" />
                                    <span>ITT</span>
                                  </span>
                                  <div className="text-[11px] font-mono font-bold text-slate-800 truncate max-w-[160px]" title={origPay.txnRef || ''}>
                                    UTR: {origPay.txnRef || '—'}
                                  </div>
                                  {origPay.screenshotUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewScreenshotUrl(origPay.screenshotUrl || null)}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      <span>View Proof</span>
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            if (origPay.isRazorpay) {
                              return (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold">
                                    <CreditCard className="w-3 h-3 text-blue-600" />
                                    <span>Razorpay</span>
                                  </span>
                                  <div className="text-[10px] font-mono font-bold text-slate-700 truncate max-w-[160px]" title={origPay.paymentId || ''}>
                                    {origPay.paymentId ? origPay.paymentId : 'Online Gateway'}
                                  </div>
                                </div>
                              );
                            }
                            if (origPay.isCash) {
                              return (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                    <Banknote className="w-3 h-3 text-emerald-600" />
                                    <span>Cash</span>
                                  </span>
                                </div>
                              );
                            }
                            if (origPay.isCoupon) {
                              return (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 text-[10px] font-bold">
                                    <Tag className="w-3 h-3 text-purple-600" />
                                    <span>{origPay.methodUpper || 'Coupon'}</span>
                                  </span>
                                  {origPay.couponCode && (
                                    <div className="text-[10px] font-mono font-bold text-purple-700">
                                      {origPay.couponCode}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold">
                                  <span>{origPay.rawMethod || 'Standard'}</span>
                                </span>
                              </div>
                            );
                          })()}
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
                                    toast.success('Copied UPI ID: ' + req.upi_id);
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
                                    toast.success('Copied Account Number: ' + req.account_number);
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

    {/* VIEW: ACCOMMODATION & HOUSING MANAGEMENT */}
    {activeView === 'accommodation' && (
      <CampAccommodationTab
        campId={campId}
        camp={camp}
        registrations={registrations}
        onViewPass={(regId) => {
          const found = registrations.find(r => r.id === regId);
          if (found) setViewPassReg(found);
        }}
        onApproveWaitingList={async (regId) => {
          await handleApproveWaitingList(regId);
        }}
        onRefresh={() => {
          loadData();
        }}
      />
    )}

    {/* VIEW 4: CENTER POC DIRECTORY & COORDINATORS */}
    {activeView === 'pocs' && (
      <div className="space-y-3 sm:space-y-4">
        {/* Header Banner & Quick Sharing Actions */}
        <div className="p-3 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Center POC Directory &amp; Coordinators
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  Contact list of center coordinators handling devotee registrations for {camp?.title || 'this camp'}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyAllPocs}
              disabled={allCampPocsCombined.length === 0}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Copy entire formatted POC directory to clipboard"
            >
              {copiedAllPocs ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copiedAllPocs ? 'Copied Directory!' : 'Copy Directory'}</span>
            </button>

            <a
              href={getWhatsAppPocsShareLink()}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 ${
                allCampPocsCombined.length === 0 ? 'pointer-events-none opacity-50' : ''
              }`}
              title="Share POC directory on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={pocSearchTerm}
              onChange={(e) => setPocSearchTerm(e.target.value)}
              placeholder="Search center, coordinator name, phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 font-semibold self-end sm:self-auto">
            Showing <strong className="text-slate-900">{filteredCampPocs.length}</strong> centers • <strong className="text-slate-900">{activeDevoteesCount}</strong> total attendees
          </div>
        </div>

        {/* POC Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredCampPocs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-1">
              <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No center POCs found matching your search</p>
              <p className="text-[11px]">POCs are recorded as center managers begin registering devotees.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 uppercase tracking-wider text-[10px]">#</th>
                    <th className="py-2.5 px-3 uppercase tracking-wider text-[10px]">Center Name</th>
                    <th className="py-2.5 px-3 uppercase tracking-wider text-[10px]">Point of Contact (POC)</th>
                    <th className="py-2.5 px-3 uppercase tracking-wider text-[10px]">Mobile Number</th>
                    <th className="py-2.5 px-3 uppercase tracking-wider text-[10px] text-center">Attendees</th>
                    <th className="py-2.5 px-3 uppercase tracking-wider text-[10px] text-right">Quick Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCampPocs.map((poc, idx) => {
                    const cleanPhone = (poc.pocPhone || '').replace(/[^0-9]/g, '').slice(-10);
                    const isCopied = copiedPocId === poc.id;
                    return (
                      <tr key={poc.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-slate-900 block text-xs">
                            {poc.centerName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {poc.pocName.charAt(0).toUpperCase()}
                            </div>
                            <span>{poc.pocName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {poc.pocPhone ? (
                            <a
                              href={`tel:${poc.pocPhone}`}
                              className="text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1"
                              title="Click to call"
                            >
                              <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{poc.pocPhone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-normal italic">Not recorded</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            {poc.attendeesCount} Devotee{poc.attendeesCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {cleanPhone && (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition-colors shadow-2xs"
                                  title={`Call ${poc.pocName}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hare Krishna HG ${poc.pocName}ji! Regarding ${camp?.title || 'Camp'} devotee registrations for ${poc.centerName}:`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors shadow-2xs"
                                  title={`WhatsApp ${poc.pocName}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                </a>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${poc.pocName} (${poc.centerName}) - ${poc.pocPhone}`);
                                setCopiedPocId(poc.id);
                                setTimeout(() => setCopiedPocId(null), 2000);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                              title="Copy contact"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

    {/* VIEW 5: ALL TRANSACTIONS & TRANSFER BATCHES (FINANCIAL AUDIT & BATCH ACTIONS) */}
    {activeView === 'batches' && (userAccess.isSuperAdmin || userAccess.canPaymentApprovals) && (
      <div className="space-y-3 sm:space-y-4">
        {/* Financial Summary & Reconciliation Cards (Matches Audit Desk Waterfall) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {/* Card 1: Gross Value (Total Transactions before discounts) */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Total Transactions</span>
              {isBatchFilterActive && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
                  Filtered
                </span>
              )}
            </div>
            <div className="text-sm sm:text-base lg:text-lg font-black text-slate-900 mt-0.5">
              ₹{(isBatchFilterActive ? grossBatchesAmount : grossBilledTotal).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block truncate mt-0.5">
              {isBatchFilterActive ? (
                <>{filteredBatches.length} of {transferBatches.length} Batches</>
              ) : (
                <>{transferBatches.length} Batches • {totalDevoteesInBatches} Devotees</>
              )}
            </span>
          </div>

          {/* Card 2: Coupons & Special Waivers */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50/50 border border-orange-200/80 shadow-2xs">
            <span className="text-[9.5px] sm:text-[10.5px] font-bold text-orange-800 uppercase tracking-wider flex items-center justify-between">
              <span>Coupons / Waivers</span>
              <Tag className="w-3.5 h-3.5 text-orange-600" />
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-orange-700 mt-0.5">
              -₹{(isBatchFilterActive ? totalDiscountAmount : totalDiscounts).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-orange-900 font-semibold block truncate mt-0.5">
              {discountBatchesCount} Subsidized Batches
            </span>
          </div>

          {/* Card 3: Net Cash Received (Actual Inflow in Bank & Gateway) */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300 shadow-2xs">
            <span className="text-[9.5px] sm:text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>Net Cash Received</span>
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-700 mt-0.5">
              ₹{(isBatchFilterActive ? approvedBatchesAmount : totalGrossReceived).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-800 font-semibold block truncate mt-0.5">
              Inflow in Bank &amp; Gateway
            </span>
          </div>

          {/* Card 4: Razorpay Inflow */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[9.5px] sm:text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>Razorpay Gateway</span>
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-600 mt-0.5">
              ₹{razorpayAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-800 font-semibold block truncate mt-0.5">
              {razorpayBatchesCount} Online Transactions
            </span>
          </div>

          {/* Card 5: ITT & IDT Transfers */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[9.5px] sm:text-[10.5px] font-bold text-teal-800 uppercase tracking-wider flex items-center justify-between">
              <span>Transfers (ITT / IDT)</span>
              <Landmark className="w-3.5 h-3.5 text-teal-600" />
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-teal-700 mt-0.5">
              ₹{(ittAmount + idtAmount).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block truncate mt-0.5">
              ITT: ₹{ittAmount.toLocaleString('en-IN')} • IDT: ₹{idtAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Card 6: Completed Refunds */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 shadow-2xs">
            <span className="text-[9.5px] sm:text-[10.5px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
              <span>Total Refunded</span>
              <Undo2 className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-purple-700 mt-0.5">
              ₹{(isBatchFilterActive ? batchRefundAmount : completedRefundAmount).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-purple-900 font-semibold block truncate mt-0.5">
              {isBatchFilterActive ? `${batchRefundsCount} Refunded Batch(es)` : `${completedRefundsCount} Payout(s) Disbursed`}
            </span>
          </div>

          {/* Card 7: Net Available Balance */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 shadow-2xs">
            <span className="text-[9.5px] sm:text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider flex items-center justify-between">
              <span>Net Available</span>
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-indigo-700 mt-0.5">
              ₹{(isBatchFilterActive ? batchNetAvailableAmount : netAvailableAmount).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-indigo-800 font-semibold block truncate mt-0.5">
              Inflow - Completed Refunds
            </span>
          </div>
        </div>

        {/* Action Needed Banner if pending approval */}
        {totalPendingBatchesCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-amber-900 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span><strong>Action Needed:</strong> {totalPendingBatchesCount} offline transfer batch(es) totaling ₹{totalPendingBatchesAmount.toLocaleString('en-IN')} awaiting review &amp; verification.</span>
            </div>
            <button
              onClick={() => {
                setBatchStatusFilter('processing');
                setBatchMethodFilter('all');
                setBatchSearchTerm('');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
            >
              Filter Pending Batches
            </button>
          </div>
        )}

        {/* Filters, Search & Ledger Exports Bar */}
        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={batchSearchTerm}
              onChange={(e) => setBatchSearchTerm(e.target.value)}
              placeholder="Search by payer / POC name, phone, Razorpay ID, bank UTR, center, or attendee..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <select
              value={batchMethodFilter}
              onChange={(e: any) => setBatchMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Payment Modes ({transferBatches.length})</option>
              <option value="RAZORPAY">Razorpay Gateway ({totalRazorpayBatchesCount})</option>
              <option value="ITT">Inter-Temple Transfer (ITT) ({totalIttBatchesCount})</option>
              <option value="IDT">Dept Transfer (IDT) ({totalIdtBatchesCount})</option>
              <option value="DISCOUNT">Coupons &amp; Discounts ({totalDiscountBatchesCount})</option>
            </select>

            <select
              value={batchStatusFilter}
              onChange={(e: any) => setBatchStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Statuses ({transferBatches.length})</option>
              <option value="completed">✔ Approved / Completed ({totalApprovedBatchesCount})</option>
              <option value="processing">⏳ Pending Verification ({totalPendingBatchesCount})</option>
              <option value="rejected">✕ Rejected ({totalRejectedBatchesCount})</option>
            </select>

            {isBatchFilterActive && (
              <button
                type="button"
                onClick={() => {
                  setBatchMethodFilter('all');
                  setBatchStatusFilter('all');
                  setBatchSearchTerm('');
                }}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Reset all batch filters"
              >
                <X className="w-3.5 h-3.5 text-amber-700" />
                <span>Clear Filters ({filteredBatches.length}/{transferBatches.length})</span>
              </button>
            )}

            {/* Direct Ledger Export Action Buttons (Excel & CSV) */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <button
                type="button"
                onClick={() => handleExportBatches('xlsx')}
                disabled={filteredBatches.length === 0}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                title="Export Batches Ledger to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportBatches('csv')}
                disabled={filteredBatches.length === 0}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                title="Export Batches Ledger to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Color Guide Legend (Matches Financial Audit) */}
        <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-semibold text-slate-700 shadow-2xs">
          <span className="font-bold flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-800">
            <Tag className="w-3 h-3 text-amber-600" />
            <span>Color Guide:</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600"></span>
            <span className="text-emerald-950 font-bold">Money In (Razorpay)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 border border-teal-600"></span>
            <span className="text-teal-950">Inter-Temple (ITT)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-600"></span>
            <span className="text-sky-950">Dept Transfer (IDT)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-orange-500"></span>
            <span className="text-orange-950">Coupon / Discount</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500 animate-pulse"></span>
            <span className="text-amber-950 font-bold">Verification Pending</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600"></span>
            <span className="text-rose-950">Rejected</span>
          </span>
        </div>

        {/* Transactions & Batches Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredBatches.length === 0 ? (
            <div className="text-center py-16 p-6">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Transactions Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                {batchSearchTerm || batchMethodFilter !== 'all' || batchStatusFilter !== 'all'
                  ? 'Try adjusting your search query or filters.'
                  : 'No payment transactions recorded for this camp yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">Date &amp; Time</th>
                    <th className="py-2 px-2.5">Center &amp; Payer / POC</th>
                    <th className="py-2 px-2.5 text-center">Attendees in Batch</th>
                    <th className="py-2 px-2.5">Payment Method &amp; Ref</th>
                    <th className="py-2 px-2.5">Amount Paid</th>
                    <th className="py-2 px-2.5">Status</th>
                    <th className="py-2 px-2.5 text-right">Audit &amp; Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((b) => {
                    const isPending = b.status === 'processing';
                    const isRejected = b.status === 'rejected';
                    const isExpanded = expandedBatchId === b.key;

                    // Compute distinct row shading & solid left accent bar (Rich & clearly visible)
                    let rowBorderClass = '';
                    if (isPending) {
                      rowBorderClass = 'border-l-[6px] border-l-yellow-500 bg-yellow-100/90 hover:bg-yellow-200 text-slate-900 shadow-2xs';
                    } else if (isRejected) {
                      rowBorderClass = 'border-l-[6px] border-l-rose-600 bg-rose-100/85 hover:bg-rose-200 text-slate-900 shadow-2xs';
                    } else if (b.isDiscountOrFree) {
                      rowBorderClass = 'border-l-[6px] border-l-orange-500 bg-orange-100/80 hover:bg-orange-200 text-slate-900 shadow-2xs';
                    } else if (b.isItt) {
                      rowBorderClass = 'border-l-[6px] border-l-teal-600 bg-teal-100/75 hover:bg-teal-200 text-slate-900 shadow-2xs';
                    } else if (b.isIdt) {
                      rowBorderClass = 'border-l-[6px] border-l-sky-600 bg-sky-100/75 hover:bg-sky-200 text-slate-900 shadow-2xs';
                    } else {
                      // Razorpay / Standard Money in
                      rowBorderClass = 'border-l-[6px] border-l-emerald-600 bg-emerald-100/75 hover:bg-emerald-200 text-slate-900 shadow-2xs';
                    }

                    const cleanPhone = (b.pocContact || '').replace(/[^0-9]/g, '').slice(-10);

                    return (
                      <React.Fragment key={b.key}>
                        <tr className={`${rowBorderClass} transition-colors`}>
                          {/* Date & Time */}
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-xs">
                              {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {b.createdAt ? new Date(b.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </div>
                            {b.transactionDate && (
                              <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[9.5px] font-semibold" title="Devotee Bank Transaction Date">
                                <Calendar className="w-2.5 h-2.5 text-teal-600" />
                                <span>Txn: {formatDisplayDate(b.transactionDate)}</span>
                              </div>
                            )}
                          </td>

                          {/* Center & Payer / POC */}
                          <td className="py-2 px-2.5">
                            <div className="font-extrabold text-slate-900 text-xs leading-tight">
                              {b.centerName}
                            </div>
                            <div className="text-[11px] text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                              <span className="text-slate-400 font-normal">Payer / POC:</span>
                              <span>{b.pocName}</span>
                            </div>
                            {b.pocContact && (
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-700 mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <a href={`tel:${cleanPhone}`} className="hover:underline">
                                  {b.pocContact}
                                </a>
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hare Krishna HG ${b.pocName}ji! Regarding your ${b.isRazorpay ? 'Razorpay' : (b.isItt ? 'ITT' : 'IDT')} batch payment for ${camp?.title || 'Camp'}:`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 text-emerald-600 hover:text-emerald-800"
                                    title="WhatsApp POC"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-600 inline" />
                                  </a>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Attendees in Batch */}
                          <td className="py-2 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedBatchId(isExpanded ? null : b.key)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                              title="Click to view all devotees in this batch"
                            >
                              <Users className="w-3 h-3 text-indigo-600" />
                              <span>{b.attendeesCount} Active</span>
                              {b.cancelledAttendeesCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold text-[9px]">
                                  {b.cancelledAttendeesCount} cancelled
                                </span>
                              )}
                              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            <span className="block text-[9.5px] text-slate-400 mt-0.5">
                              {isExpanded ? 'Click to collapse' : 'Click to preview list'}
                            </span>
                          </td>

                          {/* Payment Method & Ref */}
                          <td className="py-2 px-2.5">
                            {b.isRazorpay ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-black text-[10.5px] uppercase tracking-wide">
                                  <CreditCard className="w-3 h-3 text-emerald-700" />
                                  <span>Razorpay</span>
                                </span>
                                <div className="text-[10.5px] font-mono font-bold text-slate-800 line-clamp-1 select-all" title={b.paymentId || b.transactionRef}>
                                  Ref: <span className="text-slate-950 font-bold">{b.paymentId || b.transactionRef || 'Online'}</span>
                                </div>
                                {b.orderId && (
                                  <div className="text-[10px] font-mono text-slate-500 line-clamp-1" title={b.orderId}>
                                    Order: {b.orderId}
                                  </div>
                                )}
                              </div>
                            ) : b.isItt ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-300 font-black text-[10.5px] uppercase tracking-wide">
                                  <Landmark className="w-3 h-3 text-teal-700" />
                                  <span>ITT Bank Transfer</span>
                                </span>
                                <div className="text-[10.5px] font-mono font-bold text-slate-800">
                                  UTR: <span className="select-all text-slate-950">{b.transactionRef || 'Pending Ref'}</span>
                                </div>
                                {b.screenshotUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewScreenshotUrl(b.screenshotUrl || null)}
                                    className="text-[10px] text-teal-700 hover:text-teal-900 font-bold underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>View Receipt Proof</span>
                                  </button>
                                )}
                              </div>
                            ) : b.isIdt ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-300 font-black text-[10.5px] uppercase tracking-wide">
                                  <Building2 className="w-3 h-3 text-sky-700" />
                                  <span>IDT Dept Transfer</span>
                                </span>
                                <div className="text-[10.5px] font-semibold text-slate-800">
                                  Project: <strong className="text-slate-950">{b.deductionSource || b.centerName}</strong>
                                </div>
                                {b.passcode && (
                                  <div className="text-[10px] font-mono text-slate-500">
                                    Code: <span className="font-bold text-slate-700">{b.passcode}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-300 font-black text-[10.5px] uppercase tracking-wide">
                                  <Tag className="w-3 h-3 text-orange-700" />
                                  <span>{b.paymentMethod}</span>
                                </span>
                                <div className="text-[10.5px] font-bold text-orange-950">
                                  {b.couponCode ? `Coupon: ${b.couponCode}` : 'Complimentary / Role Waiver'}
                                </div>
                                {b.discountAmount > 0 && (
                                  <div className="text-[10px] text-orange-700 font-semibold">
                                    Subsidized: ₹{b.discountAmount.toLocaleString('en-IN')}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Amount Paid & Itemized Division */}
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span className="text-sm font-black text-slate-900 block">
                              ₹{b.totalAmount.toLocaleString('en-IN')}
                            </span>
                            {b.refundAmount > 0 ? (
                              <span className="text-[9.5px] text-purple-700 font-bold block">
                                Refunded: ₹{b.refundAmount.toLocaleString('en-IN')}
                              </span>
                            ) : b.cancelledAttendeesCount > 0 ? (
                              <span className="text-[9.5px] text-rose-600 font-bold block">
                                {b.cancelledAttendeesCount} cancelled
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium block">
                                ₹{Math.round(b.totalAmount / (b.totalRegisteredCount || b.attendeesCount || 1)).toLocaleString('en-IN')} / devotee
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              Meals: ₹{b.mealCost} | Stay: ₹{b.accCost}
                              {Boolean(b.lateFee) && ` | Late: ₹${b.lateFee}`}
                              {Boolean(b.entryCost) && ` | Kit: ₹${b.entryCost}`}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10.5px]">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                <span>Pending Verification</span>
                              </span>
                            ) : isRejected ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[10.5px]">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Transfer Rejected</span>
                                </span>
                                {b.rejectionReason && (
                                  <span className="block text-[9.5px] text-rose-600 max-w-[130px] truncate" title={b.rejectionReason}>
                                    {b.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : b.refundStatus === 'refunded' || (b.cancelledAttendeesCount > 0 && b.activeAttendeesCount === 0 && b.refundAmount > 0) ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-300 font-bold text-[10.5px]">
                                  <Undo2 className="w-3 h-3 text-purple-600" />
                                  <span>Refunded (₹{b.refundAmount.toLocaleString('en-IN')})</span>
                                </span>
                                {b.verifiedBy && (
                                  <span className="block text-[9px] text-slate-400" title={`Verified by ${b.verifiedBy}`}>
                                    by {b.verifiedBy.split('@')[0]}
                                  </span>
                                )}
                              </div>
                            ) : b.refundStatus === 'pending' || (b.cancelledAttendeesCount > 0 && b.activeAttendeesCount === 0) ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[10.5px] animate-pulse">
                                  <Undo2 className="w-3 h-3 text-rose-600" />
                                  <span>Refund Pending</span>
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10.5px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Completed</span>
                                </span>
                                {b.verifiedBy && (
                                  <span className="block text-[9px] text-slate-400" title={`Verified by ${b.verifiedBy}`}>
                                    by {b.verifiedBy.split('@')[0]}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Audit & Action */}
                          <td className="py-2 px-2.5 text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenBatchVerifyModal(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                  title="Approve all attendees in this batch at once"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Verify &amp; Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBatchRejectModal(b)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                                  title="Reject batch"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInspectingBatch(b)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                title="Inspect transaction and devotee details"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Inspect</span>
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Inline Expandable Attendees Sub-row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 border-b border-slate-200">
                            <td colSpan={7} className="p-3 sm:p-4">
                              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Devotees in this Transaction ({b.attendees.length})</span>
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Batch / Txn ID: <span className="font-mono">{b.batchId}</span>
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {b.attendees.map((att: any, aIdx: number) => {
                                    const isAttCancelled = Boolean(att.isCancelled);
                                    return (
                                      <div
                                        key={att.id}
                                        className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border transition-all ${
                                          isAttCancelled
                                            ? 'bg-rose-50/90 border-rose-300 text-rose-900 shadow-2xs'
                                            : 'bg-slate-50 border-slate-200/80 text-slate-900'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="font-bold truncate flex items-center gap-1.5">
                                            <span className={`font-mono text-[10px] ${isAttCancelled ? 'text-rose-500' : 'text-slate-400'}`}>
                                              {aIdx + 1}.
                                            </span>
                                            <span className={isAttCancelled ? 'text-rose-800 font-extrabold line-through decoration-rose-400' : 'text-slate-900 font-bold'}>
                                              {att.name}
                                            </span>
                                            {isAttCancelled && (
                                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 border border-rose-300 shrink-0">
                                                Cancelled
                                              </span>
                                            )}
                                          </div>
                                          <div className={`text-[10px] flex items-center gap-1 ${isAttCancelled ? 'text-rose-600' : 'text-slate-500'}`}>
                                            <span>{att.track}</span>
                                            {att.whatsapp && <span>• {att.whatsapp}</span>}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className={`font-black text-xs block ${isAttCancelled ? 'text-rose-700 line-through' : 'text-slate-800'}`}>
                                            ₹{att.cost.toLocaleString('en-IN')}
                                          </span>
                                          {isAttCancelled && (
                                            <span className="text-[9px] font-bold text-rose-600 block">Refunded</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
  </div>

  {/* BATCH VERIFY & APPROVE MODAL */}
  {verifyingBatch && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Verify &amp; Approve Transfer Batch
              </h3>
              <p className="text-[11px] text-slate-500">
                {verifyingBatch.cancelledAttendeesCount > 0
                  ? `Approving will mark ${verifyingBatch.activeAttendeesCount || verifyingBatch.attendeesCount} active devotees as confirmed. ${verifyingBatch.cancelledAttendeesCount} cancelled devotees will remain cancelled.`
                  : `Approving this batch will mark all ${verifyingBatch.attendeesCount} devotees as paid & confirmed.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerifyingBatch(null)}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Batch Overview Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Center &amp; Temple:</span>
            <span className="font-bold text-slate-900">{verifyingBatch.centerName} ({verifyingBatch.parentTemple || 'NVCC'})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Payer / POC:</span>
            <span className="font-bold text-slate-900">{verifyingBatch.pocName} ({verifyingBatch.pocContact})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Payment Mode:</span>
            <span className="font-bold text-teal-800">{verifyingBatch.isItt ? 'Inter-Temple Transfer (ITT)' : 'Inter-Department Transfer (IDT)'}</span>
          </div>
          {verifyingBatch.isIdt && verifyingBatch.deductionSource && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Project Name (SERP):</span>
              <span className="font-bold text-sky-900">{verifyingBatch.deductionSource}</span>
            </div>
          )}
          {verifyingBatch.transactionDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Devotee Transfer Date:</span>
              <span className="font-mono font-bold text-slate-900">{formatDisplayDate(verifyingBatch.transactionDate)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-extrabold text-sm">
            <span className="text-slate-800">Total Batch Amount:</span>
            <div className="text-right">
              <span className="text-emerald-700 font-black">₹{verifyingBatch.totalAmount.toLocaleString('en-IN')}</span>
              <span className="text-xs text-slate-600 font-bold ml-1.5">
                ({verifyingBatch.activeAttendeesCount ?? verifyingBatch.attendeesCount} Active)
              </span>
              {verifyingBatch.cancelledAttendeesCount > 0 && (
                <span className="block text-[10px] text-rose-600 font-bold">
                  {verifyingBatch.cancelledAttendeesCount} devotee(s) cancelled pre-transfer (excluded)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Devotees preview in modal */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Devotees Included in Batch:</span>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50 space-y-1 text-xs">
            {verifyingBatch.attendees.map((att: any, i: number) => {
              if (att.isCancelled) {
                return (
                  <div key={att.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded bg-rose-50/70 border border-rose-200/60 text-slate-400">
                    <span className="line-through flex items-center gap-1.5 truncate">
                      <span>{i + 1}. {att.name} ({att.track})</span>
                      <span className="no-underline px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[9px] shrink-0">
                        Cancelled (Pre-IDT)
                      </span>
                    </span>
                    <span className="line-through font-mono text-[11px] text-rose-400 shrink-0">
                      ₹{att.cost.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              }
              return (
                <div key={att.id} className="flex items-center justify-between text-slate-700 py-0.5 px-1">
                  <span>{i + 1}. {att.name} ({att.track})</span>
                  <span className="font-bold font-mono text-emerald-800">₹{att.cost.toLocaleString('en-IN')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleApproveBatch} className="space-y-3">
          {batchVerifyError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {batchVerifyError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {verifyingBatch.isItt ? 'Bank UTR / Transaction Reference ID *' : 'IDT Verification Reference ID *'}
            </label>
            <input
              type="text"
              required
              value={batchVerifyTxnId}
              onChange={(e) => setBatchVerifyTxnId(e.target.value)}
              placeholder="e.g. UTR1234567890 or IDT-GGD-OCT"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Received Date *
            </label>
            <input
              type="date"
              required
              value={batchVerifyDate}
              onChange={(e) => setBatchVerifyDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Verification Remarks (Optional)
            </label>
            <input
              type="text"
              value={batchVerifyRemarks}
              onChange={(e) => setBatchVerifyRemarks(e.target.value)}
              placeholder="e.g. Verified with NVCC Temple Accounts / Approved by Project Manager"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setVerifyingBatch(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isApprovingBatch || (verifyingBatch.activeAttendeesCount !== undefined && verifyingBatch.activeAttendeesCount === 0)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isApprovingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>
                {isApprovingBatch
                  ? 'Approving...'
                  : verifyingBatch.cancelledAttendeesCount > 0
                  ? `Approve Active (${verifyingBatch.activeAttendeesCount || verifyingBatch.attendeesCount} Devotees)`
                  : `Approve All (${verifyingBatch.attendeesCount} Devotees)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* BATCH REJECT MODAL */}
  {rejectingBatch && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-black text-rose-900 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Reject Transfer Batch
        </h3>
        <p className="text-xs text-slate-600">
          Rejecting this batch will reject all {rejectingBatch.attendeesCount} devotees registered under this transfer.
        </p>
        <form onSubmit={handleRejectBatch} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection *</label>
            <textarea
              required
              rows={3}
              value={batchRejectReason}
              onChange={(e) => setBatchRejectReason(e.target.value)}
              placeholder="e.g. Bank UTR not found in bank statement / Invalid IDT deduction source"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRejectingBatch(null)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRejectingBatch}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isRejectingBatch ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* BATCH INSPECT MODAL */}
  {inspectingBatch && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Batch Transaction Inspection</h3>
              <p className="text-[10.5px] text-slate-500">Full audit details for this transfer submission</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInspectingBatch(null)}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Center:</span>
            <span className="font-bold text-slate-900">{inspectingBatch.centerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">POC:</span>
            <span className="font-bold text-slate-900">{inspectingBatch.pocName} ({inspectingBatch.pocContact})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Method:</span>
            <span className="font-bold text-slate-900">
              {inspectingBatch.isRazorpay
                ? 'Razorpay Online Gateway'
                : inspectingBatch.isItt
                ? 'Inter-Temple Transfer (ITT)'
                : inspectingBatch.isIdt
                ? 'IDT Dept Transfer'
                : (inspectingBatch.paymentMethod || 'Other')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">
              {inspectingBatch.isRazorpay ? 'Razorpay Payment ID:' : 'Reference / UTR:'}
            </span>
            <span className="font-mono font-bold text-slate-900 select-all">
              {inspectingBatch.paymentId || inspectingBatch.transactionRef || '—'}
            </span>
          </div>
          {inspectingBatch.orderId && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Razorpay Order ID:</span>
              <span className="font-mono text-slate-700 select-all">{inspectingBatch.orderId}</span>
            </div>
          )}
          {inspectingBatch.couponCode && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Coupon / Waiver Code:</span>
              <span className="font-bold text-orange-800">{inspectingBatch.couponCode}</span>
            </div>
          )}
          {inspectingBatch.deductionSource && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Project Name (as per SERP):</span>
              <span className="font-bold text-sky-900">{inspectingBatch.deductionSource}</span>
            </div>
          )}
          {inspectingBatch.passcode && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">IDT Passcode:</span>
              <span className="font-mono text-slate-700">{inspectingBatch.passcode}</span>
            </div>
          )}
          {inspectingBatch.transactionDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Transaction Date:</span>
              <span className="font-mono font-bold text-slate-900">{formatDisplayDate(inspectingBatch.transactionDate)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-extrabold text-sm">
            <span className="text-slate-800">Total Paid:</span>
            <span className="text-emerald-700">₹{inspectingBatch.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {inspectingBatch.screenshotUrl && (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Receipt Proof:</span>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 flex justify-center">
              <img src={inspectingBatch.screenshotUrl} alt="Receipt proof" className="max-h-60 object-contain" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Devotees ({inspectingBatch.attendees.length}):</span>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50 space-y-1 text-xs">
            {inspectingBatch.attendees.map((att: any, i: number) => (
              <div key={att.id} className="flex items-center justify-between text-slate-700">
                <span>{i + 1}. {att.name} ({att.track})</span>
                <span className="font-mono font-bold">₹{att.cost.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setInspectingBatch(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  )}

  {/* RECORD REFUND PAYOUT MODAL: Compact on Mobile */}
  {payoutModal.isOpen && payoutModal.refund && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-3.5 sm:p-5 shadow-2xl border border-slate-200 space-y-2.5 sm:space-y-3.5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {payoutModal.actionType === 'refund' ? 'Record Devotee Refund Payout' : 'Reject Refund Request'}
              </h3>
              <p className="text-[9.5px] sm:text-[11px] text-slate-500 truncate">
                Confirm payout transfer details for complete transparency
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPayoutModal(prev => ({ ...prev, isOpen: false }))}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {payoutModal.error && (
          <div className="p-2 sm:p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] sm:text-xs rounded-lg sm:rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>{payoutModal.error}</span>
          </div>
        )}

        {/* Devotee & Payout Summary Card: Compact */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5 text-[11px] sm:text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Devotee (POC):</span>
            <span className="font-bold text-slate-900 truncate max-w-[200px]">{payoutModal.refund.poc_name} ({payoutModal.refund.poc_contact})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Calculated Refund Amount:</span>
            <span className="text-sm sm:text-base font-black text-emerald-700">₹{Number(payoutModal.refund.refund_amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-1.5 border-t border-amber-200/60 flex items-start justify-between">
            <span className="text-slate-600">Transfer Target:</span>
            <div className="text-right">
              {payoutModal.refund.payout_type === 'UPI' ? (
                <span className="font-mono font-bold text-slate-900">{payoutModal.refund.upi_id}</span>
              ) : (
                <div>
                  <div className="font-mono font-bold text-slate-900">{payoutModal.refund.account_number}</div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-500">IFSC: {payoutModal.refund.ifsc_code} &bull; {payoutModal.refund.account_name}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Original Payment Information Card */}
        {(() => {
          const origPay = getRefundOriginalPayment(payoutModal.refund);
          return (
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-[11px] sm:text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Original Payment Method:</span>
                <div>
                  {origPay.isIdt ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] sm:text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>IDT (Inter-Department)</span>
                    </span>
                  ) : origPay.isItt ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-[10px] sm:text-[11px]">
                      <Landmark className="w-3.5 h-3.5 text-indigo-700" />
                      <span>ITT (Inter-Temple Transfer)</span>
                    </span>
                  ) : origPay.isRazorpay ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px] sm:text-[11px]">
                      <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                      <span>Razorpay Online Gateway</span>
                    </span>
                  ) : origPay.isCash ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] sm:text-[11px]">
                      <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Cash Payment</span>
                    </span>
                  ) : origPay.isCoupon ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold text-[10px] sm:text-[11px]">
                      <Tag className="w-3.5 h-3.5 text-purple-700" />
                      <span>Coupon / Role Waiver</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] sm:text-[11px]">
                      <span>{origPay.rawMethod || 'Standard Payment'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* IDT Specific Details */}
              {origPay.isIdt && (
                <div className="pt-1.5 border-t border-slate-200/70 space-y-1.5 bg-amber-50/70 -mx-1 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Project Name (as per SERP):</span>
                    <span className="font-bold text-slate-900 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-300/80">{origPay.deductionSource || '—'}</span>
                  </div>
                  {origPay.voiceName && (
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500">Deduction Center:</span>
                      <span className="font-bold text-slate-800">{origPay.voiceName}</span>
                    </div>
                  )}
                  {origPay.passcode && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">IDT Passcode Used:</span>
                      <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 text-[11px]">
                        <KeyRound className="w-3 h-3 text-amber-700" />
                        {origPay.passcode}
                      </span>
                    </div>
                  )}
                  {origPay.parentTemple && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Assigned Temple:</span>
                      <span className="font-medium text-slate-700">{origPay.parentTemple}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ITT Specific Details */}
              {origPay.isItt && (
                <div className="pt-1.5 border-t border-slate-200/70 space-y-1.5 bg-indigo-50/70 -mx-1 px-2.5 py-1.5 rounded-lg border border-indigo-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Devotee Bank UTR / Ref:</span>
                    <span className="font-mono font-bold text-slate-900 select-all">{origPay.txnRef || '—'}</span>
                  </div>
                  {origPay.screenshotUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Transfer Receipt Proof:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewScreenshotUrl(origPay.screenshotUrl || null)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        View Proof Image
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Razorpay Specific Details */}
              {origPay.isRazorpay && (
                <div className="pt-1.5 border-t border-slate-200/70 space-y-1.5 bg-blue-50/70 -mx-1 px-2.5 py-1.5 rounded-lg border border-blue-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Razorpay Payment ID:</span>
                    <span className="font-mono font-bold text-slate-900 select-all">{origPay.paymentId || '—'}</span>
                  </div>
                  {origPay.orderId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Order ID:</span>
                      <span className="font-mono text-slate-700 select-all">{origPay.orderId}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Coupon / Waiver Specific Details */}
              {origPay.couponCode && (
                <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-slate-600">Coupon Code:</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{origPay.couponCode}</span>
                </div>
              )}

              <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10.5px] text-slate-500">
                <span>Original Total Fee Paid:</span>
                <span className="font-bold text-slate-800">₹{Number(payoutModal.refund.original_total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleProcessPayout} className="space-y-2.5 sm:space-y-3">
          {payoutModal.actionType === 'refund' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                  Bank Transaction ID / UTR *
                </label>
                <input
                  type="text"
                  required
                  value={payoutModal.txnRef}
                  onChange={(e) => setPayoutModal({ ...payoutModal, txnRef: e.target.value })}
                  placeholder="e.g. UPI/1234567890 or NEFT..."
                  className="w-full px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                  Transfer Date *
                </label>
                <input
                  type="date"
                  required
                  value={payoutModal.payoutDate}
                  onChange={(e) => setPayoutModal({ ...payoutModal, payoutDate: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
              {payoutModal.actionType === 'refund' ? 'Admin Notes / Remarks (Optional)' : 'Rejection Reason / Remarks (Required) *'}
            </label>
            <textarea
              rows={2}
              required={payoutModal.actionType === 'reject'}
              value={payoutModal.notes}
              onChange={(e) => setPayoutModal({ ...payoutModal, notes: e.target.value })}
              placeholder={payoutModal.actionType === 'refund' ? 'e.g. Transferred via HDFC Current Account...' : 'e.g. Devotee requested withdrawal, wrong bank details, duplicate, etc.'}
              className="w-full px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPayoutModal(prev => ({
                ...prev,
                actionType: prev.actionType === 'refund' ? 'reject' : 'refund'
              }))}
              className="text-[10.5px] sm:text-xs font-semibold text-slate-500 hover:text-amber-700 text-center sm:text-left transition-colors cursor-pointer py-1"
            >
              {payoutModal.actionType === 'refund' ? '⇄ Switch to Reject Mode' : '⇄ Switch to Payout Mode'}
            </button>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPayoutModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={payoutModal.saving}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-full text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  payoutModal.actionType === 'refund'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {payoutModal.saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{payoutModal.actionType === 'refund' ? 'Confirm & Mark Refunded' : 'Confirm Rejection'}</span>
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

            {/* Original Payment Details */}
            {(() => {
              const origPay = getRefundOriginalPayment(viewRefundReceipt);
              return (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Original Payment:</span>
                    <div>
                      {origPay.isIdt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                          <Building2 className="w-3 h-3 text-amber-600" />
                          <span>IDT (Inter-Department)</span>
                        </span>
                      ) : origPay.isItt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold text-[10px]">
                          <Landmark className="w-3 h-3 text-indigo-600" />
                          <span>ITT (Inter-Temple Transfer)</span>
                        </span>
                      ) : origPay.isRazorpay ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-300 font-bold text-[10px]">
                          <CreditCard className="w-3 h-3 text-blue-600" />
                          <span>Razorpay Online</span>
                        </span>
                      ) : origPay.isCash ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                          <Banknote className="w-3 h-3 text-emerald-600" />
                          <span>Cash Payment</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                          <span>{origPay.rawMethod || 'Standard'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {origPay.isIdt && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Project Name (as per SERP):</span>
                        <span className="font-bold text-slate-900 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-300/80">{origPay.deductionSource || '—'}</span>
                      </div>
                      {origPay.voiceName && (
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-slate-500">Deduction Center:</span>
                          <span className="font-bold text-slate-800">{origPay.voiceName}</span>
                        </div>
                      )}
                      {origPay.passcode && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">IDT Passcode Used:</span>
                          <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                            <KeyRound className="w-2.5 h-2.5 text-amber-700" />
                            {origPay.passcode}
                          </span>
                        </div>
                      )}
                      {origPay.parentTemple && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Assigned Temple:</span>
                          <span className="font-medium text-slate-700">{origPay.parentTemple}</span>
                        </div>
                      )}
                    </>
                  )}

                  {origPay.isItt && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Devotee Bank UTR:</span>
                        <span className="font-mono font-bold text-slate-900 select-all">{origPay.txnRef || '—'}</span>
                      </div>
                      {origPay.screenshotUrl && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Receipt Proof:</span>
                          <button
                            type="button"
                            onClick={() => setPreviewScreenshotUrl(origPay.screenshotUrl || null)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            View Receipt Image
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {origPay.isRazorpay && origPay.paymentId && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Razorpay Payment ID:</span>
                      <span className="font-mono font-bold text-slate-900 select-all">{origPay.paymentId}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Original Total Fee Paid:</span>
                    <span className="font-bold text-slate-800">₹{Number(viewRefundReceipt.original_total_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}
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
              {viewDetailsReg.payment_method === 'IDT' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Devotee Center / Temple:</span>
                    <span className="font-bold text-slate-900">
                      {viewDetailsReg.voice_name || viewDetailsReg.current_center || viewDetailsReg.parent_temple || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Project Name (as per SERP):</span>
                    <span className="font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                      {viewDetailsReg.deduction_source || '—'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Transferring Temple / Center:</span>
                  <span className="font-bold text-emerald-800">
                    {viewDetailsReg.deduction_source || '—'}
                  </span>
                </div>
              )}
              {viewDetailsReg.transaction_date && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Devotee Transfer Date:</span>
                  <span className="font-bold text-slate-800">
                    {formatDisplayDate(viewDetailsReg.transaction_date)}
                  </span>
                </div>
              )}
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

              {viewDetailsReg.payment_method === 'IDT' && (viewDetailsReg.passcode || viewDetailsReg.transaction_ref) && (
                <div className="flex justify-between items-center text-slate-600 text-xs py-1 px-2.5 rounded-lg bg-amber-100/60 border border-amber-200">
                  <span className="text-amber-950 font-bold flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3 text-amber-700" /> IDT Code Used:
                  </span>
                  <span className="font-mono font-bold text-amber-900 text-xs">
                    {viewDetailsReg.passcode || viewDetailsReg.transaction_ref}
                  </span>
                </div>
              )}

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
              {verifyingReg.payment_method === 'IDT' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Devotee Center / Temple:</span>
                    <span className="font-bold text-slate-900">
                      {verifyingReg.voice_name || verifyingReg.current_center || verifyingReg.parent_temple || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Project Name (as per SERP):</span>
                    <span className="font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                      {verifyingReg.deduction_source || 'Not specified'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Transferring Temple / Center:</span>
                    <span className="font-bold text-emerald-800">
                      {verifyingReg.deduction_source || 'Not specified'}
                    </span>
                  </div>
                  {verifyingReg.transaction_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Devotee Transfer Date:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-teal-700" />
                        {formatDisplayDate(verifyingReg.transaction_date)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {verifyingReg.payment_method === 'IDT' && (
                <div className="flex justify-between items-center py-1.5 px-3 rounded-xl bg-amber-100/70 border border-amber-300">
                  <span className="text-amber-950 font-bold text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    IDT Passcode / Code Used:
                  </span>
                  <span className="font-mono font-black text-amber-950 tracking-wider text-xs px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 shadow-2xs">
                    {verifyingReg.passcode || verifyingReg.transaction_ref || 'Not Recorded'}
                  </span>
                </div>
              )}
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

            {/* Devotee Provided Ref & Date */}
            {(verifyingReg.transaction_ref || verifyingReg.transaction_date) && (
              <div className={`p-2.5 rounded-xl border text-xs grid grid-cols-1 ${verifyingReg.transaction_date && verifyingReg.transaction_ref ? 'sm:grid-cols-2' : ''} gap-2.5 ${
                verifyingReg.payment_method === 'IDT' ? 'bg-amber-50/60 border-amber-200' : 'bg-teal-50/60 border-teal-200'
              }`}>
                {verifyingReg.transaction_ref && (
                  <div>
                    <span className={`text-[10px] uppercase font-bold block ${
                      verifyingReg.payment_method === 'IDT' ? 'text-amber-800' : 'text-teal-800'
                    }`}>
                      {verifyingReg.payment_method === 'IDT' ? 'Devotee / Center IDT Reference' : 'Devotee Provided UTR / Reference'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{verifyingReg.transaction_ref}</span>
                  </div>
                )}
                {verifyingReg.transaction_date && (
                  <div>
                    <span className={`text-[10px] uppercase font-bold block ${
                      verifyingReg.payment_method === 'IDT' ? 'text-amber-800' : 'text-teal-800'
                    }`}>
                      Devotee Transaction Date
                    </span>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-700" />
                      {formatDisplayDate(verifyingReg.transaction_date)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Rejection Prompt Panel (when admin clicks Reject) */}
            {showRejectConfirm ? (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Reject this {verifyingReg.payment_method === 'IDT' ? 'IDT Transfer' : 'Transfer Request'}?</span>
                </div>
                <p className="text-[11px] text-rose-600 leading-relaxed">
                  This will mark the registration as <strong>Rejected</strong> and cancelled. The devotee&apos;s digital pass will not be active and the department cost will not be deducted.
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1">
                    Rejection Reason / Remarks (Required) *
                  </label>
                  <input
                    type="text"
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Unauthorized IDT code, Center manager declined transfer, Invalid center..."
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-rose-900 text-xs font-medium placeholder:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isRejecting}
                    onClick={() => setShowRejectConfirm(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Back to Approve
                  </button>
                  <button
                    type="button"
                    disabled={isRejecting}
                    onClick={handleConfirmRejection}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Confirm &amp; Reject</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                    onClick={() => setShowRejectConfirm(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-2xs"
                    title="Reject this transfer request"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject</span>
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
              </>
            )}
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

      {/* SUPER ADMIN EMERGENCY REGISTRATION EDIT MODAL */}
      {editModalReg && userAccess.isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl border border-purple-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 p-4 sm:p-5 text-white flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-300" />
                    Super Admin Emergency Override
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-purple-200 text-[10px] font-bold border border-white/20 font-mono">
                    Pass #T-{(editModalReg as any).serial_no || (editModalReg as any).token_no || 1}
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-black text-white leading-tight">
                  Edit Registration: {editModalReg.participant_name}
                </h3>
                <p className="text-[11px] sm:text-xs text-purple-200/90 leading-relaxed max-w-2xl">
                  Changes made here immediately update the live registration record, digital pass, and desk punch verification. The devotee&apos;s QR code token remains identical.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditModalReg(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error & Success Feedback Alerts */}
            {editError && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccess && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editSuccess}</span>
              </div>
            )}

            {/* Modal Form Content */}
            <form onSubmit={handleSaveSuperAdminEdit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* SECTION 1: Participant Identity & Contact */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <UserCheck className="w-4 h-4 text-purple-700" />
                  Devotee Identity &amp; Contact Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editFormData.participant_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, participant_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp / Phone (+91)</label>
                    <input
                      type="tel"
                      required
                      value={editFormData.whatsapp || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={editFormData.gender || 'Male'}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Married Since (Year)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2020 (Optional)"
                      value={editFormData.married_since_year || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, married_since_year: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Center, Temple & Counselor */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <Building className="w-4 h-4 text-purple-700" />
                  Center, Temple &amp; Counselor Allocation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Center / VOICE</label>
                    <input
                      type="text"
                      value={editFormData.voice_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, voice_name: e.target.value })}
                      placeholder="e.g. Central VOICE"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Parent Temple</label>
                    <input
                      type="text"
                      value={editFormData.parent_temple || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, parent_temple: e.target.value })}
                      placeholder="e.g. ISKCON NVCC • PUNE"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Counselor Name</label>
                    <input
                      type="text"
                      value={editFormData.counselor_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, counselor_name: e.target.value })}
                      placeholder="Counselor devotee name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Point of Contact (POC) Name</label>
                    <input
                      type="text"
                      value={editFormData.poc_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, poc_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">POC Contact Number</label>
                    <input
                      type="tel"
                      value={editFormData.poc_contact || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, poc_contact: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Camp Track & Participant Role */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  Camp Track &amp; Participant Role
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Camp Track</label>
                    <div className="space-y-1.5">
                      <select
                        value={editFormData.camp_track || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, camp_track: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                      >
                        {camp?.tracks?.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        {editFormData.camp_track && !camp?.tracks?.includes(editFormData.camp_track) && (
                          <option value={editFormData.camp_track}>{editFormData.camp_track}</option>
                        )}
                      </select>
                      <input
                        type="text"
                        placeholder="Or customize track title..."
                        value={editFormData.camp_track || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, camp_track: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-800 text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Participant Type / Role</label>
                    <select
                      value={editFormData.participant_type || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, participant_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    >
                      {camp?.participant_types?.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                      {editFormData.participant_type && !camp?.participant_types?.includes(editFormData.participant_type) && (
                        <option value={editFormData.participant_type}>{editFormData.participant_type}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Prasadam Meals, Arrival & Departure Dates (Medium Purple Shading) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 via-indigo-50/40 to-purple-50/60 border-2 border-purple-300/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                  <div>
                    <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-purple-700" />
                      Prasadam Dates &amp; Meal Slots (Pass Reflection)
                    </h4>
                    <p className="text-[10px] text-purple-800/80">
                      Modifying these dates directly updates the meal columns on the boy&apos;s digital pass and attendance desk punches.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecalculateMealCost}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
                    title="Recalculate meal & stay costs according to camp master schedule"
                  >
                    <Calculator className="w-3.5 h-3.5 text-purple-200" />
                    <span>Auto-Recalculate Fees</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Arrival Meal */}
                  <div className="p-3 rounded-xl bg-white/90 border border-purple-200 space-y-2">
                    <span className="text-[10px] uppercase font-black text-purple-900 tracking-wider block">
                      Arrival (First Meal)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Arrival Date</label>
                        <select
                          value={editFormData.first_meal_date || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, first_meal_date: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        >
                          {camp?.meal_pricing?.map((m) => (
                            <option key={m.date} value={String(m.date)}>
                              {m.label || `Day ${m.date}`}
                            </option>
                          ))}
                          {editFormData.first_meal_date && !camp?.meal_pricing?.some((m) => String(m.date) === String(editFormData.first_meal_date)) && (
                            <option value={editFormData.first_meal_date}>{editFormData.first_meal_date}</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">First Meal</label>
                        <select
                          value={editFormData.first_meal_type || 'Breakfast'}
                          onChange={(e) => setEditFormData({ ...editFormData, first_meal_type: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        >
                          <option value="Breakfast">Breakfast</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Departure Meal */}
                  <div className="p-3 rounded-xl bg-white/90 border border-purple-200 space-y-2">
                    <span className="text-[10px] uppercase font-black text-purple-900 tracking-wider block">
                      Departure (Last Meal)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Departure Date</label>
                        <select
                          value={editFormData.last_meal_date || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, last_meal_date: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        >
                          {camp?.meal_pricing?.map((m) => (
                            <option key={m.date} value={String(m.date)}>
                              {m.label || `Day ${m.date}`}
                            </option>
                          ))}
                          {editFormData.last_meal_date && !camp?.meal_pricing?.some((m) => String(m.date) === String(editFormData.last_meal_date)) && (
                            <option value={editFormData.last_meal_date}>{editFormData.last_meal_date}</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Last Meal</label>
                        <select
                          value={editFormData.last_meal_type || 'Lunch'}
                          onChange={(e) => setEditFormData({ ...editFormData, last_meal_type: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        >
                          <option value="Breakfast">Breakfast</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Evening Prasadam Selection (Dinner Type)</label>
                    <select
                      value={editFormData.dinner_type || 'Dinner Meal'}
                      onChange={(e) => setEditFormData({ ...editFormData, dinner_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    >
                      <option value="Dinner Meal">Dinner Meal (Full Dinner)</option>
                      <option value="Milk Only">Milk Only</option>
                      <option value="Both Dinner & Milk">Both Dinner &amp; Milk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Accommodation / Stay Included?</label>
                    <select
                      value={editFormData.accommodation || 'No'}
                      onChange={(e) => setEditFormData({ ...editFormData, accommodation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    >
                      <option value="Yes">Yes (Stay &amp; Bedding Included)</option>
                      <option value="No">No (Day Scholar / Outside Stay)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Registration Timestamp & Attendance */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <Clock className="w-4 h-4 text-purple-700" />
                  Registration Timestamp &amp; Attendance Check-In
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Registration Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editFormData.created_at || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, created_at: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Useful for adjusting late-fee eligibility, historical logs, and batch audits.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Checked-In Status at Desk
                    </label>
                    <select
                      value={editFormData.checked_in ? 'true' : 'false'}
                      onChange={(e) => setEditFormData({ ...editFormData, checked_in: e.target.value === 'true' })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 outline-none"
                    >
                      <option value="false">Not Checked In</option>
                      <option value="true">Checked In (Pass Verified at Desk)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Financials, Payment & Fees (Medium Green Shading) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-emerald-50/60 border-2 border-emerald-300/80 space-y-3">
                <div className="border-b border-emerald-200/60 pb-1.5">
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    Fees, Payment Method &amp; Transaction Details
                  </h4>
                  <p className="text-[10px] text-emerald-800">
                    You can override costs and update payment verification status.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Total Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.total_cost ?? 0}
                      onChange={(e) => setEditFormData({ ...editFormData, total_cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-black focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Meal Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.meal_cost ?? 0}
                      onChange={(e) => setEditFormData({ ...editFormData, meal_cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Stay Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.acc_cost ?? 0}
                      onChange={(e) => setEditFormData({ ...editFormData, acc_cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.discount_amount ?? 0}
                      onChange={(e) => setEditFormData({ ...editFormData, discount_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={editFormData.payment_status || 'completed'}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none"
                    >
                      <option value="completed">Completed (Confirmed Pass)</option>
                      <option value="pending">Pending Approval</option>
                      <option value="processing">Processing (Awaiting verification)</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed / Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={editFormData.payment_method || 'RAZORPAY'}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none"
                    >
                      <option value="RAZORPAY">Razorpay (Online)</option>
                      <option value="IDT">Internal Dept Transfer (IDT)</option>
                      <option value="INTER_TEMPLE_TRANSFER">Inter-Temple Transfer (ITT)</option>
                      <option value="FREE">Free Pass (Role Waiver)</option>
                      <option value="CASH">Cash / Manual</option>
                      <option value="COUPON">Coupon Pass</option>
                      <option value="ROLE_WAIVER">Role Waiver</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction Ref / UTR / Passcode</label>
                    <input
                      type="text"
                      value={editFormData.transaction_ref || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, transaction_ref: e.target.value })}
                      placeholder="e.g. Bank UTR or IDT Code"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditModalReg(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 hover:scale-[1.01]"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving &amp; Updating Live Pass...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Save &amp; Update Live Pass</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tent, Plus, Calendar, MapPin, Users, DollarSign,
  ExternalLink, Edit, Trash2, ArrowLeft, CheckCircle,
  Clock, AlertCircle, Shield, Key, Utensils, Home,
  CreditCard, Loader2, RefreshCw, X, ChevronRight, ChevronDown,
  Filter, Archive, Tag, Gift, Percent, Landmark, Building2, AlertTriangle,
  Undo2, Banknote, HelpCircle, ArrowUpDown, BookOpen,
  Search, Eye, Download, FileSpreadsheet, CheckCheck, Image as ImageIcon,
  Copy, Check, ShieldCheck, Printer, MessageCircle, FileCheck, Palette, QrCode,
  Upload, UploadCloud, Sparkles, XCircle, UserCheck, Mail, Link2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { getThumbnailUrl } from '@/lib/utils/google-drive';
import AdminCampQrScannerModal from '@/components/camps/AdminCampQrScannerModal';
import CampStaffRoleManagementModal from '@/components/camps/CampStaffRoleManagementModal';
import AdminGlobalPrasadamAuditTab from '@/components/camps/AdminGlobalPrasadamAuditTab';
import { Camp, CampMealConfig, CampRoleWaiver, CampCoupon, CampIttBankDetails, CampRefundTier, CampRefundConfig, CampTrackFee, CampAuditTransaction, CampRefundRequest, CenterIdtCode, CampEmailLink, CampAccommodationBatchCapacity, CampRecommendedHotel } from '@/types';
import {
  getCampsAction,
  createCampAction,
  updateCampAction,
  toggleCampStatusAction,
  archiveCampAction,
  unarchiveCampAction,
  deleteCampAction,
  getAllCampTransactionsAction,
  getAllCampRefundsAction,
  verifyAndApproveCampBatchAction,
  rejectCampBatchAction,
  getAllCentersForCampConfigAction
} from './actions';
import { CAMP_ROLE_OPTIONS } from '@/lib/utils/roles';

// Formats any Date object or ISO string strictly into YYYY-MM-DD for HTML5 date inputs
function formatDateForInput(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

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
  if (!isNaN(parsed.getTime()) && (s.includes('-') || s.includes('/') || s.includes('T'))) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  return s;
}

function getDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/^([a-zA-Z0-9_-]{25,})$/);
  return match ? match[1] : null;
}

function getDriveViewUrl(url: string | null | undefined): string {
  if (!url) return '';
  const fileId = getDriveFileId(url);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/view`;
  return url;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMealDayToIso(day: CampMealConfig, campStartDate?: string): string {
  if (day.full_date && /^\d{4}-\d{2}-\d{2}$/.test(day.full_date)) {
    return day.full_date;
  }
  const raw = `${day.label || ''} ${day.date || ''}`.trim();
  const match = raw.match(/(\d{1,2})\s*[-/]?\s*([A-Za-z]{3,9})/i);
  let year = new Date().getFullYear();
  if (campStartDate) {
    const cd = new Date(campStartDate);
    if (!isNaN(cd.getTime())) {
      year = cd.getFullYear();
    }
  }

  if (match) {
    const dNum = parseInt(match[1], 10);
    const mPrefix = match[2].slice(0, 3).toLowerCase();
    const mIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === mPrefix);
    if (mIdx >= 0) {
      if (campStartDate) {
        const cd = new Date(campStartDate);
        if (!isNaN(cd.getTime()) && cd.getMonth() > 9 && mIdx < 3) {
          year += 1;
        }
      }
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    }
  }

  const numOnly = parseInt(String(day.date), 10);
  if (!isNaN(numOnly) && campStartDate) {
    const cd = new Date(campStartDate);
    if (!isNaN(cd.getTime())) {
      const mIdx = cd.getMonth();
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(numOnly).padStart(2, '0')}`;
    }
  }

  return '';
}

function getMealTimestamp(day: CampMealConfig, campStartDate?: string): number {
  const iso = parseMealDayToIso(day, campStartDate);
  if (iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  const n = parseInt(String(day.date), 10);
  return isNaN(n) ? 0 : n;
}

function sortMealDays(days: CampMealConfig[], campStartDate?: string): CampMealConfig[] {
  return [...days].sort((a, b) => {
    const tA = getMealTimestamp(a, campStartDate);
    const tB = getMealTimestamp(b, campStartDate);
    return tA - tB;
  });
}

type CampWithStats = Camp & { registration_count: number; total_revenue: number };

const defaultRoleWaivers: CampRoleWaiver[] = [
  { role: 'Volunteer', free_meals: true, free_accommodation: true, fixed_token_fee: null, notice_message: 'Volunteers receive complimentary meals & stay in devotee service.' },
  { role: 'Mentor', free_meals: false, free_accommodation: true, fixed_token_fee: null, notice_message: 'Mentors receive complimentary accommodation.' },
  { role: 'Brahmachari', free_meals: false, free_accommodation: false, fixed_token_fee: 100, notice_message: 'Brahmacharis pay a nominal confirmation fee of ₹100 under Donate As You Like.' }
];

export default function AdminCampsPage() {
  const [camps, setCamps] = useState<CampWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter Tab (All, Active, Past / Completed, Drafts, Archived)
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed' | 'draft' | 'archived'>('all');

  const router = useRouter();

  // Auth state for Super Admin check
  const { userData, loading: authLoading } = useAuth();
  const currentUserRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const isSuperAdmin = currentUserRoles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');

  // Protect Admin Console: non-superadmin staff must never access master Admin Camps page
  useEffect(() => {
    if (!authLoading && userData && !isSuperAdmin) {
      router.replace('/dashboard/camp?tab=staff');
    }
  }, [authLoading, userData, isSuperAdmin, router]);

  // Main Page View: 'camps' vs 'audit' vs 'prasadam'
  const [mainView, setMainView] = useState<'camps' | 'audit' | 'prasadam'>('camps');

  // Audit state
  const [transactions, setTransactions] = useState<CampAuditTransaction[]>([]);
  const [auditRefunds, setAuditRefunds] = useState<(CampRefundRequest & { camp_title?: string; camp_slug?: string })[]>([]);
  const [auditStats, setAuditStats] = useState<{
    total_gross_fee?: number;
    total_discounts?: number;
    total_coupons_count?: number;
    total_collected: number;
    total_refunded: number;
    net_revenue: number;
    total_transactions: number;
    total_participants: number;
    pending_verifications: number;
    pending_refunds: number;
  } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditSubView, setAuditSubView] = useState<'transactions' | 'refunds'>('transactions');
  const [showFinancialSummary, setShowFinancialSummary] = useState(false);

  // Audit Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCampFilter, setAuditCampFilter] = useState('all');
  const [auditMethodFilter, setAuditMethodFilter] = useState('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState('all');
  const [auditDateFilter, setAuditDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'this_month'>('all');
  const [auditSortBy, setAuditSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'attendees_desc'>('date_desc');

  // Pagination for audit table (20, 40, 100, 'all')
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState<number | 'all'>(20);
  const [refundPage, setRefundPage] = useState(1);
  const [refundPageSize, setRefundPageSize] = useState<number | 'all'>(20);

  // Inspector Modal State
  const [selectedTxn, setSelectedTxn] = useState<CampAuditTransaction | null>(null);
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);
  const [copiedTxnId, setCopiedTxnId] = useState(false);

  // In-Inspector Batch Verification Form State
  const [batchVerifyTxnId, setBatchVerifyTxnId] = useState('');
  const [batchVerifyDate, setBatchVerifyDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchVerifyRemarks, setBatchVerifyRemarks] = useState('');
  const [batchVerifyLoading, setBatchVerifyLoading] = useState(false);
  const [batchVerifyError, setBatchVerifyError] = useState<string | null>(null);
  const [batchVerifySuccess, setBatchVerifySuccess] = useState(false);

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Camp | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'tracks' | 'meals' | 'accommodation' | 'payment' | 'refund'>('basic');
  const [mealCalendarDate, setMealCalendarDate] = useState<string>('');

  // Accommodation Batch Capacity inputs
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchStartDate, setNewBatchStartDate] = useState('');
  const [newBatchEndDate, setNewBatchEndDate] = useState('');
  const [newBatchCapacity, setNewBatchCapacity] = useState<number>(500);

  // Recommended Hotel inputs
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelContact, setNewHotelContact] = useState('');
  const [newHotelAddress, setNewHotelAddress] = useState('');
  const [newHotelTariff, setNewHotelTariff] = useState('');
  const [newHotelNotes, setNewHotelNotes] = useState('');

  // Coupon inputs state in Modal
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [newCouponValue, setNewCouponValue] = useState<number>(100);
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<string>('');

  // Center restriction config state
  const [availableCenters, setAvailableCenters] = useState<{ id: string; name: string; temple_name?: string }[]>([]);
  const [centerSearchFilter, setCenterSearchFilter] = useState('');
  const [idtCenterSearch, setIdtCenterSearch] = useState('');
  const [copiedCenterCode, setCopiedCenterCode] = useState<string | null>(null);
  const [showLegacyPasscodes, setShowLegacyPasscodes] = useState(false);
  const [addCenterSearchQuery, setAddCenterSearchQuery] = useState('');
  const [isAddCenterDropdownOpen, setIsAddCenterDropdownOpen] = useState(false);
  const addCenterRef = React.useRef<HTMLDivElement | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    campId: string | null;
    campTitle: string;
    deleting: boolean;
  }>({
    isOpen: false,
    campId: null,
    campTitle: '',
    deleting: false
  });

  // QR Scanner & Staff Role Management Modals
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    venue: 'Central VOICE, Pune',
    status: 'active' as 'draft' | 'active' | 'closed' | 'completed' | 'archived',
    poster_url: '',
    criteria_message: '',
    banner_message: '',
    require_poc: false,
    default_poc_name: '',
    default_poc_contact: '',
    email_instructions: '',
    email_links: [] as CampEmailLink[],
    start_date: '',
    end_date: '',
    registration_start_date: '',
    late_fee_start_date: '',
    registration_deadline: '',
    late_fee: 120,
    tracks: [
      'GS Camp - 1st Timer',
      'GS Camp - Attended Before',
      'GS Camp - About to Join PDC',
      'NS Camp - 1sTimer',
      'NS Camp - Attended Before',
      'Brahmachari'
    ],
    newTrackInput: '',
    participant_types: [
      'Camp Participant',
      'Mentor',
      'Volunteer',
      'Brahmachari'
    ],
    meal_pricing: [] as CampMealConfig[],
    accommodation_pricing: {
      regular_daily: 120,
      peak_daily: 200,
      peak_start_date: '',
      peak_end_date: '',
      ac_charge: 0,
      facility_charge_label: '',
      ac_charge_billing_type: 'per_day' as 'per_day' | 'fixed',
      ac_charge_applies_to: 'accommodation' as 'accommodation' | 'all',
      allow_female_cv_accommodation: false,
      cv_floor_capacity: 0,
      batch_capacities: [] as CampAccommodationBatchCapacity[],
      recommended_hotels: [] as CampRecommendedHotel[]
    },
    special_waivers: {
      brahmachari_fee: 100,
      brahmachari_message: 'Brahmacharis are required to pay a nominal confirmation fee of ₹100 under Donate As You Like.',
      role_waivers: defaultRoleWaivers,
      coupons: [] as CampCoupon[],
      track_fees: [] as CampTrackFee[],
      base_registration_fee: 0,
      base_registration_fee_label: ''
    },
    payment_config: {
      enable_razorpay: true,
      surcharge_percent: 2.0,
      enable_idt: true,
      allow_student_idt: false,
      idt_passcodes_str: '16, 26, 36, 46, 56, AT123, NITW456, CV108, IITH101, GGD202, VSSUT303, VIT404, MTH505, BEC606, NITR707, MV808, WG909, VIIT1010, KYC1111, KVM1212, KSV1313, VTL108',
      center_idt_codes: [] as CenterIdtCode[],
      enable_itt: false,
      allow_student_itt: false,
      allowed_managerial_roles: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      itt_bank_details: {
        account_name: '',
        account_number: '',
        bank_name: '',
        ifsc_code: '',
        branch_name: '',
        upi_id: '',
        instructions: ''
      },
      sheets_webhook_url: ''
    },
    refund_config: {
      enable_refunds: true,
      refund_policy_rules: [
        { id: 'tier-1', cutoff_date: '', refund_percent: 100, label: 'Full Refund (100%)' },
        { id: 'tier-2', cutoff_date: '', refund_percent: 50, label: '50% Refund' },
        { id: 'tier-3', cutoff_date: '', refund_percent: 0, label: 'No Refund after cutoff' }
      ] as CampRefundTier[],
      refund_meals: true,
      refund_accommodation: true,
      refund_instructions: 'Refunds are transferred manually to your submitted UPI or Bank Account within 5-7 working days after verification. Payment processing fees are non-refundable.'
    },
    eligible_centers: [] as string[]
  });

  const loadCamps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCampsAction();
      if (res.success && res.camps) {
        setCamps(res.camps);
      } else {
        setError(res.error || 'Failed to fetch camps');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading camps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamps();
    const fetchCenters = async () => {
      try {
        const cRes = await getAllCentersForCampConfigAction();
        if (cRes.success && cRes.centers) {
          setAvailableCenters(cRes.centers);
        }
      } catch (err) {
        console.error('Failed to load centers for camp config:', err);
      }
    };
    fetchCenters();
  }, []);

  useEffect(() => {
    const handleClickOutsideAddCenter = (e: MouseEvent) => {
      if (addCenterRef.current && !addCenterRef.current.contains(e.target as Node)) {
        setIsAddCenterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideAddCenter);
    return () => document.removeEventListener('mousedown', handleClickOutsideAddCenter);
  }, []);

  const loadAuditData = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await getAllCampTransactionsAction();
      if (res.success && res.transactions) {
        setTransactions(res.transactions);
        if (res.refunds) setAuditRefunds(res.refunds);
        if (res.stats) setAuditStats(res.stats);
      } else {
        setAuditError(res.error || 'Failed to fetch financial audit data');
      }
    } catch (err: any) {
      setAuditError(err.message || 'Error loading financial audit data');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (mainView === 'audit' && isSuperAdmin && transactions.length === 0) {
      loadAuditData();
    }
  }, [mainView, isSuperAdmin]);

  useEffect(() => {
    if (selectedTxn) {
      setBatchVerifyTxnId(selectedTxn.payment_id || '');
      setBatchVerifyDate(new Date().toISOString().split('T')[0]);
      setBatchVerifyRemarks('');
      setBatchVerifyError(null);
      setBatchVerifySuccess(false);
    }
  }, [selectedTxn]);

  const filteredTransactions = transactions.filter((t) => {
    // Search
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const matchPayer = (t.poc_name || '').toLowerCase().includes(q);
      const matchContact = (t.poc_contact || '').toLowerCase().includes(q);
      const matchEmail = (t.email || '').toLowerCase().includes(q);
      const matchTxn = (t.txn_id || '').toLowerCase().includes(q);
      const matchPaymentId = (t.payment_id || '').toLowerCase().includes(q);
      const matchOrderId = (t.order_id || '').toLowerCase().includes(q);
      const matchCamp = (t.camp_title || '').toLowerCase().includes(q);
      const matchCoupon = (t.coupon_code || '').toLowerCase().includes(q);
      const matchParticipant = t.participants?.some(p => (p.participant_name || '').toLowerCase().includes(q) || (p.whatsapp || '').includes(q));
      if (!matchPayer && !matchContact && !matchEmail && !matchTxn && !matchPaymentId && !matchOrderId && !matchCamp && !matchParticipant && !matchCoupon) {
        return false;
      }
    }

    // Camp filter
    if (auditCampFilter !== 'all' && t.camp_id !== auditCampFilter) {
      return false;
    }

    // Payment method
    if (auditMethodFilter !== 'all') {
      if (auditMethodFilter === 'RAZORPAY' && t.payment_method !== 'RAZORPAY') return false;
      if (auditMethodFilter === 'IDT' && t.payment_method !== 'IDT') return false;
      if (auditMethodFilter === 'ITT' && t.payment_method !== 'INTER_TEMPLE_TRANSFER' && t.payment_method !== 'ITT') return false;
      if (auditMethodFilter === 'FREE' && !['FREE', 'COUPON', 'ROLE_WAIVER'].includes(t.payment_method)) return false;
      if (auditMethodFilter === 'DISCOUNT' && !(t.total_discount > 0 || t.coupon_code)) return false;
    }

    // Status
    if (auditStatusFilter !== 'all') {
      if (auditStatusFilter === 'completed' && (t.payment_status !== 'completed' || t.refund?.status === 'pending' || t.refund?.status === 'refunded')) return false;
      if (auditStatusFilter === 'pending' && t.payment_status !== 'pending' && !(t.payment_method === 'INTER_TEMPLE_TRANSFER' && !t.verified_at) && t.refund?.status !== 'pending') return false;
      if (auditStatusFilter === 'refunded' && t.refund?.status !== 'refunded' && t.payment_status !== 'refunded') return false;
    }

    // Date
    if (auditDateFilter !== 'all') {
      const tDate = new Date(t.created_at);
      const now = new Date();
      if (auditDateFilter === 'today') {
        if (tDate.toDateString() !== now.toDateString()) return false;
      } else if (auditDateFilter === '7days') {
        const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (auditDateFilter === '30days') {
        const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      } else if (auditDateFilter === 'this_month') {
        if (tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (auditSortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (auditSortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (auditSortBy === 'amount_desc') return b.total_amount - a.total_amount;
    if (auditSortBy === 'amount_asc') return a.total_amount - b.total_amount;
    if (auditSortBy === 'attendees_desc') return b.participant_count - a.participant_count;
    return 0;
  });

  const filteredRefunds = auditRefunds.filter((r) => {
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const matchPoc = (r.poc_name || '').toLowerCase().includes(q);
      const matchContact = (r.poc_contact || '').toLowerCase().includes(q);
      const matchEmail = (r.email || '').toLowerCase().includes(q);
      const matchCamp = (r.camp_title || '').toLowerCase().includes(q);
      const matchUpi = (r.upi_id || '').toLowerCase().includes(q);
      const matchAcc = (r.account_number || '').includes(q);
      const matchTxn = (r.payout_txn_ref || '').toLowerCase().includes(q);
      if (!matchPoc && !matchContact && !matchEmail && !matchCamp && !matchUpi && !matchAcc && !matchTxn) {
        return false;
      }
    }
    if (auditCampFilter !== 'all' && r.camp_id !== auditCampFilter) return false;
    if (auditStatusFilter !== 'all' && r.status !== auditStatusFilter) return false;
    if (auditDateFilter !== 'all' && r.created_at) {
      const rDate = new Date(r.created_at);
      const now = new Date();
      if (auditDateFilter === 'today') {
        if (rDate.toDateString() !== now.toDateString()) return false;
      } else if (auditDateFilter === '7days') {
        const diffDays = (now.getTime() - rDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (auditDateFilter === '30days') {
        const diffDays = (now.getTime() - rDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      } else if (auditDateFilter === 'this_month') {
        if (rDate.getMonth() !== now.getMonth() || rDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  // Check if any filter is currently applied by the user
  const isFilterActive = Boolean(
    auditSearch.trim() ||
    auditCampFilter !== 'all' ||
    auditMethodFilter !== 'all' ||
    auditStatusFilter !== 'all' ||
    auditDateFilter !== 'all'
  );

  const handleResetAuditFilters = () => {
    setAuditSearch('');
    setAuditCampFilter('all');
    setAuditMethodFilter('all');
    setAuditStatusFilter('all');
    setAuditDateFilter('all');
    setAuditPage(1);
    setRefundPage(1);
  };

  // Dynamically compute financial stats based on the active filtered transactions & refunds
  const dynamicStats = React.useMemo(() => {
    let totalGrossFee = 0;
    let totalDiscounts = 0;
    let totalCouponsCount = 0;
    let totalCollected = 0;
    let totalParticipants = 0;
    let pendingVerificationCount = 0;

    for (const t of filteredTransactions) {
      const gross = Number((t as any).gross_amount || (Number(t.total_amount || 0) + Number(t.total_discount || 0)));
      const amt = Number(t.total_amount || 0);
      const disc = Number(t.total_discount || 0);
      const count = Number(t.participant_count || 0);

      totalParticipants += count;

      if (t.payment_status === 'completed' || t.payment_status === 'refunded') {
        totalCollected += amt;
        // True Gross Camp Value before discounts
        totalGrossFee += gross;
        totalDiscounts += disc;
        if (disc > 0 || t.coupon_code) {
          totalCouponsCount++;
        }
      }

      if (t.payment_status === 'pending' || (t.payment_method === 'INTER_TEMPLE_TRANSFER' && !t.verified_at)) {
        pendingVerificationCount++;
      }
    }

    let totalRefunded = 0;
    let pendingRefundCount = 0;

    for (const r of filteredRefunds) {
      if (r.status === 'refunded') {
        totalRefunded += Number(r.refund_amount || 0);
      } else if (r.status === 'pending') {
        pendingRefundCount++;
      }
    }

    return {
      total_gross_fee: totalGrossFee,
      total_discounts: totalDiscounts,
      total_coupons_count: totalCouponsCount,
      total_collected: totalCollected,
      total_refunded: totalRefunded,
      net_revenue: Math.max(0, totalCollected - totalRefunded),
      total_transactions: filteredTransactions.length,
      total_participants: totalParticipants,
      pending_verifications: pendingVerificationCount,
      pending_refunds: pendingRefundCount
    };
  }, [filteredTransactions, filteredRefunds]);

  const handleExportTransactions = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;

    const dataToExport = filteredTransactions.map((t, idx) => ({
      '#': idx + 1,
      'Transaction ID / Batch': t.txn_id,
      'Camp Title': t.camp_title,
      'Payer Name': t.poc_name,
      'Contact Phone': t.poc_contact,
      'Email': t.email,
      'Participant Count': t.participant_count,
      'Payment Method': t.payment_method,
      'Payment Status': t.payment_status,
      'Payment ID (Gateway / UTR)': t.payment_id || '',
      'Order ID': t.order_id || '',
      'IDT Deduction Source': t.deduction_source || '',
      'IDT Passcode': t.passcode || '',
      'Meals Cost (₹)': t.total_meal_cost,
      'Accommodation Cost (₹)': t.total_acc_cost,
      'Gross Total Fee (₹)': t.total_meal_cost + t.total_acc_cost,
      'Coupon Code Applied': t.coupon_code || '',
      'Discount / Waiver (₹)': t.total_discount,
      'Net Amount Paid (Received) (₹)': t.total_amount,
      'Refund Status': t.refund ? t.refund.status : 'None',
      'Refund Amount (₹)': t.refund ? t.refund.refund_amount : 0,
      'Transaction Date': new Date(t.created_at).toLocaleString('en-IN'),
      'Participants List': t.participants?.map(p => `${p.participant_name} (${p.camp_track})`).join('; ') || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Camp_Transactions');
    const fileDate = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      XLSX.writeFile(wb, `Camp_Transactions_Audit_${fileDate}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `Camp_Transactions_Audit_${fileDate}.xlsx`, { bookType: 'xlsx' });
    }
  };

  const handleExportRefunds = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!filteredRefunds || filteredRefunds.length === 0) return;

    const dataToExport = filteredRefunds.map((r, idx) => ({
      '#': idx + 1,
      'Refund ID': r.id,
      'Camp Title': r.camp_title || '',
      'Devotee Name': r.poc_name,
      'Contact': r.poc_contact,
      'Email': r.email,
      'Cancellation Type': r.cancellation_type,
      'Original Total (₹)': r.original_total_amount,
      'Refund Amount (₹)': r.refund_amount,
      'Payout Type': r.payout_type,
      'UPI ID': r.upi_id || '',
      'Bank Account Number': r.account_number || '',
      'Account Holder': r.account_name || '',
      'Bank Name': r.bank_name || '',
      'IFSC Code': r.ifsc_code || '',
      'Payout Reference (UTR)': r.payout_txn_ref || '',
      'Payout Date': r.payout_date || '',
      'Status': r.status,
      'Reason': r.reason || '',
      'Requested At': r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Camp_Refunds');
    const fileDate = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      XLSX.writeFile(wb, `Camp_Refunds_Audit_${fileDate}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `Camp_Refunds_Audit_${fileDate}.xlsx`, { bookType: 'xlsx' });
    }
  };

  const handleVerifyBatch = async () => {
    if (!selectedTxn) return;
    if (!batchVerifyTxnId.trim()) {
      setBatchVerifyError('Please enter the confirmed Transaction ID / UTR.');
      return;
    }
    if (!batchVerifyDate) {
      setBatchVerifyError('Please enter the payment received date.');
      return;
    }

    setBatchVerifyLoading(true);
    setBatchVerifyError(null);
    try {
      const res = await verifyAndApproveCampBatchAction(selectedTxn.txn_id, {
        transactionId: batchVerifyTxnId.trim(),
        receivedDate: batchVerifyDate,
        remarks: batchVerifyRemarks.trim() || undefined
      });

      if (res.success) {
        setBatchVerifySuccess(true);
        setSelectedTxn(prev => prev ? {
          ...prev,
          payment_status: 'completed',
          payment_id: batchVerifyTxnId.trim(),
          verified_by: userData?.email || 'Super Admin',
          verified_at: new Date().toISOString()
        } : null);
        loadAuditData();
      } else {
        setBatchVerifyError(res.error || 'Failed to verify payment batch.');
      }
    } catch (err: any) {
      setBatchVerifyError(err.message || 'Error occurred during verification.');
    } finally {
      setBatchVerifyLoading(false);
    }
  };

  const handleRejectBatch = async () => {
    if (!selectedTxn?.txn_id) return;
    const reason = batchVerifyRemarks.trim() || 'Payment batch rejected by administrator';
    if (!window.confirm(`Are you sure you want to reject this payment batch (${selectedTxn.txn_id})? Registrations will be marked as rejected.`)) {
      return;
    }

    setBatchVerifyLoading(true);
    setBatchVerifyError(null);
    try {
      const res = await rejectCampBatchAction(selectedTxn.txn_id, reason);
      if (res.success) {
        setBatchVerifySuccess(true);
        setSelectedTxn(prev => prev ? {
          ...prev,
          payment_status: 'rejected',
          verified_by: userData?.email || 'Super Admin',
          verified_at: new Date().toISOString()
        } : null);
        loadAuditData();
      } else {
        setBatchVerifyError(res.error || 'Failed to reject payment batch.');
      }
    } catch (err: any) {
      setBatchVerifyError(err.message || 'Error occurred during rejection.');
    } finally {
      setBatchVerifyLoading(false);
    }
  };

  const handlePrintVoucher = (txn: CampAuditTransaction) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) return;

    const participantsRows = (txn.participants || []).map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-weight: 600;">${idx + 1}. ${p.participant_name}</td>
        <td style="padding: 8px 12px;">${p.camp_track || 'General'}</td>
        <td style="padding: 8px 12px;">${p.voice_name || p.parent_temple || 'Central VOICE'}</td>
        <td style="padding: 8px 12px;">${p.first_meal_date || ''} (${p.first_meal_type || ''}) &rarr; ${p.last_meal_date || ''} (${p.last_meal_type || ''})</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700;">₹${Number(p.total_cost || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Camp Payment Audit Voucher - ${txn.txn_id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; line-height: 1.4; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
            .card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .card-val { font-size: 13px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
            th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .totals { margin-top: 20px; padding-top: 14px; border-top: 2px solid #e2e8f0; display: flex; justify-content: flex-end; }
            .totals-box { width: 300px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
            .totals-row.grand { font-size: 15px; font-weight: 900; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px; }
            .stamp { margin-top: 36px; border-top: 1px dashed #cbd5e1; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
            @media print { body { margin: 15px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a;">VOICE GURUKUL &bull; ISKCON</h1>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">Official Camp Financial Audit Voucher &bull; Payment Reconciliation</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 800; color: #d97706;">Camp: ${txn.camp_title}</p>
            </div>
            <div style="text-align: right;">
              <span class="badge">${txn.payment_status?.toUpperCase() || 'COMPLETED'}</span>
              <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 4px;">Batch ID: ${txn.txn_id}</div>
              <div style="font-size: 11px; color: #64748b;">Date: ${new Date(txn.created_at).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Payer / Devotee POC</div>
              <div class="card-val">${txn.poc_name || 'N/A'}</div>
              <div style="font-size: 11px; color: #475569; font-family: monospace; margin-top: 2px;">${txn.poc_contact || ''}</div>
              <div style="font-size: 11px; color: #64748b;">${txn.email || ''}</div>
            </div>

            <div class="card">
              <div class="card-title">Payment Verification</div>
              <div class="card-val">${txn.payment_method?.replace(/_/g, ' ') || 'Online'}</div>
              <div style="font-size: 11px; color: #475569; font-family: monospace; margin-top: 2px;">
                ${txn.payment_id ? `Ref / UTR: ${txn.payment_id}` : (txn.order_id ? `Order: ${txn.order_id}` : 'Direct')}
              </div>
              <div style="font-size: 11px; color: #64748b;">
                ${txn.verified_by ? `Verified By: ${txn.verified_by}` : (txn.deduction_source ? `Dept: ${txn.deduction_source}` : 'Gateway Verified')}
              </div>
            </div>

            <div class="card">
              <div class="card-title">Total Reconciled</div>
              <div class="card-val" style="font-size: 17px; color: #047857;">₹${Number(txn.total_amount).toLocaleString('en-IN')}</div>
              <div style="font-size: 11px; color: #047857; margin-top: 2px;">
                ${txn.participant_count} ${txn.participant_count === 1 ? 'Registered Attendee' : 'Registered Attendees'}
              </div>
            </div>
          </div>

          <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #334155; margin: 16px 0 6px 0;">
            Registered Devotee Attendees Roster (${txn.participant_count})
          </h3>

          <table>
            <thead>
              <tr>
                <th>Attendee Name</th>
                <th>Track</th>
                <th>Temple / Center</th>
                <th>Meals Schedule</th>
                <th style="text-align: right;">Fee (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${participantsRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-box">
              <div class="totals-row">
                <span>Total Meals Cost:</span>
                <span>₹${Number(txn.total_meal_cost).toLocaleString('en-IN')}</span>
              </div>
              <div class="totals-row">
                <span>Total Accommodation Cost:</span>
                <span>₹${Number(txn.total_acc_cost).toLocaleString('en-IN')}</span>
              </div>
              ${txn.total_discount > 0 ? `
              <div class="totals-row" style="color: #7e22ce;">
                <span>Discounts Applied ${txn.coupon_code ? `(${txn.coupon_code})` : ''}:</span>
                <span>-₹${Number(txn.total_discount).toLocaleString('en-IN')}</span>
              </div>` : ''}
              <div class="totals-row grand">
                <span>Grand Total Paid:</span>
                <span>₹${Number(txn.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div class="stamp">
            <div>
              Voicegurukul Financial Audit &bull; Central VOICE Pune
            </div>
            <div>
              Super Admin Authorization Stamp &bull; Reconciled
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const openCreateModal = () => {
    setEditingCamp(null);
    setActiveTab('basic');
    setMealCalendarDate('');

    setFormData({
      title: '',
      slug: '',
      description: 'Spiritual Retreat & Devotee Leadership Camp',
      poster_url: '',
      criteria_message: '',
      banner_message: '',
      require_poc: false,
      default_poc_name: '',
      default_poc_contact: '',
      email_instructions: '',
      email_links: [],
      venue: 'Central VOICE, Pune',
      status: 'active',
      start_date: '',
      end_date: '',
      registration_start_date: '',
      late_fee_start_date: '',
      registration_deadline: '',
      late_fee: 120,
      tracks: [
        'GS Camp - 1st Timer',
        'GS Camp - Attended Before',
        'GS Camp - About to Join PDC',
        'NS Camp - 1sTimer',
        'NS Camp - Attended Before',
        'Brahmachari'
      ],
      newTrackInput: '',
      participant_types: [
        'Camp Participant',
        'Mentor',
        'Volunteer',
        'Brahmachari'
      ],
      meal_pricing: [] as CampMealConfig[],
      accommodation_pricing: {
        regular_daily: 120,
        peak_daily: 200,
        peak_start_date: '',
        peak_end_date: '',
        ac_charge: 0,
        facility_charge_label: '',
        ac_charge_billing_type: 'per_day' as 'per_day' | 'fixed',
        ac_charge_applies_to: 'accommodation' as 'accommodation' | 'all',
        allow_female_cv_accommodation: false,
        cv_floor_capacity: 0,
        batch_capacities: [],
        recommended_hotels: []
      },
      special_waivers: {
        brahmachari_fee: 100,
        brahmachari_message: 'Brahmacharis are required to pay a nominal confirmation fee of ₹100 under Donate As You Like.',
        role_waivers: defaultRoleWaivers,
        coupons: [],
        track_fees: [] as CampTrackFee[],
        base_registration_fee: 0,
        base_registration_fee_label: ''
      },
      payment_config: {
        enable_razorpay: true,
        surcharge_percent: 2.0,
        enable_idt: true,
        allow_student_idt: false,
        idt_passcodes_str: '16, 26, 36, 46, 56, AT123, NITW456, CV108, IITH101, GGD202, VSSUT303, VIT404, MTH505, BEC606, NITR707, MV808, WG909, VIIT1010, KYC1111, KVM1212, KSV1313, VTL108',
        center_idt_codes: [] as CenterIdtCode[],
        enable_itt: false,
        allow_student_itt: false,
        allowed_managerial_roles: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        itt_bank_details: {
          account_name: '',
          account_number: '',
          bank_name: '',
          ifsc_code: '',
          branch_name: '',
          upi_id: '',
          instructions: ''
        },
        sheets_webhook_url: ''
      },
      refund_config: {
        enable_refunds: true,
        refund_policy_rules: [
          { id: 'tier-1', cutoff_date: '', refund_percent: 100, label: 'Full Refund (100% of Base Fee)' },
          { id: 'tier-2', cutoff_date: '', refund_percent: 50, label: '50% Refund' },
          { id: 'tier-3', cutoff_date: '', refund_percent: 0, label: 'No Refund after cutoff' }
        ] as CampRefundTier[],
        refund_meals: true,
        refund_accommodation: true,
        refund_instructions: 'Refunds are transferred manually to your submitted UPI or Bank Account within 5-7 working days after verification. Payment processing fees are non-refundable.'
      },
      eligible_centers: []
    });

    setIsModalOpen(true);
  };

  const openEditModal = (camp: Camp) => {
    setEditingCamp(camp);
    setActiveTab('basic');

    const formattedStart = formatDateForInput(camp.start_date);
    let initialCalDate = formattedStart;
    const meals = camp.meal_pricing || [];
    if (formattedStart) {
      let earliestIso = formattedStart;
      for (const m of meals) {
        const iso = parseMealDayToIso(m, formattedStart);
        if (iso && iso < earliestIso) {
          earliestIso = iso;
        }
      }
      const [y, m, d] = earliestIso.split('-').map(Number);
      const prevDt = new Date(y, m - 1, d - 1);
      initialCalDate = `${prevDt.getFullYear()}-${String(prevDt.getMonth() + 1).padStart(2, '0')}-${String(prevDt.getDate()).padStart(2, '0')}`;
    }
    setMealCalendarDate(initialCalDate);

    const passcodes = camp.payment_config?.idt_passcodes || [];
    setFormData({
      title: camp.title,
      slug: camp.slug,
      description: camp.description || '',
      poster_url: camp.poster_url || '',
      criteria_message: camp.criteria_message || '',
      banner_message: camp.banner_message || '',
      require_poc: Boolean(camp.require_poc),
      default_poc_name: camp.default_poc_name || '',
      default_poc_contact: camp.default_poc_contact || '',
      email_instructions: camp.email_instructions || '',
      email_links: Array.isArray(camp.email_links) ? camp.email_links : [],
      venue: camp.venue || 'Central VOICE, Pune',
      status: camp.status,
      start_date: formatDateForInput(camp.start_date),
      end_date: formatDateForInput(camp.end_date),
      registration_start_date: formatDateForInput(camp.registration_start_date),
      late_fee_start_date: formatDateForInput(camp.late_fee_start_date),
      registration_deadline: formatDateForInput(camp.registration_deadline),
      late_fee: Number(camp.late_fee) || 0,
      tracks: camp.tracks || [],
      newTrackInput: '',
      participant_types: camp.participant_types || ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari'],
      meal_pricing: camp.meal_pricing || [],
      accommodation_pricing: {
        regular_daily: camp.accommodation_pricing?.regular_daily ?? 120,
        peak_daily: camp.accommodation_pricing?.peak_daily ?? 200,
        peak_start_date: camp.accommodation_pricing?.peak_start_date ?? '',
        peak_end_date: camp.accommodation_pricing?.peak_end_date ?? '',
        ac_charge: camp.accommodation_pricing?.ac_charge ?? 0,
        facility_charge_label: camp.accommodation_pricing?.facility_charge_label || '',
        ac_charge_billing_type: (camp.accommodation_pricing?.ac_charge_billing_type || 'per_day') as 'per_day' | 'fixed',
        ac_charge_applies_to: (camp.accommodation_pricing?.ac_charge_applies_to || 'accommodation') as 'accommodation' | 'all',
        allow_female_cv_accommodation: Boolean(camp.accommodation_pricing?.allow_female_cv_accommodation),
        cv_floor_capacity: camp.accommodation_pricing?.cv_floor_capacity ?? 0,
        batch_capacities: camp.accommodation_pricing?.batch_capacities || [],
        recommended_hotels: camp.accommodation_pricing?.recommended_hotels || []
      },
      special_waivers: {
        brahmachari_fee: camp.special_waivers?.brahmachari_fee ?? 100,
        brahmachari_message: camp.special_waivers?.brahmachari_message || '',
        role_waivers: camp.special_waivers?.role_waivers || defaultRoleWaivers,
        coupons: camp.special_waivers?.coupons || [],
        track_fees: camp.special_waivers?.track_fees || [],
        base_registration_fee: camp.special_waivers?.base_registration_fee ?? 0,
        base_registration_fee_label: camp.special_waivers?.base_registration_fee_label || ''
      },
      payment_config: {
        enable_razorpay: camp.payment_config?.enable_razorpay ?? true,
        surcharge_percent: camp.payment_config?.surcharge_percent ?? 2.0,
        enable_idt: camp.payment_config?.enable_idt ?? true,
        allow_student_idt: camp.payment_config?.allow_student_idt ?? false,
        idt_passcodes_str: passcodes.join(', '),
        center_idt_codes: camp.payment_config?.center_idt_codes || [],
        enable_itt: camp.payment_config?.enable_itt ?? false,
        allow_student_itt: camp.payment_config?.allow_student_itt ?? false,
        allowed_managerial_roles: camp.payment_config?.allowed_managerial_roles ?? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        itt_bank_details: {
          account_name: camp.payment_config?.itt_bank_details?.account_name || '',
          account_number: camp.payment_config?.itt_bank_details?.account_number || '',
          bank_name: camp.payment_config?.itt_bank_details?.bank_name || '',
          ifsc_code: camp.payment_config?.itt_bank_details?.ifsc_code || '',
          branch_name: camp.payment_config?.itt_bank_details?.branch_name || '',
          upi_id: camp.payment_config?.itt_bank_details?.upi_id || '',
          instructions: camp.payment_config?.itt_bank_details?.instructions || ''
        },
        sheets_webhook_url: camp.payment_config?.sheets_webhook_url || ''
      },
      refund_config: {
        enable_refunds: camp.refund_config?.enable_refunds ?? true,
        refund_policy_rules: camp.refund_config?.refund_policy_rules && camp.refund_config.refund_policy_rules.length > 0
          ? camp.refund_config.refund_policy_rules
          : [
              { id: 'tier-1', cutoff_date: '', refund_percent: 100, label: 'Full Refund (100% of Base Fee)' },
              { id: 'tier-2', cutoff_date: '', refund_percent: 50, label: '50% Refund' },
              { id: 'tier-3', cutoff_date: '', refund_percent: 0, label: 'No Refund after cutoff' }
            ],
        refund_meals: camp.refund_config?.refund_meals ?? true,
        refund_accommodation: camp.refund_config?.refund_accommodation ?? true,
        refund_instructions: camp.refund_config?.refund_instructions || 'Refunds are transferred manually to your submitted UPI or Bank Account within 5-7 working days after verification. Payment processing fees are non-refundable.'
      },
      eligible_centers: Array.isArray(camp.eligible_centers) ? camp.eligible_centers : []
    });

    setIsModalOpen(true);
  };

  // Center-Wise IDT Passcode Management Helpers
  const generateUniqueCodeForCenter = (centerName: string, existingCodes: string[]): string => {
    const clean = centerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    let prefix = '';
    if (words.length > 1) {
      prefix = words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
    } else {
      prefix = clean.slice(0, 4).toUpperCase();
    }
    if (prefix.length < 2) prefix = 'IDT';

    for (let attempt = 0; attempt < 50; attempt++) {
      const num = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${prefix}-${num}`;
      if (!existingCodes.map(c => c.toLowerCase()).includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  };

  const handleAddSpecificCenter = (centerName: string, centerId?: string) => {
    const cleanName = centerName.trim();
    if (!cleanName) return;

    const currentCodes: CenterIdtCode[] = [...(formData.payment_config.center_idt_codes || [])];
    if (currentCodes.some(c => c.center_name.toLowerCase() === cleanName.toLowerCase())) {
      return; // Already in IDT list
    }

    const matchingDbCenter = availableCenters.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    const existingCodeList = currentCodes.map(c => c.code);
    const newCode = generateUniqueCodeForCenter(cleanName, existingCodeList);

    const updated: CenterIdtCode[] = [
      ...currentCodes,
      {
        center_id: centerId || matchingDbCenter?.id,
        center_name: cleanName,
        code: newCode
      }
    ];

    setFormData(prev => ({
      ...prev,
      payment_config: {
        ...prev.payment_config,
        center_idt_codes: updated
      }
    }));

    setAddCenterSearchQuery('');
    setIsAddCenterDropdownOpen(false);
  };

  const handleRemoveCenterFromIdt = (centerName: string) => {
    const currentCodes: CenterIdtCode[] = [...(formData.payment_config.center_idt_codes || [])];
    const updated = currentCodes.filter(
      c => c.center_name.toLowerCase() !== centerName.toLowerCase()
    );
    setFormData(prev => ({
      ...prev,
      payment_config: {
        ...prev.payment_config,
        center_idt_codes: updated
      }
    }));
  };

  const handleAddAllAvailableCentersToIdt = () => {
    const currentCodes: CenterIdtCode[] = [...(formData.payment_config.center_idt_codes || [])];
    const codeList = currentCodes.map(c => c.code);

    const updated: CenterIdtCode[] = [...currentCodes];
    for (const center of availableCenters) {
      const exists = updated.some(
        c => c.center_name.toLowerCase() === center.name.toLowerCase() || (center.id && c.center_id === center.id)
      );
      if (!exists) {
        const newCode = generateUniqueCodeForCenter(center.name, codeList);
        codeList.push(newCode);
        updated.push({
          center_id: center.id,
          center_name: center.name,
          code: newCode
        });
      }
    }

    setFormData(prev => ({
      ...prev,
      payment_config: {
        ...prev.payment_config,
        center_idt_codes: updated
      }
    }));
  };

  const handleClearAllIdtCenters = () => {
    setFormData(prev => ({
      ...prev,
      payment_config: {
        ...prev.payment_config,
        center_idt_codes: []
      }
    }));
  };

  const handleRegenerateCenterCode = (centerId: string | undefined, centerName: string) => {
    const currentCodes: CenterIdtCode[] = [...(formData.payment_config.center_idt_codes || [])];
    const otherCodes = currentCodes
      .filter(c => c.center_name.toLowerCase() !== centerName.toLowerCase())
      .map(c => c.code);

    const newCode = generateUniqueCodeForCenter(centerName, otherCodes);

    let found = false;
    const updated = currentCodes.map(c => {
      if (c.center_name.toLowerCase() === centerName.toLowerCase() || (centerId && c.center_id === centerId)) {
        found = true;
        return { ...c, code: newCode };
      }
      return c;
    });

    if (!found) {
      updated.push({
        center_id: centerId,
        center_name: centerName,
        code: newCode
      });
    }

    setFormData(prev => ({
      ...prev,
      payment_config: {
        ...prev.payment_config,
        center_idt_codes: updated
      }
    }));
  };

  const handleUpdateCenterCode = (centerId: string | undefined, centerName: string, newCode: string) => {
    const currentCodes: CenterIdtCode[] = [...(formData.payment_config.center_idt_codes || [])];
    let found = false;
    const updated = currentCodes.map(c => {
      if (c.center_name.toLowerCase() === centerName.toLowerCase() || (centerId && c.center_id === centerId)) {
        found = true;
        return { ...c, code: newCode.toUpperCase() };
      }
      return c;
    });
    if (!found) {
      updated.push({
        center_id: centerId,
        center_name: centerName,
        code: newCode.toUpperCase()
      });
    }
    setFormData(prev => ({
      ...prev,
      payment_config: {
        ...prev.payment_config,
        center_idt_codes: updated
      }
    }));
  };

  const handleCopyCenterCode = (centerName: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCenterCode(centerName);
    setTimeout(() => setCopiedCenterCode(null), 2000);
  };

  const posterFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterUploadError, setPosterUploadError] = useState<string | null>(null);

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPosterUploadError('Please select a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPosterUploadError('Image size should be less than 15MB');
      return;
    }

    setPosterUploading(true);
    setPosterUploadError(null);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('action', 'upload');
      uploadData.append('userName', (userData as any)?.name || 'Admin');
      uploadData.append('folderName', 'Camps Thumbnails');

      const res = await fetch('/api/upload/google-drive', {
        method: 'POST',
        body: uploadData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload photo to Google Drive');
      }

      const driveUrl = json.data?.directImageUrl || json.data?.webViewLink || json.data?.webContentLink;
      if (!driveUrl) {
        throw new Error('Google Drive upload succeeded but no link was returned');
      }

      setFormData((prev) => ({
        ...prev,
        poster_url: driveUrl
      }));

      // Prepend to library images if already populated
      setPosterLibraryImages((prev) => [
        {
          id: `drive-${Date.now()}`,
          name: file.name,
          url: driveUrl,
          thumbnailUrl: driveUrl,
          source: 'drive',
          createdTime: new Date().toISOString()
        },
        ...prev.filter(p => p.url !== driveUrl)
      ]);
    } catch (err: any) {
      console.error('Google Drive photo upload failed:', err);
      setPosterUploadError(err?.message || 'Error uploading photo to Google Drive');
    } finally {
      setPosterUploading(false);
      if (posterFileInputRef.current) {
        posterFileInputRef.current.value = '';
      }
    }
  };

  // Poster & Thumbnail Library state
  const [isPosterLibraryOpen, setIsPosterLibraryOpen] = useState(false);
  const [loadingPosterLibrary, setLoadingPosterLibrary] = useState(false);
  const [posterLibraryImages, setPosterLibraryImages] = useState<{
    id: string;
    name: string;
    url: string;
    thumbnailUrl: string;
    source: 'drive' | 'camp';
    createdTime?: string;
  }[]>([]);
  const [posterLibrarySearch, setPosterLibrarySearch] = useState('');
  const [posterLibrarySourceFilter, setPosterLibrarySourceFilter] = useState<'all' | 'drive' | 'camp'>('all');

  const openPosterLibrary = async () => {
    setIsPosterLibraryOpen(true);
    setLoadingPosterLibrary(true);
    setPosterLibrarySearch('');
    setPosterLibrarySourceFilter('all');

    try {
      const seenUrls = new Set<string>();
      const combined: {
        id: string;
        name: string;
        url: string;
        thumbnailUrl: string;
        source: 'drive' | 'camp';
        createdTime?: string;
      }[] = [];

      // 1. Fetch images from Google Drive folder "Camps Thumbnails"
      try {
        const res = await fetch('/api/upload/google-drive?folderName=Camps+Thumbnails');
        const json = await res.json();
        if (json.success && Array.isArray(json.files)) {
          json.files.forEach((f: any) => {
            if (f.url && !seenUrls.has(f.url)) {
              seenUrls.add(f.url);
              combined.push({
                id: `drive-${f.id}`,
                name: f.name || 'Drive Poster',
                url: f.url,
                thumbnailUrl: f.thumbnailUrl || f.url,
                source: 'drive',
                createdTime: f.createdTime,
              });
            }
          });
        }
      } catch (driveErr) {
        console.warn('Could not fetch drive poster files:', driveErr);
      }

      // 2. Gather all existing posters from loaded camps
      camps.forEach((c) => {
        if (c.poster_url && c.poster_url.trim()) {
          const u = c.poster_url.trim();
          if (!seenUrls.has(u)) {
            seenUrls.add(u);
            combined.push({
              id: `camp-${c.id}`,
              name: `${c.title} Poster`,
              url: u,
              thumbnailUrl: getThumbnailUrl(u) || u,
              source: 'camp',
              createdTime: c.created_at,
            });
          }
        }
      });

      setPosterLibraryImages(combined);
    } catch (err) {
      console.error('Error opening poster library:', err);
    } finally {
      setLoadingPosterLibrary(false);
    }
  };

  const filteredLibraryImages = posterLibraryImages.filter((img) => {
    if (posterLibrarySourceFilter !== 'all' && img.source !== posterLibrarySourceFilter) {
      return false;
    }
    if (posterLibrarySearch.trim()) {
      const q = posterLibrarySearch.toLowerCase();
      return img.name.toLowerCase().includes(q) || img.url.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSaveCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const passcodes = formData.payment_config.idt_passcodes_str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: formData.description,
        poster_url: formData.poster_url || undefined,
        criteria_message: formData.criteria_message || undefined,
        banner_message: formData.banner_message || undefined,
        require_poc: Boolean(formData.require_poc),
        default_poc_name: formData.default_poc_name || undefined,
        default_poc_contact: formData.default_poc_contact || undefined,
        email_instructions: formData.email_instructions || undefined,
        email_links: formData.email_links || [],
        venue: formData.venue,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date,
        registration_start_date: formData.registration_start_date || undefined,
        late_fee_start_date: formData.late_fee_start_date || undefined,
        registration_deadline: formData.registration_deadline || undefined,
        late_fee: Number(formData.late_fee) || 0,
        tracks: formData.tracks,
        participant_types: formData.participant_types,
        meal_pricing: formData.meal_pricing,
        accommodation_pricing: formData.accommodation_pricing,
        special_waivers: formData.special_waivers,
        payment_config: {
          enable_razorpay: formData.payment_config.enable_razorpay,
          surcharge_percent: Number(formData.payment_config.surcharge_percent) || 0,
          enable_idt: formData.payment_config.enable_idt,
          allow_student_idt: Boolean(formData.payment_config.allow_student_idt),
          idt_passcodes: Array.from(new Set([
            ...passcodes,
            ...(formData.payment_config.center_idt_codes || []).map(c => c.code.trim()).filter(Boolean)
          ])),
          center_idt_codes: formData.payment_config.center_idt_codes || [],
          enable_itt: formData.payment_config.enable_itt,
          allow_student_itt: Boolean(formData.payment_config.allow_student_itt),
          allowed_managerial_roles: formData.payment_config.allowed_managerial_roles || [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
          itt_bank_details: formData.payment_config.itt_bank_details,
          sheets_webhook_url: formData.payment_config.sheets_webhook_url
        },
        refund_config: formData.refund_config,
        eligible_centers: formData.eligible_centers || []
      };

      let res;
      if (editingCamp) {
        res = await updateCampAction(editingCamp.id, payload);
      } else {
        res = await createCampAction(payload);
      }

      if (res.success) {
        setIsModalOpen(false);
        loadCamps();
      } else {
        setError(res.error || 'Failed to save camp');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      const res = await toggleCampStatusAction(id, nextStatus as any);
      if (res.success) {
        setCamps((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: res.status as any } : c))
        );
      } else {
        setError(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while updating status');
    }
  };

  const handleArchiveCamp = async (id: string) => {
    try {
      const res = await archiveCampAction(id);
      if (res.success) {
        setCamps((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'archived' } : c))
        );
      } else {
        setError(res.error || 'Failed to archive camp');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while archiving camp');
    }
  };

  const handleUnarchiveCamp = async (id: string) => {
    try {
      const res = await unarchiveCampAction(id);
      if (res.success) {
        setCamps((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'closed' } : c))
        );
      } else {
        setError(res.error || 'Failed to restore camp');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while restoring camp');
    }
  };

  const openDeleteModal = (id: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      campId: id,
      campTitle: title,
      deleting: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.campId) return;
    setDeleteModal((prev) => ({ ...prev, deleting: true }));
    setError(null);
    try {
      const res = await deleteCampAction(deleteModal.campId);
      if (res.success) {
        setCamps((prev) => prev.filter((c) => c.id !== deleteModal.campId));
        setDeleteModal({ isOpen: false, campId: null, campTitle: '', deleting: false });
      } else {
        setError(res.error || 'Failed to delete camp');
        setDeleteModal((prev) => ({ ...prev, deleting: false }));
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while deleting camp');
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  const toggleCenterSelection = (centerName: string) => {
    setFormData((prev) => {
      const current = prev.eligible_centers || [];
      const exists = current.includes(centerName);
      const updated = exists ? current.filter((c) => c !== centerName) : [...current, centerName];
      return { ...prev, eligible_centers: updated };
    });
  };

  const selectAllCenters = () => {
    setFormData((prev) => ({
      ...prev,
      eligible_centers: availableCenters.map((c) => c.name)
    }));
  };

  const clearAllCenters = () => {
    setFormData((prev) => ({
      ...prev,
      eligible_centers: []
    }));
  };

  const addTrack = () => {
    if (!formData.newTrackInput.trim()) return;
    if (formData.tracks.includes(formData.newTrackInput.trim())) return;
    setFormData({
      ...formData,
      tracks: [...formData.tracks, formData.newTrackInput.trim()],
      newTrackInput: ''
    });
  };

  const removeTrack = (trackName: string) => {
    setFormData({
      ...formData,
      tracks: formData.tracks.filter((t) => t !== trackName),
      special_waivers: {
        ...formData.special_waivers,
        track_fees: (formData.special_waivers.track_fees || []).filter((tf) => tf.track !== trackName)
      }
    });
  };

  const updateTrackFee = (trackName: string, updates: { fee?: number; label?: string; min_rounds?: number; applicable_roles?: string[]; start_date?: string; start_meal_type?: string; end_date?: string; end_meal_type?: string }) => {
    const existing = formData.special_waivers.track_fees || [];
    const index = existing.findIndex((tf) => tf.track.toLowerCase() === trackName.toLowerCase());
    let nextList: CampTrackFee[];

    if (index >= 0) {
      nextList = [...existing];
      nextList[index] = {
        ...nextList[index],
        ...updates
      };
    } else {
      nextList = [
        ...existing,
        {
          track: trackName,
          fee: updates.fee ?? 0,
          label: updates.label ?? 'Camp Booklet & Study Material',
          min_rounds: updates.min_rounds ?? 0,
          applicable_roles: updates.applicable_roles ?? [],
          start_date: updates.start_date,
          start_meal_type: updates.start_meal_type,
          end_date: updates.end_date,
          end_meal_type: updates.end_meal_type,
        }
      ];
    }

    setFormData({
      ...formData,
      special_waivers: {
        ...formData.special_waivers,
        track_fees: nextList
      }
    });
  };

  const addBatchCapacity = () => {
    const name = newBatchName.trim() || `Batch ${(formData.accommodation_pricing.batch_capacities || []).length + 1}`;
    if (!newBatchStartDate || !newBatchEndDate) {
      alert('Please select both start and end dates for the accommodation batch.');
      return;
    }
    const cap = Number(newBatchCapacity) || 500;
    const existing = formData.accommodation_pricing.batch_capacities || [];
    const newBatch: CampAccommodationBatchCapacity = {
      id: `batch_${Date.now()}`,
      name,
      start_date: newBatchStartDate,
      end_date: newBatchEndDate,
      capacity: cap,
    };
    setFormData({
      ...formData,
      accommodation_pricing: {
        ...formData.accommodation_pricing,
        batch_capacities: [...existing, newBatch],
      },
    });
    setNewBatchName('');
    setNewBatchStartDate('');
    setNewBatchEndDate('');
    setNewBatchCapacity(500);
  };

  const removeBatchCapacity = (idx: number) => {
    const existing = formData.accommodation_pricing.batch_capacities || [];
    setFormData({
      ...formData,
      accommodation_pricing: {
        ...formData.accommodation_pricing,
        batch_capacities: existing.filter((_, i) => i !== idx),
      },
    });
  };

  const addRecommendedHotel = () => {
    if (!newHotelName.trim()) {
      alert('Please enter the hotel name.');
      return;
    }
    const existing = formData.accommodation_pricing.recommended_hotels || [];
    const newHotel: CampRecommendedHotel = {
      id: `hotel_${Date.now()}`,
      name: newHotelName.trim(),
      contact: newHotelContact.trim(),
      address: newHotelAddress.trim(),
      tariff: newHotelTariff.trim(),
      notes: newHotelNotes.trim(),
    };
    setFormData({
      ...formData,
      accommodation_pricing: {
        ...formData.accommodation_pricing,
        recommended_hotels: [...existing, newHotel],
      },
    });
    setNewHotelName('');
    setNewHotelContact('');
    setNewHotelAddress('');
    setNewHotelTariff('');
    setNewHotelNotes('');
  };

  const removeRecommendedHotel = (idx: number) => {
    const existing = formData.accommodation_pricing.recommended_hotels || [];
    setFormData({
      ...formData,
      accommodation_pricing: {
        ...formData.accommodation_pricing,
        recommended_hotels: existing.filter((_, i) => i !== idx),
      },
    });
  };

  const addCoupon = () => {
    const code = newCouponCode.trim().toUpperCase();
    if (!code) return;
    const existing = formData.special_waivers.coupons || [];
    if (existing.some((c) => c.code === code)) {
      alert(`Coupon code "${code}" already exists.`);
      return;
    }
    const parsedLimit = newCouponMaxUses.trim() !== '' ? parseInt(newCouponMaxUses, 10) : null;
    const maxUses = (parsedLimit && !isNaN(parsedLimit) && parsedLimit > 0) ? parsedLimit : null;

    const newCoupon: CampCoupon = {
      code,
      discount_type: newCouponType,
      discount_value: Number(newCouponValue) || 0,
      description: newCouponDesc.trim() || (newCouponType === 'PERCENT' ? `${newCouponValue}% OFF` : `₹${newCouponValue} OFF`),
      max_uses: maxUses,
      used_count: 0
    };
    setFormData({
      ...formData,
      special_waivers: {
        ...formData.special_waivers,
        coupons: [...existing, newCoupon]
      }
    });
    setNewCouponCode('');
    setNewCouponValue(100);
    setNewCouponDesc('');
    setNewCouponMaxUses('');
  };

  const resetCouponUsage = (code: string) => {
    const existing = formData.special_waivers.coupons || [];
    setFormData({
      ...formData,
      special_waivers: {
        ...formData.special_waivers,
        coupons: existing.map((c) => (c.code === code ? { ...c, used_count: 0 } : c))
      }
    });
  };

  const removeCoupon = (code: string) => {
    const existing = formData.special_waivers.coupons || [];
    setFormData({
      ...formData,
      special_waivers: {
        ...formData.special_waivers,
        coupons: existing.filter((c) => c.code !== code)
      }
    });
  };

  const updateRoleWaiver = (roleName: string, updates: Partial<CampRoleWaiver>) => {
    const current = formData.special_waivers.role_waivers || defaultRoleWaivers;
    const idx = current.findIndex((w) => w.role.toLowerCase() === roleName.toLowerCase());
    let next: CampRoleWaiver[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = { ...next[idx], ...updates };
    } else {
      next = [...current, { role: roleName, ...updates }];
    }
    setFormData({
      ...formData,
      special_waivers: {
        ...formData.special_waivers,
        role_waivers: next
      }
    });
  };

  const updateMealPrice = (index: number, field: keyof CampMealConfig, value: any) => {
    const updated = [...formData.meal_pricing];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, meal_pricing: updated });
  };

  const handleRowDateChange = (index: number, newDateStr: string) => {
    if (!newDateStr) return;
    const [yStr, mStr, dStr] = newDateStr.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) return;

    const monthStr = MONTH_NAMES_SHORT[m];
    const updated = [...formData.meal_pricing];
    updated[index] = {
      ...updated[index],
      date: String(d),
      label: `${d} - ${monthStr}`,
      full_date: newDateStr
    };

    const sorted = sortMealDays(updated, formData.start_date);
    setFormData({ ...formData, meal_pricing: sorted });
  };

  const handleSortMealDays = () => {
    const sorted = sortMealDays(formData.meal_pricing, formData.start_date);
    setFormData({ ...formData, meal_pricing: sorted });
  };

  const handleAddCalendarDate = (dateToAdd?: string) => {
    const targetDateStr = (dateToAdd || mealCalendarDate || '').trim();
    if (!targetDateStr) {
      alert('Please select a date from the calendar first.');
      return;
    }
    const [yStr, mStr, dStr] = targetDateStr.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) {
      alert('Invalid date selected.');
      return;
    }

    const monthStr = MONTH_NAMES_SHORT[m];
    const dateKey = String(d);
    const formattedIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const formattedLabel = `${d} - ${monthStr}`;

    // Check if already in schedule
    const alreadyExists = formData.meal_pricing.some((mp) => {
      if (mp.full_date === formattedIso) return true;
      const parsedIso = parseMealDayToIso(mp, formData.start_date);
      return parsedIso === formattedIso;
    });

    if (alreadyExists) {
      alert(`Date ${formattedLabel} is already in the meal schedule.`);
      return;
    }

    // Inherit default prices from first or last row if available
    const templateRow = formData.meal_pricing[0] || formData.meal_pricing[formData.meal_pricing.length - 1];
    const breakfast = templateRow ? Number(templateRow.breakfast) : 40;
    const lunch = templateRow ? Number(templateRow.lunch) : 60;
    const dinner = templateRow ? Number(templateRow.dinner) : 30;

    const newDay: CampMealConfig = {
      date: dateKey,
      label: formattedLabel,
      breakfast,
      lunch,
      dinner,
      isPeak: false,
      full_date: formattedIso
    };

    const nextList = sortMealDays([...formData.meal_pricing, newDay], formData.start_date);
    setFormData({
      ...formData,
      meal_pricing: nextList
    });

    // Advance calendar picker to next day (or day before if we just added an early day)
    if (formData.start_date && formattedIso < formData.start_date) {
      const dayBefore = new Date(y, m, d - 1);
      const dbIso = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2, '0')}-${String(dayBefore.getDate()).padStart(2, '0')}`;
      setMealCalendarDate(dbIso);
    } else {
      const dayAfter = new Date(y, m, d + 1);
      const daIso = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, '0')}-${String(dayAfter.getDate()).padStart(2, '0')}`;
      setMealCalendarDate(daIso);
    }
  };

  const addMealDay = () => {
    if (mealCalendarDate) {
      handleAddCalendarDate(mealCalendarDate);
      return;
    }

    let nextIso = '';
    if (formData.meal_pricing.length > 0) {
      const last = formData.meal_pricing[formData.meal_pricing.length - 1];
      const lastIso = parseMealDayToIso(last, formData.start_date);
      if (lastIso) {
        const [y, m, d] = lastIso.split('-').map(Number);
        const dt = new Date(y, m - 1, d + 1);
        nextIso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
    } else if (formData.start_date) {
      nextIso = formData.start_date;
    }

    if (nextIso) {
      handleAddCalendarDate(nextIso);
    } else {
      alert('Please select a date from the calendar to add.');
    }
  };

  const autoGenerateMealDays = () => {
    if (!formData.start_date || !formData.end_date) {
      alert('Please set Camp Start Date and End Date in the Basic Details tab first.');
      return;
    }
    const [sy, sm, sd] = formData.start_date.split('-').map(Number);
    const [ey, em, ed] = formData.end_date.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      alert('Please enter valid Start and End Dates.');
      return;
    }

    const newMeals: CampMealConfig[] = [];
    const curr = new Date(sy, sm - 1, sd);
    while (curr <= end && newMeals.length < 31) {
      const cy = curr.getFullYear();
      const cm = curr.getMonth();
      const cd = curr.getDate();
      const fullDateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(cd).padStart(2, '0')}`;
      const monthStr = MONTH_NAMES_SHORT[cm];
      const dateKey = String(cd);

      const existing = formData.meal_pricing.find((m) => {
        if (m.full_date === fullDateStr) return true;
        const parsedIso = parseMealDayToIso(m, formData.start_date);
        return parsedIso === fullDateStr;
      });

      newMeals.push({
        date: dateKey,
        label: `${cd} - ${monthStr}`,
        full_date: fullDateStr,
        breakfast: existing?.breakfast ?? 40,
        lunch: existing?.lunch ?? 60,
        dinner: existing?.dinner ?? 30,
        isPeak: existing?.isPeak ?? false
      });

      curr.setDate(curr.getDate() + 1);
    }

    // Preserve any existing early arrival or late departure days that admin already configured
    const extraDays = formData.meal_pricing.filter((m) => {
      const iso = parseMealDayToIso(m, formData.start_date);
      if (!iso) return false;
      return iso < formData.start_date || iso > formData.end_date;
    });

    const combined = sortMealDays([...newMeals, ...extraDays], formData.start_date);

    setFormData({
      ...formData,
      meal_pricing: combined
    });
  };

  const removeMealDay = (index: number) => {
    const updated = formData.meal_pricing.filter((_, i) => i !== index);
    setFormData({ ...formData, meal_pricing: updated });
  };

  // Helper to suggest adding the preceding day before camp starts (for devotees arriving early)
  const suggestedEarlyDate = (() => {
    if (!formData.start_date) return null;
    let earliestIso = formData.start_date;
    if (formData.meal_pricing.length > 0) {
      for (const m of formData.meal_pricing) {
        const iso = parseMealDayToIso(m, formData.start_date);
        if (iso && iso < earliestIso) {
          earliestIso = iso;
        }
      }
    }
    const [y, m, d] = earliestIso.split('-').map(Number);
    const prevDt = new Date(y, m - 1, d - 1);
    const prevIso = `${prevDt.getFullYear()}-${String(prevDt.getMonth() + 1).padStart(2, '0')}-${String(prevDt.getDate()).padStart(2, '0')}`;
    const prevLabel = `${prevDt.getDate()} - ${MONTH_NAMES_SHORT[prevDt.getMonth()]}`;
    return { iso: prevIso, label: prevLabel };
  })();

  // Metrics (Archived camps are excluded from All Camps and Active metrics)
  const totalCamps = camps.filter((c) => c.status !== 'archived').length;
  const activeCamps = camps.filter((c) => c.status === 'active').length;
  const completedCamps = camps.filter((c) => c.status === 'closed' || c.status === 'completed').length;
  const draftCamps = camps.filter((c) => c.status === 'draft').length;
  const archivedCamps = camps.filter((c) => c.status === 'archived').length;
  const totalRegistrations = camps
    .filter((c) => c.status !== 'archived')
    .reduce((sum, c) => sum + (Number(c.registration_count) || 0), 0);
  const totalRevenue = camps
    .filter((c) => c.status !== 'archived')
    .reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0);

  // Filtered Camps: Archived camps do not appear in 'All Camps'
  const filteredCamps = camps.filter((c) => {
    if (filterTab === 'all') return c.status !== 'archived';
    if (filterTab === 'active') return c.status === 'active';
    if (filterTab === 'completed') return c.status === 'closed' || c.status === 'completed';
    if (filterTab === 'draft') return c.status === 'draft';
    if (filterTab === 'archived') return c.status === 'archived';
    return c.status !== 'archived';
  });

  if (!authLoading && (!userData || !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-[#fafcff] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Redirecting to Camp Staff Portal...</h2>
          <p className="text-xs text-slate-500">
            You do not have master Super Admin privileges. Redirecting you to your assigned camp duty desk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafcff] p-2.5 sm:p-4 lg:p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        
        {/* Streamlined Top Navigation Bar: Admin Center, Primary Views, & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-1 sm:p-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5 sm:pb-0">
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-amber-600 rounded-lg hover:bg-slate-50 transition-colors font-bold whitespace-nowrap shrink-0 border border-slate-200"
              title="Return to Admin Center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>

            <button
              onClick={() => setMainView('camps')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                mainView === 'camps'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Tent className="w-3.5 h-3.5" />
              <span>Camp Retreats ({totalCamps})</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setMainView('audit');
                  if (transactions.length === 0) loadAuditData();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  mainView === 'audit'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Financial Audit</span>
                {auditStats && (auditStats.pending_verifications > 0 || auditStats.pending_refunds > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500 text-white">
                    {auditStats.pending_verifications + auditStats.pending_refunds}
                  </span>
                )}
              </button>
            )}

            {isSuperAdmin && (
              <button
                onClick={() => setMainView('prasadam')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  mainView === 'prasadam'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 text-amber-300" />
                <span>Prasadam Audit</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => {
                if (mainView === 'camps') loadCamps();
                else loadAuditData();
              }}
              className="p-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || auditLoading) ? 'animate-spin' : ''}`} />
            </button>

            {/* QR Code Pass Scanner Button */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Scan Attendee Pass QR Code for Gate Entry & Meal Punch"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan Pass</span>
            </button>

            {/* Super Admin Staff & Role Management */}
            {isSuperAdmin && (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Assign camp staff and custom privileges"
              >
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Staff &amp; Roles</span>
                <span className="md:hidden">Staff</span>
              </button>
            )}

            {mainView === 'camps' && isSuperAdmin && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-lg text-xs shadow-xs shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Host Camp</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: CAMPS RETREAT MANAGEMENT */}
        {mainView === 'camps' && (
          <>

        {/* Stats Row: Compact on Mobile & 13"-14" Laptops */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>All Camps</span>
              <Tent className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalCamps}</div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate mt-0.5">Total Hosted Retreats</span>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Active Camps</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-base sm:text-xl font-black text-emerald-600 mt-0.5 sm:mt-1">{activeCamps}</div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate mt-0.5">Accepting Registrations</span>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Devotees Registered</span>
              <Users className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalRegistrations}</div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate mt-0.5">Across All Camps</span>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Total Laxmi</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-base sm:text-xl font-black text-amber-600 mt-0.5 sm:mt-1 truncate">
              ₹{Number(totalRevenue).toLocaleString('en-IN')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate mt-0.5">Collected Camp Laxmi</span>
          </div>
        </div>

        {/* STATUS FILTER TABS: Always access active & past camps */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-200/90 rounded-xl sm:rounded-full shadow-2xs text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-full transition-all whitespace-nowrap shrink-0 text-xs ${
                filterTab === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Camps ({totalCamps})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-full transition-all whitespace-nowrap shrink-0 text-xs ${
                filterTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Open ({activeCamps})
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-full transition-all whitespace-nowrap shrink-0 text-xs ${
                filterTab === 'completed'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past / Completed ({completedCamps})
            </button>
            <button
              onClick={() => setFilterTab('draft')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-full transition-all whitespace-nowrap shrink-0 text-xs ${
                filterTab === 'draft'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({draftCamps})
            </button>
            <button
              onClick={() => setFilterTab('archived')}
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-full transition-all whitespace-nowrap shrink-0 text-xs ${
                filterTab === 'archived'
                  ? 'bg-rose-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived ({archivedCamps})</span>
            </button>
          </div>

          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            {filterTab === 'archived'
              ? 'Archived camps are kept here safely. You can restore them or permanently delete them.'
              : 'Past and concluded camps remain permanently accessible for reports & Excel downloads.'}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Camps Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <Loader2 className="w-7 h-7 text-amber-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading camps and configurations...</p>
          </div>
        ) : filteredCamps.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <Tent className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Camps in this Category</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {filterTab === 'completed'
                ? 'No past completed camps yet.'
                : 'Click Host New Camp to set up your retreat dates, tracks, and fees.'}
            </p>
            {filterTab !== 'completed' && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full text-xs font-bold shadow-xs shadow-orange-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Host New Camp
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {filteredCamps.map((camp) => {
              const startDateStr = camp.start_date ? new Date(camp.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              const endDateStr = camp.end_date ? new Date(camp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              const isPastCamp = camp.status === 'closed' || camp.status === 'completed';

              return (
                <div
                  key={camp.id}
                  className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 flex flex-col justify-between transition-all hover:shadow-xs ${
                    isPastCamp
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-white border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Header: Status Badge & Actions */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                          camp.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : camp.status === 'draft'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : camp.status === 'archived'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-200/80 text-slate-700 border border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            camp.status === 'active'
                              ? 'bg-emerald-500 animate-pulse'
                              : camp.status === 'archived'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {camp.status.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-1">
                        {camp.status === 'archived' ? (
                          <>
                            <button
                              onClick={() => handleUnarchiveCamp(camp.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
                              title="Restore Camp from Archive"
                            >
                              <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => openEditModal(camp)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                              title="Edit Camp Config"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {/* In Archive: Keep Delete Option */}
                            <button
                              onClick={() => openDeleteModal(camp.id, camp.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Permanently Delete Camp"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleStatus(camp.id, camp.status)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                              title="Toggle Active/Closed"
                            >
                              {camp.status === 'active' ? 'Close' : 'Reactivate'}
                            </button>
                            <button
                              onClick={() => openEditModal(camp)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                              title="Edit Camp Config"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {/* Regular Cards: Show Archive instead of Delete */}
                            <button
                              onClick={() => handleArchiveCamp(camp.id)}
                              className="p-1 text-slate-400 hover:text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                              title="Archive Camp"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h2 className="text-sm sm:text-base font-black text-slate-900 mb-1 line-clamp-1">
                      {camp.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                      {camp.description || 'Spiritual retreat and youth development camp.'}
                    </p>

                    <div className="space-y-1 text-[10.5px] sm:text-[11px] text-slate-600 mb-2.5 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{startDateStr} &mdash; {endDateStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{camp.venue || 'Central VOICE, Pune'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{(camp.meal_pricing || []).length} Scheduled Meal Days</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {camp.eligible_centers && camp.eligible_centers.length > 0
                            ? `Restricted: ${camp.eligible_centers.length} Centers (${camp.eligible_centers.slice(0, 2).join(', ')}${camp.eligible_centers.length > 2 ? '...' : ''})`
                            : 'Open to All Centers'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Devotee Count & Collections: Permanent Records */}
                    <div className="flex items-center justify-between py-1.5 sm:py-2 border-t border-slate-100 text-xs mb-2">
                      <div>
                        <span className="text-slate-400 block text-[9.5px] sm:text-[10px] font-semibold">Attendees</span>
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {camp.registration_count || 0}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9.5px] sm:text-[10px] font-semibold">Collections</span>
                        <span className="text-sm sm:text-base font-black text-emerald-600">
                          ₹{Number(camp.total_revenue || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <Link
                        href={`/dashboard/admin/camps/${camp.id}/registrations`}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Attendees</span>
                      </Link>
                      <Link
                        href={`/camps/${camp.slug}`}
                        target="_blank"
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isPastCamp ? 'Lookup' : 'Public Portal'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}

        {/* VIEW 2: SUPER ADMIN FINANCIAL AUDIT & TRANSACTIONS */}
        {mainView === 'audit' && (
          <div className="space-y-6">
            {!isSuperAdmin ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Super Admin Access Required</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Only Super Administrators have permission to view complete cross-camp transactions, banking UTRs, and financial reconciliation ledgers.
                </p>
              </div>
            ) : (
              <>
                {/* Financial Summary Cards with Complete Gross -> Discount -> Net Tally (Collapsible) */}
                {showFinancialSummary && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-amber-600" />
                        <span>Financial Summary &amp; Reconciliation</span>
                      </span>

                      {isFilterActive ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <Filter className="w-3 h-3 text-amber-600" />
                            <span>Filtered View ({dynamicStats.total_transactions} Batches)</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleResetAuditFilters}
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          All Records ({dynamicStats.total_transactions} Batches)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-2.5">
                      {/* 1. Gross Camp Value (Before Discounts) */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Camp Value</span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-slate-900 mt-0.5">
                          ₹{dynamicStats.total_gross_fee.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate mt-0.5">Before Waivers</span>
                      </div>

                      {/* 2. Coupons & Discounts Given */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/90 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-orange-700 uppercase tracking-wider block flex items-center justify-between">
                          <span>Coupons / Discounts</span>
                          <Tag className="w-3 h-3 text-orange-600" />
                        </span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-orange-950 mt-0.5">
                          -₹{dynamicStats.total_discounts.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-orange-700 block truncate mt-0.5">
                          {dynamicStats.total_coupons_count} {dynamicStats.total_coupons_count === 1 ? 'Batch Subsidized' : 'Batches Subsidized'}
                        </span>
                      </div>

                      {/* 3. Net Cash Collected (Received in Bank/Gateway) */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/90 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Net Cash Received</span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-800 mt-0.5">
                          ₹{dynamicStats.total_collected.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-emerald-700 block truncate mt-0.5">Bank &amp; Gateway Inflow</span>
                      </div>

                      {/* 4. Total Cash Refunded */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Total Refunded</span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-purple-700 mt-0.5">
                          ₹{dynamicStats.total_refunded.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-purple-900 font-medium block truncate mt-0.5">Approved Payouts Sent</span>
                      </div>

                      {/* 5. Net Retained Revenue */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Net Revenue</span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-indigo-700 mt-0.5">
                          ₹{dynamicStats.net_revenue.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-indigo-950 font-medium block truncate mt-0.5">Cash Inflow - Refunded</span>
                      </div>

                      {/* 6. Total Attendees & Batches */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Devotees</span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-amber-600 mt-0.5">
                          {dynamicStats.total_participants}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate mt-0.5">in {dynamicStats.total_transactions} Batches</span>
                      </div>

                      {/* 7. Action Needed */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 shadow-2xs">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Action Needed</span>
                        <div className="text-sm sm:text-base lg:text-lg font-black text-amber-900 mt-0.5 flex items-center gap-1.5">
                          <span>{dynamicStats.pending_verifications + dynamicStats.pending_refunds}</span>
                          {(dynamicStats.pending_verifications + dynamicStats.pending_refunds > 0) && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          )}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-amber-700 block truncate mt-0.5">
                          {dynamicStats.pending_verifications} ITT | {dynamicStats.pending_refunds} Refunds
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-view Navigation Switcher & Ledger Exports */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setAuditSubView('transactions')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        auditSubView === 'transactions'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>All Transactions ({filteredTransactions.length})</span>
                    </button>

                    <button
                      onClick={() => setAuditSubView('refunds')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        auditSubView === 'refunds'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Undo2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Refund Requests Audit ({filteredRefunds.length})</span>
                      {auditRefunds.filter(r => r.status === 'pending').length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white">
                          {auditRefunds.filter(r => r.status === 'pending').length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowFinancialSummary(!showFinancialSummary)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        showFinancialSummary
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={showFinancialSummary ? 'Hide financial summary cards' : 'Show financial summary cards'}
                    >
                      <Landmark className="w-3.5 h-3.5 text-amber-600" />
                      <span>Summary ({showFinancialSummary ? 'Hide' : 'Show'})</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showFinancialSummary ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Direct Ledger Export Action Buttons (Excel & CSV) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (auditSubView === 'transactions') {
                          handleExportTransactions('xlsx');
                        } else {
                          handleExportRefunds('xlsx');
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title={`Export ${auditSubView === 'transactions' ? 'Transactions' : 'Refunds'} to Excel (.xlsx)`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (auditSubView === 'transactions') {
                          handleExportTransactions('csv');
                        } else {
                          handleExportRefunds('csv');
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title={`Export ${auditSubView === 'transactions' ? 'Transactions' : 'Refunds'} to CSV (.csv)`}
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {/* Search */}
                    <div className="lg:col-span-2 relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => {
                          setAuditSearch(e.target.value);
                          setAuditPage(1);
                        }}
                        placeholder="Search by Payer Name, Phone, Email, UTR, Order ID, Passcode..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                      />
                      {auditSearch && (
                        <button
                          onClick={() => setAuditSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Camp Filter */}
                    <div>
                      <select
                        value={auditCampFilter}
                        onChange={(e) => {
                          setAuditCampFilter(e.target.value);
                          setAuditPage(1);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="all">All Camps ({camps.length})</option>
                        {camps.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Method Filter */}
                    {auditSubView === 'transactions' && (
                      <div>
                        <select
                          value={auditMethodFilter}
                          onChange={(e) => {
                            setAuditMethodFilter(e.target.value);
                            setAuditPage(1);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="all">All Payment Modes</option>
                          <option value="RAZORPAY">Razorpay Gateway</option>
                          <option value="IDT">IDT (Inter-Department)</option>
                          <option value="ITT">Inter-Temple Transfer (ITT)</option>
                          <option value="DISCOUNT">Coupons &amp; Discounts Applied</option>
                          <option value="FREE">Complimentary / Free / 100% Waiver</option>
                        </select>
                      </div>
                    )}

                    {/* Status Filter */}
                    <div>
                      <select
                        value={auditStatusFilter}
                        onChange={(e) => {
                          setAuditStatusFilter(e.target.value);
                          setAuditPage(1);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending Verification</option>
                        <option value="refunded">Refunded / Cancelled</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <select
                        value={auditDateFilter}
                        onChange={(e) => {
                          setAuditDateFilter(e.target.value as any);
                          setAuditPage(1);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="all">Date: All Time</option>
                        <option value="today">Today</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                      </select>
                    </div>

                    {/* Sort Filter */}
                    {auditSubView === 'transactions' && (
                      <div>
                        <select
                          value={auditSortBy}
                          onChange={(e) => setAuditSortBy(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="date_desc">Sort: Newest First</option>
                          <option value="date_asc">Sort: Oldest First</option>
                          <option value="amount_desc">Sort: Amount (High to Low)</option>
                          <option value="amount_asc">Sort: Amount (Low to High)</option>
                          <option value="attendees_desc">Sort: Most Participants</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {auditError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{auditError}</span>
                  </div>
                )}

                {/* SUBVIEW 1: TRANSACTIONS TABLE */}
                {auditSubView === 'transactions' && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {auditLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
                        <p className="text-xs text-slate-500 font-medium">Loading transactions across all camps...</p>
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="text-center py-20 p-6">
                        <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-800">No Transactions Found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          No camp transactions matched your selected filters or search query.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Status & Method Color Guide Legend */}
                        <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-700">
                          <span className="font-bold flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-slate-800">
                            <Palette className="w-3 h-3 text-amber-600" />
                            <span>Color Guide:</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs border border-emerald-600"></span>
                            <span className="text-emerald-950">Money In (Razorpay)</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-2xs border border-orange-600"></span>
                            <span className="text-orange-950">Coupon / Discount</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-2xs border border-teal-600"></span>
                            <span className="text-teal-950">Inter-Temple (ITT)</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-2xs border border-sky-600"></span>
                            <span className="text-sky-950">Dept Transfer (IDT)</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-2xs border border-purple-600"></span>
                            <span className="text-purple-950">Refunded</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs border border-rose-600"></span>
                            <span className="text-rose-950">Refund Pending</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-2xs border border-yellow-500"></span>
                            <span className="text-yellow-950">Verification Pending</span>
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-2.5">Date &amp; Time</th>
                                <th className="py-2 px-2.5">Camp Retreat</th>
                                <th className="py-2 px-2.5">Payer / POC</th>
                                <th className="py-2 px-2.5 text-center">Attendees</th>
                                <th className="py-2 px-2.5">Payment Method &amp; Ref</th>
                                <th className="py-2 px-2.5">Amount Paid</th>
                                <th className="py-2 px-2.5">Status</th>
                                <th className="py-2 px-2.5 text-right">Audit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(auditPageSize === 'all'
                                ? filteredTransactions
                                : filteredTransactions.slice((auditPage - 1) * auditPageSize, auditPage * (auditPageSize as number))
                              ).map((t) => {
                                  const formattedDate = t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 'N/A';
                                  const formattedTime = t.created_at ? new Date(t.created_at).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '';

                                  // Compute distinct row shading & solid left accent bar
                                  const isRefunded = t.refund?.status === 'refunded' || t.payment_status === 'refunded';
                                  const isRefundPending = t.refund?.status === 'pending';
                                  const isPendingVerification = t.payment_status === 'pending' || (t.payment_method === 'INTER_TEMPLE_TRANSFER' && !t.verified_at);
                                  const isDiscountOrCoupon = (t.total_discount > 0 || !!t.coupon_code || ['FREE', 'COUPON', 'ROLE_WAIVER'].includes(t.payment_method));
                                  const isItt = t.payment_method === 'INTER_TEMPLE_TRANSFER' || t.payment_method === 'ITT';
                                  const isIdt = t.payment_method === 'IDT';

                                  let rowShadeClass = '';
                                  if (isRefunded) {
                                    rowShadeClass = 'bg-purple-100/75 hover:bg-purple-200/85 border-l-4 border-l-purple-600 text-slate-900';
                                  } else if (isRefundPending) {
                                    rowShadeClass = 'bg-rose-100/70 hover:bg-rose-200/80 border-l-4 border-l-rose-600 text-slate-900';
                                  } else if (isPendingVerification) {
                                    rowShadeClass = 'bg-yellow-100/80 hover:bg-yellow-200/90 border-l-4 border-l-yellow-500 text-slate-900';
                                  } else if (isDiscountOrCoupon) {
                                    rowShadeClass = 'bg-orange-100/75 hover:bg-orange-200/85 border-l-4 border-l-orange-500 text-slate-900';
                                  } else if (isItt) {
                                    rowShadeClass = 'bg-teal-100/60 hover:bg-teal-200/75 border-l-4 border-l-teal-600 text-slate-900';
                                  } else if (isIdt) {
                                    rowShadeClass = 'bg-sky-100/60 hover:bg-sky-200/75 border-l-4 border-l-sky-600 text-slate-900';
                                  } else {
                                    // Razorpay / Standard Money in
                                    rowShadeClass = 'bg-emerald-100/60 hover:bg-emerald-200/75 border-l-4 border-l-emerald-600 text-slate-900';
                                  }

                                  return (
                                    <tr key={t.txn_id} className={`${rowShadeClass} transition-colors group`}>
                                    {/* Date & Time */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <div className="font-semibold text-slate-900">{formattedDate}</div>
                                      <div className="text-[10px] text-slate-400">{formattedTime}</div>
                                    </td>

                                    {/* Camp Title */}
                                    <td className="py-2 px-2.5">
                                      <Link
                                        href={`/camps/${t.camp_slug}`}
                                        target="_blank"
                                        className="font-bold text-slate-900 hover:text-amber-600 transition-colors line-clamp-1 inline-flex items-center gap-1"
                                      >
                                        <span>{t.camp_title}</span>
                                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </Link>
                                      <div className="text-[10px] text-slate-400 font-mono">/camps/{t.camp_slug}</div>
                                    </td>

                                    {/* Payer POC */}
                                    <td className="py-2 px-2.5">
                                      <div className="font-bold text-slate-900">{t.poc_name || 'Anonymous'}</div>
                                      <div className="text-[11px] text-slate-500 font-mono">{t.poc_contact || t.email}</div>
                                    </td>

                                    {/* Devotees Count */}
                                    <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <Users className="w-3 h-3" />
                                        {t.participant_count} {t.participant_count === 1 ? 'Devotee' : 'Devotees'}
                                      </span>
                                      {t.participants && t.participants.length > 0 && (
                                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 max-w-[120px] mx-auto">
                                          {t.participants.map(p => p.participant_name).join(', ')}
                                        </div>
                                      )}
                                    </td>

                                    {/* Payment Method & Reference */}
                                    <td className="py-2 px-2.5">
                                      <div className="flex items-center gap-1.5">
                                        {t.payment_method === 'RAZORPAY' && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                            RAZORPAY
                                          </span>
                                        )}
                                        {t.payment_method === 'IDT' && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                            IDT TRANSFER
                                          </span>
                                        )}
                                        {t.payment_method === 'INTER_TEMPLE_TRANSFER' && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            ITT BANK TRANSFER
                                          </span>
                                        )}
                                        {['FREE', 'COUPON', 'ROLE_WAIVER'].includes(t.payment_method) && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200">
                                            {t.payment_method}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 line-clamp-1">
                                        {t.payment_method === 'RAZORPAY' && (t.payment_id || t.order_id || 'Online')}
                                        {t.payment_method === 'IDT' && (t.deduction_source ? `Dept: ${t.deduction_source}` : `Key: ${t.passcode || 'IDT'}`)}
                                        {t.payment_method === 'INTER_TEMPLE_TRANSFER' && (t.payment_id ? `UTR: ${t.payment_id}` : 'Receipt Attached')}
                                        {['FREE', 'COUPON', 'ROLE_WAIVER'].includes(t.payment_method) && (t.coupon_code || '100% Waiver')}
                                      </div>
                                    </td>

                                    {/* Amount Paid & Discount Breakdown */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                                          ₹{t.total_amount.toLocaleString('en-IN')}
                                        </span>
                                        {t.total_discount > 0 && (
                                          <span className="text-[10px] line-through text-slate-400 font-semibold" title="Original Billed Fee before discount">
                                            ₹{((t.gross_amount || (t.total_amount + t.total_discount))).toLocaleString('en-IN')}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[9.5px] text-slate-400">
                                        Meals: ₹{t.total_meal_cost} | Stay: ₹{t.total_acc_cost}
                                        {Boolean(t.total_late_fee) && ` | Late: ₹${t.total_late_fee}`}
                                        {Boolean(t.total_entry_cost) && ` | Kit: ₹${t.total_entry_cost}`}
                                      </div>
                                      {t.total_discount > 0 && (
                                        <div className="text-[9.5px] font-bold text-orange-700 flex items-center gap-1 mt-0.5">
                                          <Tag className="w-2.5 h-2.5 text-orange-600 flex-shrink-0" />
                                          <span>-₹{t.total_discount.toLocaleString('en-IN')} {t.coupon_code ? `(${t.coupon_code})` : 'Discount'}</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Status */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      {t.refund?.status === 'refunded' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                          <Undo2 className="w-3 h-3" />
                                          Refunded (₹{Number(t.transaction_refund_amount != null ? t.transaction_refund_amount : t.refund.refund_amount).toLocaleString('en-IN')})
                                        </span>
                                      ) : t.refund?.status === 'pending' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                          <Undo2 className="w-3 h-3" />
                                          Refund Pending (₹{Number(t.transaction_refund_amount != null ? t.transaction_refund_amount : t.refund.refund_amount).toLocaleString('en-IN')})
                                        </span>
                                      ) : t.refund?.status === 'rejected' ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <CheckCircle className="w-3 h-3" />
                                            Completed
                                          </span>
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200" title={`Refund rejected${t.refund.admin_notes ? `: ${t.refund.admin_notes}` : ''}`}>
                                            <X className="w-2.5 h-2.5 text-rose-500" />
                                            Refund Rejected
                                          </span>
                                        </div>
                                      ) : t.payment_status === 'completed' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <CheckCircle className="w-3 h-3" />
                                          Completed
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                          <Clock className="w-3 h-3 animate-spin" />
                                          Verification Pending
                                        </span>
                                      )}
                                    </td>

                                    {/* Inspect Action */}
                                    <td className="py-2 px-2.5 text-right whitespace-nowrap">
                                      <button
                                        onClick={() => setSelectedTxn(t)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg font-bold text-xs transition-all shadow-2xs cursor-pointer"
                                        title="Inspect full transaction details"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Inspect</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                      </>
                    )}

                    {/* Professional Pagination Bar (20, 40, 100, All) */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      {/* Left: Rows Per Page Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-xs">Rows per page:</span>
                        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                          {([20, 40, 100, 'all'] as const).map((size) => (
                            <button
                              key={String(size)}
                              type="button"
                              onClick={() => {
                                setAuditPageSize(size);
                                setAuditPage(1);
                              }}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                auditPageSize === size
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                            >
                              {size === 'all' ? 'All' : size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Middle: Range */}
                      <span className="text-slate-500 font-medium">
                        Showing <strong className="text-slate-800">{filteredTransactions.length === 0 ? 0 : (auditPageSize === 'all' ? 1 : (auditPage - 1) * (auditPageSize as number) + 1)}</strong> to{' '}
                        <strong className="text-slate-800">{auditPageSize === 'all' ? filteredTransactions.length : Math.min(auditPage * (auditPageSize as number), filteredTransactions.length)}</strong> of{' '}
                        <strong className="text-slate-900">{filteredTransactions.length}</strong> transactions
                      </span>

                      {/* Right: Page Navigation Buttons */}
                      {auditPageSize !== 'all' && Math.ceil(filteredTransactions.length / (auditPageSize as number)) > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAuditPage(1)}
                            disabled={auditPage === 1}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                            title="First Page"
                          >
                            &laquo;
                          </button>
                          <button
                            onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                            disabled={auditPage === 1}
                            className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                          >
                            Prev
                          </button>
                          {/* Page pill numbers */}
                          {Array.from({ length: Math.ceil(filteredTransactions.length / (auditPageSize as number)) }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === Math.ceil(filteredTransactions.length / (auditPageSize as number)) || Math.abs(p - auditPage) <= 1)
                            .map((p, idx, arr) => (
                              <React.Fragment key={p}>
                                {idx > 0 && arr[idx - 1] !== p - 1 && (
                                  <span className="px-1 text-slate-400">...</span>
                                )}
                                <button
                                  onClick={() => setAuditPage(p)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    auditPage === p
                                      ? 'bg-slate-900 text-white'
                                      : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            ))}
                          <button
                            onClick={() => setAuditPage(prev => Math.min(Math.ceil(filteredTransactions.length / (auditPageSize as number)), prev + 1))}
                            disabled={auditPage >= Math.ceil(filteredTransactions.length / (auditPageSize as number))}
                            className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                          >
                            Next
                          </button>
                          <button
                            onClick={() => setAuditPage(Math.ceil(filteredTransactions.length / (auditPageSize as number)))}
                            disabled={auditPage >= Math.ceil(filteredTransactions.length / (auditPageSize as number))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                            title="Last Page"
                          >
                            &raquo;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUBVIEW 2: REFUND REQUESTS AUDIT TABLE */}
                {auditSubView === 'refunds' && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {auditLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
                        <p className="text-xs text-slate-500 font-medium">Loading refunds audit...</p>
                      </div>
                    ) : filteredRefunds.length === 0 ? (
                      <div className="text-center py-20 p-6">
                        <Undo2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-800">No Refund Claims Found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          No cancellation or refund requests matched your filters.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-2.5">Requested Date</th>
                              <th className="py-2 px-2.5">Camp Retreat</th>
                              <th className="py-2 px-2.5">Devotee Name &amp; Contact</th>
                              <th className="py-2 px-2.5">Type &amp; Attendees</th>
                              <th className="py-2 px-2.5">Refund Amount</th>
                              <th className="py-2 px-2.5">Payout Account / UPI</th>
                              <th className="py-2 px-2.5">Payout UTR</th>
                              <th className="py-2 px-2.5">Status</th>
                              <th className="py-2 px-2.5 text-right">Camp Portal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(refundPageSize === 'all'
                              ? filteredRefunds
                              : filteredRefunds.slice((refundPage - 1) * refundPageSize, refundPage * (refundPageSize as number))
                            ).map((r) => {
                              const reqDate = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : 'N/A';

                              return (
                                <tr key={r.id} className="hover:bg-rose-50/20 transition-colors">
                                  <td className="py-2 px-2.5 whitespace-nowrap">
                                    <div className="font-semibold text-slate-900">{reqDate}</div>
                                    <div className="text-[10px] text-slate-400">ID: {r.id.substring(0, 8)}...</div>
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <div className="font-bold text-slate-900">{r.camp_title || 'Camp'}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">/camps/{r.camp_slug}</div>
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <div className="font-bold text-slate-900">{r.poc_name}</div>
                                    <div className="text-[11px] text-slate-500 font-mono">{r.poc_contact || r.email}</div>
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {r.cancellation_type}
                                    </span>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {Array.isArray(r.cancelled_registrations) ? `${r.cancelled_registrations.length} Devotees` : '1 Devotee'}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2.5 whitespace-nowrap">
                                    <div className="font-extrabold text-xs sm:text-sm text-rose-600">
                                      ₹{Number(r.refund_amount || 0).toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[9.5px] text-slate-400">
                                      Original: ₹{Number(r.original_total_amount || 0).toLocaleString('en-IN')}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2.5">
                                    {r.payout_type === 'UPI' ? (
                                      <div>
                                        <span className="font-mono text-emerald-700 font-bold text-xs">{r.upi_id}</span>
                                        <span className="text-[10px] text-slate-400 block font-sans">UPI VPA</span>
                                      </div>
                                    ) : (
                                      <div className="text-[11px] leading-tight">
                                        <div className="font-mono font-bold text-slate-900">{r.account_number}</div>
                                        <div className="text-slate-500 text-[10px]">{r.bank_name} &bull; IFSC: {r.ifsc_code}</div>
                                        <div className="text-slate-400 text-[10px]">A/C Holder: {r.account_name}</div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5">
                                    {r.payout_txn_ref ? (
                                      <div className="font-mono font-bold text-emerald-700 text-xs">
                                        {r.payout_txn_ref}
                                        {r.payout_date && <div className="text-[10px] text-slate-400 font-sans">{formatDisplayDate(r.payout_date)}</div>}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Pending transfer</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tracking-wide ${
                                        r.status === 'refunded'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : r.status === 'rejected'
                                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {r.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-right whitespace-nowrap">
                                    <Link
                                      href={`/dashboard/admin/camps/${r.camp_id}/registrations`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all"
                                    >
                                      <span>Camp Refund Desk</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Professional Pagination Bar for Refunds (20, 40, 100, All) */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      {/* Left: Rows Per Page Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-xs">Rows per page:</span>
                        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                          {([20, 40, 100, 'all'] as const).map((size) => (
                            <button
                              key={String(size)}
                              type="button"
                              onClick={() => {
                                setRefundPageSize(size);
                                setRefundPage(1);
                              }}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                refundPageSize === size
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                            >
                              {size === 'all' ? 'All' : size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Middle: Range */}
                      <span className="text-slate-500 font-medium">
                        Showing <strong className="text-slate-800">{filteredRefunds.length === 0 ? 0 : (refundPageSize === 'all' ? 1 : (refundPage - 1) * (refundPageSize as number) + 1)}</strong> to{' '}
                        <strong className="text-slate-800">{refundPageSize === 'all' ? filteredRefunds.length : Math.min(refundPage * (refundPageSize as number), filteredRefunds.length)}</strong> of{' '}
                        <strong className="text-slate-900">{filteredRefunds.length}</strong> refund claims
                      </span>

                      {/* Right: Page Navigation Buttons */}
                      {refundPageSize !== 'all' && Math.ceil(filteredRefunds.length / (refundPageSize as number)) > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setRefundPage(1)}
                            disabled={refundPage === 1}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                            title="First Page"
                          >
                            &laquo;
                          </button>
                          <button
                            onClick={() => setRefundPage(prev => Math.max(1, prev - 1))}
                            disabled={refundPage === 1}
                            className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                          >
                            Prev
                          </button>
                          {Array.from({ length: Math.ceil(filteredRefunds.length / (refundPageSize as number)) }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === Math.ceil(filteredRefunds.length / (refundPageSize as number)) || Math.abs(p - refundPage) <= 1)
                            .map((p, idx, arr) => (
                              <React.Fragment key={p}>
                                {idx > 0 && arr[idx - 1] !== p - 1 && (
                                  <span className="px-1 text-slate-400">...</span>
                                )}
                                <button
                                  onClick={() => setRefundPage(p)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    refundPage === p
                                      ? 'bg-slate-900 text-white'
                                      : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            ))}
                          <button
                            onClick={() => setRefundPage(prev => Math.min(Math.ceil(filteredRefunds.length / (refundPageSize as number)), prev + 1))}
                            disabled={refundPage >= Math.ceil(filteredRefunds.length / (refundPageSize as number))}
                            className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                          >
                            Next
                          </button>
                          <button
                            onClick={() => setRefundPage(Math.ceil(filteredRefunds.length / (refundPageSize as number)))}
                            disabled={refundPage >= Math.ceil(filteredRefunds.length / (refundPageSize as number))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                            title="Last Page"
                          >
                            &raquo;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 3: SUPER ADMIN PRASADAM AUDIT & KITCHEN LEDGER */}
        {mainView === 'prasadam' && (
          <AdminGlobalPrasadamAuditTab
            onOpenScanner={() => setIsQrScannerOpen(true)}
          />
        )}
      </div>

      {/* COMPREHENSIVE TRANSACTION AUDIT INSPECTOR MODAL */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-sm">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Transaction Audit Inspector
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Super Admin
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Camp: <strong className="text-slate-800">{selectedTxn.camp_title}</strong></span>
                    <span>&bull;</span>
                    <span className="font-mono text-[11px]">Batch ID: {selectedTxn.txn_id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintVoucher(selectedTxn)}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="Print Official Payment & Reconciliation Voucher"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTxn.txn_id);
                    setCopiedTxnId(true);
                    setTimeout(() => setCopiedTxnId(false), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                  title="Copy Transaction ID"
                >
                  {copiedTxnId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTxnId ? 'Copied' : 'Copy ID'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: flex-1 min-h-0 prevents vertical overflow */}
            <div className="flex-1 min-h-0 p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Payer */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payer / Contact Devotee</span>
                    {selectedTxn.poc_contact && (
                      <a
                        href={`https://wa.me/${selectedTxn.poc_contact.replace(/[^0-9]/g, '').length === 10 ? `91${selectedTxn.poc_contact.replace(/[^0-9]/g, '')}` : selectedTxn.poc_contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hare Krishna ${selectedTxn.poc_name || 'Prabhuji'}, regarding your camp registration for "${selectedTxn.camp_title}" (Txn ID: ${selectedTxn.txn_id})...`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Chat with Devotee on WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">{selectedTxn.poc_name || 'N/A'}</div>
                  <div className="text-slate-600 font-mono mt-0.5">{selectedTxn.poc_contact || 'No contact'}</div>
                  <div className="text-slate-400 text-[11px] truncate">{selectedTxn.email}</div>
                </div>

                {/* Financial Summary & Itemized Division */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Cash Paid (₹)</span>
                    <span className="text-xs font-black text-slate-500">
                      Billed Gross: ₹{((selectedTxn.gross_amount || (selectedTxn.total_amount + selectedTxn.total_discount))).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    ₹{selectedTxn.total_amount.toLocaleString('en-IN')}
                  </div>
                  
                  {/* Detailed Sectional Division */}
                  <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Prasadam (Meals):</span>
                      <strong className="text-slate-900">₹{selectedTxn.total_meal_cost}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Room Stay / Acc:</span>
                      <strong className="text-slate-900">₹{selectedTxn.total_acc_cost}</strong>
                    </div>
                    {Boolean(selectedTxn.total_late_fee) && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Late Fee:</span>
                        <strong className="text-slate-900">₹{selectedTxn.total_late_fee}</strong>
                      </div>
                    )}
                    {Boolean(selectedTxn.total_entry_cost) && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Kit / Material Fee:</span>
                        <strong className="text-slate-900">₹{selectedTxn.total_entry_cost}</strong>
                      </div>
                    )}
                    {selectedTxn.total_discount > 0 && (
                      <div className="flex items-center justify-between text-orange-700 col-span-2">
                        <span>Coupon / Waiver:</span>
                        <strong className="text-orange-800">-₹{selectedTxn.total_discount} {selectedTxn.coupon_code ? `(${selectedTxn.coupon_code})` : ''}</strong>
                      </div>
                    )}
                    {selectedTxn.payment_method === 'RAZORPAY' && (
                      <div className="flex items-center justify-between text-blue-700 col-span-2">
                        <span>Gateway Charge (~2%):</span>
                        <strong className="text-blue-800">~₹{Math.round(selectedTxn.total_amount * 0.02)}</strong>
                      </div>
                    )}
                    {selectedTxn.refund && (
                      <div className="flex items-center justify-between text-purple-700 col-span-2 font-bold pt-1 border-t border-emerald-200/40">
                        <span>Refund Disbursed:</span>
                        <span>₹{Number(selectedTxn.transaction_refund_amount != null ? selectedTxn.transaction_refund_amount : selectedTxn.refund.refund_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Gateway / Method */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Payment Verification</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
                        selectedTxn.payment_status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : selectedTxn.payment_status === 'refunded'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {selectedTxn.payment_status?.toUpperCase() || 'COMPLETED'}
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-indigo-950 mt-1 leading-snug">
                      {selectedTxn.payment_method === 'INTER_TEMPLE_TRANSFER'
                        ? 'Inter-Temple Transfer (ITT)'
                        : selectedTxn.payment_method === 'IDT'
                        ? 'Inter-Department Transfer (IDT)'
                        : selectedTxn.payment_method === 'RAZORPAY'
                        ? 'Razorpay Gateway'
                        : selectedTxn.payment_method === 'FREE'
                        ? 'Fee Waiver'
                        : selectedTxn.payment_method?.replace(/_/g, ' ') || 'Payment'}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 font-mono mt-2 pt-2 border-t border-indigo-100 break-all space-y-0.5">
                    {selectedTxn.payment_method === 'RAZORPAY' && (
                      <>
                        <div>Pay ID: <span className="font-semibold text-slate-800">{selectedTxn.payment_id || 'N/A'}</span></div>
                        <div>Order: <span className="font-semibold text-slate-800">{selectedTxn.order_id || 'N/A'}</span></div>
                      </>
                    )}
                    {selectedTxn.payment_method === 'IDT' && (
                      <>
                        <div>Dept: <span className="font-semibold text-slate-800">{selectedTxn.deduction_source || 'Central VOICE'}</span></div>
                        <div>Passcode: <span className="font-semibold text-slate-800">{selectedTxn.passcode || 'N/A'}</span></div>
                      </>
                    )}
                    {selectedTxn.payment_method === 'INTER_TEMPLE_TRANSFER' && (
                      <>
                        <div>UTR: <span className="font-semibold text-slate-800">{selectedTxn.payment_id || 'Pending'}</span></div>
                        {selectedTxn.verified_by && <div>Verified By: <span className="font-semibold text-slate-800">{selectedTxn.verified_by}</span></div>}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Proof Screenshot (for ITT) */}
              {selectedTxn.payment_screenshot_url && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      onClick={() => setPreviewScreenshotUrl(selectedTxn.payment_screenshot_url || null)}
                      className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-amber-300 shadow-xs flex-shrink-0 cursor-pointer relative group"
                    >
                      <img
                        src={selectedTxn.payment_screenshot_url}
                        alt="Bank Receipt"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          const fileId = getDriveFileId(selectedTxn.payment_screenshot_url);
                          const target = e.currentTarget;
                          if (fileId && !target.dataset.fallbackTried) {
                            target.dataset.fallbackTried = '1';
                            target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                        <ImageIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="truncate">Inter-Temple Transfer Bank Receipt</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Devotee uploaded bank screenshot for payment verification.
                      </p>
                      {getDriveFileId(selectedTxn.payment_screenshot_url) && (
                        <div className="text-[10px] text-amber-700 font-mono mt-0.5 truncate">
                          Drive ID: {getDriveFileId(selectedTxn.payment_screenshot_url)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewScreenshotUrl(selectedTxn.payment_screenshot_url || null)}
                      className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>View Full Size</span>
                    </button>
                    <a
                      href={getDriveViewUrl(selectedTxn.payment_screenshot_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Open Original</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Refund Associated Box (if any) */}
              {selectedTxn.refund && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                      <Undo2 className="w-4 h-4" />
                      <span>Associated Refund Request ({selectedTxn.refund.status.toUpperCase()})</span>
                    </span>
                    <span className="font-black text-sm text-rose-700">
                      Refund Amount: ₹{selectedTxn.refund.refund_amount}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700">
                    Reason: {selectedTxn.refund.reason || 'Devotee cancellation request'}
                  </p>
                  <div className="text-[11px] text-rose-600 font-mono">
                    Payout: {selectedTxn.refund.payout_type} • {selectedTxn.refund.upi_id || `A/C: ${selectedTxn.refund.account_number} (${selectedTxn.refund.bank_name})`}
                    {selectedTxn.refund.payout_txn_ref && ` • UTR: ${selectedTxn.refund.payout_txn_ref}`}
                    {selectedTxn.refund.payout_date && ` • Date: ${formatDisplayDate(selectedTxn.refund.payout_date)}`}
                  </div>
                </div>
              )}

              {/* Batch Reconciliation & Direct Super Admin Approval Box (only for unverified offline payments) */}
              {selectedTxn.payment_status !== 'completed' &&
               selectedTxn.payment_status !== 'refunded' &&
               selectedTxn.payment_method !== 'RAZORPAY' &&
               !['FREE', 'COUPON', 'ROLE_WAIVER'].includes(selectedTxn.payment_method) ? (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Direct Payment Verification &amp; UTR Reconciliation</span>
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                      Pending Action
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Verify this offline transfer / payment batch. Once approved, payment status becomes <strong className="text-emerald-700">COMPLETED</strong>, confirmation passes to the devotee, and it is permanently stamped in audit records.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Bank UTR / Transaction ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={batchVerifyTxnId}
                        onChange={(e) => setBatchVerifyTxnId(e.target.value)}
                        placeholder="e.g. UTR123456789 or BANK REF"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Received Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={batchVerifyDate}
                        onChange={(e) => setBatchVerifyDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Audit Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        value={batchVerifyRemarks}
                        onChange={(e) => setBatchVerifyRemarks(e.target.value)}
                        placeholder="e.g. Verified via HDFC statement"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {batchVerifyError && (
                    <div className="text-rose-700 text-[11px] font-bold flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{batchVerifyError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={batchVerifyLoading}
                      onClick={handleRejectBatch}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Reject this payment batch"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reject Batch</span>
                    </button>
                    <button
                      type="button"
                      disabled={batchVerifyLoading}
                      onClick={handleVerifyBatch}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {batchVerifyLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Confirm &amp; Reconcile Batch</span>
                    </button>
                  </div>
                </div>
              ) : selectedTxn.verified_at ? (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Reconciled &amp; Verified by <strong>{selectedTxn.verified_by || 'Super Admin'}</strong> on{' '}
                      {new Date(selectedTxn.verified_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {selectedTxn.payment_id && (
                    <span className="font-mono text-[11px] bg-white border border-emerald-200 px-2 py-0.5 rounded-lg">
                      UTR: {selectedTxn.payment_id}
                    </span>
                  )}
                </div>
              ) : null}

              {/* Registered Devotees Roster for this payment */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Participants Registered in this Transaction ({selectedTxn.participants?.length || 0})</span>
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Participant Name</th>
                        <th className="py-2.5 px-3">Track &amp; Type</th>
                        <th className="py-2.5 px-3">Center / Temple</th>
                        <th className="py-2.5 px-3">Meals &amp; Stay</th>
                        <th className="py-2.5 px-3 text-right">Fee (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTxn.participants?.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{p.participant_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.whatsapp} &bull; {p.gender}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800">{p.camp_track}</span>
                            <div className="text-[10px] text-slate-400">{p.participant_type}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{p.voice_name || p.parent_temple || 'N/A'}</div>
                            {p.counselor_name && <div className="text-[10px] text-slate-400">Counselor: {p.counselor_name}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{p.first_meal_date} ({p.first_meal_type}) &rarr; {p.last_meal_date} ({p.last_meal_type})</div>
                            <div className="text-[10px] text-slate-400">Stay: {p.accommodation}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{Number(p.total_cost || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <Link
                href={`/dashboard/admin/camps/${selectedTxn.camp_id}/registrations`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
              >
                <span>Go to Camp Attendees Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREENSHOT MODAL */}
      {previewScreenshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between text-xs px-5 flex-shrink-0">
              <span className="font-bold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                Inter-Temple Transfer Bank Receipt
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={getDriveViewUrl(previewScreenshotUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Open in Drive</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewScreenshotUrl(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center bg-black/40">
              <img
                src={previewScreenshotUrl}
                alt="Bank Receipt Full Preview"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="max-h-[75vh] max-w-full w-auto object-contain rounded-xl shadow-2xl"
                onError={(e) => {
                  const fileId = getDriveFileId(previewScreenshotUrl);
                  const target = e.currentTarget;
                  if (fileId && !target.dataset.fallbackTried) {
                    target.dataset.fallbackTried = '1';
                    target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Host / Edit Camp Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[96vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                  <Tent className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {editingCamp ? 'Edit Camp Configuration' : 'Host New Camp'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    Set up retreat schedules, custom meal rates, room stay charges, and IDT keys.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-100 px-3 sm:px-6 gap-1 sm:gap-2 overflow-x-auto no-scrollbar bg-slate-50/30 text-xs font-bold shrink-0">
              {[
                { id: 'basic', label: '1. Basic Info', icon: Calendar },
                { id: 'tracks', label: '2. Camps', icon: Tent },
                { id: 'meals', label: '3. Meal Pricing Matrix', icon: Utensils },
                { id: 'accommodation', label: '4. Stay & Other Charges', icon: Home },
                { id: 'payment', label: '5. Payment & IDT', icon: CreditCard },
                { id: 'refund', label: '6. Cancellation & Refunds', icon: Undo2 }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-3 sm:py-3.5 px-2.5 sm:px-3 border-b-2 transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'border-amber-600 text-amber-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveCamp} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  {/* Panel 1: Identity */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Tent className="w-4 h-4 text-amber-600" />
                      Camp Identity &amp; Link
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Camp Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Annual VOICE Camp 2026"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          URL Slug (Public Link) *
                        </label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                          placeholder="e.g. annual-camp-2026"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                        />
                        <span className="text-[11px] text-slate-500 font-medium mt-1.5 block">
                          Portal URL: <span className="font-mono text-amber-700 font-bold">/camps/{formData.slug || 'slug'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2: Camp Retreat Schedule & Availability */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Camp Retreat Schedule &amp; Status
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Camp Start Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Camp End Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Camp Status *
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                        >
                          <option value="draft">Draft (Hidden)</option>
                          <option value="active">Active (Open for Registrations)</option>
                          <option value="closed">Closed / Past (Records Retained)</option>
                          <option value="completed">Completed (Concluded)</option>
                          <option value="archived">Archived (Moved to Archive Tab)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: Registration Lifecycle & Auto-Close Deadlines */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/50 via-slate-50 to-orange-50/30 border border-amber-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-200/60 pb-2">
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Registration Timeline &amp; Auto-Close Control
                      </h4>
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                        Admin Emergency / Live Override
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      You can adjust these dates at any time as per camp schedule needs, devotee extensions, or emergencies.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Registration Open Date
                        </label>
                        <input
                          type="date"
                          value={formData.registration_start_date}
                          onChange={(e) => setFormData({ ...formData, registration_start_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Optional. Leave blank to open immediately.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Late Fee Starts On
                        </label>
                        <input
                          type="date"
                          value={formData.late_fee_start_date}
                          onChange={(e) => setFormData({ ...formData, late_fee_start_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Late fee is charged on or after this date.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Late Fee Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.late_fee}
                          onChange={(e) => setFormData({ ...formData, late_fee: Number(e.target.value) })}
                          placeholder="120"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Added to attendee total when late fee is active.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Auto-Close Deadline
                        </label>
                        <input
                          type="date"
                          value={formData.registration_deadline}
                          onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Registrations automatically close past this date.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 4: Location & Instructions */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      Location &amp; Instructions
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Venue / Location
                      </label>
                      <input
                        type="text"
                        value={formData.venue}
                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        placeholder="e.g. Central VOICE, Pune"
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Description &amp; Briefing
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief devotees about instructions, schedule, what to bring, etc."
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Panel: Camp Poster, Eligibility Criteria & Colorful Announcement */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 via-slate-50 to-orange-50/40 border border-amber-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-200/60 pb-2">
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        Camp Poster Image &amp; Participant Eligibility
                      </h4>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        Student Card &amp; Presentation Display
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                          <span>Camp Poster / Banner Photo</span>
                          {formData.poster_url && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Photo Configured
                            </span>
                          )}
                        </label>

                        {/* Hidden file input for Google Drive upload */}
                        <input
                          ref={posterFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePosterFileUpload}
                          className="hidden"
                        />

                        {/* Upload to Google Drive Button, Library Button & Direct Link Input */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                          <button
                            type="button"
                            disabled={posterUploading}
                            onClick={() => posterFileInputRef.current?.click()}
                            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                          >
                            {posterUploading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading to Drive...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-4 h-4" />
                                <span>Upload to Google Drive</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={openPosterLibrary}
                            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-900 text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                            title="Choose from previously uploaded posters & thumbnails"
                          >
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                            <span>Choose from Library</span>
                          </button>

                          <div className="flex-1 relative">
                            <input
                              type="url"
                              value={formData.poster_url || ''}
                              onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                              placeholder="Or paste Google Drive link / Image URL..."
                              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-purple-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 outline-none transition-all placeholder:text-slate-400 pr-8"
                            />
                            {formData.poster_url && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, poster_url: '' })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                title="Remove photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {posterUploadError && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{posterUploadError}</span>
                          </div>
                        )}

                        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-purple-950">
                            <span>📁 Dedicated Google Drive Folder:</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-800">Camps Thumbnails</span>
                          </div>
                          <p className="text-slate-600 text-[10.5px] leading-relaxed">
                            <strong>Recommended Dimensions:</strong> <strong>16:9 banner</strong> (e.g. <strong>1200 × 675 px</strong> or <strong>1600 × 900 px</strong>) so the entire artwork is fully visible without top/bottom cropping. Accepts PNG, JPG, WebP up to 15MB.
                          </p>
                        </div>

                        {/* Live Photo Preview */}
                        {formData.poster_url && (
                          <div className="mt-2.5 relative w-full h-40 rounded-xl overflow-hidden border-2 border-purple-300 bg-slate-900 shadow-md">
                            <img
                              src={getThumbnailUrl(formData.poster_url) || formData.poster_url}
                              alt="Poster Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-bold border border-white/20">
                              Google Drive Preview
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 1. Camp Promotional / Welcome Message (Above criteria, concise limit) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                          <span>Camp Promotional / Welcome Message</span>
                          <span className={`text-[10.5px] font-mono font-semibold ${(formData.banner_message || '').length > 200 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {(formData.banner_message || '').length} / 220 chars
                          </span>
                        </label>
                        <textarea
                          rows={3}
                          maxLength={220}
                          value={formData.banner_message || ''}
                          onChange={(e) => setFormData({ ...formData, banner_message: e.target.value })}
                          placeholder="e.g. Join 300+ youth devotees for a blissful 4-day spiritual immersion filled with uplifting kirtans, transformative seminars, and sattvic feasts!"
                          className="w-full min-h-[85px] px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs sm:text-[13px] font-medium shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                        />
                        <p className="text-[10.5px] text-slate-500 mt-1">
                          Short, catchy welcome note shown on the camp card &amp; presentation view. Limited to 220 characters to keep the card compact and uncluttered.
                        </p>
                      </div>

                      {/* 2. Basic Eligibility Criteria (Full rules & breakdown) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                          <span>Basic Eligibility Criteria (Audience Requirements)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Full rules &amp; fee breakdown</span>
                        </label>
                        <textarea
                          rows={6}
                          value={formData.criteria_message || ''}
                          onChange={(e) => setFormData({ ...formData, criteria_message: e.target.value })}
                          placeholder="e.g. 1. Registration is mandatory with fees as follows:&#10;a. 📌 Breakfast: ₹40, Lunch: ₹100...&#10;b. 🏠 Accommodation Option:&#10;i. Central VOICE floor: ₹150/day..."
                          className="w-full min-h-[140px] px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs sm:text-[13px] font-medium shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y"
                        />
                        <p className="text-[10.5px] text-slate-500 mt-1">
                          Displayed with structured formatting in the &quot;Explore Camp&quot; presentation modal. Supports numbered points (1.), letters (a.), and Roman numerals (i.). Drag corner to expand.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Panel: Registration Email Guidelines, Custom Announcement & Dynamic Action Links */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-teal-50/20 to-slate-50 border border-emerald-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                          <Mail className="w-4 h-4 text-emerald-600" />
                          Registration Email Guidelines &amp; Dynamic Action Links
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                          Configure special announcements, arrival instructions, and dynamic action buttons (WhatsApp groups, Docs, Videos, Maps) sent to registered devotees.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-300">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Automated Devotee Email
                      </span>
                    </div>

                    {/* Standard Pass & QR Entry Notice Banner */}
                    <div className="p-3.5 rounded-xl bg-white/90 border border-emerald-200 flex items-start gap-3 shadow-xs">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-emerald-900">
                          Automatic Pass &amp; Entry Guidelines Included:
                        </p>
                        <p className="text-slate-600 leading-relaxed text-[11.5px]">
                          All welcome emails automatically inform devotees to <strong>bring their Camp Pass (printed copy or digital on mobile)</strong>, and remind them that their <strong>QR code will be scanned at the registration desk for issuing wristbands</strong> and at the <strong>Prasadam counter for meals</strong>.
                        </p>
                      </div>
                    </div>

                    {/* 1. Custom Email Instructions / Announcement */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>Special Camp Announcement / Instructions (Optional)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Included in confirmation email</span>
                      </label>
                      <textarea
                        rows={3}
                        value={formData.email_instructions || ''}
                        onChange={(e) => setFormData({ ...formData, email_instructions: e.target.value })}
                        placeholder="e.g. Please report at NVCC Gate 2 by 7:30 AM. Bring your own water bottle, notebook, and pen. Bedding will be provided at the ashram."
                        className="w-full min-h-[85px] px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs sm:text-[13px] font-medium shadow-xs hover:border-emerald-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                      />
                      <p className="text-[10.5px] text-slate-500">
                        Highlighted notice box inside the devotee welcome email for arrival instructions, packing lists, or special ashram rules.
                      </p>
                    </div>

                    {/* 2. Dynamic Action Links Repeater */}
                    <div className="space-y-3 pt-2 border-t border-emerald-200/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">
                            Dynamic Action Links &amp; Buttons (WhatsApp, Docs, Videos, Maps)
                          </label>
                          <p className="text-[10.5px] text-slate-500">
                            Buttons rendered with high visibility plus direct clickable URLs for easy access on any email client.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newLink: CampEmailLink = {
                              id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                              title: '',
                              url: '',
                              type: 'whatsapp'
                            };
                            setFormData({
                              ...formData,
                              email_links: [...(formData.email_links || []), newLink]
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Link / Button
                        </button>
                      </div>

                      {/* Links List */}
                      {(!formData.email_links || formData.email_links.length === 0) ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white/60 text-center text-xs text-slate-500">
                          No custom links added yet. Click &quot;Add Link / Button&quot; to add WhatsApp group links, Google Drive guidelines, YouTube videos, or venue Google Maps.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {formData.email_links.map((link, idx) => (
                            <div
                              key={link.id || idx}
                              className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-2.5"
                            >
                              <div className="w-full md:w-36 shrink-0">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">
                                  Type
                                </label>
                                <select
                                  value={link.type || 'whatsapp'}
                                  onChange={(e) => {
                                    const updated = [...(formData.email_links || [])];
                                    updated[idx] = { ...updated[idx], type: e.target.value as any };
                                    setFormData({ ...formData, email_links: updated });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                                >
                                  <option value="whatsapp">💬 WhatsApp</option>
                                  <option value="document">📄 Document / PDF</option>
                                  <option value="video">▶️ YouTube / Video</option>
                                  <option value="map">📍 Location / Map</option>
                                  <option value="website">🔗 Website / Other</option>
                                </select>
                              </div>

                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">
                                  Button Label / Title
                                </label>
                                <input
                                  type="text"
                                  value={link.title}
                                  onChange={(e) => {
                                    const updated = [...(formData.email_links || [])];
                                    updated[idx] = { ...updated[idx], title: e.target.value };
                                    setFormData({ ...formData, email_links: updated });
                                  }}
                                  placeholder="e.g. Join Official Camp WhatsApp Group"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-emerald-500 outline-none"
                                />
                              </div>

                              <div className="flex-[1.5]">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">
                                  Target URL (Destination)
                                </label>
                                <input
                                  type="url"
                                  value={link.url}
                                  onChange={(e) => {
                                    const updated = [...(formData.email_links || [])];
                                    updated[idx] = { ...updated[idx], url: e.target.value };
                                    setFormData({ ...formData, email_links: updated });
                                  }}
                                  placeholder="e.g. https://chat.whatsapp.com/..."
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-emerald-500 outline-none font-mono text-[11px]"
                                />
                              </div>

                              <div className="shrink-0 flex items-end justify-end md:self-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (formData.email_links || []).filter((_, i) => i !== idx);
                                    setFormData({ ...formData, email_links: updated });
                                  }}
                                  title="Remove link"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel 5: Center-Based Access & Registration Restriction */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-slate-50 to-blue-50/40 border border-indigo-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          Center Registration Restriction (Audience Control)
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                          Select the centers eligible to view and register for this camp. Only devotees from selected centers can access it.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            (formData.eligible_centers?.length || 0) > 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              (formData.eligible_centers?.length || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {(formData.eligible_centers?.length || 0) > 0
                            ? `Restricted: ${formData.eligible_centers.length} center(s)`
                            : 'Open to All Centers (Public)'}
                        </span>
                      </div>
                    </div>

                    {/* Filter and Quick Action Tools */}
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-1">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={centerSearchFilter}
                          onChange={(e) => setCenterSearchFilter(e.target.value)}
                          placeholder="Search centers by name or temple..."
                          className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        {centerSearchFilter && (
                          <button
                            type="button"
                            onClick={() => setCenterSearchFilter('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={selectAllCenters}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all"
                        >
                          Select All ({availableCenters.length})
                        </button>
                        <button
                          type="button"
                          onClick={clearAllCenters}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                          Clear All (Open to All)
                        </button>
                      </div>
                    </div>

                    {/* Active Selected Center Badges */}
                    {(formData.eligible_centers?.length || 0) > 0 && (
                      <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1.5">
                        <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                          <span>Allowed Centers ({formData.eligible_centers.length}):</span>
                          <span className="text-[10px] font-medium text-slate-500">Click &times; to remove</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                          {formData.eligible_centers.map((cName) => (
                            <span
                              key={cName}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-900 text-xs font-bold border border-indigo-300/80"
                            >
                              <span>{cName}</span>
                              <button
                                type="button"
                                onClick={() => toggleCenterSelection(cName)}
                                className="text-indigo-600 hover:text-indigo-950 p-0.5 rounded-full hover:bg-indigo-200/70"
                                title={`Remove ${cName}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Centers Checkbox Selection Grid */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3 max-h-56 overflow-y-auto space-y-1">
                      {availableCenters.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                          Loading centers list...
                        </div>
                      ) : (
                        (() => {
                          const filtered = availableCenters.filter((c) => {
                            if (!centerSearchFilter.trim()) return true;
                            const q = centerSearchFilter.toLowerCase();
                            return (
                              c.name.toLowerCase().includes(q) ||
                              (c.temple_name || '').toLowerCase().includes(q)
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="py-6 text-center text-xs text-slate-400">
                                No centers match &quot;{centerSearchFilter}&quot;.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {filtered.map((center) => {
                                const isSelected = (formData.eligible_centers || []).includes(center.name);
                                return (
                                  <label
                                    key={center.id}
                                    onClick={() => toggleCenterSelection(center.name)}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-indigo-50/80 border-indigo-400/90 text-indigo-950 shadow-xs'
                                        : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 truncate">{center.name}</div>
                                      {center.temple_name && (
                                        <div className="text-[10px] text-slate-500 truncate">{center.temple_name}</div>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Panel 6: POC Contact Details Requirement */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-slate-50 to-orange-50/50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-amber-600" />
                        POC Contact Details (Point of Contact Requirement)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                        When enabled, anyone registering for this camp (managers or devotees) will be prompted for their center&apos;s Point of Contact (POC Name and Mobile Number) as Step 1 before adding attendee registrations.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.require_poc)}
                        onChange={(e) => setFormData({ ...formData, require_poc: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      <span className="ml-2.5 text-xs font-bold text-slate-800">
                        {formData.require_poc ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: CAMPS */}
              {activeTab === 'tracks' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-1">
                        <Tent className="w-4 h-4 text-amber-600" />
                        Camps (Categories / Sub-Camps)
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">
                        Attendees will choose one of these camps during registration (e.g. Nistha, Sharanagati, Ashray).
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.newTrackInput}
                        onChange={(e) => setFormData({ ...formData, newTrackInput: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrack(); } }}
                        placeholder="e.g. Nistha, Sharanagati, Ashray"
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={addTrack}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold hover:from-amber-600 hover:to-orange-700 shadow-sm transition-all"
                      >
                        Add Camp
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.tracks.map((track) => (
                        <span
                          key={track}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300/80 text-xs font-bold shadow-2xs"
                        >
                          {track}
                          <button
                            type="button"
                            onClick={() => removeTrack(track)}
                            className="text-amber-700 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sub-Camp Specific Base Fee & Material Charges */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-600" />
                          Sub-Camp Extra Charges &amp; Booklets (Per Camp)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Set custom extra charges (e.g. Camp Booklet, Study Kit, or Material) for specific sub-camps only. Other camps during the same retreat remain ₹0 / standard pricing.
                        </p>
                      </div>
                    </div>

                    {formData.tracks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Please add at least one camp above to configure sub-camp booklet/material fees.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.tracks.map((track) => {
                          const tf = (formData.special_waivers.track_fees || []).find(
                            (x) => x.track.toLowerCase() === track.toLowerCase()
                          );
                          const feeVal = tf && tf.fee !== undefined && tf.fee !== null ? tf.fee : 0;
                          const labelVal = tf?.label || '';
                          const minRoundsVal = tf && tf.min_rounds !== undefined && tf.min_rounds !== null ? tf.min_rounds : 0;
                          const applicableRolesVal: string[] = tf?.applicable_roles || [];
                          const startDateVal = tf?.start_date || '';
                          const startMealVal = tf?.start_meal_type || 'Breakfast';
                          const endDateVal = tf?.end_date || '';
                          const endMealVal = tf?.end_meal_type || 'Dinner';

                          return (
                            <div
                              key={track}
                              className="p-4 rounded-xl bg-white border-2 border-slate-200/80 hover:border-amber-400 transition-all shadow-2xs space-y-3"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                                  {track}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {startDateVal && endDateVal ? (
                                    <span className="text-[11px] font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                      <span>{startDateVal} ({startMealVal}) &rarr; {endDateVal} ({endMealVal})</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      Full Camp Duration (Default)
                                    </span>
                                  )}
                                  {minRoundsVal > 0 ? (
                                    <span className="text-[11px] font-black text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 shadow-2xs flex items-center gap-1">
                                      <span>📿</span> Min. {minRoundsVal} Rounds Chanting
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      Open to All (0+ Rounds)
                                    </span>
                                  )}
                                  {applicableRolesVal.length > 0 ? (
                                    <span className="text-[11px] font-black text-purple-900 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 shadow-2xs flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-purple-600" />
                                      {applicableRolesVal.length} Role{applicableRolesVal.length > 1 ? 's' : ''} Restricted
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      All Roles (Open)
                                    </span>
                                  )}
                                  {feeVal > 0 ? (
                                    <span className="text-[11px] font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
                                      +₹{feeVal} {labelVal ? `• ${labelVal}` : '• Extra Charge'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                      Standard Rate (No Extra Fee)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-slate-100">
                                <div className="sm:col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Extra Charge Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={feeVal > 0 ? feeVal : ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                                      updateTrackFee(track, { fee: val });
                                    }}
                                    placeholder="0 (Standard rate)"
                                    className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                                  />
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    0 = No extra fee for this camp.
                                  </span>
                                </div>

                                <div className="sm:col-span-6">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Charge Description / Label (Free Text)
                                  </label>
                                  <input
                                    type="text"
                                    value={labelVal}
                                    onChange={(e) => updateTrackFee(track, { label: e.target.value })}
                                    placeholder="e.g. Camp Booklet & Material Kit, Workbook, Spiritual Kit"
                                    className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                                  />
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    Visible to devotees during registration as a transparent breakdown line item.
                                  </span>
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Min. Chanting Rounds</span>
                                    {minRoundsVal > 0 && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                        {minRoundsVal}+
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="64"
                                    value={minRoundsVal > 0 ? minRoundsVal : ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                      updateTrackFee(track, { min_rounds: val });
                                    }}
                                    placeholder="0 (All Devotees)"
                                    className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                                  />
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    0 or empty = open to all. e.g. 16 = only devotees chanting 16+ rounds can see/register.
                                  </span>
                                </div>
                              </div>

                              {/* SUB-CAMP DATES & MEAL SLOTS (SCHEDULE) */}
                              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                  <span className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                    Sub-Camp Schedule / Dates (Auto-fills on Registration)
                                  </span>
                                  {(startDateVal || endDateVal) && (
                                    <button
                                      type="button"
                                      onClick={() => updateTrackFee(track, { start_date: '', start_meal_type: 'Breakfast', end_date: '', end_meal_type: 'Dinner' })}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
                                    >
                                      <X className="w-3 h-3" /> Reset to Full Camp
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                      Start Date
                                    </label>
                                    {formData.meal_pricing.length > 0 ? (
                                      <select
                                        value={startDateVal}
                                        onChange={(e) => updateTrackFee(track, { start_date: e.target.value })}
                                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                                      >
                                        <option value="">Full Camp Start (Default)</option>
                                        {formData.meal_pricing.map((m) => (
                                          <option key={m.date} value={m.date}>
                                            {m.label || `Day ${m.date}`}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={startDateVal}
                                        onChange={(e) => updateTrackFee(track, { start_date: e.target.value })}
                                        placeholder="e.g. 21 - Dec"
                                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                                      />
                                    )}
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                      Start Meal Slot
                                    </label>
                                    <select
                                      value={startMealVal}
                                      onChange={(e) => updateTrackFee(track, { start_meal_type: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                                    >
                                      <option value="Breakfast">Breakfast</option>
                                      <option value="Lunch">Lunch</option>
                                      <option value="Dinner">Dinner</option>
                                    </select>
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                      End Date
                                    </label>
                                    {formData.meal_pricing.length > 0 ? (
                                      <select
                                        value={endDateVal}
                                        onChange={(e) => updateTrackFee(track, { end_date: e.target.value })}
                                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                                      >
                                        <option value="">Full Camp End (Default)</option>
                                        {formData.meal_pricing.map((m) => (
                                          <option key={m.date} value={m.date}>
                                            {m.label || `Day ${m.date}`}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={endDateVal}
                                        onChange={(e) => updateTrackFee(track, { end_date: e.target.value })}
                                        placeholder="e.g. 25 - Dec"
                                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                                      />
                                    )}
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                      End Meal Slot
                                    </label>
                                    <select
                                      value={endMealVal}
                                      onChange={(e) => updateTrackFee(track, { end_meal_type: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                                    >
                                      <option value="Breakfast">Breakfast</option>
                                      <option value="Lunch">Lunch</option>
                                      <option value="Dinner">Dinner</option>
                                    </select>
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-500 block">
                                  When devotees select &ldquo;{track}&rdquo; during registration, their arrival &amp; departure dates will auto-populate with these dates (devotees can still modify them if needed).
                                </span>
                              </div>

                              {/* SUB-CAMP ROLE-BASED ACCESS & VISIBILITY */}
                              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <span className="text-[11px] font-extrabold text-purple-950 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-purple-600" />
                                      Role-Based Camp Access (Applicable Roles)
                                    </span>
                                    <p className="text-[10px] text-purple-800/80 mt-0.5">
                                      {applicableRolesVal.length === 0
                                        ? 'No roles selected — this sub-camp is visible and open to ALL devotees.'
                                        : `Restricted to ${applicableRolesVal.length} selected role(s). Only devotees with these roles will see or be registered for this sub-camp.`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {applicableRolesVal.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => updateTrackFee(track, { applicable_roles: [] })}
                                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
                                      >
                                        <X className="w-3 h-3" /> Clear Roles (Open to All)
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                                  {CAMP_ROLE_OPTIONS.map((opt) => {
                                    const isChecked = applicableRolesVal.includes(opt.id);
                                    return (
                                      <label
                                        key={opt.id}
                                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                          isChecked
                                            ? 'bg-purple-100 border-purple-400 text-purple-950 shadow-2xs'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/30'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...applicableRolesVal, opt.id]
                                              : applicableRolesVal.filter((r) => r !== opt.id);
                                            updateTrackFee(track, { applicable_roles: next });
                                          }}
                                          className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <span className="truncate">{opt.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* General Base Registration Fee (All Camps) */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                          General Base Fee (Applies to All Camps Across Retreat &mdash; Optional)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              General Base Fee (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.special_waivers.base_registration_fee || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  special_waivers: {
                                    ...formData.special_waivers,
                                    base_registration_fee: e.target.value === '' ? 0 : Number(e.target.value)
                                  }
                                })
                              }
                              placeholder="0 (No general base fee)"
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Applies to every attendee regardless of camp.
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              General Fee Label (Free Text)
                            </label>
                            <input
                              type="text"
                              value={formData.special_waivers.base_registration_fee_label || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  special_waivers: {
                                    ...formData.special_waivers,
                                    base_registration_fee_label: e.target.value
                                  }
                                })
                              }
                              placeholder="e.g. Base Fee (Registration Overhead), Facility Overhead"
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Custom label for the retreat-wide base registration fee.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role Pricing & Free Waivers */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-600" />
                          Role Pricing &amp; Free Waivers
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Set automatic free meals, free stay, or fixed confirmation token fee for specific roles.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(formData.participant_types || ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari']).map((role) => {
                        const waivers = formData.special_waivers.role_waivers || defaultRoleWaivers;
                        const w = waivers.find((x) => x.role.toLowerCase() === role.toLowerCase()) || {
                          role,
                          free_meals: false,
                          free_accommodation: false,
                          fixed_token_fee: null,
                          notice_message: ''
                        };

                        return (
                          <div
                            key={role}
                            className="p-4 rounded-xl bg-white border-2 border-slate-200/80 hover:border-amber-400 transition-all shadow-2xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                {role}
                              </span>

                              <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-600">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(w.free_meals)}
                                    onChange={(e) => updateRoleWaiver(role, { free_meals: e.target.checked })}
                                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                                  />
                                  Free Meals
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-600">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(w.free_accommodation)}
                                    onChange={(e) => updateRoleWaiver(role, { free_accommodation: e.target.checked })}
                                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                                  />
                                  Free Stay
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Fixed Token Fee (₹)
                                </label>
                                <input
                                  type="number"
                                  value={w.fixed_token_fee !== null && w.fixed_token_fee !== undefined ? w.fixed_token_fee : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    updateRoleWaiver(role, { fixed_token_fee: val });
                                  }}
                                  placeholder="Standard rate"
                                  className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  0 = 100% Free, or leave blank for calculated rate.
                                </span>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Devotee Notice Message (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={w.notice_message || ''}
                                  onChange={(e) => updateRoleWaiver(role, { notice_message: e.target.value })}
                                  placeholder="e.g. Volunteers receive complimentary meals & stay in devotee service."
                                  className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Displayed to devotee when they select this role.
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Discount Coupons & Promo Codes */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        Discount Coupons &amp; Promo Codes
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Create promo codes for students or guest devotees (e.g. 100% free access or flat ₹ discounts).
                      </p>
                    </div>

                    {/* Add Coupon Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-4 rounded-xl bg-white border-2 border-slate-200/90 shadow-2xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Coupon Code</label>
                        <input
                          type="text"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                          placeholder="e.g. FIRST10"
                          className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-bold uppercase shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Discount Type</label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                        >
                          <option value="PERCENT">Percentage (%) Off</option>
                          <option value="FLAT">Flat Amount (₹) Off</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {newCouponType === 'PERCENT' ? 'Discount % (e.g. 100)' : 'Discount ₹ (e.g. 500)'}
                        </label>
                        <input
                          type="number"
                          value={newCouponValue}
                          onChange={(e) => setNewCouponValue(Number(e.target.value))}
                          placeholder={newCouponType === 'PERCENT' ? '100' : '500'}
                          className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          User Limit <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newCouponMaxUses}
                          onChange={(e) => setNewCouponMaxUses(e.target.value)}
                          placeholder="e.g. 10 (blank = unlimited)"
                          className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={addCoupon}
                          className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Coupon
                        </button>
                      </div>
                    </div>

                    {/* Active Coupons List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        Active Promo Codes ({(formData.special_waivers.coupons || []).length}):
                      </span>

                      {(formData.special_waivers.coupons || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No promo codes configured yet. Devotees pay standard rates.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {(formData.special_waivers.coupons || []).map((cpn) => {
                            const used = cpn.used_count || 0;
                            const limit = cpn.max_uses;
                            const isExhausted = limit != null && used >= limit;

                            return (
                              <div
                                key={cpn.code}
                                className={`p-3 rounded-xl bg-white border-2 flex flex-col justify-between gap-2 shadow-2xs transition-colors ${
                                  isExhausted
                                    ? 'border-rose-300 bg-rose-50/20'
                                    : 'border-emerald-200/90 hover:border-emerald-400'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-black text-xs text-emerald-800">
                                        {cpn.code}
                                      </span>
                                      {isExhausted ? (
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                                          Full ({used}/{limit})
                                        </span>
                                      ) : limit ? (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                          {limit - used} left of {limit}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                          Unlimited
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 block">
                                      {cpn.discount_type === 'PERCENT' ? `${cpn.discount_value}% OFF` : `₹${cpn.discount_value} OFF`}
                                      {cpn.description ? ` • ${cpn.description}` : ''}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeCoupon(cpn.code)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                                    title="Delete Coupon"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500 font-medium">
                                    Used:{' '}
                                    <strong className={isExhausted ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>
                                      {used}
                                    </strong>
                                    {' / '}
                                    <span className="text-slate-600 font-semibold">
                                      {limit ? `${limit} users` : '∞ unlimited'}
                                    </span>
                                  </span>

                                  {used > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => resetCouponUsage(cpn.code)}
                                      className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold underline transition-colors"
                                      title="Reset used count back to 0"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MEAL PRICING MATRIX */}
              {activeTab === 'meals' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-amber-600" />
                          Scheduled Meal Days &amp; Per-Meal Pricing
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Devotees only pay for the exact meals between their arrival and departure.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={autoGenerateMealDays}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs transition-all cursor-pointer"
                          title="Generate a meal row for each day between Camp Start Date and End Date"
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          Auto-Fill Days from Dates
                        </button>

                        {/* Calendar Date Picker to Add Specific Date (including early arrival dates before camp) */}
                        <div className="flex items-center bg-white border-2 border-slate-300 hover:border-amber-400 focus-within:border-amber-500 rounded-xl px-2.5 py-1 shadow-xs transition-all gap-2">
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Date:
                          </span>
                          <input
                            type="date"
                            value={mealCalendarDate}
                            onChange={(e) => setMealCalendarDate(e.target.value)}
                            className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                            title="Select date from calendar to add"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCalendarDate(mealCalendarDate)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-2xs transition-all cursor-pointer"
                            title="Add selected calendar date"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Date
                          </button>
                        </div>

                        {formData.meal_pricing.length > 1 && (
                          <button
                            type="button"
                            onClick={handleSortMealDays}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-white border-2 border-slate-300 hover:border-amber-400 text-slate-700 shadow-xs transition-all cursor-pointer"
                            title="Sort meal dates chronologically"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                            Sort
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick suggestion banner if early arrival date can be added */}
                    {suggestedEarlyDate && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200/90 rounded-xl text-xs">
                        <div className="flex items-center gap-2 text-amber-950 font-medium">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Devotees arriving before camp starts? Add pre-camp early arrival date:
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddCalendarDate(suggestedEarlyDate.iso)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Early Arrival ({suggestedEarlyDate.label})
                        </button>
                      </div>
                    )}

                    {formData.meal_pricing.length === 0 ? (
                      <div className="text-center py-8 px-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl">
                        <Calendar className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <h5 className="text-xs font-bold text-slate-800">No Meal Days Configured Yet</h5>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                          {formData.start_date && formData.end_date
                            ? 'Click "Auto-Fill Days from Dates" to automatically generate meal slots for your custom camp dates.'
                            : 'Select Camp Start Date and End Date in the Basic Info tab, then click Auto-Fill.'}
                        </p>
                        {formData.start_date && formData.end_date && (
                          <button
                            type="button"
                            onClick={autoGenerateMealDays}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Auto-Fill Days ({formData.start_date} to {formData.end_date})
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-slate-300/80 rounded-2xl overflow-x-auto shadow-xs bg-white">
                        <table className="w-full text-xs text-left min-w-[620px]">
                          <thead className="bg-slate-100/80 text-slate-700 font-black border-b-2 border-slate-200">
                            <tr>
                              <th className="py-3 px-3 text-center w-16">Date Key</th>
                              <th className="py-3 px-3">Label</th>
                              <th className="py-3 px-3 text-center w-24">Breakfast (₹)</th>
                              <th className="py-3 px-3 text-center w-24">Lunch (₹)</th>
                              <th className="py-3 px-3 text-center w-24">Dinner (₹)</th>
                              <th className="py-3 px-3 text-center w-24">Peak Feast?</th>
                              <th className="py-3 px-3 text-center w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {formData.meal_pricing.map((day, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="text"
                                    value={day.date}
                                    onChange={(e) => updateMealPrice(idx, 'date', e.target.value)}
                                    className="w-14 px-2 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 font-bold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none text-center"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={day.label}
                                      onChange={(e) => updateMealPrice(idx, 'label', e.target.value)}
                                      className="w-full max-w-[130px] px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 font-bold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none"
                                    />
                                    <div className="relative group inline-flex items-center" title="Change date via calendar">
                                      <input
                                        type="date"
                                        value={day.full_date || parseMealDayToIso(day, formData.start_date)}
                                        onChange={(e) => handleRowDateChange(idx, e.target.value)}
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                        title="Pick date from calendar"
                                      />
                                      <div className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-slate-500 group-hover:text-amber-700 group-hover:border-amber-400 transition-all cursor-pointer shadow-2xs">
                                        <Calendar className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="number"
                                    value={day.breakfast}
                                    onChange={(e) => updateMealPrice(idx, 'breakfast', Number(e.target.value))}
                                    className="w-16 px-2 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 font-bold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none text-center mx-auto"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="number"
                                    value={day.lunch}
                                    onChange={(e) => updateMealPrice(idx, 'lunch', Number(e.target.value))}
                                    className="w-16 px-2 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 font-bold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none text-center mx-auto"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="number"
                                    value={day.dinner}
                                    onChange={(e) => updateMealPrice(idx, 'dinner', Number(e.target.value))}
                                    className="w-16 px-2 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 font-bold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none text-center mx-auto"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(day.isPeak)}
                                    onChange={(e) => updateMealPrice(idx, 'isPeak', e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded border-2 border-slate-300 focus:ring-amber-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeMealDay(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="Delete Day"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACCOMMODATION & AC CHARGES */}
              {activeTab === 'accommodation' && (
                <div className="space-y-4">
                  {/* Daily Room Charges */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Home className="w-4 h-4 text-amber-600" />
                      Daily Room Tariff
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Regular Room Charge / Day (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.accommodation_pricing.regular_daily}
                          onChange={(e) => setFormData({
                            ...formData,
                            accommodation_pricing: {
                              ...formData.accommodation_pricing,
                              regular_daily: Number(e.target.value)
                            }
                          })}
                          placeholder="120"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Peak Camp Room Charge / Day (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.accommodation_pricing.peak_daily}
                          onChange={(e) => setFormData({
                            ...formData,
                            accommodation_pricing: {
                              ...formData.accommodation_pricing,
                              peak_daily: Number(e.target.value)
                            }
                          })}
                          placeholder="200"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Peak Dates & Other / Miscellaneous Charges */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Peak Stay Period &amp; Other Charges
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Define peak stay dates (charged at ₹{formData.accommodation_pricing.peak_daily}/day) and any other extra camp charges (optional).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Peak Period Starts (Date)
                        </label>
                        {formData.meal_pricing.length > 0 ? (
                          <select
                            value={formData.accommodation_pricing.peak_start_date || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              accommodation_pricing: {
                                ...formData.accommodation_pricing,
                                peak_start_date: e.target.value
                              }
                            })}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                          >
                            <option value="">None (No Peak Period)</option>
                            {formData.meal_pricing.map((m) => (
                              <option key={m.date} value={m.date}>
                                {m.label || `Day ${m.date}`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData.accommodation_pricing.peak_start_date || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              accommodation_pricing: {
                                ...formData.accommodation_pricing,
                                peak_start_date: e.target.value
                              }
                            })}
                            placeholder="e.g. 18"
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                          />
                        )}
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Day when peak room rate starts.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Peak Period Ends (Date)
                        </label>
                        {formData.meal_pricing.length > 0 ? (
                          <select
                            value={formData.accommodation_pricing.peak_end_date || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              accommodation_pricing: {
                                ...formData.accommodation_pricing,
                                peak_end_date: e.target.value
                              }
                            })}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                          >
                            <option value="">None (No Peak Period)</option>
                            {formData.meal_pricing.map((m) => (
                              <option key={m.date} value={m.date}>
                                {m.label || `Day ${m.date}`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData.accommodation_pricing.peak_end_date || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              accommodation_pricing: {
                                ...formData.accommodation_pricing,
                                peak_end_date: e.target.value
                              }
                            })}
                            placeholder="e.g. 20"
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                          />
                        )}
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Day when peak room rate concludes.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Other / Miscellaneous Charge Name
                        </label>
                        <input
                          type="text"
                          value={formData.accommodation_pricing.facility_charge_label || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            accommodation_pricing: {
                              ...formData.accommodation_pricing,
                              facility_charge_label: e.target.value
                            }
                          })}
                          placeholder="e.g. AC Facility, Auditorium Setup, Electricity Backup"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Charge name shown to devotees on registration (leave blank if none).
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>
                            {formData.accommodation_pricing.ac_charge_billing_type === 'fixed'
                              ? 'Other / Misc Charge (₹ Flat)'
                              : 'Other / Misc Charge (₹ / day)'}
                          </span>
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-extrabold border border-amber-200">
                            {formData.accommodation_pricing.ac_charge_billing_type === 'fixed' ? 'Fixed Fee' : 'Per Day Rate'}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={formData.accommodation_pricing.ac_charge}
                          onChange={(e) => setFormData({
                            ...formData,
                            accommodation_pricing: {
                              ...formData.accommodation_pricing,
                              ac_charge: Number(e.target.value)
                            }
                          })}
                          placeholder="0 or 50"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {formData.accommodation_pricing.ac_charge_billing_type === 'fixed'
                            ? 'Flat fixed charge applied once per registration.'
                            : 'Charged per day based on selected days (e.g. 7 days out of 10 = 7 × ₹rate).'}
                        </span>
                      </div>

                      {/* Billing Basis & Applicability Controls */}
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/70">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Charge Basis (Pricing Model)
                          </label>
                          <select
                            value={formData.accommodation_pricing.ac_charge_billing_type || 'per_day'}
                            onChange={(e) => setFormData({
                              ...formData,
                              accommodation_pricing: {
                                ...formData.accommodation_pricing,
                                ac_charge_billing_type: e.target.value as 'per_day' | 'fixed'
                              }
                            })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="per_day">📅 Per Day (Selected Meal/Stay Days) — Recommended</option>
                            <option value="fixed">🔒 Fixed One-Time Charge (Flat)</option>
                          </select>
                          <span className="text-[9.5px] text-slate-500 mt-0.5 block">
                            If devotee books 7 days out of 10, they only pay for 7 days.
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Applicable To
                          </label>
                          <select
                            value={formData.accommodation_pricing.ac_charge_applies_to || 'accommodation'}
                            onChange={(e) => setFormData({
                              ...formData,
                              accommodation_pricing: {
                                ...formData.accommodation_pricing,
                                ac_charge_applies_to: e.target.value as 'accommodation' | 'all'
                              }
                            })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="accommodation">🏠 Devotees Opting for CV Accommodation</option>
                            <option value="all">👥 All Registered Devotees (Meals &amp; Stay)</option>
                          </select>
                          <span className="text-[9.5px] text-slate-500 mt-0.5 block">
                            Choose who gets billed for this miscellaneous charge.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white border-2 border-slate-300 hover:border-amber-400 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.accommodation_pricing.allow_female_cv_accommodation}
                          onChange={(e) => setFormData({
                            ...formData,
                            accommodation_pricing: {
                              ...formData.accommodation_pricing,
                              allow_female_cv_accommodation: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-amber-600 rounded border-2 border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Allow Female CV Accommodation (Uncheck if female devotee accommodation is managed off-site)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* CV Floor Accommodation Capacity & Multi-Batch Management */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-600" />
                          CV Floor Accommodation Capacity &amp; Batches
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Set capacity limits for CV floor accommodation (e.g. 500 per batch). When full, non-Brahmachari devotees must arrange external hotels. Brahmacharis are never blocked.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600">Overall CV Capacity:</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.accommodation_pricing.cv_floor_capacity || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            accommodation_pricing: {
                              ...formData.accommodation_pricing,
                              cv_floor_capacity: Math.max(0, Number(e.target.value))
                            }
                          })}
                          placeholder="Unlimited"
                          className="w-24 px-2 py-1 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-bold shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Add Capacity Batch Form */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                        + Add Date-Range Batch Limit (e.g. 500 for Part 1, 500 for Part 2)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Batch Name / Label</label>
                          <input
                            type="text"
                            value={newBatchName}
                            onChange={(e) => setNewBatchName(e.target.value)}
                            placeholder="e.g. Batch 1 (24 Dec - 28 Dec)"
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Start Date</label>
                          {formData.meal_pricing.length > 0 ? (
                            <select
                              value={newBatchStartDate}
                              onChange={(e) => setNewBatchStartDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                            >
                              <option value="">Select Date</option>
                              {formData.meal_pricing.map((m) => (
                                <option key={m.date} value={m.date}>{m.label || `Day ${m.date}`}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={newBatchStartDate}
                              onChange={(e) => setNewBatchStartDate(e.target.value)}
                              placeholder="e.g. 24 - Dec"
                              className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                            />
                          )}
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">End Date</label>
                          {formData.meal_pricing.length > 0 ? (
                            <select
                              value={newBatchEndDate}
                              onChange={(e) => setNewBatchEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none cursor-pointer"
                            >
                              <option value="">Select Date</option>
                              {formData.meal_pricing.map((m) => (
                                <option key={m.date} value={m.date}>{m.label || `Day ${m.date}`}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={newBatchEndDate}
                              onChange={(e) => setNewBatchEndDate(e.target.value)}
                              placeholder="e.g. 28 - Dec"
                              className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                            />
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Max Capacity</label>
                          <input
                            type="number"
                            min="1"
                            value={newBatchCapacity}
                            onChange={(e) => setNewBatchCapacity(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-bold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={addBatchCapacity}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Batch Capacity</span>
                        </button>
                      </div>
                    </div>

                    {/* Configured Batches List */}
                    {(formData.accommodation_pricing.batch_capacities || []).length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-700 block">Configured Capacity Batches:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(formData.accommodation_pricing.batch_capacities || []).map((batch, idx) => (
                            <div
                              key={batch.id || idx}
                              className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-extrabold text-xs text-slate-900 block truncate">{batch.name}</span>
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-amber-600" />
                                  <span>{batch.start_date} &rarr; {batch.end_date}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-black">
                                  {batch.capacity} Beds
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeBatchCapacity(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                  title="Remove batch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommended Nearby Hotels & Lodges (Admin Directory) */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-600" />
                          Recommended Nearby Hotels &amp; Lodges (Self-Arranged Stay)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          List recommended hotels and lodges. When CV floor accommodation is full, attendees can review these contact options to book external rooms and upload booking receipts.
                        </p>
                      </div>
                    </div>

                    {/* Add Hotel Form */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                        + Add Recommended Hotel
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Hotel / Lodge Name *</label>
                          <input
                            type="text"
                            value={newHotelName}
                            onChange={(e) => setNewHotelName(e.target.value)}
                            placeholder="e.g. Hotel Sai Palace, Katraj"
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Contact / Mobile No.</label>
                          <input
                            type="text"
                            value={newHotelContact}
                            onChange={(e) => setNewHotelContact(e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Address / Landmark</label>
                          <input
                            type="text"
                            value={newHotelAddress}
                            onChange={(e) => setNewHotelAddress(e.target.value)}
                            placeholder="e.g. Near Katraj Chowk, 1km from NVCC Temple"
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Approx Tariff / Pricing</label>
                          <input
                            type="text"
                            value={newHotelTariff}
                            onChange={(e) => setNewHotelTariff(e.target.value)}
                            placeholder="e.g. ₹800 - ₹1200 / night"
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Special Notes / Amenities</label>
                          <input
                            type="text"
                            value={newHotelNotes}
                            onChange={(e) => setNewHotelNotes(e.target.value)}
                            placeholder="e.g. 24hr hot water, mentions ISKCON camp discount"
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={addRecommendedHotel}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Recommended Hotel</span>
                        </button>
                      </div>
                    </div>

                    {/* Configured Hotels List */}
                    {(formData.accommodation_pricing.recommended_hotels || []).length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-700 block">Recommended Hotel Directory ({formData.accommodation_pricing.recommended_hotels.length}):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(formData.accommodation_pricing.recommended_hotels || []).map((hotel, idx) => (
                            <div
                              key={hotel.id || idx}
                              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-xs text-slate-900 truncate">{hotel.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeRecommendedHotel(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                  title="Remove hotel"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {hotel.contact && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded inline-block">
                                  📞 {hotel.contact}
                                </span>
                              )}
                              {hotel.address && (
                                <p className="text-[11px] text-slate-500 leading-tight">📍 {hotel.address}</p>
                              )}
                              {(hotel.tariff || hotel.notes) && (
                                <p className="text-[10px] text-slate-400">
                                  {hotel.tariff ? `Tariff: ${hotel.tariff}` : ''}
                                  {hotel.tariff && hotel.notes ? ' • ' : ''}
                                  {hotel.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PAYMENT & IDT */}
              {activeTab === 'payment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Razorpay Gateway */}
                    <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/80 space-y-3">
                      <label className="flex items-center gap-2.5 font-black text-xs text-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.payment_config.enable_razorpay}
                          onChange={(e) => setFormData({
                            ...formData,
                            payment_config: { ...formData.payment_config, enable_razorpay: e.target.checked }
                          })}
                          className="w-4 h-4 text-amber-600 rounded border-2 border-slate-300 focus:ring-amber-500"
                        />
                        Enable Razorpay / UPI Gateway
                      </label>
                      <div className="pt-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Online Processing Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.payment_config.surcharge_percent}
                          onChange={(e) => setFormData({
                            ...formData,
                            payment_config: { ...formData.payment_config, surcharge_percent: Number(e.target.value) }
                          })}
                          placeholder="0 or 2.0"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Set to 0 if temple covers transaction costs (devotees pay no extra fee).
                        </span>
                      </div>
                    </div>

                    {/* IDT Transfers */}
                    <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/80 space-y-3">
                      <label className="flex items-center gap-2.5 font-black text-xs text-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.payment_config.enable_idt}
                          onChange={(e) => setFormData({
                            ...formData,
                            payment_config: { ...formData.payment_config, enable_idt: e.target.checked }
                          })}
                          className="w-4 h-4 text-amber-600 rounded border-2 border-slate-300 focus:ring-amber-500"
                        />
                        Enable IDT (Inter-Department)
                      </label>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Allows authorized temple departments to register devotees and deduct costs via security passcodes.
                      </p>
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Available to authorized ISKCON & VOICE connected centers.</span>
                      </div>

                      {/* Access restriction toggle */}
                      {formData.payment_config.enable_idt && (
                        <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formData.payment_config.allow_student_idt)}
                              onChange={(e) => setFormData({
                                ...formData,
                                payment_config: { ...formData.payment_config, allow_student_idt: e.target.checked }
                              })}
                              className="w-4 h-4 text-amber-600 rounded border-2 border-slate-300 focus:ring-amber-500"
                            />
                            <span>Allow Regular Students to access IDT</span>
                          </label>
                          <div className="text-[11px]">
                            {formData.payment_config.allow_student_idt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                🌐 Open to All Devotees &amp; Students
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                                🔒 Restricted: Managerial Roles (8 to 17) Only
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inter-Temple Transfer (ITT) */}
                    <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/80 space-y-3">
                      <label className="flex items-center gap-2.5 font-black text-xs text-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.payment_config.enable_itt}
                          onChange={(e) => setFormData({
                            ...formData,
                            payment_config: { ...formData.payment_config, enable_itt: e.target.checked }
                          })}
                          className="w-4 h-4 text-emerald-600 rounded border-2 border-slate-300 focus:ring-emerald-500"
                        />
                        Enable Inter-Temple Transfer
                      </label>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Allows other ISKCON / VOICE centers to transfer camp registration fees directly to your bank account with receipt proof.
                      </p>
                      <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        Admin Receipt Verification
                      </span>

                      {/* Access restriction toggle */}
                      {formData.payment_config.enable_itt && (
                        <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formData.payment_config.allow_student_itt)}
                              onChange={(e) => setFormData({
                                ...formData,
                                payment_config: { ...formData.payment_config, allow_student_itt: e.target.checked }
                              })}
                              className="w-4 h-4 text-emerald-600 rounded border-2 border-slate-300 focus:ring-emerald-500"
                            />
                            <span>Allow Regular Students to access ITT</span>
                          </label>
                          <div className="text-[11px]">
                            {formData.payment_config.allow_student_itt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                🌐 Open to All Devotees &amp; Students
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                                🔒 Restricted: Managerial Roles (8 to 17) Only
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Transfer Role Restriction Helper Notice */}
                  {(formData.payment_config.enable_idt || formData.payment_config.enable_itt) && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-indigo-950">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Managerial Roles Access Policy</span>
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-relaxed">
                        By default, IDT and ITT transfer options are reserved exclusively for Managerial Roles (<strong>Roles 8 to 17</strong>: Super Admin, President, VP, Directors, Managers, Advisors, OC). Regular students will only see online payment unless you enable the student permission checkbox above.
                      </p>
                    </div>
                  )}

                  {/* Center-Wise IDT Passcodes Section */}
                  {formData.payment_config.enable_idt && (
                    <div className="p-5 rounded-2xl border-2 border-amber-300/80 bg-amber-50/30 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Key className="w-4 h-4 text-amber-600" />
                            Eligible Centers &amp; Auto-Generated IDT Passcodes
                          </label>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Only centers you add to this list are authorized to use IDT. Devotees and managers from unlisted centers will not be permitted to use IDT.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleAddAllAvailableCentersToIdt}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                            title="Add all registered centers at once"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Add All Centers
                          </button>
                          {(formData.payment_config.center_idt_codes || []).length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllIdtCenters}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer"
                              title="Remove all centers from IDT eligibility"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Clear All
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Searchable Add Center Row */}
                      <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-xs space-y-2">
                        <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            Search &amp; Add Center to IDT:
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Type to search any center, or type an external center name
                          </span>
                        </label>

                        <div className="relative" ref={addCenterRef}>
                          <div className="relative flex items-center">
                            <Search className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={addCenterSearchQuery}
                              onChange={(e) => {
                                setAddCenterSearchQuery(e.target.value);
                                setIsAddCenterDropdownOpen(true);
                              }}
                              onFocus={() => setIsAddCenterDropdownOpen(true)}
                              placeholder="Search center by name or temple (e.g. Narhe, GGD, Mayapur)..."
                              className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-semibold focus:border-amber-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {addCenterSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddCenterSearchQuery('');
                                    setIsAddCenterDropdownOpen(false);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsAddCenterDropdownOpen(!isAddCenterDropdownOpen)}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 rounded-lg cursor-pointer transition-colors"
                              >
                                {isAddCenterDropdownOpen ? 'Close ▴' : 'Browse ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Search Results / Autocomplete Suggestions Dropdown */}
                          {isAddCenterDropdownOpen && (() => {
                            const remainingCenters = availableCenters.filter(
                              c => !(formData.payment_config.center_idt_codes || []).some(
                                existing => existing.center_name.toLowerCase() === c.name.toLowerCase()
                              )
                            );

                            const q = addCenterSearchQuery.trim().toLowerCase();
                            const filtered = q
                              ? remainingCenters.filter(
                                  c => c.name.toLowerCase().includes(q) || (c.temple_name && c.temple_name.toLowerCase().includes(q))
                                )
                              : remainingCenters;

                            const alreadyInIdt = (formData.payment_config.center_idt_codes || []).some(
                              c => c.center_name.toLowerCase() === q
                            );

                            return (
                              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border-2 border-amber-300 shadow-2xl max-h-64 overflow-y-auto z-50 p-1.5 space-y-1">
                                {filtered.length > 0 ? (
                                  filtered.map(c => (
                                    <button
                                      key={c.id || c.name}
                                      type="button"
                                      onClick={() => handleAddSpecificCenter(c.name, c.id)}
                                      className="w-full text-left px-3 py-2 hover:bg-amber-50 rounded-lg flex items-center justify-between group transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900 truncate">
                                          {c.name}
                                        </span>
                                        {c.temple_name && (
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate group-hover:bg-amber-100/60">
                                            {c.temple_name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-bold text-amber-600 group-hover:text-amber-800 shrink-0 flex items-center gap-1 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-0.5 rounded-md">
                                        <Plus className="w-3 h-3" /> Add
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="py-3 px-2 text-center text-xs text-slate-500">
                                    {q ? `No registered centers match "${addCenterSearchQuery}".` : 'All registered centers are already added to IDT.'}
                                  </div>
                                )}

                                {/* Option to add custom / external center if typed */}
                                {q && !alreadyInIdt && (
                                  <button
                                    type="button"
                                    onClick={() => handleAddSpecificCenter(addCenterSearchQuery.trim())}
                                    className="w-full text-left px-3 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 rounded-lg flex items-center justify-between transition-colors border border-dashed border-amber-400 cursor-pointer mt-1"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span className="text-xs font-bold truncate">
                                        Add &quot;{addCenterSearchQuery.trim()}&quot; as New / External Center
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold bg-amber-600 text-white px-2.5 py-1 rounded-md shrink-0 shadow-xs">
                                      + Add to IDT
                                    </span>
                                  </button>
                                )}

                                {q && alreadyInIdt && (
                                  <div className="p-2 text-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg">
                                    ✓ &quot;{addCenterSearchQuery}&quot; is already authorized in the IDT list below.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Search & Stats Bar */}
                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <div className="relative flex-1 w-full">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={idtCenterSearch}
                            onChange={(e) => setIdtCenterSearch(e.target.value)}
                            placeholder="Filter authorized centers..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div className="text-[11px] font-bold text-amber-950 px-2.5 py-1.5 bg-amber-100/70 rounded-lg border border-amber-200 shrink-0">
                          {(formData.payment_config.center_idt_codes || []).length} Centers Authorized for IDT
                        </div>
                      </div>

                      {/* Configured Centers List */}
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 rounded-xl border border-amber-200/60 bg-white/70 p-2.5">
                        {(formData.payment_config.center_idt_codes || []).length === 0 ? (
                          <div className="text-center py-7 px-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 space-y-1">
                            <Building2 className="w-7 h-7 mx-auto text-amber-500/70" />
                            <p className="text-xs font-bold text-slate-800">No centers authorized for IDT yet</p>
                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                              Only centers added above can use IDT. Select a center from the dropdown or click &quot;Add All Centers&quot; to authorize centers.
                            </p>
                          </div>
                        ) : (
                          (formData.payment_config.center_idt_codes || [])
                            .filter(c => {
                              if (!idtCenterSearch.trim()) return true;
                              const q = idtCenterSearch.toLowerCase();
                              return c.center_name.toLowerCase().includes(q);
                            })
                            .map(cEntry => {
                              const dbMatch = availableCenters.find(
                                ac => ac.name.toLowerCase() === cEntry.center_name.toLowerCase() || (cEntry.center_id && ac.id === cEntry.center_id)
                              );
                              const templeName = dbMatch?.temple_name;
                              const isCopied = copiedCenterCode === cEntry.center_name;

                              return (
                                <div
                                  key={cEntry.center_name}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-colors shadow-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-900 truncate">
                                        {cEntry.center_name}
                                      </span>
                                      {templeName && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate">
                                          {templeName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <input
                                      type="text"
                                      value={cEntry.code}
                                      onChange={(e) => handleUpdateCenterCode(cEntry.center_id, cEntry.center_name, e.target.value)}
                                      placeholder="Enter code"
                                      className="w-32 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-amber-900 uppercase bg-amber-50/70 border border-amber-200 rounded-lg focus:border-amber-500 outline-none"
                                    />

                                    <button
                                      type="button"
                                      title="Regenerate unique code for this center"
                                      onClick={() => handleRegenerateCenterCode(cEntry.center_id, cEntry.center_name)}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-100 hover:text-amber-800 text-slate-600 transition-colors cursor-pointer"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={!cEntry.code}
                                      title="Copy passcode"
                                      onClick={() => handleCopyCenterCode(cEntry.center_name, cEntry.code)}
                                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        isCopied
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40'
                                      }`}
                                    >
                                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>

                                    <button
                                      type="button"
                                      title="Remove center from IDT"
                                      onClick={() => handleRemoveCenterFromIdt(cEntry.center_name)}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 transition-colors cursor-pointer ml-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>

                      {/* Advanced / Legacy Passcodes Accordion */}
                      <div className="pt-2 border-t border-amber-200/60">
                        <button
                          type="button"
                          onClick={() => setShowLegacyPasscodes(!showLegacyPasscodes)}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showLegacyPasscodes ? '▾ Hide' : '▸ Show'} Legacy / Fallback Passcodes (Optional)</span>
                        </button>
                        {showLegacyPasscodes && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] text-slate-500">
                              Comma-separated general passcodes that work regardless of center assignment (for testing or backwards compatibility):
                            </p>
                            <textarea
                              rows={2}
                              value={formData.payment_config.idt_passcodes_str}
                              onChange={(e) => setFormData({
                                ...formData,
                                payment_config: { ...formData.payment_config, idt_passcodes_str: e.target.value }
                              })}
                              placeholder="CV108, AT123, NITW456..."
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inter-Temple Transfer Bank Details Section */}
                  {formData.payment_config.enable_itt && (
                    <div className="p-5 rounded-2xl border-2 border-emerald-300/80 bg-emerald-50/30 space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Inter-Temple Bank Account Details
                          </h4>
                          <p className="text-[11px] text-slate-600">
                            These details will be displayed to devotee centers to transfer registration funds directly.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Account Beneficiary Name *
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.account_name || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  account_name: e.target.value
                                }
                              }
                            })}
                            placeholder="e.g. ISKCON Pune / NVCC"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Bank Name *
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.bank_name || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  bank_name: e.target.value
                                }
                              }
                            })}
                            placeholder="e.g. State Bank of India"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.account_number || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  account_number: e.target.value
                                }
                              }
                            })}
                            placeholder="e.g. 308912345678"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            IFSC Code *
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.ifsc_code || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  ifsc_code: e.target.value.toUpperCase()
                                }
                              }
                            })}
                            placeholder="e.g. SBIN0011234"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-semibold uppercase focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Branch Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.branch_name || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  branch_name: e.target.value
                                }
                              }
                            })}
                            placeholder="e.g. Katraj Branch, Pune"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            UPI ID / VPA (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.upi_id || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  upi_id: e.target.value
                                }
                              }
                            })}
                            placeholder="e.g. iskconpune@sbi"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Transfer Instructions / Narration Note (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.payment_config.itt_bank_details?.instructions || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              payment_config: {
                                ...formData.payment_config,
                                itt_bank_details: {
                                  ...(formData.payment_config.itt_bank_details || { account_name: '', account_number: '', bank_name: '', ifsc_code: '' }),
                                  instructions: e.target.value
                                }
                              }
                            })}
                            placeholder="e.g. Please mention Camp Name & Center in the transfer remarks/narration."
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: CANCELLATION & REFUNDS */}
              {activeTab === 'refund' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Master Toggle */}
                  <div className="p-5 rounded-2xl border-2 border-slate-200/90 bg-slate-50/80 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Undo2 className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Accept Devotee Cancellation &amp; Refund Requests
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500">
                        Allow devotees to look up their booking and request full, batch attendee, or partial day cancellations directly on the camp page.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.refund_config?.enable_refunds ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          refund_config: {
                            ...formData.refund_config,
                            enable_refunds: e.target.checked
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {formData.refund_config?.enable_refunds && (
                    <>
                      {/* Explainer / Disclaimer */}
                      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
                        <Banknote className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Real Amount Refund Principle:</strong>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                            Refunds are calculated on the <strong>net real camp fee</strong> (Base Registration Fee + eligible unconsumed meals &amp; accommodation).
                            Payment gateway processing fees ({Number(formData.payment_config?.surcharge_percent || 0)}% surcharge configured in Section 5) are strictly non-refundable. Funds are transferred manually via UPI / Bank transfer by admin, not automatically debited.
                          </p>
                        </div>
                      </div>

                      {/* Refund Policy Timeline Tiers */}
                      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white space-y-4 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600" />
                              Refund Policy Timeline Tiers
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Decide what percentage of camp fee (base registration, meals &amp; accommodation) is refunded based on the cancellation date.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const currentRules = formData.refund_config?.refund_policy_rules || [];
                              const newTier: CampRefundTier = {
                                id: `tier-${Date.now()}`,
                                cutoff_date: '',
                                refund_percent: 50,
                                label: '50% Refund'
                              };
                              setFormData({
                                ...formData,
                                refund_config: {
                                  ...formData.refund_config,
                                  refund_policy_rules: [...currentRules, newTier]
                                }
                              });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Tier</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(formData.refund_config?.refund_policy_rules || []).map((tier, idx) => (
                            <div
                              key={tier.id || idx}
                              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center gap-3"
                            >
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Cutoff Date (Leave blank for default/final cutoff)
                                </label>
                                <input
                                  type="date"
                                  value={tier.cutoff_date || ''}
                                  onChange={(e) => {
                                    const next = [...(formData.refund_config?.refund_policy_rules || [])];
                                    next[idx] = { ...next[idx], cutoff_date: e.target.value };
                                    setFormData({
                                      ...formData,
                                      refund_config: { ...formData.refund_config, refund_policy_rules: next }
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:border-amber-500 outline-none"
                                />
                              </div>

                              <div className="w-full md:w-36">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Refund (%)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={tier.refund_percent}
                                    onChange={(e) => {
                                      const next = [...(formData.refund_config?.refund_policy_rules || [])];
                                      next[idx] = { ...next[idx], refund_percent: Number(e.target.value) };
                                      setFormData({
                                        ...formData,
                                        refund_config: { ...formData.refund_config, refund_policy_rules: next }
                                      });
                                    }}
                                    className="w-full px-3 py-1.5 pr-7 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:border-amber-500 outline-none"
                                  />
                                  <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                                </div>
                              </div>

                              <div className="flex-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Description / Condition Shown to Devotees
                                </label>
                                <input
                                  type="text"
                                  value={tier.label || ''}
                                  onChange={(e) => {
                                    const next = [...(formData.refund_config?.refund_policy_rules || [])];
                                    next[idx] = { ...next[idx], label: e.target.value };
                                    setFormData({
                                      ...formData,
                                      refund_config: { ...formData.refund_config, refund_policy_rules: next }
                                    });
                                  }}
                                  placeholder="e.g. 100% Refund before Nov 1st"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:border-amber-500 outline-none"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const next = (formData.refund_config?.refund_policy_rules || []).filter((_, i) => i !== idx);
                                  setFormData({
                                    ...formData,
                                    refund_config: { ...formData.refund_config, refund_policy_rules: next }
                                  });
                                }}
                                disabled={(formData.refund_config?.refund_policy_rules || []).length <= 1}
                                className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-white transition-colors self-end md:self-center cursor-pointer"
                                title="Remove Tier"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Meal & Accommodation Refund Rules */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white space-y-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.refund_config?.refund_meals ?? true}
                              onChange={(e) => setFormData({
                                ...formData,
                                refund_config: {
                                  ...formData.refund_config,
                                  refund_meals: e.target.checked
                                }
                              })}
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">
                                Refund Meal Charges
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                Meal cost for cancelled attendees or unconsumed days will be refunded.
                              </span>
                            </div>
                          </label>
                        </div>

                        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white space-y-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.refund_config?.refund_accommodation ?? true}
                              onChange={(e) => setFormData({
                                ...formData,
                                refund_config: {
                                  ...formData.refund_config,
                                  refund_accommodation: e.target.checked
                                }
                              })}
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">
                                Refund Accommodation Charges
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                Room / stay charges for cancelled attendees or unconsumed days will be refunded.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Refund Instructions & Terms */}
                      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white space-y-2">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Refund Terms &amp; Payout Instructions (Shown to Devotees)
                        </label>
                        <p className="text-xs text-slate-500">
                          Explain how and when money will be refunded back to their bank/UPI accounts.
                        </p>
                        <textarea
                          rows={2}
                          value={formData.refund_config?.refund_instructions || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            refund_config: {
                              ...formData.refund_config,
                              refund_instructions: e.target.value
                            }
                          })}
                          placeholder="e.g. Refunds are transferred manually by ISKCON NVCC accounts to your submitted UPI/Bank account within 5-7 working days..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:border-amber-500 outline-none transition-all"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-colors text-center"
                >
                  Cancel
                </button>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  {activeTab !== 'refund' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ('basic' | 'tracks' | 'meals' | 'accommodation' | 'payment' | 'refund')[] = ['basic', 'tracks', 'meals', 'accommodation', 'payment', 'refund'];
                        const nextIdx = tabs.indexOf(activeTab) + 1;
                        if (nextIdx < tabs.length) setActiveTab(tabs[nextIdx]);
                      }}
                      className="px-6 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer text-center"
                    >
                      Next Step &rarr;
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-7 py-2.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-full shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                    <span>{editingCamp ? 'Update Camp Config' : 'Save & Publish Camp'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM BEAUTIFUL DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden p-6 sm:p-7 relative text-center animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => {
                if (!deleteModal.deleting) {
                  setDeleteModal({ isOpen: false, campId: null, campTitle: '', deleting: false });
                }
              }}
              disabled={deleteModal.deleting}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Trash / Warning Icon */}
            <div className="w-16 h-16 rounded-3xl bg-rose-50 border-2 border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              Delete Camp?
            </h3>

            {/* Message Body */}
            <div className="text-xs text-slate-600 leading-relaxed mb-6 font-medium space-y-2">
              <p>
                Are you sure you want to delete this camp?
              </p>
              <div className="font-bold text-slate-900 text-sm bg-slate-50 py-2 px-3 rounded-xl border border-slate-200/80">
                &ldquo;{deleteModal.campTitle}&rdquo;
              </div>
              <p className="text-rose-600 font-semibold text-[11px] pt-1">
                This will permanently remove its schedule configurations, pricing matrices, and all registered attendee records. This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deleteModal.deleting}
                onClick={() => setDeleteModal({ isOpen: false, campId: null, campTitle: '', deleting: false })}
                className="flex-1 py-3 px-5 rounded-full border-2 border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 hover:border-slate-400 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteModal.deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {deleteModal.deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Camp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camp Poster & Thumbnail Library Modal */}
      {isPosterLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Camp Poster &amp; Thumbnail Library</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      {posterLibraryImages.length} {posterLibraryImages.length === 1 ? 'item' : 'items'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pick any previously uploaded camp poster or Google Drive image with a single click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPosterLibraryOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search, Filter Tabs & Actions */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posterLibrarySearch}
                  onChange={(e) => setPosterLibrarySearch(e.target.value)}
                  placeholder="Search posters by name or camp..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
                {posterLibrarySearch && (
                  <button
                    type="button"
                    onClick={() => setPosterLibrarySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Source Filters & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPosterLibrarySourceFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      posterLibrarySourceFilter === 'all'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({posterLibraryImages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterLibrarySourceFilter('drive')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      posterLibrarySourceFilter === 'drive'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Drive Folder ({posterLibraryImages.filter(i => i.source === 'drive').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterLibrarySourceFilter('camp')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      posterLibrarySourceFilter === 'camp'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Camps ({posterLibraryImages.filter(i => i.source === 'camp').length})
                  </button>
                </div>

                <button
                  type="button"
                  disabled={loadingPosterLibrary}
                  onClick={openPosterLibrary}
                  title="Reload posters"
                  className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPosterLibrary ? 'animate-spin text-purple-600' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => posterFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload New</span>
                </button>
              </div>
            </div>

            {/* Gallery Grid Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[320px] max-h-[58vh]">
              {loadingPosterLibrary ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-xs font-semibold">Loading thumbnail library from Google Drive &amp; Camps...</p>
                </div>
              ) : filteredLibraryImages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No thumbnails found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    {posterLibrarySearch
                      ? 'No items match your search filter. Try clearing the search query.'
                      : 'No previously uploaded posters detected yet. Upload your first poster directly to Google Drive.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => posterFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/20"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Poster Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredLibraryImages.map((img) => {
                    const isSelected = formData.poster_url === img.url;
                    return (
                      <div
                        key={img.id}
                        onClick={() => {
                          setFormData({ ...formData, poster_url: img.url });
                          setIsPosterLibraryOpen(false);
                        }}
                        className={`group relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col ${
                          isSelected
                            ? 'border-purple-600 ring-4 ring-purple-500/20 shadow-lg bg-purple-50/30'
                            : 'border-slate-200 hover:border-purple-300 hover:shadow-md bg-white'
                        }`}
                      >
                        {/* 16:9 Image Preview container */}
                        <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                          <img
                            src={img.thumbnailUrl}
                            alt={img.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback if thumbnail fails
                              (e.target as HTMLImageElement).src = img.url;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                          {/* Source badge */}
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md bg-black/60 text-white border border-white/20">
                              {img.source === 'drive' ? '📁 Google Drive' : '🏕️ Camp Poster'}
                            </span>
                          </div>

                          {/* Selected Checkmark */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Active</span>
                            </div>
                          )}

                          {/* Hover Overlay Button */}
                          <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                            <span className="px-3.5 py-1.5 rounded-xl bg-white text-purple-700 text-xs font-bold shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                              <span>{isSelected ? 'Currently Selected' : 'Use This Poster'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Image Metadata Caption */}
                        <div className="p-2.5 flex items-center justify-between gap-2 border-t border-slate-100 bg-white">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate" title={img.name}>
                              {img.name}
                            </p>
                            {img.createdTime && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                {new Date(img.createdTime).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                          {isSelected ? (
                            <span className="shrink-0 p-1 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="shrink-0 text-[11px] font-bold text-purple-600 group-hover:underline">
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {formData.poster_url ? (
                  <>
                    <img
                      src={getThumbnailUrl(formData.poster_url) || formData.poster_url}
                      alt="Current"
                      className="w-10 h-6 object-cover rounded border border-slate-300 shrink-0"
                    />
                    <div className="text-[11px] text-slate-600 truncate font-medium">
                      <span className="font-bold text-slate-800">Current: </span>
                      <span className="font-mono text-[10.5px]">{formData.poster_url}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 italic">No poster currently selected</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPosterLibraryOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Pass Scanner Modal */}
      <AdminCampQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
      />

      {/* Super Admin Staff Role & Allocation Modal */}
      {isSuperAdmin && (
        <CampStaffRoleManagementModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          camps={camps}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import {
  Tent, Calendar, MapPin, User, Phone, Mail,
  CheckCircle, Plus, Trash2, Edit, AlertCircle,
  CreditCard, ShieldCheck, ArrowRight, Utensils,
  Home, Clock, Loader2, Sparkles, X, ChevronRight,
  Search, FileText, CheckCircle2, HeartHandshake,
  Building, Building2, UserCheck, Award, Tag, Gift, Percent,
  Landmark, UploadCloud, Copy, Check, AlertTriangle,
  Undo2, Banknote, RefreshCw, Ticket, Download,
  ExternalLink, ArrowLeft, Info, Shield, QrCode,
  Users, FileSpreadsheet, Ban, UserCircle, UserPlus,
  Filter, ChevronDown, Save, BookmarkCheck, RotateCcw,
  MessageCircle, Receipt
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Camp, CampMealConfig, CampRegistration, CampCoupon, CampRefundRequest } from '@/types';
import { calculateDynamicCampCost, CalculatedCostResult } from '@/lib/camp-cost';
import { isCampManagerialUser, userHasEligibleRole } from '@/lib/utils/roles';
import { toast } from 'react-hot-toast';
import {
  getActiveCampsForUserAction,
  getUserCampRegistrationsAction,
  submitCampRefundRequestAction,
  cancelPendingIdtRegistrationAction,
  lookupCampRegistrationsAction,
  getUserAllocatedCampsAction,
  getCenterDevoteesForCampRegistrationAction,
  validateCampCouponAction,
  getCampAccommodationCapacityStatusAction
} from '@/app/dashboard/admin/camps/actions';
import CampPrasadamCard from '@/components/camps/CampPrasadamCard';
import AdminCampQrScannerModal from '@/components/camps/AdminCampQrScannerModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { validatePhoneNumber } from '@/lib/utils/phone-validation';
import { getThumbnailUrl } from '@/lib/utils/google-drive';

function formatDisplayDateTime(val: any): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMealOptionLabel(m?: CampMealConfig | null, campStartDate?: string): string {
  if (!m) return '';
  const rawLabel = (m.label || `${m.date}`).trim();

  if (/\bdate\b/i.test(rawLabel)) {
    if (campStartDate) {
      const d = new Date(campStartDate);
      if (!isNaN(d.getTime())) {
        const monthStr = d.toLocaleString('en-IN', { month: 'short' });
        return rawLabel.replace(/\bdate\b/gi, monthStr);
      }
    }
    return rawLabel.replace(/\s*-\s*date\b/gi, '').trim();
  }

  if (/^\d+$/.test(rawLabel) && campStartDate) {
    const d = new Date(campStartDate);
    if (!isNaN(d.getTime())) {
      const monthStr = d.toLocaleString('en-IN', { month: 'short' });
      return `${rawLabel} - ${monthStr}`;
    }
  }

  return rawLabel;
}

function calculateAgeFromBirthDate(birthDateStr?: string | null): string {
  if (!birthDateStr) return '';
  const clean = String(birthDateStr).trim().split('T')[0].split(' ')[0];
  const d = new Date(clean);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age > 0 ? String(age) : '';
}

// Deterministic Camp & Pass Theme System
interface PassColorScheme {
  name: string;
  stubGradient: string;
  stubBorder: string;
  stubGlow: string;
  stubIconBg: string;
  stubTag: string;
  cardBorder: string;
  cardBg: string;
  textAccent: string;
  iconAccent: string;
  paidAccent: string;
  badgeBg: string;
  dotColor: string;
}

// Subcamp / Track & Camp Color Palette System (Medium Green, Purple, Orange, Sky Blue, etc.)
const SUBCAMP_COLOR_PALETTES: PassColorScheme[] = [
  {
    name: 'Medium Green',
    stubGradient: 'bg-gradient-to-br from-emerald-600 via-green-600 to-teal-800',
    stubBorder: 'border-emerald-400/40',
    stubGlow: 'bg-emerald-300/30',
    stubIconBg: 'bg-white/20 text-emerald-100 border-white/20',
    stubTag: 'text-emerald-100 bg-black/30 border-white/20',
    cardBorder: 'border-emerald-200/90 hover:border-emerald-400',
    cardBg: 'bg-white',
    textAccent: 'text-emerald-950',
    iconAccent: 'text-emerald-600',
    paidAccent: 'text-emerald-800',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    name: 'Purple',
    stubGradient: 'bg-gradient-to-br from-purple-700 via-violet-750 to-indigo-900',
    stubBorder: 'border-purple-400/40',
    stubGlow: 'bg-purple-300/30',
    stubIconBg: 'bg-white/20 text-purple-100 border-white/20',
    stubTag: 'text-purple-100 bg-black/30 border-white/20',
    cardBorder: 'border-purple-200/90 hover:border-purple-400',
    cardBg: 'bg-white',
    textAccent: 'text-purple-950',
    iconAccent: 'text-purple-600',
    paidAccent: 'text-purple-800',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    name: 'Orange',
    stubGradient: 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700',
    stubBorder: 'border-orange-400/40',
    stubGlow: 'bg-orange-300/30',
    stubIconBg: 'bg-white/20 text-amber-100 border-white/20',
    stubTag: 'text-amber-100 bg-black/30 border-white/20',
    cardBorder: 'border-orange-200/90 hover:border-orange-400',
    cardBg: 'bg-white',
    textAccent: 'text-orange-950',
    iconAccent: 'text-orange-600',
    paidAccent: 'text-orange-800',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  {
    name: 'Sky Blue',
    stubGradient: 'bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-700',
    stubBorder: 'border-sky-400/40',
    stubGlow: 'bg-sky-300/30',
    stubIconBg: 'bg-white/20 text-sky-100 border-white/20',
    stubTag: 'text-sky-100 bg-black/30 border-white/20',
    cardBorder: 'border-sky-200/90 hover:border-sky-400',
    cardBg: 'bg-white',
    textAccent: 'text-sky-950',
    iconAccent: 'text-sky-600',
    paidAccent: 'text-sky-800',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    dotColor: 'bg-sky-500',
  },
  {
    name: 'Royal Indigo',
    stubGradient: 'bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900',
    stubBorder: 'border-indigo-400/40',
    stubGlow: 'bg-indigo-300/30',
    stubIconBg: 'bg-white/20 text-indigo-100 border-white/20',
    stubTag: 'text-indigo-100 bg-black/30 border-white/20',
    cardBorder: 'border-indigo-200/90 hover:border-indigo-400',
    cardBg: 'bg-white',
    textAccent: 'text-indigo-950',
    iconAccent: 'text-indigo-600',
    paidAccent: 'text-indigo-800',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  {
    name: 'Rose Crimson',
    stubGradient: 'bg-gradient-to-br from-rose-600 via-red-600 to-stone-850',
    stubBorder: 'border-rose-400/40',
    stubGlow: 'bg-rose-300/30',
    stubIconBg: 'bg-white/20 text-rose-100 border-white/20',
    stubTag: 'text-rose-100 bg-black/30 border-white/20',
    cardBorder: 'border-rose-200/90 hover:border-rose-400',
    cardBg: 'bg-white',
    textAccent: 'text-rose-950',
    iconAccent: 'text-rose-600',
    paidAccent: 'text-rose-800',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    dotColor: 'bg-rose-500',
  },
  {
    name: 'Teal Cyan',
    stubGradient: 'bg-gradient-to-br from-teal-600 via-cyan-700 to-slate-900',
    stubBorder: 'border-teal-400/40',
    stubGlow: 'bg-teal-300/30',
    stubIconBg: 'bg-white/20 text-teal-100 border-white/20',
    stubTag: 'text-teal-100 bg-black/30 border-white/20',
    cardBorder: 'border-teal-200/90 hover:border-teal-400',
    cardBg: 'bg-white',
    textAccent: 'text-teal-950',
    iconAccent: 'text-teal-600',
    paidAccent: 'text-teal-800',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    dotColor: 'bg-teal-500',
  },
  {
    name: 'Plum Fuchsia',
    stubGradient: 'bg-gradient-to-br from-fuchsia-700 via-pink-700 to-purple-900',
    stubBorder: 'border-fuchsia-400/40',
    stubGlow: 'bg-fuchsia-300/30',
    stubIconBg: 'bg-white/20 text-pink-100 border-white/20',
    stubTag: 'text-pink-100 bg-black/30 border-white/20',
    cardBorder: 'border-pink-200/90 hover:border-pink-400',
    cardBg: 'bg-white',
    textAccent: 'text-pink-950',
    iconAccent: 'text-pink-600',
    paidAccent: 'text-pink-800',
    badgeBg: 'bg-pink-100 text-pink-800 border-pink-200',
    dotColor: 'bg-pink-500',
  },
];

// Cancelled Pass Palette (Light Red & Off-Red Preview)
const CANCELLED_PASS_THEME: PassColorScheme = {
  name: 'Cancelled',
  // Light red vibrant gradient stub
  stubGradient: 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-700',
  stubBorder: 'border-red-400/50',
  stubGlow: 'bg-red-400/25',
  stubIconBg: 'bg-white/25 text-white border-white/30',
  stubTag: 'text-red-100 bg-black/35 border-red-300/30 line-through',
  // Soft off-red preview card
  cardBorder: 'border-red-300/90 border-2 hover:border-red-400',
  cardBg: 'bg-red-50/50',
  textAccent: 'text-red-950 line-through decoration-red-400',
  iconAccent: 'text-red-500',
  paidAccent: 'text-red-800 line-through',
  badgeBg: 'bg-red-100 text-red-700 border border-red-200',
  dotColor: 'bg-red-500',
};

// Waiting List Palette (Royal Purple / Violet)
const WAITING_LIST_PASS_THEME: PassColorScheme = {
  name: 'Waiting List',
  stubGradient: 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800',
  stubBorder: 'border-purple-400/50',
  stubGlow: 'bg-purple-300/35',
  stubIconBg: 'bg-white/20 text-purple-100 border-white/25',
  stubTag: 'text-purple-100 bg-black/35 border-purple-300/20',
  cardBorder: 'border-purple-300 border-2 hover:border-purple-400',
  cardBg: 'bg-purple-50/40',
  textAccent: 'text-purple-950',
  iconAccent: 'text-purple-600',
  paidAccent: 'text-purple-800 font-black',
  badgeBg: 'bg-purple-100 text-purple-900 border border-purple-300',
  dotColor: 'bg-purple-600',
};

// Pending Stage Palette (Warm Amber / Saffron Yellow)
const PENDING_PASS_THEME: PassColorScheme = {
  name: 'Pending',
  stubGradient: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700',
  stubBorder: 'border-amber-400/50',
  stubGlow: 'bg-amber-300/35',
  stubIconBg: 'bg-white/20 text-amber-100 border-white/25',
  stubTag: 'text-amber-100 bg-black/35 border-amber-300/20',
  cardBorder: 'border-amber-300 border-2 hover:border-amber-400',
  cardBg: 'bg-amber-50/30',
  textAccent: 'text-amber-950',
  iconAccent: 'text-amber-600',
  paidAccent: 'text-amber-800 font-black',
  badgeBg: 'bg-amber-100 text-amber-800 border border-amber-300',
  dotColor: 'bg-amber-500',
};

function getTrackColorPalette(trackName: string): PassColorScheme {
  const name = (trackName || '').trim();
  if (!name) return SUBCAMP_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return SUBCAMP_COLOR_PALETTES[Math.abs(hash) % SUBCAMP_COLOR_PALETTES.length];
}

function getPassDynamicTheme(
  reg: any,
  isCancelled: boolean,
  isPending: boolean,
  registeredTracks: Array<{ id: string; name: string }>,
  registeredCamps: Array<{ id: string; title: string }>,
  isWaitingList: boolean = false
): PassColorScheme {
  if (isCancelled) {
    return CANCELLED_PASS_THEME;
  }
  if (isWaitingList) {
    return WAITING_LIST_PASS_THEME;
  }
  if (isPending) {
    return PENDING_PASS_THEME;
  }

  // 1. Assign color by Subcamp / Track first (Medium green, Purple, Orange, Sky blue, etc.)
  const trackName = (reg.camp_track || '').trim();
  if (trackName) {
    const trackIdx = registeredTracks.findIndex(t => t.id.toLowerCase() === trackName.toLowerCase());
    if (trackIdx >= 0) {
      return SUBCAMP_COLOR_PALETTES[trackIdx % SUBCAMP_COLOR_PALETTES.length];
    }
    let hash = 0;
    for (let i = 0; i < trackName.length; i++) {
      hash = (hash << 5) - hash + trackName.charCodeAt(i);
      hash |= 0;
    }
    return SUBCAMP_COLOR_PALETTES[Math.abs(hash) % SUBCAMP_COLOR_PALETTES.length];
  }

  // 2. Fallback to camp
  const campId = String(reg.camp_id || reg.camp_title || 'camp');
  const campIdx = registeredCamps.findIndex(c => c.id === campId || c.title === campId);
  if (campIdx >= 0) {
    return SUBCAMP_COLOR_PALETTES[campIdx % SUBCAMP_COLOR_PALETTES.length];
  }

  return SUBCAMP_COLOR_PALETTES[0];
}

function CampDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campParam = searchParams.get('camp') || searchParams.get('slug') || '';

  const { user, userData, loading: authLoading } = useAuth();
  const isPending = userData?.verificationStatus === 'pending';

  // Navigation Tabs: 'camps' | 'registrations' | 'register' | 'staff'
  const [activeTab, setActiveTab] = useState<'camps' | 'registrations' | 'register' | 'staff'>('camps');

  // Staff & Coordinator Allocation State
  const [allocatedCamps, setAllocatedCamps] = useState<(Camp & { user_role: string; staff_notes?: string })[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCampId, setScannerCampId] = useState<string>('');
  const [scannerCampTitle, setScannerCampTitle] = useState<string>('');

  const getStaffRoleMeta = (role: string, roles?: string[]) => {
    const allRoles = roles && roles.length > 0 ? roles : [role];
    const isSuper = role === 'super_admin';
    const isBoth = isSuper || allRoles.includes('both');

    const canScan = isSuper || isBoth || allRoles.includes('scan_pass') || allRoles.includes('attendance') || allRoles.includes('prasadam');
    const canAttendance = isSuper || isBoth || allRoles.includes('attendance') || allRoles.includes('payment_approvals');
    const canRefunds = isSuper || isBoth || allRoles.includes('refunds');
    const canPrasadam = isSuper || isBoth || allRoles.includes('prasadam');
    const canPaymentApprovals = isSuper || isBoth || allRoles.includes('payment_approvals');

    if (isBoth) {
      return {
        title: 'Full Camp Coordinator',
        pill: 'Full Coordinator',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        desc: 'Complete operational management: QR pass scanning, attendee ledger, IDT & ITT payment approvals, kitchen tally & refunds.',
        canScan: true,
        canAttendance: true,
        canRefunds: true,
        canPrasadam: true,
        canPaymentApprovals: true,
      };
    }

    if (allRoles.length > 1) {
      const labels: string[] = [];
      if (canAttendance) labels.push('Attendance');
      if (canPaymentApprovals && !labels.includes('Approvals')) labels.push('Approvals');
      if (canPrasadam && !labels.includes('Prasadam')) labels.push('Prasadam');
      if (canRefunds) labels.push('Refunds');
      if (allRoles.includes('scan_pass') && !canAttendance && !canPrasadam) labels.push('Scanner');

      const pillText = labels.length > 0 ? labels.join(' & ') : 'Multi-Role Staff';
      return {
        title: `Multi-Duty: ${pillText}`,
        pill: pillText,
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        desc: 'You have been assigned multiple operational roles for this camp. Access all your permitted desks below.',
        canScan,
        canAttendance,
        canRefunds,
        canPrasadam,
        canPaymentApprovals,
      };
    }

    switch (role) {
      case 'scan_pass':
        return {
          title: 'Pass Scanner & Meal Punch',
          pill: 'Pass Scanner Only',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          desc: 'Gate entry & prasadam serving counter role. Verify delegate passes and punch meal coupons in real-time.',
          canScan: true,
          canAttendance: false,
          canRefunds: false,
          canPrasadam: false,
          canPaymentApprovals: false,
        };
      case 'attendance':
        return {
          title: 'Attendance & Registrations',
          pill: 'Attendance Desk',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          desc: 'Full attendee ledger access, delegate check-in coordination, and Excel export.',
          canScan: true,
          canAttendance: true,
          canRefunds: false,
          canPrasadam: false,
          canPaymentApprovals: false,
        };
      case 'payment_approvals':
        return {
          title: 'IDT & ITT Payment Approvals',
          pill: 'Attendance & Payment Approvals',
          badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
          desc: 'Inspect UTR payment proofs, verify IDT center passcodes, approve ITT transfers, and manage attendee registrations ledger.',
          canScan: false,
          canAttendance: true,
          canRefunds: false,
          canPrasadam: false,
          canPaymentApprovals: true,
        };
      case 'refunds':
        return {
          title: 'Refunds Desk Coordinator',
          pill: 'Refunds Desk Only',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          desc: 'Inspect cancellation requests, approve refund payouts, and financial return logs.',
          canScan: false,
          canAttendance: false,
          canRefunds: true,
          canPrasadam: false,
          canPaymentApprovals: false,
        };
      case 'prasadam':
        return {
          title: 'Prasadam & Kitchen Coordinator',
          pill: 'Prasadam Desk Only',
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          desc: 'Audit kitchen headcounts, meal tallies, prasad distribution logs, and scan pass coupons.',
          canScan: true,
          canAttendance: false,
          canRefunds: false,
          canPrasadam: true,
          canPaymentApprovals: false,
        };
      case 'both':
      case 'super_admin':
      default:
        return {
          title: 'Full Camp Coordinator',
          pill: 'Full Coordinator',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          desc: 'Complete operational management: QR pass scanning, attendee ledger, IDT & ITT payment approvals, kitchen tally & refunds.',
          canScan: true,
          canAttendance: true,
          canRefunds: true,
          canPrasadam: true,
          canPaymentApprovals: true,
        };
    }
  };

  // Camp Data State
  const [activeCamps, setActiveCamps] = useState<(Camp & { registration_count?: number })[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [selectedPreviewCamp, setSelectedPreviewCamp] = useState<Camp | null>(null);
  const [campsLoading, setCampsLoading] = useState(true);
  const [campsError, setCampsError] = useState<string | null>(null);

  // User Registrations State
  const [userRegistrations, setUserRegistrations] = useState<(CampRegistration & {
    camp_title: string;
    camp_slug: string;
    camp_venue: string;
    camp_start_date: string;
    camp_end_date: string;
    camp_refund_config?: any;
    camp_payment_config?: any;
  })[]>([]);
  const [userRefunds, setUserRefunds] = useState<CampRefundRequest[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Pre-IDT Direct Cancellation State
  const [pendingIdtCancelTarget, setPendingIdtCancelTarget] = useState<any | null>(null);
  const [pendingIdtCancelReason, setPendingIdtCancelReason] = useState('');
  const [isCancellingPendingIdt, setIsCancellingPendingIdt] = useState(false);

  // Registration Form State (Devotee details come directly from DB!)
  const [formData, setFormData] = useState({
    voiceName: '',
    participantName: '',
    whatsapp: '',
    rounds: '',
    email: '',
    dob: '',
    introducedToKcSince: '',
    ashram: 'Student and Not decided',
    parentTemple: '',
    counselorName: '',
    otherCounselorName: '',
    campTrack: '',
    firstMealDate: '',
    firstMealType: 'Breakfast',
    lastMealDate: '',
    lastMealType: 'Dinner',
    dinnerType: 'Dinner Meal',
    accommodation: 'Yes',
    gender: 'Male - Bachelor',
    participantType: 'Camp Participant',
    age: '',
    marriedSinceYear: '',
  });

  // Batch Entries for Group / Multiple attendees
  const [entries, setEntries] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Counselors list for manual devotee registration dropdown
  const [counselorsList, setCounselorsList] = useState<{ id: string; name: string }[]>([]);

  // Center Devotees for Managerial Quick Registration
  const [centerDevotees, setCenterDevotees] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    age: string;
    rounds?: number | string;
    role?: any;
    royalMember?: boolean;
    counselor: string;
    center: string;
    temple: string;
    registeredTracks?: string[];
  }[]>([]);
  const [loadingDevotees, setLoadingDevotees] = useState(false);
  const [selectedDevoteeId, setSelectedDevoteeId] = useState('');
  const [devoteeSearchTerm, setDevoteeSearchTerm] = useState('');
  const [entryMode, setEntryMode] = useState<'select' | 'manual'>('select');
  const [centerNameFound, setCenterNameFound] = useState<string>('');
  const [managerAssignedCenter, setManagerAssignedCenter] = useState<string>('');
  const [managerAssignedTemple, setManagerAssignedTemple] = useState<string>('');

  // POC (Point of Contact) State for Camp Registration
  const [pocDetails, setPocDetails] = useState({
    pocName: '',
    pocContact: '',
  });
  const [pocConfirmed, setPocConfirmed] = useState(false);
  const [pocLoading, setPocLoading] = useState(false);
  const [pocSaving, setPocSaving] = useState(false);
  const [pocError, setPocError] = useState<string | null>(null);
  const [pocEditing, setPocEditing] = useState(false);

  // Live Cost Preview
  const [liveCost, setLiveCost] = useState<CalculatedCostResult | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'RAZORPAY' | 'IDT' | 'INTER_TEMPLE_TRANSFER' | null>(null);
  const [idtSource, setIdtSource] = useState('');
  const [idtPasscode, setIdtPasscode] = useState('');
  const [ittTempleName, setIttTempleName] = useState('');
  const [ittTransactionRef, setIttTransactionRef] = useState('');
  const [ittTransactionDate, setIttTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ittScreenshotFile, setIttScreenshotFile] = useState<File | null>(null);
  const [ittScreenshotPreview, setIttScreenshotPreview] = useState<string | null>(null);
  const [ittUploading, setIttUploading] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Registration Draft / Progress Saving State
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftToast, setDraftToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Coupon / Promo Code State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CampCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Success State
  // Accommodation Capacity & Waiting List State
  const [capacityStatus, setCapacityStatus] = useState<any>(null);
  const [hotelBookingName, setHotelBookingName] = useState('');
  const [hotelReceiptUrl, setHotelReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);

  // Ticket Modal State
  const [viewTicketReg, setViewTicketReg] = useState<any | null>(null);

  // Cancellation & Refund Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLookupQuery, setCancelLookupQuery] = useState('');
  const [cancelLookupLoading, setCancelLookupLoading] = useState(false);
  const [cancelLookupError, setCancelLookupError] = useState<string | null>(null);
  const [cancelCamp, setCancelCamp] = useState<Camp | null>(null);
  const [cancelRegs, setCancelRegs] = useState<CampRegistration[] | null>(null);
  const [cancelExistingRefunds, setCancelExistingRefunds] = useState<CampRefundRequest[]>([]);
  const [selectedRegIdsToCancel, setSelectedRegIdsToCancel] = useState<string[]>([]);
  const [cancelDevoteeMode, setCancelDevoteeMode] = useState<'self' | 'devotee'>('self');
  const [passViewFilter, setPassViewFilter] = useState<'all' | 'mine' | 'assigned'>('all');
  const [passSearchTerm, setPassSearchTerm] = useState('');
  const [passCampFilter, setPassCampFilter] = useState<string>('all');
  const [passStatusFilter, setPassStatusFilter] = useState<'all' | 'confirmed' | 'waiting_list' | 'pending' | 'cancelled'>('all');
  const [passSubcampFilter, setPassSubcampFilter] = useState<string>('all');

  // Payout details
  const [cancelPayoutType, setCancelPayoutType] = useState<'UPI' | 'BANK'>('UPI');
  const [cancelUpiId, setCancelUpiId] = useState('');
  const [cancelAccountName, setCancelAccountName] = useState('');
  const [cancelAccountNumber, setCancelAccountNumber] = useState('');
  const [cancelConfirmAccount, setCancelConfirmAccount] = useState('');
  const [cancelBankName, setCancelBankName] = useState('');
  const [cancelIfscCode, setCancelIfscCode] = useState('');
  const [cancelReason, setCancelReason] = useState('Schedule Conflict');
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessResult, setCancelSuccessResult] = useState<any | null>(null);
  const [cancelDevoteeFilter, setCancelDevoteeFilter] = useState('');
  const [viewingRefundStatus, setViewingRefundStatus] = useState<{ reg: any; refund?: CampRefundRequest } | null>(null);
  const [showLookupFallback, setShowLookupFallback] = useState(false);

  // 1. Fetch Active Camps
  const fetchActiveCamps = async () => {
    setCampsLoading(true);
    setCampsError(null);
    try {
      const res = await getActiveCampsForUserAction(userData?.id || user?.id);
      if (res.success && res.camps) {
        setActiveCamps(res.camps);
        // If camp param in URL, auto select it
        if (campParam) {
          const match = res.camps.find(c => c.slug === campParam || c.id === campParam);
          if (match) {
            handleSelectCampForRegistration(match);
          }
        }
      } else {
        setCampsError(res.error || 'Failed to fetch active camps.');
      }
    } catch (err: any) {
      setCampsError(err.message || 'Error loading active camps.');
    } finally {
      setCampsLoading(false);
    }
  };

  // 2. Fetch User Registrations
  const fetchUserRegistrations = async () => {
    if (!user && !userData) return;
    setRegsLoading(true);
    try {
      const res = await getUserCampRegistrationsAction({
        email: user?.email || undefined,
        phone: userData?.phone || undefined,
        callerUserId: userData?.id || user?.id,
      });
      if (res.success && res.registrations) {
        const seen = new Set<string>();
        const unique = res.registrations.filter((r: any) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        setUserRegistrations(unique);
        setUserRefunds(res.refundRequests || []);
      }
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
    } finally {
      setRegsLoading(false);
    }
  };

  const fetchAllocatedCamps = async () => {
    setAllocationsLoading(true);
    try {
      const res = await getUserAllocatedCampsAction();
      if (res.success && res.camps) {
        setAllocatedCamps(res.camps);
      }
    } catch (err: any) {
      console.error('Error fetching allocated staff camps:', err);
    } finally {
      setAllocationsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveCamps();
  }, [campParam, userData?.id, user?.id]);

  useEffect(() => {
    if (user || userData) {
      fetchUserRegistrations();
      fetchAllocatedCamps();
    }
  }, [user, userData]);

  // Synchronize attendee pre-filled age & devotee details when userData loads
  useEffect(() => {
    if (userData) {
      const userDob = userData.birthDate || (userData as any).birth_date || userData.hierarchy?.birthDate;
      const calculatedAge = calculateAgeFromBirthDate(userDob);
      setFormData((prev) => ({
        ...prev,
        age: prev.age || calculatedAge || '',
        participantName: prev.participantName || userData.name || '',
        whatsapp: prev.whatsapp || (userData.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : ''),
        parentTemple: prev.parentTemple || userData.hierarchy?.parentTemple || (userData as any)?.parent_temple || 'ISKCON NVCC • PUNE',
        counselorName: prev.counselorName || userData.hierarchy?.brahmachariCounselor || (userData as any)?.brahmachari_counselor || '',
        voiceName: prev.voiceName || userData.hierarchy?.currentCenter || (userData as any)?.current_center || userData.hierarchy?.center || (userData as any)?.center || '',
      }));
    }
  }, [userData]);

  // When a camp is selected for registration, initialize attendee default values from userData
  const handleSelectCampForRegistration = (camp: Camp) => {
    setSelectedCamp(camp);
    setActiveTab('register');
    getCampAccommodationCapacityStatusAction(camp.id, true)
      .then((res) => {
        if (res.success) setCapacityStatus(res);
      })
      .catch((e) => console.warn('Capacity status fetch error:', e));
    setEntries([]);
    setEditIndex(null);
    setAppliedCoupon(null);
    setCouponInput('');
    setRegistrationSuccess(null);

    const meals = camp.meal_pricing || [];
    const initialTrack = camp.tracks?.[0] || 'GS Camp - 1st Timer';
    const initTf = (camp.special_waivers?.track_fees || []).find(
      (t) => t.track.toLowerCase() === initialTrack.toLowerCase()
    );
    const firstMeal = initTf?.start_date || (meals.length > 0 ? String(meals[0].date) : '');
    const firstMealType = initTf?.start_meal_type || 'Breakfast';
    const lastMeal = initTf?.end_date || (meals.length > 0 ? String(meals[meals.length - 1].date) : '');
    const lastMealType = initTf?.end_meal_type || 'Dinner';

    const userDob = userData?.birthDate || (userData as any)?.birth_date || userData?.hierarchy?.birthDate;
    const calculatedAge = calculateAgeFromBirthDate(userDob);

    const resolvedUserCenter = (() => {
      const cur = (userData?.hierarchy?.currentCenter || (userData as any)?.current_center || '').trim();
      const oth = (userData?.hierarchy?.otherCenter || (userData as any)?.other_center || '').trim();
      if (cur && cur.toLowerCase() !== 'none') {
        if (cur.toLowerCase() === 'other') return oth || 'Other';
        return cur;
      }
      const cen = (userData?.hierarchy?.center || (userData as any)?.center || '').trim();
      if (cen && cen.toLowerCase() !== 'none') {
        if (cen.toLowerCase() === 'other') return oth || 'Other';
        return cen;
      }
      return 'Central VOICE';
    })();

    const resolvedUserTemple = (() => {
      const curT = ((userData as any)?.current_temple || userData?.hierarchy?.currentTemple || '').trim();
      const othT = ((userData as any)?.other_temple || userData?.hierarchy?.otherTemple || '').trim();
      if (curT && curT.toLowerCase() !== 'none') {
        if (curT.toLowerCase() === 'other') return othT || 'Other';
        return curT;
      }
      const parT = ((userData as any)?.parent_temple || userData?.hierarchy?.parentTemple || '').trim();
      if (parT && parT.toLowerCase() !== 'none') {
        if (parT.toLowerCase() === 'other') return othT || 'Other';
        return parT;
      }
      return 'ISKCON NVCC • PUNE';
    })();

    const userRounds = (userData as any)?.rounds !== undefined && (userData as any)?.rounds !== null
      ? String((userData as any).rounds)
      : (userData?.hierarchy?.rounds !== undefined && userData?.hierarchy?.rounds !== null ? String(userData.hierarchy.rounds) : '');

    // Auto-populate Attendee #1 with devotee profile from DB!
    const initialFormData = {
      participantName: userData?.name || '',
      whatsapp: userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '',
      rounds: userRounds || '',
      email: userData?.email || user?.email || '',
      dob: userDob ? String(userDob).split('T')[0] : '',
      introducedToKcSince: (userData?.hierarchy?.introducedToKcIn || (userData as any)?.introduced_to_kc_in || ''),
      ashram: ((userData as any)?.ashram || userData?.hierarchy?.ashram || 'Student and Not decided'),
      parentTemple: resolvedUserTemple,
      counselorName: userData?.hierarchy?.brahmachariCounselor || (userData as any)?.brahmachari_counselor || '',
      otherCounselorName: userData?.hierarchy?.otherCounselor || (userData as any)?.other_counselor || '',
      voiceName: resolvedUserCenter,
      campTrack: initialTrack,
      firstMealDate: firstMeal,
      firstMealType: firstMealType,
      lastMealDate: lastMeal,
      lastMealType: lastMealType,
      dinnerType: 'Dinner Meal',
      accommodation: 'Yes',
      gender: 'Male - Bachelor',
      participantType: 'Camp Participant',
      age: calculatedAge || '',
      marriedSinceYear: '',
    };
    setFormData(initialFormData);

    // Compute liveCost immediately without delay
    if (firstMeal && lastMeal) {
      const isLate = Boolean(
        Number(camp.late_fee) > 0 &&
        camp.late_fee_start_date &&
        new Date() >= new Date(camp.late_fee_start_date)
      );
      const initialCost = calculateDynamicCampCost(
        camp,
        {
          firstMealDate: firstMeal,
          firstMealType: 'Breakfast',
          lastMealDate: lastMeal,
          lastMealType: 'Dinner',
          accommodation: 'Yes',
          participantType: 'Camp Participant',
          campTrack: initialTrack,
        },
        isLate
      );
      setLiveCost(initialCost);
    }

    // Check for existing registration progress draft for this camp
    checkAndLoadDraft(camp.id);

    // Check if POC is required and if center POC already exists for this camp
    checkAndLoadPoc(camp, resolvedUserCenter);
  };

  // Check if center POC already exists for this camp
  const checkAndLoadPoc = async (camp: Camp, centerCandidate?: string) => {
    if (!camp?.require_poc) {
      setPocConfirmed(true);
      return;
    }

    const targetCenter = (
      centerCandidate ||
      managerAssignedCenter ||
      formData.voiceName ||
      userData?.hierarchy?.currentCenter ||
      userData?.hierarchy?.center ||
      (userData as any)?.center ||
      'Central VOICE'
    ).trim();

    setPocLoading(true);
    setPocError(null);
    try {
      const res = await fetch(`/api/camps/poc?campId=${camp.id}&centerName=${encodeURIComponent(targetCenter)}`);
      const json = await res.json();
      if (json.success && json.poc) {
        setPocDetails({
          pocName: json.poc.poc_name,
          pocContact: json.poc.poc_phone,
        });
        setPocConfirmed(true);
        setPocEditing(false);
      } else {
        // Not filled yet for this camp & center!
        setPocDetails({
          pocName: camp.default_poc_name || userData?.name || '',
          pocContact: camp.default_poc_contact || (userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : ''),
        });
        setPocConfirmed(false);
        setPocEditing(true);
      }
    } catch (err: any) {
      console.error('Error checking camp center POC:', err);
      setPocDetails({
        pocName: camp.default_poc_name || userData?.name || '',
        pocContact: camp.default_poc_contact || (userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : ''),
      });
      setPocConfirmed(false);
      setPocEditing(true);
    } finally {
      setPocLoading(false);
    }
  };

  const handleSavePoc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCamp) return;

    if (!pocDetails.pocName.trim()) {
      setPocError('Please enter the POC Name');
      return;
    }
    const cleanPhone = pocDetails.pocContact.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setPocError('Please enter a valid 10-digit mobile number');
      return;
    }

    const targetCenter = (
      managerAssignedCenter ||
      formData.voiceName ||
      userData?.hierarchy?.currentCenter ||
      userData?.hierarchy?.center ||
      (userData as any)?.center ||
      'Central VOICE'
    ).trim();

    setPocSaving(true);
    setPocError(null);
    try {
      const res = await fetch('/api/camps/poc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: selectedCamp.id,
          centerName: targetCenter,
          pocName: pocDetails.pocName.trim(),
          pocPhone: cleanPhone,
          userId: userData?.id || user?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save POC details');
      }

      setPocDetails({
        pocName: json.poc.poc_name,
        pocContact: json.poc.poc_phone,
      });
      setPocConfirmed(true);
      setPocEditing(false);
      setDraftToast({ type: 'success', message: `POC details confirmed for ${targetCenter}!` });
      setTimeout(() => setDraftToast(null), 4000);
    } catch (err: any) {
      setPocError(err.message || 'Failed to save POC details');
    } finally {
      setPocSaving(false);
    }
  };

  // Draft Check & Load
  const checkAndLoadDraft = async (campId: string) => {
    if (!campId) return;
    setLoadingDraft(true);
    try {
      const callerId = userData?.id || user?.id || '';
      const res = await fetch(`/api/camps/draft?campId=${campId}&userId=${callerId}`);
      const json = await res.json();
      if (json.success && json.draft) {
        if (Array.isArray(json.draft.entries) && json.draft.entries.length > 0) {
          setActiveDraft(json.draft);
        } else {
          setActiveDraft(null);
        }
      } else {
        setActiveDraft(null);
      }
    } catch (err) {
      console.error('Error checking registration draft:', err);
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleResumeDraft = () => {
    if (!activeDraft) return;
    if (Array.isArray(activeDraft.entries) && activeDraft.entries.length > 0) {
      setEntries(activeDraft.entries);
    }
    if (activeDraft.form_data && Object.keys(activeDraft.form_data).length > 0) {
      setFormData(prev => ({ ...prev, ...activeDraft.form_data }));
    }
    if (activeDraft.payment_method) {
      setSelectedMethod(activeDraft.payment_method);
    }
    if (activeDraft.itt_temple_name) {
      setIttTempleName(activeDraft.itt_temple_name);
    }
    if (activeDraft.itt_transaction_ref) {
      setIttTransactionRef(activeDraft.itt_transaction_ref);
    }
    if (activeDraft.itt_transaction_date) {
      setIttTransactionDate(activeDraft.itt_transaction_date);
    }
    if (activeDraft.idt_source) {
      setIdtSource(activeDraft.idt_source);
    }
    if (activeDraft.idt_passcode) {
      setIdtPasscode(activeDraft.idt_passcode);
    }
    if (activeDraft.coupon_code) {
      setCouponInput(activeDraft.coupon_code);
    }
    setDraftToast({
      type: 'success',
      message: `Restored saved draft with ${activeDraft.entries?.length || 0} devotee(s)!`,
    });
    setTimeout(() => setDraftToast(null), 5000);
    setActiveDraft(null);
  };

  const handleDiscardDraft = async () => {
    if (!selectedCamp?.id) return;
    try {
      const callerId = userData?.id || user?.id || '';
      await fetch(`/api/camps/draft?campId=${selectedCamp.id}&userId=${callerId}`, { method: 'DELETE' });
      setActiveDraft(null);
      setDraftToast({ type: 'success', message: 'Draft cleared.' });
      setTimeout(() => setDraftToast(null), 3000);
    } catch (err) {
      console.error('Error discarding draft:', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedCamp?.id) return;
    if (entries.length === 0 && !formData.participantName) {
      setDraftToast({ type: 'error', message: 'Please add at least one attendee or fill in devotee details before saving.' });
      setTimeout(() => setDraftToast(null), 4000);
      return;
    }

    setSavingDraft(true);
    try {
      const callerId = userData?.id || user?.id || '';
      const payload = {
        campId: selectedCamp.id,
        callerUserId: callerId,
        entries,
        formData,
        paymentMethod: selectedMethod,
        ittTempleName,
        ittTransactionRef,
        ittTransactionDate,
        idtSource,
        idtPasscode,
        couponCode: appliedCoupon?.code || couponInput || null,
      };

      const res = await fetch('/api/camps/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save progress');
      }

      setDraftToast({
        type: 'success',
        message: `Progress saved (${entries.length} devotee${entries.length === 1 ? '' : 's'})! You can log in from any system anytime to resume.`,
      });
      setTimeout(() => setDraftToast(null), 6000);
    } catch (err: any) {
      setDraftToast({ type: 'error', message: err.message || 'Failed to save progress' });
      setTimeout(() => setDraftToast(null), 4000);
    } finally {
      setSavingDraft(false);
    }
  };

  // Re-check draft when camp selection or user changes
  useEffect(() => {
    if (selectedCamp?.id) {
      checkAndLoadDraft(selectedCamp.id);
    }
  }, [selectedCamp?.id, userData?.id]);

  // Accommodation Capacity Evaluation
  const isBrahmachari = useMemo(() => {
    const pt = (formData.participantType || '').toLowerCase();
    const g = (formData.gender || '').toLowerCase();
    return pt.includes('brahmachari') || g.includes('brahmachari');
  }, [formData.participantType, formData.gender]);

  const isCvFullForSelectedDates = useMemo(() => {
    if (!capacityStatus || isBrahmachari) return false;
    if (capacityStatus.globalCapacity?.isFull) return true;
    const batches = capacityStatus.batches || [];
    if (batches.length === 0) return false;

    const fStart = String(formData.firstMealDate || '').trim().toLowerCase().replace(/\s+/g, '');
    const fEnd = String(formData.lastMealDate || '').trim().toLowerCase().replace(/\s+/g, '');

    for (const b of batches) {
      if (b.isFull) {
        const bStart = String(b.start_date || '').trim().toLowerCase().replace(/\s+/g, '');
        const bEnd = String(b.end_date || '').trim().toLowerCase().replace(/\s+/g, '');
        if (
          (bStart && (fStart.includes(bStart) || bStart.includes(fStart))) ||
          (bEnd && (fEnd.includes(bEnd) || bEnd.includes(fEnd))) ||
          (!bStart && !bEnd)
        ) {
          return true;
        }
      }
    }
    return false;
  }, [capacityStatus, isBrahmachari, formData.firstMealDate, formData.lastMealDate]);

  const isArrangingOwnStay = useMemo(() => {
    return !isBrahmachari && (formData.accommodation === 'No' || isCvFullForSelectedDates);
  }, [isBrahmachari, formData.accommodation, isCvFullForSelectedDates]);

  const recommendedHotelsList = useMemo(() => {
    const fromCamp = selectedCamp?.accommodation_pricing?.recommended_hotels;
    const fromStatus = capacityStatus?.recommendedHotels;
    return (Array.isArray(fromCamp) && fromCamp.length > 0)
      ? fromCamp
      : (Array.isArray(fromStatus) ? fromStatus : []);
  }, [selectedCamp?.accommodation_pricing?.recommended_hotels, capacityStatus?.recommendedHotels]);

  useEffect(() => {
    if (isCvFullForSelectedDates && !isBrahmachari && formData.accommodation === 'Yes') {
      setFormData((prev) => ({ ...prev, accommodation: 'No' }));
    }
  }, [isCvFullForSelectedDates, isBrahmachari, formData.accommodation]);

  const handleUploadHotelReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB Client-side File Size Limit
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`File size exceeds ${MAX_MB}MB limit. Please upload an image or PDF under ${MAX_MB}MB.`);
      e.target.value = '';
      return;
    }

    setUploadingReceipt(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('campTitle', selectedCamp?.title || 'Camp');
      data.append('devoteeName', formData.participantName || 'Devotee');
      data.append('hotelName', hotelBookingName || 'Nearby Hotel');

      const res = await fetch('/api/camps/upload-accommodation-proof', {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        alert(json.error || 'Failed to upload hotel receipt.');
      } else {
        setHotelReceiptUrl(json.fileUrl || json.webViewLink);
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading hotel receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Recalculate Live Cost on Attendee Form Change
  useEffect(() => {
    if (!selectedCamp) return;

    if (formData.firstMealDate && formData.lastMealDate) {
      const isLate = Boolean(
        Number(selectedCamp.late_fee) > 0 &&
        selectedCamp.late_fee_start_date &&
        new Date() >= new Date(selectedCamp.late_fee_start_date)
      );

      const calc = calculateDynamicCampCost(
        selectedCamp,
        {
          firstMealDate: formData.firstMealDate,
          firstMealType: formData.firstMealType,
          lastMealDate: formData.lastMealDate,
          lastMealType: formData.lastMealType,
          accommodation: formData.accommodation,
          participantType: formData.participantType,
          campTrack: formData.campTrack,
        },
        isLate
      );
      setLiveCost(calc);
    }
  }, [selectedCamp, formData]);

  const isManager = isCampManagerialUser(userData?.role, selectedCamp?.payment_config?.allowed_managerial_roles);
  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const isSuperAdmin = userRoles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');

  // Strict center-based visibility filtering for Active Camps list
  const visibleActiveCamps = useMemo(() => {
    if (isSuperAdmin) return activeCamps;

    const userCenters = [
      managerAssignedCenter,
      userData?.hierarchy?.currentCenter,
      userData?.hierarchy?.center,
      (userData as any)?.center,
      (userData as any)?.current_center,
      userData?.hierarchy?.otherCenter,
      (userData as any)?.other_center,
    ].filter(Boolean).map((s: string) => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

    return activeCamps.filter((camp) => {
      const eligible = camp.eligible_centers;
      if (!Array.isArray(eligible) || eligible.length === 0) {
        // Open to all centers (Public)
        return true;
      }
      return eligible.some((ec: string) => {
        const ecNorm = String(ec || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!ecNorm) return false;
        return userCenters.some((uc: string) => uc === ecNorm || uc.includes(ecNorm) || ecNorm.includes(uc));
      });
    });
  }, [activeCamps, isSuperAdmin, userData, managerAssignedCenter]);

  // Check center-based registration eligibility for currently selected camp
  const isDevoteeEligibleForCamp = useMemo(() => {
    if (!selectedCamp) return true;
    const eligibleCenters = selectedCamp.eligible_centers || [];
    if (!Array.isArray(eligibleCenters) || eligibleCenters.length === 0) return true;
    if (isSuperAdmin) return true;

    const userCenters: string[] = [];
    const curCenter = (userData?.hierarchy?.currentCenter || (userData as any)?.current_center || '').trim();
    const othCenter = (userData?.hierarchy?.otherCenter || (userData as any)?.other_center || '').trim();
    const regCenter = (userData?.hierarchy?.center || (userData as any)?.center || '').trim();
    if (curCenter) userCenters.push(curCenter);
    if (othCenter) userCenters.push(othCenter);
    if (regCenter) userCenters.push(regCenter);
    if (managerAssignedCenter) userCenters.push(managerAssignedCenter);

    return eligibleCenters.some((ec) =>
      userCenters.some((uc) =>
        uc.toLowerCase() === ec.toLowerCase() ||
        uc.toLowerCase().includes(ec.toLowerCase()) ||
        ec.toLowerCase().includes(uc.toLowerCase())
      )
    );
  }, [selectedCamp, userData, isSuperAdmin, managerAssignedCenter]);

  // Load center devotees for managerial fast registration and cancellation
  useEffect(() => {
    if (isManager && userData?.id) {
      const campIdToUse = selectedCamp?.id || cancelCamp?.id;
      setLoadingDevotees(true);
      getCenterDevoteesForCampRegistrationAction(campIdToUse, userData?.id)
        .then((res) => {
          setLoadingDevotees(false);
          if (res.success && res.devotees) {
            setCenterDevotees(res.devotees);
            const label = res.centerName || res.templeName || '';
            if (label) {
              setCenterNameFound(label);
              const assignedCenter = res.centerName ? res.centerName.split(',')[0].trim() : '';
              const assignedTemple = res.templeName ? res.templeName.split(',')[0].trim() : '';
              if (assignedCenter) setManagerAssignedCenter(assignedCenter);
              if (assignedTemple) setManagerAssignedTemple(assignedTemple);
              setFormData((prev) => ({
                ...prev,
                ...(assignedCenter ? { voiceName: assignedCenter } : {}),
                ...(assignedTemple ? { parentTemple: assignedTemple } : {})
              }));
              if (assignedCenter && selectedCamp?.require_poc) {
                checkAndLoadPoc(selectedCamp, assignedCenter);
              }
            }
          } else {
            console.warn('[Camp] Devotees fetch failed:', res.error);
          }
        })
        .catch((err) => {
          console.error('[Camp] Devotees fetch error:', err);
          setLoadingDevotees(false);
        });
    } else if (!isManager) {
      setCenterDevotees([]);
      setCenterNameFound('');
      setSelectedDevoteeId('');
      setDevoteeSearchTerm('');
    }
  }, [selectedCamp?.id, cancelCamp?.id, showCancelModal, isManager, userData?.id]);

  // Load counselors list for manual devotee registration dropdown
  useEffect(() => {
    fetch('/api/counselors/get')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCounselorsList(data);
        }
      })
      .catch((err) => console.warn('Could not load counselors list:', err));
  }, []);

  // Memoized options for counselor selection including None & Other (names only, no email display)
  const counselorDropdownOptions = useMemo(() => {
    return [
      { id: 'None', name: 'None' },
      { id: 'Other', name: 'Other' },
      ...counselorsList
        .filter((c) => c.name && c.name !== 'None' && c.name !== 'Other')
        .map((c) => ({
          id: c.id || c.name,
          name: c.name
        }))
    ];
  }, [counselorsList]);

  // Track list already registered by the individual logged-in user for this selected camp
  const userRegisteredTracks = useMemo(() => {
    if (!selectedCamp) return [];
    const myEmail = (userData?.email || user?.email || '').trim().toLowerCase();
    const myPhone = (userData?.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return userRegistrations
      .filter((r) => {
        if (r.camp_id !== selectedCamp.id || r.is_cancelled || r.payment_status === 'failed') return false;
        const rEmail = (r.email || '').trim().toLowerCase();
        const rPhone = (r.whatsapp || r.poc_contact || '').replace(/[^0-9]/g, '').slice(-10);
        return (myEmail && rEmail === myEmail) || (myPhone && rPhone === myPhone);
      })
      .map((r) => (r.camp_track || '').trim())
      .filter(Boolean);
  }, [selectedCamp?.id, userRegistrations, userData?.email, user?.email, userData?.phone]);

  const myPassesCount = useMemo(() => userRegistrations.filter(r => r.is_own_registration).length, [userRegistrations]);
  const assignedPassesCount = useMemo(() => userRegistrations.filter(r => !r.is_own_registration).length, [userRegistrations]);

  // Base scoped passes by manager view (all / mine / assigned)
  const scopedRegistrations = useMemo(() => {
    if (isManager && passViewFilter !== 'all') {
      if (passViewFilter === 'mine') {
        return userRegistrations.filter(r => r.is_own_registration);
      } else {
        return userRegistrations.filter(r => !r.is_own_registration);
      }
    }
    return userRegistrations;
  }, [userRegistrations, isManager, passViewFilter]);

  // 1. Cascading Main Camps List: Derived from scoped passes
  const registeredCampsList = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    scopedRegistrations.forEach((r) => {
      const cId = r.camp_id || r.camp_title || 'unknown';
      const cTitle = r.camp_title || 'Camp Pass';
      if (!map.has(cId)) {
        map.set(cId, { id: cId, title: cTitle, count: 0 });
      }
      map.get(cId)!.count += 1;
    });
    return Array.from(map.values());
  }, [scopedRegistrations]);

  // All unique camps available for cancellation (combining active camps and registered camps)
  const cancellationCamps = useMemo(() => {
    const map = new Map<string, Camp>();
    activeCamps.forEach(c => map.set(c.id, c));
    userRegistrations.forEach(r => {
      if (r.camp_id && !map.has(r.camp_id)) {
        const fromActive = activeCamps.find(c => c.id === r.camp_id || c.slug === r.camp_slug);
        if (fromActive) {
          map.set(r.camp_id, fromActive);
        } else {
          map.set(r.camp_id, {
            id: r.camp_id,
            slug: r.camp_slug,
            title: r.camp_title,
            venue: r.camp_venue,
            refund_config: r.camp_refund_config,
            payment_config: r.camp_payment_config || {
              enable_razorpay: true,
              surcharge_percent: Number((r as any)?.camp_payment_config?.surcharge_percent || 0),
              enable_idt: false,
              idt_passcodes: []
            },
          } as unknown as Camp);
        }
      }
    });
    return Array.from(map.values());
  }, [activeCamps, userRegistrations]);

  // 2. Cascading Subcamps / Tracks List: Dynamically scoped by selected Main Camp
  const registeredTracksList = useMemo(() => {
    const list = passCampFilter === 'all'
      ? scopedRegistrations
      : scopedRegistrations.filter((r) => (r.camp_id || r.camp_title) === passCampFilter);

    const map = new Map<string, { id: string; name: string; count: number }>();
    list.forEach((r) => {
      const trackName = (r.camp_track || 'General Attendee').trim();
      const trackKey = trackName.toLowerCase();
      if (!map.has(trackKey)) {
        map.set(trackKey, { id: trackName, name: trackName, count: 0 });
      }
      map.get(trackKey)!.count += 1;
    });
    return Array.from(map.values());
  }, [scopedRegistrations, passCampFilter]);

  // 3. Cascading Status Counts: Dynamically scoped by both Main Camp and Sub-Camp
  const passStatusCounts = useMemo(() => {
    let list = scopedRegistrations;
    if (passCampFilter !== 'all') {
      list = list.filter((r) => (r.camp_id || r.camp_title) === passCampFilter);
    }
    if (passSubcampFilter !== 'all') {
      list = list.filter((r) => ((r.camp_track || 'General Attendee').trim().toLowerCase()) === passSubcampFilter.toLowerCase());
    }

    let confirmed = 0;
    let waiting_list = 0;
    let pending = 0;
    let cancelled = 0;

    list.forEach((reg) => {
      const refund = userRefunds.find(
        (ref) => ref.registration_id === reg.id || ref.group_id === reg.group_id
      );
      const paymentStatus = String(reg.payment_status || '').toLowerCase();
      const isWaitingList = Boolean(reg.is_waiting_list || paymentStatus === 'waiting_list');
      const isCompleted = !isWaitingList && (['completed', 'free', 'role_waiver'].includes(paymentStatus) || String((reg as any).payment_method || '').toUpperCase() === 'FREE');
      const isCancelled = Boolean(reg.is_cancelled || paymentStatus === 'refunded' || refund?.status === 'refunded');
      const isPendingRefund = refund?.status === 'pending';
      const isPendingApproval = !isCompleted && !isCancelled && !isWaitingList;

      if (isCancelled) {
        cancelled++;
      } else if (isWaitingList) {
        waiting_list++;
      } else if (isPendingApproval || isPendingRefund) {
        pending++;
      } else if (isCompleted) {
        confirmed++;
      }
    });

    return { confirmed, waiting_list, pending, cancelled, all: list.length };
  }, [scopedRegistrations, passCampFilter, passSubcampFilter, userRefunds]);

  const displayedRegistrations = useMemo(() => {
    let list = userRegistrations;

    // 1. Manager view filter (all / mine / assigned)
    if (isManager && passViewFilter !== 'all') {
      if (passViewFilter === 'mine') {
        list = userRegistrations.filter(r => r.is_own_registration);
      } else {
        list = userRegistrations.filter(r => !r.is_own_registration);
      }
    }

    // 2. Status filter ('all' | 'confirmed' | 'pending' | 'cancelled')
    if (passStatusFilter !== 'all') {
      list = list.filter((reg) => {
        const refund = userRefunds.find(
          (ref) => ref.registration_id === reg.id || ref.group_id === reg.group_id
        );
        const paymentStatus = String(reg.payment_status || '').toLowerCase();
        const isWaitingList = Boolean(reg.is_waiting_list || paymentStatus === 'waiting_list');
        const isCompleted = !isWaitingList && (['completed', 'free', 'role_waiver'].includes(paymentStatus) || String((reg as any).payment_method || '').toUpperCase() === 'FREE');
        const isCancelled = Boolean(reg.is_cancelled || paymentStatus === 'refunded' || refund?.status === 'refunded');
        const isPendingRefund = refund?.status === 'pending';
        const isPendingApproval = !isCompleted && !isCancelled && !isWaitingList;

        if (passStatusFilter === 'cancelled') return isCancelled;
        if (passStatusFilter === 'waiting_list') return isWaitingList && !isCancelled;
        if (passStatusFilter === 'pending') return (isPendingApproval || isPendingRefund) && !isCancelled;
        if (passStatusFilter === 'confirmed') return isCompleted && !isCancelled;
        return true;
      });
    }

    // 3. Camp filter
    if (passCampFilter !== 'all') {
      list = list.filter((r) => (r.camp_id || r.camp_title) === passCampFilter);
    }

    // 4. Subcamp / Track filter
    if (passSubcampFilter !== 'all') {
      list = list.filter((r) => ((r.camp_track || 'General Attendee').trim().toLowerCase()) === passSubcampFilter.toLowerCase());
    }

    // 5. Search query
    if (passSearchTerm.trim()) {
      const q = passSearchTerm.trim().toLowerCase();
      list = list.filter((r) => {
        const name = (r.participant_name || '').toLowerCase();
        const phone = (r.whatsapp || r.poc_contact || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const group = (r.group_id || '').toLowerCase();
        const camp = (r.camp_title || '').toLowerCase();
        const track = (r.camp_track || '').toLowerCase();
        const center = (r.voice_name || r.parent_temple || '').toLowerCase();
        const counselor = (r.counselor_name || '').toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          group.includes(q) ||
          camp.includes(q) ||
          track.includes(q) ||
          center.includes(q) ||
          counselor.includes(q)
        );
      });
    }
    return list;
  }, [userRegistrations, isManager, passViewFilter, passStatusFilter, passCampFilter, passSubcampFilter, passSearchTerm, userRefunds]);

  const selectedDevotee = useMemo(() => {
    return centerDevotees.find((d) => d.id === selectedDevoteeId) || null;
  }, [centerDevotees, selectedDevoteeId]);

  // Devotees available for cancellation in managerial mode (combines center devotees and active registered passes)
  const devoteesForCancellation = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      phone: string;
      email: string;
      center?: string;
      hasPassInCamp: boolean;
      campTitle?: string;
      queryIdentifier: string;
    }> = [];
    const seen = new Set<string>();

    // 1. First add attendees who actually have CONFIRMED passes in this selected cancelCamp!
    userRegistrations.forEach((r) => {
      if (!r.is_own_registration && r.participant_name && r.payment_status === 'completed' && !r.is_cancelled) {
        const matchesCamp = !cancelCamp || r.camp_id === cancelCamp.id || r.camp_slug === cancelCamp.slug;
        if (matchesCamp) {
          const rawPhone = (r.whatsapp || r.poc_contact || '').replace(/[^0-9]/g, '').slice(-10);
          const rawEmail = (r.email || '').trim().toLowerCase();
          const queryId = rawPhone || rawEmail || r.group_id || '';
          const dedupeKey = `${queryId}-${r.participant_name.toLowerCase()}`;
          if (queryId && !seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            list.push({
              id: r.id || dedupeKey,
              name: r.participant_name,
              phone: r.whatsapp || r.poc_contact || '',
              email: r.email || '',
              center: r.voice_name || r.parent_temple || 'Assigned Center',
              hasPassInCamp: true,
              campTitle: r.camp_title,
              queryIdentifier: queryId,
            });
          }
        }
      }
    });

    // 2. Add devotees loaded from centerDevotees in the assigned center
    centerDevotees.forEach((d) => {
      const rawPhone = (d.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const rawEmail = (d.email || '').trim().toLowerCase();
      const queryId = rawPhone || rawEmail || d.id;
      const dedupeKey = `${queryId}-${d.name.toLowerCase()}`;
      if (queryId && !seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        list.push({
          id: d.id,
          name: d.name,
          phone: d.phone,
          email: d.email,
          center: d.center || d.temple,
          hasPassInCamp: false,
          queryIdentifier: queryId,
        });
      }
    });

    return list;
  }, [userRegistrations, centerDevotees, cancelCamp?.id, cancelCamp?.slug]);

  // Active registered tracks for whoever is currently being registered
  const activeRegisteredTracks = useMemo(() => {
    if (isManager && selectedDevotee) {
      return selectedDevotee.registeredTracks || [];
    }
    return userRegisteredTracks;
  }, [isManager, selectedDevotee, userRegisteredTracks]);

  // Dynamically filter available camp tracks based on devotee chanting rounds & roles
  const availableTracksForDevotee = useMemo(() => {
    const allTracks = selectedCamp?.tracks && selectedCamp.tracks.length > 0
      ? selectedCamp.tracks
      : ['GS Camp - 1st Timer'];

    const userRoundsNum = formData.rounds !== '' && formData.rounds !== undefined && formData.rounds !== null
      ? Number(formData.rounds)
      : 0;

    const attendeeRole = isManager && selectedDevotee ? selectedDevotee.role : userData?.role;
    const attendeeRoyal = isManager && selectedDevotee
      ? selectedDevotee.royalMember
      : (userData?.hierarchy?.royalMember || (userData as any)?.royalMember || (userData as any)?.royal_member);

    const trackFees = selectedCamp?.special_waivers?.track_fees || [];

    return allTracks.filter((t) => {
      const tf = trackFees.find((x) => x.track.toLowerCase() === t.toLowerCase());
      const minRounds = tf && tf.min_rounds !== undefined && tf.min_rounds !== null ? Number(tf.min_rounds) : 0;
      // If minimum rounds are specified (e.g. 16 rounds for Nistha), devotee must chant >= minRounds to see and register.
      if (minRounds > 0 && userRoundsNum < minRounds) {
        return false;
      }
      // If specific roles are required (e.g. Director, Acting Manager, Royal Member), check devotee eligibility
      if (tf?.applicable_roles && tf.applicable_roles.length > 0) {
        const isEligible = userHasEligibleRole(attendeeRole, attendeeRoyal, tf.applicable_roles);
        if (!isEligible) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCamp, formData.rounds, isManager, selectedDevotee, userData]);

  // If current campTrack is not in the filtered available tracks, auto-select the first available track
  useEffect(() => {
    if (availableTracksForDevotee.length > 0 && !availableTracksForDevotee.includes(formData.campTrack)) {
      const firstAvailable = availableTracksForDevotee.find((t) => !activeRegisteredTracks.includes(t.trim())) || availableTracksForDevotee[0];
      const tf = (selectedCamp?.special_waivers?.track_fees || []).find(
        (t) => t.track.toLowerCase() === firstAvailable.toLowerCase()
      );
      setFormData((prev) => ({
        ...prev,
        campTrack: firstAvailable,
        ...(tf?.start_date ? { firstMealDate: tf.start_date } : {}),
        ...(tf?.start_meal_type ? { firstMealType: tf.start_meal_type } : {}),
        ...(tf?.end_date ? { lastMealDate: tf.end_date } : {}),
        ...(tf?.end_meal_type ? { lastMealType: tf.end_meal_type } : {}),
      }));
    }
  }, [availableTracksForDevotee, formData.campTrack, activeRegisteredTracks, selectedCamp]);

  // Check if current form track is already registered
  const isCurrentTrackAlreadyRegistered = useMemo(() => {
    if (!formData.campTrack) return false;
    return activeRegisteredTracks.includes(formData.campTrack.trim());
  }, [formData.campTrack, activeRegisteredTracks]);

  const handleSelectDevotee = (devId: string) => {
    setSelectedDevoteeId(devId);
    if (!devId) return;
    const found = centerDevotees.find((d) => d.id === devId);
    if (found) {
      // If devotee already holds the currently selected track, auto-pick an available track if one exists
      let nextTrack = formData.campTrack;
      const devoteeTracks = found.registeredTracks || [];
      if (devoteeTracks.includes(nextTrack)) {
        const available = selectedCamp?.tracks?.find((t) => !devoteeTracks.includes(t));
        if (available) {
          nextTrack = available;
        }
      }
      setFormData((prev) => ({
        ...prev,
        participantName: found.name,
        whatsapp: found.phone ? found.phone.replace(/[^0-9]/g, '').slice(-10) : prev.whatsapp,
        rounds: found.rounds !== undefined && found.rounds !== null ? String(found.rounds) : '',
        email: found.email || prev.email,
        age: found.age || prev.age,
        gender: (found.gender as any) || prev.gender,
        counselorName: found.counselor || prev.counselorName,
        voiceName: found.center || prev.voiceName,
        parentTemple: found.temple || prev.parentTemple,
        campTrack: nextTrack,
        ...(() => {
          const tf = (selectedCamp?.special_waivers?.track_fees || []).find(
            (t) => t.track.toLowerCase() === nextTrack.toLowerCase()
          );
          return {
            ...(tf?.start_date ? { firstMealDate: tf.start_date } : {}),
            ...(tf?.start_meal_type ? { firstMealType: tf.start_meal_type } : {}),
            ...(tf?.end_date ? { lastMealDate: tf.end_date } : {}),
            ...(tf?.end_meal_type ? { lastMealType: tf.end_meal_type } : {}),
          };
        })(),
      }));
    }
  };

  const filteredCenterDevotees = centerDevotees.filter((dev) => {
    if (!devoteeSearchTerm.trim()) return true;
    const term = devoteeSearchTerm.toLowerCase();
    return (
      dev.name.toLowerCase().includes(term) ||
      dev.phone.includes(term) ||
      dev.email.toLowerCase().includes(term)
    );
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'dob') {
      const calculatedAge = calculateAgeFromBirthDate(value);
      setFormData((prev) => ({
        ...prev,
        dob: value,
        age: calculatedAge ? String(calculatedAge) : prev.age,
      }));
    } else if (name === 'gender') {
      const isFemale = value.startsWith('Female');
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        accommodation: isFemale ? 'No' : prev.accommodation,
      }));
    } else if (name === 'campTrack') {
      const tf = (selectedCamp?.special_waivers?.track_fees || []).find(
        (t) => t.track.toLowerCase() === value.toLowerCase()
      );
      setFormData((prev) => ({
        ...prev,
        campTrack: value,
        ...(tf?.start_date ? { firstMealDate: tf.start_date } : {}),
        ...(tf?.start_meal_type ? { firstMealType: tf.start_meal_type } : {}),
        ...(tf?.end_date ? { lastMealDate: tf.end_date } : {}),
        ...(tf?.end_meal_type ? { lastMealType: tf.end_meal_type } : {}),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();

    // Strict rule: Center-based registration restriction
    if (!isDevoteeEligibleForCamp) {
      alert(`Registration for "${selectedCamp?.title}" is restricted to devotees from: ${(selectedCamp?.eligible_centers || []).join(', ')}. Your center is not in the allowed list.`);
      return;
    }

    if (selectedCamp?.eligible_centers && selectedCamp.eligible_centers.length > 0 && !isSuperAdmin) {
      const attendeeCenter = (formData.voiceName || '').trim();
      const allowed = selectedCamp.eligible_centers.some((ec) =>
        ec.toLowerCase() === attendeeCenter.toLowerCase() ||
        ec.toLowerCase().includes(attendeeCenter.toLowerCase()) ||
        attendeeCenter.toLowerCase().includes(ec.toLowerCase())
      );
      if (!allowed) {
        alert(`This camp is restricted to devotees from: ${selectedCamp.eligible_centers.join(', ')}. Attendee center "${attendeeCenter}" is not eligible.`);
        return;
      }
    }

    // Strict rule: Student accounts are restricted to single attendee self-registration
    if (!isManager && entries.length >= 1 && editIndex === null) {
      alert('Student accounts can register for themselves only (1 attendee maximum). Multi-attendee booking is restricted to center managers.');
      return;
    }

    if (!formData.participantName.trim()) {
      alert('Please enter Participant full name');
      return;
    }

    const phoneRes = validatePhoneNumber(formData.whatsapp, '+91', true);
    if (!phoneRes.isValid) {
      alert(phoneRes.error || 'WhatsApp / Phone number must be a valid phone number');
      return;
    }
    const cleanWhatsapp = phoneRes.parsed.cleanNumber;

    // Manual entry specific validations
    if (isManager && entryMode === 'manual') {
      const cleanEmail = (formData.email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        alert('Please enter a valid Email Address for the participant to create their account and send login details.');
        return;
      }
      if (!formData.dob && (!formData.age || Number(formData.age) < 1)) {
        alert('Please enter the participant Date of Birth.');
        return;
      }
      if (!formData.counselorName?.trim()) {
        alert('Please select or specify a Counselor / Care Giver for this devotee.');
        return;
      }
      if (formData.counselorName === 'Other' && !formData.otherCounselorName?.trim()) {
        alert('Please enter the Counselor / Care Giver name.');
        return;
      }
      if (!formData.introducedToKcSince?.trim()) {
        alert('Please select the date when the devotee was Introduced to Krishna Consciousness.');
        return;
      }
    }

    if (!formData.age || Number(formData.age) < 1) {
      alert('Please enter a valid age or Date of Birth');
      return;
    }

    // Chronological meal order validation on the same day
    if (formData.firstMealDate === formData.lastMealDate) {
      const order = { Breakfast: 1, Lunch: 2, Dinner: 3 };
      const fVal = order[formData.firstMealType as keyof typeof order] || 1;
      const lVal = order[formData.lastMealType as keyof typeof order] || 3;
      if (fVal > lVal) {
        alert('On the same day, First Meal must precede Last Meal (Breakfast → Lunch → Dinner)');
        return;
      }
    }

    if (!liveCost) {
      alert('Unable to calculate cost for selected meals.');
      return;
    }

    // Prevent duplicate registration for the same track in this camp
    if (isCurrentTrackAlreadyRegistered) {
      const personName = formData.participantName || (isManager && selectedDevotee ? selectedDevotee.name : 'Devotee');
      alert(`"${personName}" is already registered for track "${formData.campTrack}" in this camp. Please select a different track.`);
      return;
    }

    // Enforce sub-camp minimum rounds requirement
    const selectedTrackFeeObj = (selectedCamp?.special_waivers?.track_fees || []).find(
      (x) => x.track.toLowerCase() === (formData.campTrack || '').toLowerCase()
    );
    const reqMinRounds = selectedTrackFeeObj?.min_rounds ? Number(selectedTrackFeeObj.min_rounds) : 0;
    const currentDevoteeRounds = Number(formData.rounds || 0);
    if (reqMinRounds > 0 && currentDevoteeRounds < reqMinRounds) {
      alert(`The "${formData.campTrack}" track requires a minimum of ${reqMinRounds} rounds of chanting. (Current: ${currentDevoteeRounds} rounds). Please choose an eligible track.`);
      return;
    }

    // Enforce sub-camp role requirement
    if (selectedTrackFeeObj?.applicable_roles && selectedTrackFeeObj.applicable_roles.length > 0) {
      const attendeeRole = isManager && selectedDevotee ? selectedDevotee.role : userData?.role;
      const attendeeRoyal = isManager && selectedDevotee
        ? selectedDevotee.royalMember
        : (userData?.hierarchy?.royalMember || (userData as any)?.royalMember || (userData as any)?.royal_member);
      const isRoleEligible = userHasEligibleRole(attendeeRole, attendeeRoyal, selectedTrackFeeObj.applicable_roles);
      if (!isRoleEligible) {
        alert(`The "${formData.campTrack}" sub-camp is restricted to specific roles (${selectedTrackFeeObj.applicable_roles.join(', ')}). This devotee does not have an eligible role.`);
        return;
      }
    }

    // Prevent duplicate entries in the same batch for the same track
    const newEntryEmail = (formData.email || (selectedDevoteeId ? centerDevotees.find(d => d.id === selectedDevoteeId)?.email : '') || userData?.email || '').trim().toLowerCase();
    const newEntryPhone = cleanWhatsapp;
    const newEntryTrack = (formData.campTrack || '').trim().toLowerCase();

    const isDuplicateInBatch = entries.some((e, idx) => {
      if (editIndex !== null && idx === editIndex) return false;
      const eEmail = (e.email || '').trim().toLowerCase();
      const ePhone = String(e.whatsapp || e.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const eTrack = (e.campTrack || e.camp_track || '').trim().toLowerCase();
      const trackMatches = eTrack === newEntryTrack;
      const personMatches = (newEntryEmail && eEmail && newEntryEmail === eEmail) || (newEntryPhone && ePhone && newEntryPhone === ePhone);
      return trackMatches && personMatches;
    });

    if (isDuplicateInBatch) {
      alert(`"${formData.participantName || 'Devotee'}" is already added to this batch for track "${formData.campTrack}".`);
      return;
    }

    const isOtherCounselor = formData.counselorName === 'Other';
    const resolvedCounselorName = isOtherCounselor
      ? (formData.otherCounselorName?.trim() || 'Other')
      : (formData.counselorName || '');

    // For center managers, prioritize their allocated assigned center & temple
    const effectiveCenter = (
      (isManager && managerAssignedCenter ? managerAssignedCenter : null) ||
      formData.voiceName ||
      (centerNameFound ? centerNameFound.split('•')[0].trim() : '') ||
      'Central VOICE'
    ).trim();

    const effectiveTemple = (
      (isManager && managerAssignedTemple ? managerAssignedTemple : null) ||
      formData.parentTemple ||
      'ISKCON NVCC • PUNE'
    ).trim();

    // Accommodation Capacity Check:
    const isWaiting = Boolean(isArrangingOwnStay);
    if (isWaiting && !hotelReceiptUrl) {
      alert(
        isCvFullForSelectedDates
          ? 'CV Floor Accommodation is completely full for selected dates. Please upload external hotel booking receipt to proceed on the Waiting List.'
          : 'For self-arranged accommodation / outside stay, please enter hotel name and upload booking receipt proof to proceed.'
      );
      return;
    }

    const newEntry = {
      ...formData,
      is_waiting_list: isWaiting,
      isWaitingList: isWaiting,
      hotel_receipt_url: hotelReceiptUrl || null,
      hotelReceiptUrl: hotelReceiptUrl || null,
      hotel_name: hotelBookingName || null,
      hotelName: hotelBookingName || null,
      participantType: formData.participantType || 'Camp Participant',
      participant_type: formData.participantType || 'Camp Participant',
      rounds: formData.rounds !== undefined && formData.rounds !== null ? String(formData.rounds) : '0',
      is_manual_entry: isManager && entryMode === 'manual',
      isManualEntry: isManager && entryMode === 'manual',
      email: (formData.email || (selectedDevoteeId ? centerDevotees.find(d => d.id === selectedDevoteeId)?.email : '') || userData?.email || '').trim().toLowerCase(),
      dob: formData.dob || '',
      birth_date: formData.dob || '',
      introduced_to_kc_in: formData.introducedToKcSince || '',
      introducedToKcSince: formData.introducedToKcSince || '',
      counselor_name: resolvedCounselorName,
      counselorName: resolvedCounselorName,
      counselor_selection: formData.counselorName,
      counselorSelection: formData.counselorName,
      other_counselor: isOtherCounselor ? formData.otherCounselorName.trim() : null,
      otherCounselor: isOtherCounselor ? formData.otherCounselorName.trim() : null,
      ashram: 'Student and Not decided',
      current_center: effectiveCenter,
      currentCenter: effectiveCenter,
      current_temple: effectiveTemple,
      currentTemple: effectiveTemple,
      voice_name: effectiveCenter,
      parent_temple: effectiveTemple, // strictly assigned temple per user specification
      parent_center: effectiveCenter,
      parentCenter: effectiveCenter,
      assigned_center: managerAssignedCenter || null,
      assigned_temple: managerAssignedTemple || null,
      firstMealDate: formData.firstMealDate,
      firstMealType: formData.firstMealType,
      lastMealDate: formData.lastMealDate,
      lastMealType: formData.lastMealType,
      first_meal_date: formData.firstMealDate,
      first_meal_type: formData.firstMealType,
      last_meal_date: formData.lastMealDate,
      last_meal_type: formData.lastMealType,
      dinner_type: formData.dinnerType,
      dinnerType: formData.dinnerType,
      accommodation: formData.accommodation,
      mealCost: liveCost.mealCost,
      accCost: liveCost.accCost,
      acCost: liveCost.acCost,
      lateFee: liveCost.lateFee,
      totalCost: liveCost.totalCost,
      baseCost: liveCost.baseCost,
      entryCost: liveCost.entryCost,
      meal_cost: liveCost.mealCost,
      acc_cost: liveCost.accCost,
      ac_cost: liveCost.acCost,
      late_fee: liveCost.lateFee,
      total_cost: liveCost.totalCost,
      base_cost: liveCost.baseCost,
      entry_cost: liveCost.entryCost,
    };

    if (editIndex !== null) {
      const updated = [...entries];
      updated[editIndex] = newEntry;
      setEntries(updated);
      setEditIndex(null);
    } else {
      setEntries((prev) => [...prev, newEntry]);
    }

    // Reset attendee form for next entry (if group registration)
    setHotelReceiptUrl('');
    setHotelBookingName('');
    setSelectedDevoteeId('');
    setDevoteeSearchTerm('');
    const meals = selectedCamp?.meal_pricing || [];
    setFormData((prev) => {
      const currentTrack = prev.campTrack || selectedCamp?.tracks?.[0] || '';
      const tf = (selectedCamp?.special_waivers?.track_fees || []).find(
        (t) => t.track.toLowerCase() === currentTrack.toLowerCase()
      );
      return {
        ...prev,
        participantName: '',
        whatsapp: '',
        rounds: '',
        email: '',
        dob: '',
        age: '',
        introducedToKcSince: '',
        counselorName: '',
        otherCounselorName: '',
        ashram: 'Student and Not decided',
        gender: 'Male - Bachelor',
        accommodation: isCvFullForSelectedDates ? 'No' : 'Yes',
        firstMealDate: tf?.start_date || (meals.length > 0 ? String(meals[0].date) : ''),
        firstMealType: tf?.start_meal_type || 'Breakfast',
        lastMealDate: tf?.end_date || (meals.length > 0 ? String(meals[meals.length - 1].date) : ''),
        lastMealType: tf?.end_meal_type || 'Dinner',
        dinnerType: 'Dinner Meal',
      };
    });
  };

  const handleEditEntry = (index: number) => {
    const item = entries[index];
    setHotelBookingName(item.hotel_name || item.hotelName || '');
    setHotelReceiptUrl(item.hotel_receipt_url || item.hotelReceiptUrl || '');
    setFormData({
      voiceName: item.voiceName || '',
      participantName: item.participantName || '',
      whatsapp: item.whatsapp || '',
      rounds: item.rounds !== undefined && item.rounds !== null ? String(item.rounds) : '',
      email: item.email || '',
      dob: item.dob || item.birth_date || '',
      introducedToKcSince: item.introducedToKcSince || item.introduced_to_kc_in || '',
      ashram: item.ashram || 'Student and Not decided',
      parentTemple: item.parentTemple || '',
      counselorName: item.counselor_selection || item.counselorSelection || (item.other_counselor || item.otherCounselor ? 'Other' : (item.counselorName || item.counselor_name || '')),
      otherCounselorName: item.other_counselor || item.otherCounselor || '',
      campTrack: item.campTrack || '',
      firstMealDate: item.firstMealDate || '',
      firstMealType: item.firstMealType || 'Breakfast',
      lastMealDate: item.lastMealDate || '',
      lastMealType: item.lastMealType || 'Dinner',
      dinnerType: item.dinnerType || 'Dinner Meal',
      accommodation: item.accommodation || 'No',
      gender: item.gender || 'Male - Bachelor',
      participantType: item.participantType || 'Camp Participant',
      age: item.age || '',
      marriedSinceYear: item.marriedSinceYear || '',
    });
    setEditIndex(index);
  };

  const handleDeleteEntry = (index: number) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      setEntries((prev) => prev.filter((_, idx) => idx !== index));
      if (editIndex === index) {
        setEditIndex(null);
      }
    }
  };

  // Grand Total Calculation
  const grandTotalBeforeCoupon = useMemo(() => {
    return entries.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  }, [entries]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'PERCENT') {
      return Math.round((grandTotalBeforeCoupon * appliedCoupon.discount_value) / 100);
    } else {
      return Math.min(appliedCoupon.discount_value, grandTotalBeforeCoupon);
    }
  }, [appliedCoupon, grandTotalBeforeCoupon]);

  const grandTotal = Math.max(0, grandTotalBeforeCoupon - discountAmount);

  const surchargePercent = selectedCamp?.payment_config?.surcharge_percent ?? 2.0;
  const surchargeAmount = grandTotal > 0
    ? Math.round((grandTotal * surchargePercent) / 100)
    : 0;

  const onlineTotalWithSurcharge = grandTotal + surchargeAmount;
  const grandTotalWithSurcharge = selectedMethod === 'RAZORPAY' ? onlineTotalWithSurcharge : grandTotal;

  // Apply Coupon Code (Server-side validation for maximum security)
  const [couponValidating, setCouponValidating] = useState(false);
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(null);

    const clean = couponInput.trim().toUpperCase();
    if (!selectedCamp?.id) return;

    setCouponValidating(true);
    try {
      const res = await validateCampCouponAction(selectedCamp.id, clean);
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon as CampCoupon);
        setCouponError(null);
      } else {
        setCouponError(res.error || `Promo code "${clean}" is invalid or expired.`);
      }
    } catch {
      setCouponError('Failed to validate promo code. Please try again.');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Submit Free Registration (Bypasses payment gateway when total is ₹0 via coupon or waiver)
  const submitFreeRegistration = async () => {
    if (entries.length === 0) {
      alert('Please add at least one participant entry before proceeding.');
      return;
    }
    setIsSubmitting(true);
    setPaymentError(null);
    await submitRegistrationsToBackend({
      paymentMethod: appliedCoupon ? 'COUPON' : 'FREE',
      deductionSource: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : 'Complimentary Free Registration',
      couponCode: appliedCoupon?.code
    });
  };

  // Open Payment Modal
  const handleProceedToPayment = () => {
    if (entries.length === 0) {
      alert('Please add at least one participant entry before proceeding.');
      return;
    }
    if (grandTotal === 0) {
      submitFreeRegistration();
      return;
    }
    setSelectedMethod(null);
    setShowPaymentModal(true);
    setPaymentError(null);
  };

  // Razorpay Payment Handler
  const handleRazorpayPayment = async () => {
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      const currentWebsite = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/camp?camp=${selectedCamp?.slug || selectedCamp?.id}`
        : 'https://voicegurukul.com/dashboard/camp';

      const payerName = userData?.name || 'Devotee';
      const payerContact = userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '';
      const payerEmail = user?.email || '';

      const orderRes = await fetch('/api/camps/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: selectedCamp?.id,
          amount: grandTotalWithSurcharge,
          campTitle: selectedCamp?.title,
          payerName: payerName,
          website: currentWebsite,
        }),
      });

      if (!orderRes.ok) {
        const errJson = await orderRes.json();
        throw new Error(errJson.error || 'Failed to create payment order');
      }

      const orderData = await orderRes.json();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'VOICE Gurukul',
        description: `${selectedCamp?.title} Registration (${entries.length} Devotees)`,
        order_id: orderData.id,
        notes: {
          payment_for: selectedCamp?.title || '',
          website: currentWebsite,
          payer_name: payerName,
        },
        prefill: {
          name: payerName,
          email: payerEmail,
          contact: payerContact,
        },
        theme: {
          color: '#f59e0b',
        },
        handler: async function (response: any) {
          await submitRegistrationsToBackend({
            paymentMethod: 'RAZORPAY',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setPaymentError(resp.error.description || 'Payment failed');
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Error initializing payment gateway');
      setIsSubmitting(false);
    }
  };

  // IDT Payment Handler
  const submitIdtPayment = async () => {
    if (!idtSource.trim()) {
      setPaymentError('Please enter your VOICE Name or Department from where to deduct Laxmi');
      return;
    }
    if (!idtPasscode.trim()) {
      setPaymentError('Please enter the IDT Authorization Passcode');
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);

    await submitRegistrationsToBackend({
      paymentMethod: 'IDT',
      deductionSource: idtSource.trim(),
      passcode: idtPasscode.trim(),
      paymentStatus: 'processing',
    });
  };

  // ITT Payment Handler
  const submitIttPayment = async () => {
    if (!ittTempleName.trim()) {
      setPaymentError('Please enter your Temple / Center Name.');
      return;
    }
    if (!ittTransactionRef.trim()) {
      setPaymentError('Please enter the Bank Transaction UTR / Reference ID.');
      return;
    }
    if (!ittTransactionDate.trim()) {
      setPaymentError('Please select the Transaction Date.');
      return;
    }
    if (!ittScreenshotFile) {
      setPaymentError('Please upload a screenshot of your bank transfer receipt.');
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);
    setIttUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', ittScreenshotFile);
      uploadFormData.append('campTitle', selectedCamp?.title || 'Camp');
      uploadFormData.append('devoteeName', userData?.name || 'Attendee');

      const uploadRes = await fetch('/api/camps/upload-payment-proof', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.url) {
        throw new Error(uploadJson.error || 'Failed to upload payment proof screenshot');
      }

      setIttUploading(false);

      await submitRegistrationsToBackend({
        paymentMethod: 'INTER_TEMPLE_TRANSFER',
        paymentScreenshotUrl: uploadJson.url,
        payment_screenshot_url: uploadJson.url,
        transactionRef: ittTransactionRef.trim(),
        transaction_ref: ittTransactionRef.trim(),
        transactionDate: ittTransactionDate.trim(),
        transaction_date: ittTransactionDate.trim(),
        deductionSource: ittTempleName.trim(),
      });
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to submit Inter-Temple Transfer');
      setIsSubmitting(false);
      setIttUploading(false);
    }
  };

  // Shared Backend Submission
  const submitRegistrationsToBackend = async (paymentDetails: any) => {
    try {
      const finalPocName = (selectedCamp?.require_poc && pocDetails.pocName.trim())
        ? pocDetails.pocName.trim()
        : (userData?.name || 'Devotee');
      const finalPocContact = (selectedCamp?.require_poc && pocDetails.pocContact)
        ? pocDetails.pocContact.replace(/[^0-9]/g, '').slice(-10)
        : (userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '');

      const payerName = finalPocName;
      const payerContact = finalPocContact;
      const payerEmail = user?.email || '';

      const finalPaidAmount = paymentDetails.paymentMethod === 'RAZORPAY'
        ? onlineTotalWithSurcharge
        : grandTotal;

      const res = await fetch('/api/camps/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: selectedCamp?.id,
          entries,
          pocName: payerName,
          pocContact: payerContact,
          poc_name: payerName,
          poc_contact: payerContact,
          email: payerEmail,
          totalAmount: finalPaidAmount,
          couponCode: appliedCoupon?.code || undefined,
          discountAmount: discountAmount || undefined,
          ...paymentDetails,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Registration failed');
      }

      const finalPaymentStatus = json.paymentStatus || (
        paymentDetails.paymentMethod === 'IDT' ||
        paymentDetails.paymentMethod === 'INTER_TEMPLE_TRANSFER' ||
        paymentDetails.paymentMethod === 'ITT'
          ? 'processing'
          : 'completed'
      );

      setRegistrationSuccess({
        groupId: json.groupId,
        count: json.count,
        totalPaid: finalPaidAmount,
        paymentMethod: paymentDetails.paymentMethod,
        paymentStatus: finalPaymentStatus,
        pocName: payerName,
        pocContact: payerContact,
        email: payerEmail,
        entries,
      });

      setShowPaymentModal(false);
      fetchUserRegistrations(); // refresh passes

      // Clear any saved draft for this camp upon successful completion
      try {
        const callerId = userData?.id || user?.id || '';
        if (selectedCamp?.id) {
          fetch(`/api/camps/draft?campId=${selectedCamp.id}&userId=${callerId}`, { method: 'DELETE' }).catch(() => {});
        }
        setActiveDraft(null);
      } catch (e) {}
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch selected camp inside Cancellation Modal and auto-load active devotees
  const onSelectCampForCancel = (campId: string) => {
    const chosen = cancellationCamps.find(c => c.id === campId || c.slug === campId) ||
      activeCamps.find(c => c.id === campId || c.slug === campId);
    if (chosen) {
      setCancelCamp(chosen);
      setCancelError(null);
      setCancelLookupError(null);
      setCancelDevoteeFilter('');
      // Filter out all already-cancelled records
      const campRegs = userRegistrations.filter(r =>
        (r.camp_id === chosen.id || r.camp_slug === chosen.slug) &&
        !r.is_cancelled &&
        r.payment_status !== 'cancelled' &&
        r.payment_status !== 'refunded'
      );
      setCancelRegs(campRegs);
      setSelectedRegIdsToCancel(campRegs.map(r => r.id!));
    }
  };

  // Open Cancellation Modal (Select camp -> Directly show all active devotees)
  const handleOpenCancelModal = async (reg?: any) => {
    setShowCancelModal(true);
    setCancelError(null);
    setCancelSuccessResult(null);
    setCancelLookupError(null);
    setSelectedDevoteeId('');
    setCancelDevoteeFilter('');
    setShowLookupFallback(false);

    if (reg) {
      if (reg.payment_status !== 'completed') {
        const isIdt = String(reg.payment_method || '').toUpperCase() === 'IDT';
        if (isIdt) {
          setShowCancelModal(false);
          handleOpenDirectIdtCancel(reg);
          return;
        }
        alert('This registration is currently awaiting payment approval (ITT) and has not been confirmed yet. Cancellation and refund requests are only allowed for confirmed registrations.');
        return;
      }

      // Find matching camp in activeCamps or cancellationCamps
      const campMatch = cancellationCamps.find(c => c.id === reg.camp_id || c.slug === reg.camp_slug) ||
        activeCamps.find(c => c.id === reg.camp_id || c.slug === reg.camp_slug) ||
        (selectedCamp?.id === reg.camp_id ? selectedCamp : null) ||
        ({
          id: reg.camp_id,
          slug: reg.camp_slug,
          title: reg.camp_title,
          venue: reg.camp_venue,
          refund_config: reg.camp_refund_config,
          payment_config: reg.camp_payment_config || {
            enable_razorpay: true,
            surcharge_percent: Number((reg as any)?.camp_payment_config?.surcharge_percent || 0),
            enable_idt: false,
            idt_passcodes: []
          },
        } as unknown as Camp);

      setCancelCamp(campMatch);
      // Filter all active (non-cancelled) registrations for this camp
      const campRegs = userRegistrations.filter(r =>
        (r.camp_id === campMatch.id || r.camp_slug === campMatch.slug) &&
        !r.is_cancelled &&
        r.payment_status !== 'cancelled' &&
        r.payment_status !== 'refunded'
      );
      const activeList = campRegs.length > 0 ? campRegs : [reg];
      setCancelRegs(activeList);
      setSelectedRegIdsToCancel([reg.id]);
    } else {
      const defaultCamp = selectedCamp ||
        cancellationCamps.find(c => userRegistrations.some(r => (r.camp_id === c.id || r.camp_slug === c.slug) && !r.is_cancelled && r.payment_status !== 'cancelled')) ||
        (cancellationCamps.length > 0 ? cancellationCamps[0] : null) ||
        (activeCamps.length > 0 ? activeCamps[0] : null);

      if (defaultCamp) {
        setCancelCamp(defaultCamp);
        const campRegs = userRegistrations.filter(r =>
          (r.camp_id === defaultCamp.id || r.camp_slug === defaultCamp.slug) &&
          !r.is_cancelled &&
          r.payment_status !== 'cancelled' &&
          r.payment_status !== 'refunded'
        );
        setCancelRegs(campRegs);
        setSelectedRegIdsToCancel(campRegs.map(r => r.id!));
      } else {
        setCancelRegs([]);
        setSelectedRegIdsToCancel([]);
      }
    }
  };

  const handleLookupForCancel = async (e?: React.FormEvent, overrideCampId?: string, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const phoneDigits = userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '';
    const userEmail = (user?.email || userData?.email || '').trim().toLowerCase();
    
    let queryToUse = '';
    if (overrideQuery) {
      queryToUse = overrideQuery.trim();
    } else if (isManager && cancelDevoteeMode === 'devotee') {
      queryToUse = cancelLookupQuery.trim();
    } else {
      queryToUse = cancelLookupQuery.trim() || phoneDigits || userEmail;
    }

    if (!queryToUse) return;

    const cleanSearchQuery = queryToUse.includes('@')
      ? queryToUse
      : (queryToUse.replace(/[^0-9]/g, '').slice(-10) || queryToUse);

    const targetCamp = overrideCampId
      ? (activeCamps.find(c => c.id === overrideCampId || c.slug === overrideCampId) || cancelCamp)
      : (cancelCamp || selectedCamp || (activeCamps.length > 0 ? activeCamps[0] : null));

    if (!targetCamp) {
      setCancelLookupError('Please select a camp retreat to lookup registrations.');
      return;
    }

    setCancelLookupLoading(true);
    setCancelLookupError(null);
    setSelectedRegIdsToCancel([]);

    try {
      const res = await lookupCampRegistrationsAction(targetCamp.id || targetCamp.slug, cleanSearchQuery, userData?.id);
      if (res.success && res.registrations && res.registrations.length > 0) {
        // Exclude already cancelled registrations
        const activeRegistrations = res.registrations.filter((r: any) =>
          !r.is_cancelled && r.payment_status !== 'cancelled' && r.payment_status !== 'refunded'
        );
        setCancelRegs(activeRegistrations);
        setCancelExistingRefunds(res.existingRefunds || []);
        if (res.camp) setCancelCamp(res.camp);
        const activeIds = activeRegistrations
          .filter((r: any) => r.payment_status === 'completed' || (String(r.payment_method || '').toUpperCase() === 'IDT'))
          .map((r: any) => r.id!);
        setSelectedRegIdsToCancel(activeIds);
      } else {
        setCancelLookupError(res.error || 'No active registrations found matching this search in your assigned temple or center.');
      }
    } catch (err: any) {
      setCancelLookupError(err.message || 'Error occurred while looking up booking.');
    } finally {
      setCancelLookupLoading(false);
    }
  };

  const computeLiveRefund = () => {
    const campFeePercent = Number(
      cancelCamp?.payment_config?.surcharge_percent ??
      (cancelCamp as any)?.online_payment_surcharge_percent ??
      0
    );

    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !cancelCamp) {
      return {
        totalRefund: 0,
        baseRefund: 0,
        mealRefund: 0,
        accRefund: 0,
        originalTotal: 0,
        totalPaidAtCheckout: 0,
        tierLabel: 'No Devotees Selected',
        baseRefundPercent: 100,
        surchargePercent: campFeePercent,
        gatewayFee: 0,
        totalLateFee: 0,
        cancellationFee: 0,
        reasonExplanation: 'Please select at least one active devotee to cancel.'
      };
    }

    const selectedRegs = cancelRegs.filter(r => selectedRegIdsToCancel.includes(r.id!));
    const refundConfig = cancelCamp.refund_config || {
      enable_refunds: true,
      refund_policy_rules: [],
      refund_meals: true,
      refund_accommodation: true
    };

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const rules = refundConfig.refund_policy_rules || [];
    const sortedRules = [...rules].sort((a, b) => {
      if (!a.cutoff_date) return 1;
      if (!b.cutoff_date) return -1;
      return a.cutoff_date.localeCompare(b.cutoff_date);
    });

    let matchedTier = sortedRules.find(r => r.cutoff_date && todayStr <= r.cutoff_date);
    if (!matchedTier && sortedRules.length > 0) {
      matchedTier = sortedRules.find(r => !r.cutoff_date) || sortedRules[sortedRules.length - 1];
    }

    const baseRefundPercent = matchedTier ? Number(matchedTier.refund_percent) : (sortedRules.length > 0 ? 0 : 100);
    const tierLabel = matchedTier
      ? (matchedTier.label || `${baseRefundPercent}% Refund Tier`)
      : (sortedRules.length > 0 ? '0% Refund (Deadline Passed)' : 'Standard Policy (100% Refund)');

    let originalTotal = 0;
    let baseRefund = 0;
    let mealRefund = 0;
    let accRefund = 0;
    let totalLateFee = 0;

    for (const reg of selectedRegs) {
      const orig = Number(reg.total_cost || 0);
      const discount = Number(reg.discount_amount || 0);
      const isFree = ['COUPON', 'ROLE_WAIVER', 'FREE'].includes((reg.payment_method || '').toUpperCase()) || discount >= orig;
      const actualPaid = isFree ? 0 : Math.max(0, orig - discount);
      originalTotal += actualPaid;

      const lateFee = Number(reg.late_fee || 0);
      totalLateFee += lateFee;

      const entryCost = Number(reg.entry_cost || 0);
      const netEntryCost = Math.max(0, entryCost - discount);

      const mealCost = Number(reg.meal_cost || 0);
      const accCost = Number(reg.acc_cost || 0) + Number(reg.ac_cost || 0);

      // Base fee is any net fee excluding meals, stay, and late fee
      const baseCost = Math.max(0, netEntryCost - mealCost - accCost);
      const thisBaseRefund = isFree ? 0 : Math.round(baseCost * (baseRefundPercent / 100));
      baseRefund += thisBaseRefund;

      if (!isFree && refundConfig.refund_meals !== false) {
        mealRefund += Math.round(mealCost * (baseRefundPercent / 100));
      }
      if (!isFree && refundConfig.refund_accommodation !== false) {
        accRefund += Math.round(accCost * (baseRefundPercent / 100));
      }
    }

    const isAllTransferOrFree = selectedRegs.length > 0 && selectedRegs.every(r => 
      ['INTER_TEMPLE_TRANSFER', 'ITT', 'IDT', 'COUPON', 'ROLE_WAIVER', 'FREE'].includes((r.payment_method || '').toUpperCase())
    );

    const configuredSurcharge = Number(
      cancelCamp?.payment_config?.surcharge_percent ??
      (cancelCamp as any)?.online_payment_surcharge_percent ??
      0
    );

    const surchargePercent = isAllTransferOrFree ? 0 : configuredSurcharge;
    const gatewayFee = Math.round(originalTotal * (surchargePercent / 100));
    const totalPaidAtCheckout = originalTotal + gatewayFee;
    // Late registration fee is strictly non-refundable per camp policy, and refund cannot exceed actual paid
    const maxEligible = Math.max(0, originalTotal - totalLateFee);
    const totalRefund = Math.min(maxEligible, baseRefund + mealRefund + accRefund);
    const cancellationFee = Math.max(0, originalTotal - totalRefund);

    let reasonExplanation = '';
    if (baseRefundPercent === 0) {
      const cutoffInfo = sortedRules.length > 0 && sortedRules[0]?.cutoff_date
        ? `the refund deadline of ${new Date(sortedRules[0].cutoff_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'the camp refund deadline';
      reasonExplanation = `Refund is ₹0 because cancellation is being requested after ${cutoffInfo}. As per camp policy, registrations cancelled after this date are non-refundable.`;
    } else if (baseRefundPercent < 100) {
      const cutoffInfo = matchedTier?.cutoff_date
        ? `before ${new Date(matchedTier.cutoff_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'during the current refund window';
      reasonExplanation = `Under the camp policy for cancellations ${cutoffInfo}, a ${baseRefundPercent}% base fee refund applies (${100 - baseRefundPercent}% retained as cancellation fee).`;
    } else {
      reasonExplanation = `Full refund tier applies. 100% of the base registration fee is eligible for refund.`;
    }

    if (totalLateFee > 0) {
      reasonExplanation = `${reasonExplanation} Note: ₹${totalLateFee} late registration fee is strictly non-refundable.`;
    }

    return {
      totalRefund,
      baseRefund,
      mealRefund,
      accRefund,
      originalTotal,
      totalPaidAtCheckout,
      totalLateFee,
      tierLabel,
      baseRefundPercent,
      surchargePercent,
      gatewayFee,
      cancellationFee,
      reasonExplanation
    };
  };

  const handleOpenDirectIdtCancel = (reg: any) => {
    setPendingIdtCancelTarget(reg);
    setPendingIdtCancelReason('');
  };

  const handleConfirmPendingIdtCancel = async () => {
    if (!pendingIdtCancelTarget?.id) return;
    setIsCancellingPendingIdt(true);
    try {
      const res = await cancelPendingIdtRegistrationAction(
        [pendingIdtCancelTarget.id],
        pendingIdtCancelReason.trim() || undefined,
        userData?.id || user?.id
      );
      if (res.success) {
        toast.success(`Registration for ${pendingIdtCancelTarget.participant_name} cancelled. IDT batch total updated.`);
        setUserRegistrations(prev =>
          prev.map(r => r.id === pendingIdtCancelTarget.id ? { ...r, is_cancelled: true, payment_status: 'cancelled', cancellation_reason: pendingIdtCancelReason.trim() } : r)
        );
        setPendingIdtCancelTarget(null);
        fetchUserRegistrations();
      } else {
        toast.error(res.error || 'Failed to cancel registration');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while cancelling');
    } finally {
      setIsCancellingPendingIdt(false);
    }
  };

  // Handle Cancellation Submission
  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !cancelCamp) return;

    const selectedRegs = cancelRegs.filter(r => selectedRegIdsToCancel.includes(r.id!));
    const isAllPendingIdt = selectedRegs.length > 0 && selectedRegs.every(r => (r.payment_method || '').toUpperCase() === 'IDT' && r.payment_status !== 'completed');

    if (isAllPendingIdt) {
      setCancelSubmitting(true);
      setCancelError(null);
      try {
        const finalReason = cancelReason === 'Other' ? (cancelReasonCustom.trim() || 'Other') : cancelReason;
        const res = await cancelPendingIdtRegistrationAction(selectedRegIdsToCancel, finalReason, userData?.id || user?.id);
        if (res.success) {
          toast.success(`Successfully cancelled ${selectedRegIdsToCancel.length} devotee(s) from pending IDT batch.`);
          setUserRegistrations(prev =>
            prev.map(r => selectedRegIdsToCancel.includes(r.id!) ? { ...r, is_cancelled: true, payment_status: 'cancelled', cancellation_reason: finalReason } : r)
          );
          setShowCancelModal(false);
          fetchUserRegistrations();
        } else {
          setCancelError(res.error || 'Failed to cancel registration');
        }
      } catch (err: any) {
        setCancelError(err.message || 'Error occurred while cancelling');
      } finally {
        setCancelSubmitting(false);
      }
      return;
    }

    if (cancelPayoutType === 'UPI') {
      if (!cancelUpiId.trim()) {
        setCancelError('Please enter your UPI ID for refund payout.');
        return;
      }
    } else {
      if (!cancelAccountNumber.trim()) {
        setCancelError('Please enter your bank account number.');
        return;
      }
      if (cancelAccountNumber.trim() !== cancelConfirmAccount.trim()) {
        setCancelError('Account numbers do not match. Please verify.');
        return;
      }
      if (!cancelIfscCode.trim()) {
        setCancelError('Please enter your bank IFSC code.');
        return;
      }
      if (!cancelAccountName.trim()) {
        setCancelError('Please enter the account holder name.');
        return;
      }
    }

    setCancelSubmitting(true);
    setCancelError(null);

    try {
      const primaryReg = cancelRegs[0];
      const cancellationType = selectedRegIdsToCancel.length === cancelRegs.length ? 'FULL' : 'PARTIAL_ATTENDEES';
      const finalReason = cancelReason === 'Other' ? (cancelReasonCustom.trim() || 'Other') : cancelReason;

      const res = await submitCampRefundRequestAction({
        campId: cancelCamp.id,
        poc_name: primaryReg.poc_name || userData?.name || 'Devotee',
        poc_contact: primaryReg.poc_contact || userData?.phone || '',
        email: primaryReg.email || user?.email || '',
        cancellation_type: cancellationType,
        cancelled_reg_ids: selectedRegIdsToCancel,
        payout_type: cancelPayoutType,
        upi_id: cancelUpiId.trim(),
        account_name: cancelAccountName.trim(),
        account_number: cancelAccountNumber.trim(),
        bank_name: cancelBankName.trim(),
        ifsc_code: cancelIfscCode.trim().toUpperCase(),
        reason: finalReason,
      }, userData?.id);

      if (res.success && res.refundRequest) {
        setCancelSuccessResult({
          refundRequest: res.refundRequest,
          refundAmount: res.refundAmount,
          breakdown: res.breakdown,
        });
        setUserRegistrations(prev =>
          prev.map(r => selectedRegIdsToCancel.includes(r.id!) ? { ...r, is_cancelled: true, payment_status: 'cancelled', cancellation_reason: finalReason } : r)
        );
        if (res.refundRequest) {
          setUserRefunds(prev => [res.refundRequest, ...prev.filter(x => x.id !== res.refundRequest.id)]);
        }
        fetchUserRegistrations(); // refresh passes
      } else {
        setCancelError(res.error || 'Failed to submit cancellation request.');
      }
    } catch (err: any) {
      setCancelError(err.message || 'Error occurred while submitting request.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedBankField(fieldName);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const effectiveCenter = (
    managerAssignedCenter ||
    formData.voiceName ||
    userData?.hierarchy?.currentCenter ||
    userData?.hierarchy?.center ||
    (userData as any)?.center ||
    'Central VOICE'
  ).trim();

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 pb-20 sm:pb-10">
        {/* Header Greeting Banner - Compact Devotional Purple Theme */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 rounded-xl sm:rounded-2xl text-white shadow-lg relative overflow-hidden transition-all p-3 sm:p-4 md:p-4.5 border border-purple-500/30">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-purple-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -top-12 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/25 backdrop-blur-md text-purple-200 text-[9.5px] sm:text-[10px] font-bold mb-1 border border-purple-400/40 shadow-xs">
                <Tent className="w-3 h-3 text-purple-300" />
                <span>{activeTab === 'register' ? 'Camp Registration' : 'Devotee Camp Portal'}</span>
              </div>
              <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight leading-tight text-white font-display">
                {activeTab === 'register' && selectedCamp ? selectedCamp.title : 'Camp Retreats & Registrations'}
              </h1>
              <p className="text-purple-100/90 text-[10.5px] sm:text-xs mt-0.5 max-w-lg line-clamp-1 font-medium">
                Hare Krishna, <span className="font-bold text-purple-200 underline decoration-purple-400/60">{userData?.name || user?.email}</span>! Explore youth camps, register passes, and manage your booked retreats.
              </p>

              {allocatedCamps.length > 0 && (
                <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-200 text-[9.5px] sm:text-[10px] font-bold border border-purple-500/40 shadow-xs">
                    <Shield className="w-3 h-3 text-purple-300 shrink-0" />
                    <span>Delegated Staff ({allocatedCamps.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('staff');
                      setSelectedCamp(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-black shadow-md shadow-emerald-950/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Open Staff Desk &rarr;</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Profile Pill: Compact on all devices */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/15 text-[10px] sm:text-[11px] flex flex-wrap md:flex-col items-center md:items-start gap-x-3 gap-y-0.5 w-full md:w-auto shrink-0 p-2 sm:p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-white">
                <UserCheck className="w-3 h-3 text-purple-300 shrink-0" />
                <span className="font-bold text-white truncate">{userData?.name || 'Devotee'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-100/80">
                <Phone className="w-3 h-3 text-purple-300 shrink-0" />
                <span className="truncate font-medium">{userData?.phone || 'No phone set'}</span>
              </div>
              {userData?.hierarchy?.center && (
                <div className="flex items-center gap-1.5 text-purple-100/80">
                  <Building className="w-3 h-3 text-purple-300 shrink-0" />
                  <span className="truncate font-medium">{userData.hierarchy.center}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informative Notice for Pending Users */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold text-amber-950">Notice for Devotees: </span>
              Your general account approval is currently under review by temple administrators, but your <strong>Camps &amp; Retreats access is fully active</strong>. You can register for all active camps, book group passes, and review bookings seamlessly.
            </div>
          </div>
        )}

        {/* Tab Navigation: Compact & Responsive for Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-gray-200 pb-2.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('camps');
              setSelectedCamp(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'camps'
                ? 'bg-gradient-to-r from-purple-700 via-violet-800 to-purple-900 text-white shadow-md border border-purple-600/60'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Tent className="w-3.5 h-3.5 shrink-0" />
            <span>Active Camps</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'camps' ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-2xs' : 'bg-slate-100 text-slate-600'
            }`}>
              {visibleActiveCamps.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('registrations');
              setSelectedCamp(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'registrations'
                ? 'bg-gradient-to-r from-purple-700 via-violet-800 to-purple-900 text-white shadow-md border border-purple-600/60'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">My Bookings &amp; Passes</span>
            <span className="sm:hidden">My Passes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'registrations' ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-2xs' : 'bg-slate-100 text-slate-600'
            }`}>
              {userRegistrations.length}
            </span>
          </button>

          {allocatedCamps.length > 0 && (
            <button
              onClick={() => {
                setActiveTab('staff');
                setSelectedCamp(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 ring-1 ring-emerald-400/50'
                  : 'bg-purple-50 text-purple-950 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Staff &amp; Coordinator Duty</span>
              <span className="sm:hidden">Staff Duty</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'staff' ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950' : 'bg-emerald-100 text-emerald-950'
              }`}>
                {allocatedCamps.length}
              </span>
            </button>
          )}

          {selectedCamp && (
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-purple-700 via-violet-800 to-purple-900 text-white shadow-md border border-purple-600/60'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Registering: {selectedCamp.title.slice(0, 18)}...</span>
            </button>
          )}
        </div>

        {/* TAB 1: ACTIVE CAMPS GRID */}
        {activeTab === 'camps' && (
          <div className="space-y-6">
            {campsLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Loading active camps...</p>
              </div>
            ) : campsError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 text-sm">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p>{campsError}</p>
                <button
                  onClick={fetchActiveCamps}
                  className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : visibleActiveCamps.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <Tent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">No Active Camps for Your Center</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  There are currently no active retreats available for your assigned center. Open retreats will appear here once announced.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleActiveCamps.map((camp) => {
                  const deadlinePassed = camp.registration_deadline && new Date() > new Date(camp.registration_deadline);
                  const notStarted = camp.registration_start_date && new Date() < new Date(camp.registration_start_date);
                  const posterUrl = getThumbnailUrl(camp.poster_url) || camp.poster_url;

                  return (
                    <div
                      key={camp.id}
                      className="group bg-white rounded-2xl border border-purple-200/80 shadow-xs hover:border-purple-400 hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Camp Poster Header */}
                        <div className="relative h-40 sm:h-44 md:h-48 w-full overflow-hidden bg-slate-900">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={camp.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-700 via-violet-800 to-indigo-900 flex flex-col justify-end p-4 relative">
                              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
                              <div className="z-10">
                                <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md">
                                  {camp.title}
                                </h3>
                              </div>
                            </div>
                          )}

                          {/* Gradient Overlay for Readable Text if poster exists */}
                          {posterUrl && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-3.5 sm:p-4 text-white">
                              <div>
                                <h3 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-md line-clamp-2">
                                  {camp.title}
                                </h3>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Camp Body Details */}
                        <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs text-gray-600">
                          {/* Colorful Welcome / Announcement Tagline if available */}
                          {camp.banner_message && (
                            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 text-purple-950 text-[11px] sm:text-xs font-semibold leading-relaxed shadow-2xs">
                              <span className="font-bold text-purple-800">📣 Notice: </span>
                              <span className="line-clamp-2 inline">{camp.banner_message}</span>
                            </div>
                          )}

                          {/* Camp Description Snippet */}
                          {camp.description && (
                            <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 leading-relaxed font-normal">
                              {camp.description}
                            </p>
                          )}

                          {/* Dates */}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                            <p className="font-semibold text-gray-900 text-xs">
                              {new Date(camp.start_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              {' - '}
                              {new Date(camp.end_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>

                          {/* Venue */}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                            <p className="font-medium text-gray-800 text-xs line-clamp-1">{camp.venue || 'Central VOICE, Pune'}</p>
                          </div>

                          {/* Camps */}
                          {camp.tracks && camp.tracks.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Tent className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {camp.tracks.map((t) => {
                                  const tPalette = getTrackColorPalette(t);
                                  return (
                                    <span
                                      key={t}
                                      className={`px-2 py-0.5 rounded-md ${tPalette.badgeBg} text-[10px] font-bold inline-flex items-center gap-1`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${tPalette.dotColor}`} />
                                      <span>{t}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Base Fee & Registration Deadline Side-by-Side */}
                          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400 block text-[9.5px] uppercase font-bold tracking-wider">Base Fee</span>
                              <span className="text-xs sm:text-sm font-black text-purple-800">
                                {Number(camp.special_waivers?.base_registration_fee) > 0 ? `₹${Number(camp.special_waivers?.base_registration_fee).toLocaleString('en-IN')}` : 'Included in meals'}
                              </span>
                            </div>

                            {camp.registration_deadline && (
                              <div className="text-right">
                                <span className="text-gray-400 block text-[9.5px] uppercase font-bold tracking-wider">Deadline</span>
                                <span className={`text-xs font-bold ${deadlinePassed ? 'text-red-600' : 'text-gray-800'}`}>
                                  {new Date(camp.registration_deadline).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Camp POC Contact Details for Connect */}
                          {(camp.default_poc_name || camp.default_poc_contact) && (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-amber-50/95 via-orange-50/80 to-amber-50/95 border border-amber-200/90 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="min-w-0">
                                  <span className="text-[9.5px] uppercase font-black text-amber-900 tracking-wider flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Camp POC:</span>
                                  </span>
                                  <div className="font-extrabold text-slate-900 text-[11px] sm:text-xs truncate">
                                    {camp.default_poc_name || 'Camp Coordinator'}
                                  </div>
                                  {camp.default_poc_contact && (
                                    <div className="text-[10px] sm:text-[10.5px] font-mono font-semibold text-slate-600 truncate">
                                      {camp.default_poc_contact}
                                    </div>
                                  )}
                                </div>
                                {camp.default_poc_contact && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                      href={`tel:${camp.default_poc_contact.replace(/[^0-9+]/g, '')}`}
                                      className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all flex items-center gap-1 text-[10.5px] font-bold cursor-pointer"
                                      title={`Call ${camp.default_poc_name || 'Camp POC'}`}
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>Call</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/91${camp.default_poc_contact.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hare Krishna! Regarding ${camp.title} Camp Registration:`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-800 border border-emerald-300 shadow-2xs transition-all flex items-center gap-1 text-[10.5px] font-bold cursor-pointer"
                                      title="WhatsApp Camp POC"
                                    >
                                      <MessageCircle className="w-3 h-3 text-emerald-700" />
                                      <span>Chat</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions: Explore Overview Modal + Direct Register */}
                      <div className="p-3.5 sm:p-4 pt-0 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewCamp(camp)}
                            className="py-2.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Explore Camp</span>
                          </button>

                          {deadlinePassed ? (
                            <div className="py-2.5 px-2 bg-gray-100 text-gray-500 rounded-xl text-center font-bold text-xs flex items-center justify-center">
                              Closed
                            </div>
                          ) : notStarted ? (
                            <div className="py-2.5 px-2 bg-gray-100 text-gray-500 rounded-xl text-center font-bold text-[10px] flex items-center justify-center">
                              Opens Soon
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectCampForRegistration(camp)}
                              className="py-2.5 px-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-center font-black text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02]"
                            >
                              <span>Register</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY BOOKINGS & PASSES */}
        {activeTab === 'registrations' && (
          <div className="space-y-3 sm:space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-base font-bold text-gray-900 truncate">
                  {isManager ? 'Camp Bookings & Devotee Passes' : 'My Registered Camp Passes'}
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                  {isManager 
                    ? `Showing personal and center devotee passes.`
                    : `Passes registered under ${userData?.phone || user?.email}`
                  }
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenCancelModal()}
                  className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] sm:text-xs font-semibold cursor-pointer transition-all"
                >
                  <Undo2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Manage / Cancel</span>
                  <span className="sm:hidden">Manage</span>
                </button>
                <button
                  onClick={fetchUserRegistrations}
                  disabled={regsLoading}
                  className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                  title="Refresh Passes"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${regsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Pass Filters & Search Toolbar - Compact on Mobile */}
            {userRegistrations.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                {/* Main Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5 bg-slate-50/90 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200/80">
                  {/* Left: Filter Tabs or Devotee Passes counter badge */}
                  {isManager && assignedPassesCount > 0 ? (
                    <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg sm:rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar shrink-0">
                      <button
                        type="button"
                        onClick={() => setPassViewFilter('all')}
                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          passViewFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Passes ({userRegistrations.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassViewFilter('mine')}
                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          passViewFilter === 'mine'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        My Passes ({myPassesCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassViewFilter('assigned')}
                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          passViewFilter === 'assigned'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="sm:hidden">Assigned ({assignedPassesCount})</span>
                        <span className="hidden sm:inline">Assigned Center Passes ({assignedPassesCount})</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-1 text-slate-700">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] sm:text-xs font-bold block text-slate-800">
                          {userRegistrations.length} Devotee {userRegistrations.length === 1 ? 'Pass' : 'Passes'}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block -mt-0.5">
                          Active registered bookings
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Right Side: Search Input */}
                  <div className="relative w-full sm:w-64 md:w-72 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      type="text"
                      value={passSearchTerm}
                      onChange={(e) => setPassSearchTerm(e.target.value)}
                      placeholder="Search attendee, mobile..."
                      style={{ paddingLeft: '32px', paddingRight: '30px' }}
                      className="w-full py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
                    />
                    {passSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setPassSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer z-10"
                        title="Clear Search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cascading Dropdowns: 1. Main Camp -> 2. Sub-Camp -> 3. Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* 1. Main Camp Filter Dropdown */}
                    {registeredCampsList.length > 0 && (
                      <div className="relative w-full sm:w-52 md:w-56">
                        <select
                          value={passCampFilter}
                          onChange={(e) => {
                            const newCamp = e.target.value;
                            setPassCampFilter(newCamp);
                            // Cascading reset: If current subcamp doesn't exist in the selected main camp, reset to all
                            if (passSubcampFilter !== 'all') {
                              const validTracks = scopedRegistrations
                                .filter((r) => newCamp === 'all' || (r.camp_id || r.camp_title) === newCamp)
                                .map((r) => (r.camp_track || 'General Attendee').trim().toLowerCase());
                              if (!validTracks.includes(passSubcampFilter.toLowerCase())) {
                                setPassSubcampFilter('all');
                              }
                            }
                          }}
                          className="w-full appearance-none pl-8 pr-8 py-1.5 sm:py-2 bg-white border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs cursor-pointer transition-all"
                        >
                          <option value="all">🏕️ All Main Camps ({scopedRegistrations.length})</option>
                          {registeredCampsList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title} ({c.count})
                            </option>
                          ))}
                        </select>
                        <Filter className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}

                    {/* 2. Sub-Camp / Track Filter Dropdown (Cascades based on Main Camp) */}
                    <div className="relative w-full sm:w-56 md:w-60">
                      <select
                        value={passSubcampFilter}
                        onChange={(e) => setPassSubcampFilter(e.target.value)}
                        className="w-full appearance-none pl-8 pr-8 py-1.5 sm:py-2 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer transition-all"
                      >
                        <option value="all">🎯 All Sub-Camps ({registeredTracksList.reduce((acc, t) => acc + t.count, 0)})</option>
                        {registeredTracksList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.count})
                          </option>
                        ))}
                      </select>
                      <Tag className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* 3. Status Filter Dropdown (Cascades based on Main Camp & Sub-Camp) */}
                    <div className="relative w-full sm:w-44 md:w-48">
                      <select
                        value={passStatusFilter}
                        onChange={(e) => setPassStatusFilter(e.target.value as 'all' | 'confirmed' | 'waiting_list' | 'pending' | 'cancelled')}
                        className="w-full appearance-none pl-8 pr-8 py-1.5 sm:py-2 bg-white border border-slate-200 hover:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer transition-all"
                      >
                        <option value="all">📋 All Statuses ({passStatusCounts.all})</option>
                        <option value="confirmed">🟢 Confirmed ({passStatusCounts.confirmed})</option>
                        <option value="waiting_list">🟣 Waiting List ({passStatusCounts.waiting_list})</option>
                        <option value="pending">🟡 Pending ({passStatusCounts.pending})</option>
                        <option value="cancelled">🔴 Cancelled ({passStatusCounts.cancelled})</option>
                      </select>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* 4. Quick Reset if any filter or search query is active */}
                    {(passCampFilter !== 'all' || passSubcampFilter !== 'all' || passStatusFilter !== 'all' || passSearchTerm) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPassCampFilter('all');
                          setPassSubcampFilter('all');
                          setPassStatusFilter('all');
                          setPassSearchTerm('');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        title="Reset all filters"
                      >
                        <X className="w-3 h-3" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Filter Active Match Info Banner */}
            {(passSearchTerm || passStatusFilter !== 'all' || passCampFilter !== 'all' || passSubcampFilter !== 'all') && (
              <div className="flex items-center justify-between text-xs text-slate-600 px-3 py-1.5 bg-purple-50/70 border border-purple-200/70 rounded-xl">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>
                    Showing <strong className="text-slate-900">{displayedRegistrations.length}</strong> matching {displayedRegistrations.length === 1 ? 'pass' : 'passes'}
                  </span>
                  {passStatusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200 uppercase">
                      Status: {passStatusFilter}
                    </span>
                  )}
                  {passSubcampFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                      Camp: {passSubcampFilter}
                    </span>
                  )}
                  {passCampFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200">
                      Camp: {registeredCampsList.find(c => c.id === passCampFilter)?.title || passCampFilter}
                    </span>
                  )}
                  {passSearchTerm && (
                    <span>
                      for &quot;<strong className="text-purple-900">{passSearchTerm}</strong>&quot;
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPassSearchTerm('');
                    setPassStatusFilter('all');
                    setPassCampFilter('all');
                    setPassSubcampFilter('all');
                  }}
                  className="text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer text-xs shrink-0 ml-2"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {regsLoading ? (
              <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200">
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 animate-spin mx-auto mb-2.5 sm:mb-3" />
                <p className="text-xs sm:text-sm font-semibold text-gray-700">Loading your passes...</p>
              </div>
            ) : displayedRegistrations.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200">
                <Ticket className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2.5 sm:mb-3" />
                <h3 className="text-sm sm:text-base font-bold text-gray-800">
                  {passSearchTerm || passStatusFilter !== 'all' || passSubcampFilter !== 'all' || passCampFilter !== 'all'
                    ? 'No Matching Passes Found'
                    : 'No Registrations Found'}
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {passSearchTerm || passStatusFilter !== 'all' || passSubcampFilter !== 'all' || passCampFilter !== 'all' ? (
                    'No devotee passes match the selected filters. Try clearing your filters or search query.'
                  ) : passViewFilter === 'assigned' ? (
                    'No devotee passes found for your assigned temple or centers yet.'
                  ) : (
                    "You haven't registered for any camps yet. Browse active camps and book your retreat spot!"
                  )}
                </p>
                {(passSearchTerm || passStatusFilter !== 'all' || passSubcampFilter !== 'all' || passCampFilter !== 'all') ? (
                  <button
                    onClick={() => {
                      setPassSearchTerm('');
                      setPassStatusFilter('all');
                      setPassCampFilter('all');
                      setPassSubcampFilter('all');
                    }}
                    className="mt-3.5 sm:mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : passViewFilter !== 'assigned' && (
                  <button
                    onClick={() => setActiveTab('camps')}
                    className="mt-3.5 sm:mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                  >
                    Browse Active Camps
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5 sm:gap-4">
                {displayedRegistrations.map((reg) => {
                  const refund = userRefunds.find(
                    (ref) => ref.registration_id === reg.id ||
                             ref.group_id === reg.group_id ||
                             (Array.isArray(ref.cancelled_registrations) && ref.cancelled_registrations.some((cr: any) => cr.reg_id === reg.id))
                  );
                  const paymentStatus = String(reg.payment_status || '').toLowerCase();
                  const isWaitingList = Boolean(reg.is_waiting_list || paymentStatus === 'waiting_list');
                  const isCompleted = !isWaitingList && (['completed', 'free', 'role_waiver'].includes(paymentStatus) || String((reg as any).payment_method || '').toUpperCase() === 'FREE');
                  const isCancelled = Boolean(reg.is_cancelled || paymentStatus === 'refunded' || paymentStatus === 'cancelled' || refund?.status === 'refunded');
                  const isPendingRefund = Boolean(refund?.status === 'pending');
                  const isPendingApproval = !isCompleted && !isCancelled && !isWaitingList;
                  const tokenNumber = (reg as any).serial_no || (reg as any).token_no || 1;

                  // Dynamic Theme: Cancelled -> Light Red / Off-Red; Waiting List -> Royal Purple; Pending -> Warm Amber/Yellow; Confirmed -> Subcamp
                  const theme = getPassDynamicTheme(
                    reg,
                    isCancelled,
                    isPendingApproval || isPendingRefund,
                    registeredTracksList,
                    registeredCampsList,
                    isWaitingList
                  );

                  return (
                    <div
                      key={reg.id}
                      className={`group rounded-xl sm:rounded-2xl border ${theme.cardBorder} ${theme.cardBg} shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col sm:flex-row items-stretch`}
                    >
                      {/* Left Ticket Stub Section with dynamic color gradient - Compact on mobile */}
                      <div className={`${theme.stubGradient} text-white px-2.5 py-2 sm:p-3.5 flex sm:flex-col items-center justify-between sm:justify-center text-center sm:w-28 md:w-30 shrink-0 relative overflow-hidden border-b sm:border-b-0 sm:border-r ${theme.stubBorder}`}>
                        <div className={`absolute -left-6 -top-6 w-20 h-20 ${theme.stubGlow} rounded-full blur-xl pointer-events-none`} />
                        <div className="flex sm:flex-col items-center gap-1.5 sm:gap-2 z-10">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${theme.stubIconBg} backdrop-blur-md flex items-center justify-center font-bold`}>
                            {isCancelled ? (
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
                            ) : isPendingApproval || isPendingRefund ? (
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
                            ) : (
                              <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </div>
                          <div className="text-left sm:text-center">
                            <span className="block text-[8px] sm:text-[9px] uppercase tracking-wider sm:tracking-widest text-white/80 font-bold leading-none">Pass ID</span>
                            <span className="font-mono font-black text-xs sm:text-sm text-white leading-tight">#T-{tokenNumber}</span>
                          </div>
                        </div>

                        <div className="z-10 mt-0 sm:mt-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full ${theme.stubTag} backdrop-blur-md text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider`}>
                            {reg.camp_track || 'Attendee'}
                          </span>
                        </div>
                      </div>

                      {/* Main Ticket Information - Compact on mobile */}
                      <div className="p-2.5 sm:p-3.5 flex-1 min-w-0 flex flex-col justify-between space-y-1.5 sm:space-y-2">
                        <div>
                          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs sm:text-base font-black text-gray-900 leading-snug line-clamp-1">
                                {reg.camp_title}
                              </h3>
                              <p className={`text-[11px] sm:text-xs ${theme.textAccent} font-bold flex items-center gap-1 mt-0.5`}>
                                <User className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${theme.iconAccent} shrink-0`} />
                                <span className="truncate">{reg.participant_name}</span>
                              </p>
                            </div>

                            {/* Status Pill */}
                            <div className="shrink-0">
                              {refund?.status === 'refunded' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  {Number(refund.refund_amount) > 0 ? `Refunded (₹${Number(refund.refund_amount).toLocaleString('en-IN')})` : 'Cancelled'}
                                </span>
                              ) : (isPendingRefund || refund?.status === 'pending') ? (
                                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  Under Review
                                </span>
                              ) : isCancelled ? (
                                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  Cancelled
                                </span>
                              ) : isWaitingList ? (
                                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-700" />
                                  Waiting List
                                </span>
                              ) : isCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                                  Confirmed Pass
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600" />
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick 1-line Date & Venue info */}
                          <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] sm:text-xs text-gray-600">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${theme.iconAccent} shrink-0`} />
                              <span>{reg.camp_start_date ? new Date(reg.camp_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Dates TBA'}</span>
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${theme.iconAccent} shrink-0`} />
                              <span className="truncate max-w-[140px] sm:max-w-[160px]">{reg.camp_venue || 'Central VOICE'}</span>
                            </span>
                            {reg.accommodation === 'Yes' && (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] sm:text-[9.5px] font-bold">
                                Stay Included
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions: Digital Pass View, Amount & Refund View */}
                        <div className="pt-1.5 sm:pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-gray-400 block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider leading-none">Paid Amount</span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className={`font-black ${theme.paidAccent} text-xs sm:text-sm leading-tight`}>
                                ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                              </span>
                              {Number(reg.late_fee || 0) > 0 && (
                                <span className="text-[8px] sm:text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap" title={`Includes ₹${reg.late_fee} Late Fee (Non-refundable)`}>
                                  ₹{reg.late_fee} Late Fee
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isWaitingList && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => setViewTicketReg({
                                  ...reg,
                                  center: (reg.voice_name && !['none', 'null', 'undefined', 'n/a', '-'].includes(reg.voice_name.toLowerCase()))
                                    ? reg.voice_name
                                    : (userData?.hierarchy?.center || (userData as any)?.center || '')
                                })}
                                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-md hover:shadow-lg"
                              >
                                <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>Waiting List Pass</span>
                              </button>
                            )}
                            {isCompleted && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => setViewTicketReg({
                                  ...reg,
                                  center: (reg.voice_name && !['none', 'null', 'undefined', 'n/a', '-'].includes(reg.voice_name.toLowerCase()))
                                    ? reg.voice_name
                                    : (userData?.hierarchy?.center || (userData as any)?.center || '')
                                })}
                                className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02]"
                              >
                                <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>View Full Pass</span>
                              </button>
                            )}

                            {/* View Refund Status Button for Cancelled / Refunded Pass */}
                            {isCancelled && (
                              <button
                                type="button"
                                onClick={() => setViewingRefundStatus({ reg, refund })}
                                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
                              >
                                <Receipt className="w-3.5 h-3.5 text-amber-300" />
                                <span>View Refund Status</span>
                              </button>
                            )}

                            {!isCancelled && isCompleted && (!refund || refund.status === 'rejected') && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancelModal(reg)}
                                className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-semibold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs border border-rose-200 transition-all cursor-pointer"
                                title="Manage / Request Cancellation"
                              >
                                <Undo2 className="w-3 h-3 text-rose-500" />
                              </button>
                            )}

                            {!isCancelled && !isCompleted && String(reg.payment_method || '').toUpperCase() === 'IDT' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDirectIdtCancel(reg)}
                                className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs border border-rose-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Cancel registration before IDT transfer is processed"
                              >
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>Cancel (Pre-IDT)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: STAFF & COORDINATOR DUTY */}
        {activeTab === 'staff' && (
          <div className="space-y-3 sm:space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl border border-purple-500/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-2xl font-black tracking-tight text-white leading-tight">
                        Staff &amp; Coordinator Duty
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[10px] sm:text-xs font-bold">
                        {allocatedCamps.length} Active {allocatedCamps.length === 1 ? 'Camp' : 'Camps'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl leading-relaxed">
                      Access your assigned operational desks below to verify attendee passes and manage registrations.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchAllocatedCamps}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs hover:border-white/40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${allocationsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Duties</span>
                </button>
              </div>
            </div>

            {allocationsLoading ? (
              <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-gray-200">
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 animate-spin mx-auto mb-2.5 sm:mb-3" />
                <p className="text-xs sm:text-sm font-semibold text-gray-700">Loading your delegated staff duties...</p>
              </div>
            ) : allocatedCamps.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-gray-200">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2.5 sm:mb-3" />
                <h3 className="text-sm sm:text-base font-bold text-gray-800">No Camp Staff Allocations</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  You are not currently delegated as a staff member or coordinator for any camp. Contact your temple camp administrator or super admin to assign your roles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {allocatedCamps.map((camp) => {
                  const meta = getStaffRoleMeta(camp.user_role, (camp as any).user_roles);
                  return (
                    <div
                      key={camp.id}
                      className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Camp Header */}
                        <div className="bg-slate-900 p-2.5 sm:p-4 text-white flex items-start justify-between gap-2.5 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className={`px-2 py-0.2 sm:px-2.5 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${meta.badgeClass}`}>
                                {meta.pill}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Status: {camp.status?.toUpperCase() || 'ACTIVE'}
                              </span>
                            </div>
                            <h3 className="text-xs sm:text-lg font-black text-white tracking-tight leading-snug">
                              {camp.title}
                            </h3>
                          </div>
                          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                            <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 text-xs text-gray-600">
                          {/* Role Scope Banner */}
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg sm:rounded-xl p-2 sm:p-2.5">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] sm:text-xs mb-0.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{meta.title}</span>
                            </div>
                            <p className="text-[10px] sm:text-[11.5px] text-amber-950 leading-relaxed line-clamp-2 sm:line-clamp-none">
                              {meta.desc}
                            </p>
                            {camp.staff_notes && (
                              <p className="text-[10px] text-amber-800/80 mt-1 pt-1 border-t border-amber-200/60 italic line-clamp-1">
                                Note: &ldquo;{camp.staff_notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Camp Date & Venue */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5 pt-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <p className="font-semibold text-gray-900 text-[11px] sm:text-xs truncate">
                                {new Date(camp.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                {' - '}
                                {new Date(camp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <p className="font-medium text-gray-800 text-[11px] sm:text-xs truncate">{camp.venue || 'Camp Venue'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Tools / Counters: 2-column micro-grid on mobile */}
                      <div className="p-2.5 sm:p-4 pt-0 border-t border-slate-100 bg-slate-50/50 mt-1">
                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 pt-2">
                          Authorized Action Desks:
                        </p>
                        <div className="grid grid-cols-2 gap-1 sm:gap-2">
                          {meta.canScan && (
                            <button
                              onClick={() => {
                                setScannerCampId(camp.id);
                                setScannerCampTitle(camp.title);
                                setIsScannerOpen(true);
                              }}
                              className="col-span-2 sm:col-span-1 py-1.5 sm:py-2 px-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 active:scale-[0.98] text-white font-black rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 shrink-0" />
                              <span>Pass Scanner</span>
                            </button>
                          )}

                          {meta.canAttendance && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations`}
                              className="py-1.5 sm:py-2 px-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs flex items-center justify-center gap-1 border border-slate-300 shadow-2xs transition-all text-center"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">Attendees &amp; Excel</span>
                            </Link>
                          )}

                          {meta.canPaymentApprovals && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations?payment=PROCESSING`}
                              className="py-1.5 sm:py-2 px-2 bg-white hover:bg-teal-50 text-teal-800 font-bold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs flex items-center justify-center gap-1 border border-teal-200 shadow-2xs transition-all text-center"
                            >
                              <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="truncate">Payment Desk</span>
                            </Link>
                          )}

                          {meta.canPrasadam && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations?view=prasadam`}
                              className="py-1.5 sm:py-2 px-2 bg-white hover:bg-orange-50 text-orange-700 font-bold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs flex items-center justify-center gap-1 border border-orange-200 shadow-2xs transition-all text-center"
                            >
                              <Utensils className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span className="truncate">Kitchen Tally</span>
                            </Link>
                          )}

                          {meta.canRefunds && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations?view=refunds`}
                              className="py-1.5 sm:py-2 px-2 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs flex items-center justify-center gap-1 border border-rose-200 shadow-2xs transition-all text-center"
                            >
                              <Undo2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate">Refunds Desk</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REGISTRATION FLOW (Devotee details taken automatically from DB!) */}
        {activeTab === 'register' && selectedCamp && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => {
                setActiveTab('camps');
                setSelectedCamp(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Active Camps</span>
            </button>

            {/* Success View */}
            {registrationSuccess ? (
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200 shadow-xl text-center space-y-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
                  registrationSuccess.paymentStatus === 'processing'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {registrationSuccess.paymentStatus === 'processing' ? (
                    <Clock className="w-10 h-10 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {registrationSuccess.paymentStatus === 'processing'
                      ? 'Camp Registration Submitted - Pending Verification'
                      : 'Camp Registration Confirmed!'}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {registrationSuccess.paymentStatus === 'processing'
                      ? `Hare Krishna! Your transfer request (${registrationSuccess.paymentMethod}) has been recorded under reference: `
                      : 'Hare Krishna! Your registration has been successfully recorded under group reference: '}
                    <span className="font-mono font-bold text-amber-700">{registrationSuccess.groupId}</span>
                  </p>
                  {registrationSuccess.paymentStatus === 'processing' && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs font-semibold max-w-md mx-auto">
                      ⏳ Your transfer is currently being verified by the central administration desk. Your pass will be fully activated upon approval.
                    </div>
                  )}
                </div>

                <div className="max-w-md mx-auto bg-gray-50 rounded-2xl p-5 text-xs text-left space-y-2 border border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Camp:</span>
                    <span className="font-bold text-gray-800">{selectedCamp.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Registered Devotee:</span>
                    <span className="font-bold text-gray-800">{registrationSuccess.pocName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attendees Count:</span>
                    <span className="font-bold text-gray-800">{registrationSuccess.count} Devotee(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="font-black text-amber-700 text-sm">₹{Number(registrationSuccess.totalPaid).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Mode:</span>
                    <span className="font-bold text-gray-800">{registrationSuccess.paymentMethod}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('registrations')}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>View in My Bookings & Passes</span>
                  </button>
                  <button
                    onClick={() => {
                      setRegistrationSuccess(null);
                      setEntries([]);
                      setSelectedCamp(null);
                      setActiveTab('camps');
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50 transition-all"
                  >
                    Browse Other Camps
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 xl:gap-6">
                {/* Left Cols: Profile Card & Attendee Form */}
                <div className="lg:col-span-8 space-y-4 sm:space-y-5">
                  {/* Saved Draft Notification Banner - Compact & Clean */}
                  {activeDraft && (
                    <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-2xs animate-in fade-in">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-amber-200/90 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300">
                          <BookmarkCheck className="w-4 h-4 text-amber-800" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-amber-950 truncate">
                              Saved Draft ({activeDraft.entries?.length || 0} {activeDraft.entries?.length === 1 ? 'Devotee' : 'Devotees'})
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-900 font-extrabold text-[9px] shrink-0 border border-amber-300/80">
                              In Progress
                            </span>
                          </div>
                          <p className="text-[10.5px] text-amber-800/90 leading-tight truncate mt-0.5">
                            Saved on <strong>{formatDisplayDateTime(activeDraft.updated_at)}</strong> • Click Resume to restore
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleDiscardDraft}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={handleResumeDraft}
                          className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Resume Progress</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Toast/Alert for Save Draft Feedback */}
                  {draftToast && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                      draftToast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                    }`}>
                      <div className="flex items-center gap-2">
                        {draftToast.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{draftToast.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftToast(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Center Restriction Warning Banner */}
                  {!isDevoteeEligibleForCamp && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 space-y-2 shadow-xs">
                      <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>Center Restriction: Access Limited</span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Registration for <strong>{selectedCamp.title}</strong> is restricted to devotees belonging to:
                        <span className="font-bold underline ml-1">{(selectedCamp.eligible_centers || []).join(', ')}</span>.
                        Your current center on record is <strong>{userData?.hierarchy?.currentCenter || userData?.hierarchy?.center || 'Unspecified'}</strong>.
                      </p>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Because your center is not in the allowed list, you cannot register for this camp. If your assigned center has changed, please update your profile or reach out to camp coordinators.
                      </p>
                    </div>
                  )}

                  {/* Step 1: Point of Contact (POC) / Devotee Profile */}
                  {selectedCamp.require_poc ? (
                    <div className={`bg-white rounded-xl sm:rounded-2xl border-2 p-3.5 sm:p-5 shadow-xs space-y-3 transition-colors ${
                      pocConfirmed ? 'border-emerald-300 bg-emerald-50/20' : 'border-amber-400 bg-amber-50/30'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start sm:items-center gap-2">
                          <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            pocConfirmed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            1
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                                Point of Contact (POC) Details *
                              </h3>
                              {effectiveCenter && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Center: {effectiveCenter}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] sm:text-[11px] text-slate-600 mt-0.5">
                              {pocConfirmed
                                ? 'POC details confirmed and shared for this center. Devotee registrations will be coordinated through this contact.'
                                : 'Please provide the POC Name & Mobile Number for this camp. Once entered, other managers of this center will not be asked again.'}
                            </p>
                          </div>
                        </div>

                        {pocConfirmed && (
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>POC Confirmed</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPocEditing(!pocEditing);
                                setPocError(null);
                              }}
                              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 cursor-pointer transition-colors"
                            >
                              {pocEditing ? 'Cancel Edit' : 'Edit POC'}
                            </button>
                          </div>
                        )}
                      </div>

                      {pocLoading ? (
                        <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                          <span>Checking center POC details...</span>
                        </div>
                      ) : (!pocConfirmed || pocEditing) ? (
                        <form onSubmit={handleSavePoc} className="pt-2 border-t border-amber-200/60 space-y-3">
                          {pocError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                              <span>{pocError}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                POC Name *
                              </label>
                              <input
                                type="text"
                                required
                                value={pocDetails.pocName}
                                onChange={(e) => setPocDetails({ ...pocDetails, pocName: e.target.value })}
                                placeholder="e.g. HG Devotee Das / Center Manager Name"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold outline-none focus:border-amber-500 shadow-2xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                POC Mobile / WhatsApp Number *
                              </label>
                              <input
                                type="tel"
                                required
                                maxLength={10}
                                value={pocDetails.pocContact}
                                onChange={(e) => setPocDetails({ ...pocDetails, pocContact: e.target.value.replace(/[^0-9]/g, '') })}
                                placeholder="10-digit mobile (e.g. 9876543210)"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-bold outline-none focus:border-amber-500 shadow-2xs"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                            <span className="text-[10.5px] text-slate-500">
                              ℹ️ Shared for {effectiveCenter} center. Accessible by all center coordinators.
                            </span>
                            <button
                              type="submit"
                              disabled={pocSaving}
                              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/25 cursor-pointer disabled:opacity-50 transition-all"
                            >
                              {pocSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>{pocConfirmed ? 'Update POC Contact' : 'Confirm POC & Proceed →'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/90 rounded-xl p-3 border border-emerald-200 text-xs shadow-2xs">
                          <div>
                            <span className="text-slate-400 text-[9.5px] uppercase font-bold tracking-wider block">POC Name</span>
                            <span className="font-extrabold text-slate-900 text-xs truncate block mt-0.5">{pocDetails.pocName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9.5px] uppercase font-bold tracking-wider block">POC Mobile Number</span>
                            <span className="font-mono font-extrabold text-slate-900 text-xs truncate block mt-0.5">{pocDetails.pocContact}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9.5px] uppercase font-bold tracking-wider block">Center Assigned</span>
                            <span className="font-bold text-slate-800 text-xs truncate block mt-0.5">{effectiveCenter}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3 sm:p-4.5 shadow-xs space-y-2 sm:space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0">
                            1
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                            Devotee Profile &amp; POC <span className="text-[10px] sm:text-xs text-gray-400 font-normal hidden sm:inline">(Auto-filled from Database)</span>
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified Profile
                        </span>
                      </div>

                      <p className="text-[10px] sm:text-xs text-gray-500 leading-snug">
                        Your name, contact number, and email are automatically applied to this booking. No manual re-typing required.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-amber-50/60 rounded-xl p-2.5 sm:p-3 border border-amber-200/60 text-xs">
                        <div>
                          <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider block">Payer / Devotee</span>
                          <span className="font-bold text-gray-800 text-[11px] sm:text-xs truncate block mt-0.5">{userData?.name || 'Devotee'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider block">Mobile / WhatsApp</span>
                          <span className="font-bold text-gray-800 text-[11px] sm:text-xs truncate block mt-0.5">{userData?.phone || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider block">Email</span>
                          <span className="font-bold text-gray-800 text-[11px] sm:text-xs truncate block mt-0.5">{user?.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider block">Home Center</span>
                          <span className="font-semibold text-gray-800 text-[11px] sm:text-xs truncate block mt-0.5">{userData?.hierarchy?.center || 'Center Devotee'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Attendee Form */}
                  <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-300/90 p-4 sm:p-6 shadow-md space-y-4 sm:space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs">
                          2
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                          {editIndex !== null
                            ? 'Edit Attendee Details'
                            : isManager
                            ? 'Add Devotees to Batch (Center Manager)'
                            : 'Attendee Details (Self-Registration)'}
                        </h3>
                        {!isManager ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] sm:text-xs border border-blue-200">
                            Self Only
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] sm:text-xs border border-emerald-300/90 shadow-2xs flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Multi-Devotee Allowed</span>
                          </span>
                        )}
                      </div>
                      {editIndex !== null && (
                        <button
                          onClick={() => setEditIndex(null)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    {/* If POC is required on camp but not confirmed yet, gate attendee entry */}
                    {selectedCamp.require_poc && !pocConfirmed ? (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                            <UserCheck className="w-5 h-5 text-amber-800" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs sm:text-sm text-amber-950">
                              POC Contact Details Required First
                            </h4>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                              Please confirm the Point of Contact (POC) details in <strong>Step 1</strong> above to unlock devotee registrations.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : !isManager && entries.length >= 1 && editIndex === null ? (
                      <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900">Your Attendee Registration is Added!</h4>
                            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5">
                              Student accounts register individually for themselves. Review your booking summary on the right and proceed to payment below.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditEntry(0)}
                          className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
                        >
                          Edit Details
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Manager Center Devotee Picker */}
                        {isManager && (
                          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-cyan-50/50 to-emerald-50 border-2 border-teal-300 shadow-xs space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Building className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-xs sm:text-sm text-teal-950 block">
                                    Center Devotee Fast-Select {centerNameFound ? `• ${centerNameFound}` : ''}
                                  </span>
                                  <span className="text-[10px] text-teal-700 font-medium">Quickly register approved devotees from your center</span>
                                </div>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-200/90 text-teal-900 border border-teal-300 shrink-0">
                                  {centerDevotees.length} Devotees
                                </span>
                              </div>

                              <div className="flex items-center bg-white rounded-xl p-1 border-2 border-teal-200 text-xs font-bold shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => setEntryMode('select')}
                                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    entryMode === 'select'
                                      ? 'bg-teal-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Select from Center
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEntryMode('manual');
                                    setSelectedDevoteeId('');
                                    setFormData((prev) => ({
                                      ...prev,
                                      participantName: '',
                                      whatsapp: '',
                                      email: '',
                                      dob: '',
                                      age: '',
                                      introducedToKcSince: '',
                                      counselorName: '',
                                      otherCounselorName: '',
                                      ashram: 'Student and Not decided',
                                      voiceName: managerAssignedCenter || prev.voiceName,
                                      parentTemple: managerAssignedTemple || prev.parentTemple,
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    entryMode === 'manual'
                                      ? 'bg-teal-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Manual Entry
                                </button>
                              </div>
                            </div>

                            {entryMode === 'select' && (
                              <div className="space-y-2 pt-1">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <div className="relative flex-1">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      value={devoteeSearchTerm}
                                      onChange={(e) => setDevoteeSearchTerm(e.target.value)}
                                      placeholder="Search devotee by name, phone..."
                                      className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-teal-300/90 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 shadow-2xs transition-all"
                                    />
                                  </div>
                                  <select
                                    value={selectedDevoteeId}
                                    onChange={(e) => handleSelectDevotee(e.target.value)}
                                    className="flex-1 sm:max-w-xs px-3 py-2 rounded-xl border-2 border-teal-300/90 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 shadow-2xs cursor-pointer transition-all"
                                  >
                                    <option value="">-- Choose Devotee --</option>
                                    {filteredCenterDevotees.map((dev) => {
                                      const regCount = dev.registeredTracks?.length || 0;
                                      return (
                                        <option key={dev.id} value={dev.id}>
                                          {dev.name} • {dev.phone} {regCount > 0 ? `[Reg: ${dev.registeredTracks?.join(', ')}]` : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {selectedDevoteeId && (
                                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Devotee auto-populated! Review track &amp; meals below.</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {entryMode === 'manual' && (
                              <div className="flex items-center gap-2 text-xs font-bold text-teal-950 bg-teal-100/80 px-3.5 py-2 rounded-xl border border-teal-300/80 mt-1">
                                <UserPlus className="w-4 h-4 text-teal-700 shrink-0" />
                                <span>Manual Devotee Mode: Enter devotee profile details below. An approved center devotee account will be created automatically.</span>
                              </div>
                            )}
                          </div>
                        )}

                        <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
                          {isManager && entryMode === 'manual' ? (
                            /* Enhanced Manual Devotee Entry Form (Creates New Approved Account) */
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-amber-50/20 border-2 border-slate-200/90 shadow-2xs space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/90">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                                  <UserPlus className="w-4 h-4 text-teal-600" />
                                  <span>New Devotee Details (Manual Registration)</span>
                                </div>
                                <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100/90 px-2.5 py-0.5 rounded-full border border-teal-300">
                                  Auto-Creates Center Account
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Participant Full Name *</span>
                                  </label>
                                  <input
                                    type="text"
                                    name="participantName"
                                    value={formData.participantName}
                                    onChange={handleFormChange}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Devotee Full Name"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Email Address *</span>
                                    <span className="text-[10px] text-teal-700 font-bold ml-1">(Account creation)</span>
                                  </label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleFormChange}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="devotee@example.com"
                                  />
                                </div>

                                <div>
                                  <PhoneInputWithCountry
                                    label="WhatsApp / Phone"
                                    required
                                    value={formData.whatsapp}
                                    onChange={(fullPhone) => setFormData((p) => ({ ...p, whatsapp: fullPhone }))}
                                    placeholder="e.g. 9876543210"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Date of Birth *</span>
                                    </span>
                                    {formData.age && (
                                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                        Age: {formData.age} yrs
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleFormChange}
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                  />
                                </div>

                                {/* Row 3: Daily Rounds & Camp Track (symmetrical alignment) */}
                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center justify-between gap-1">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="whitespace-nowrap">Daily Rounds <span className="text-amber-600">*</span></span>
                                    </span>
                                    {formData.rounds ? (
                                      <span className="text-[9.5px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300 shrink-0 whitespace-nowrap">
                                        {formData.rounds} {Number(formData.rounds) === 1 ? 'Round' : 'Rounds'}
                                      </span>
                                    ) : null}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="64"
                                    name="rounds"
                                    value={formData.rounds}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="e.g. 16"
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center justify-between gap-1">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <Tent className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="whitespace-nowrap">Camp Track <span className="text-amber-600">*</span></span>
                                    </span>
                                    {selectedCamp.tracks && selectedCamp.tracks.length > availableTracksForDevotee.length && (
                                      <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 shrink-0 whitespace-nowrap">
                                        {availableTracksForDevotee.length}/{selectedCamp.tracks.length} eligible
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    name="campTrack"
                                    value={formData.campTrack}
                                    onChange={handleFormChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                  >
                                    {availableTracksForDevotee.length === 0 ? (
                                      <option value="" disabled>No eligible camps for {formData.rounds || 0} rounds</option>
                                    ) : (
                                      availableTracksForDevotee.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))
                                    )}
                                  </select>
                                </div>

                                {/* Spanning Sub-camps note for manual entry */}
                                <div className="sm:col-span-2 -mt-1 px-3 py-1.5 bg-amber-50/60 border border-amber-200/60 rounded-lg text-[10.5px] text-amber-900 flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Sub-camps with minimum round criteria (e.g. Nistha) appear dynamically based on daily chanting rounds.</span>
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Gender / Category *</span>
                                  </label>
                                  <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleFormChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                  >
                                    <option value="Male - Bachelor">Male - Bachelor</option>
                                    <option value="Male - Married">Male - Married</option>
                                    <option value="Female - Unmarried">Female - Unmarried</option>
                                    <option value="Female - Married">Female - Married</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Participation Role *</span>
                                  </label>
                                  <select
                                    name="participantType"
                                    value={formData.participantType}
                                    onChange={handleFormChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50/30 text-xs font-bold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                  >
                                    {((selectedCamp.participant_types && selectedCamp.participant_types.length > 0)
                                      ? selectedCamp.participant_types
                                      : ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari']
                                    ).map((role) => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Dynamic Role Perk / Waiver Notice for Manual Entry */}
                                {(() => {
                                  const waivers = selectedCamp.special_waivers?.role_waivers || [];
                                  const w = waivers.find((x: any) => x.role.toLowerCase() === formData.participantType.toLowerCase());
                                  if (w) {
                                    const perks: string[] = [];
                                    if (w.fixed_token_fee !== null && w.fixed_token_fee !== undefined) {
                                      if (w.fixed_token_fee === 0) perks.push('100% Complimentary Registration (₹0)');
                                      else perks.push(`Fixed confirmation token fee: ₹${w.fixed_token_fee}`);
                                    } else {
                                      if (w.free_meals && w.free_accommodation) perks.push('Complimentary Meals & Accommodation');
                                      else if (w.free_meals) perks.push('Complimentary Meals (₹0)');
                                      else if (w.free_accommodation) perks.push('Complimentary Stay (₹0)');
                                    }

                                    if (perks.length > 0 || w.notice_message) {
                                      return (
                                        <div className="sm:col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                                          <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                          <div>
                                            <strong className="block text-amber-900 font-bold mb-0.5">
                                              {formData.participantType} Benefit: {perks.join(' • ')}
                                            </strong>
                                            <p className="text-[11px] text-amber-800">
                                              {w.notice_message || `${formData.participantType}s pay a nominal confirmation fee of ₹${w.fixed_token_fee ?? 0} under Donate As You Like.`}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                })()}

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Counselor / Care Giver *</span>
                                  </label>
                                  <SearchableSelect
                                    options={counselorDropdownOptions}
                                    value={formData.counselorName}
                                    valueProperty="name"
                                    showEmail={false}
                                    searchPlaceholder="Search counselor name..."
                                    onChange={(val) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        counselorName: val,
                                        otherCounselorName: val === 'Other' ? prev.otherCounselorName : ''
                                      }));
                                    }}
                                    placeholder="Search & choose counselor..."
                                    triggerClassName="py-2.5 pl-3.5 pr-8 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 shadow-2xs"
                                  />
                                  {formData.counselorName === 'Other' && (
                                    <div className="mt-2 animate-fadeIn">
                                      <label className="block text-amber-800 font-bold text-xs mb-1">
                                        Specify Counselor Name *
                                      </label>
                                      <input
                                        type="text"
                                        name="otherCounselorName"
                                        value={formData.otherCounselorName}
                                        onChange={handleFormChange}
                                        placeholder="Type counselor's full name"
                                        required
                                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/50 text-xs font-semibold text-slate-900 shadow-2xs outline-none focus:ring-4 focus:ring-amber-500/15"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Introduced to KC Since *</span>
                                  </label>
                                  <input
                                    type="date"
                                    name="introducedToKcSince"
                                    value={formData.introducedToKcSince}
                                    onChange={handleFormChange}
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Standard Select from Center / Self-Registration Form */
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-amber-50/20 border-2 border-slate-200/90 shadow-2xs space-y-4">
                              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                                <User className="w-4 h-4 text-amber-600" />
                                <span>Devotee Details</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5 whitespace-nowrap">
                                    <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Participant Full Name <span className="text-amber-600">*</span></span>
                                    {!isManager && (
                                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Your Profile)</span>
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    name="participantName"
                                    value={formData.participantName}
                                    onChange={handleFormChange}
                                    required
                                    readOnly={!isManager}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-xs font-semibold shadow-2xs outline-none transition-all ${
                                      !isManager
                                        ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                                        : 'border-slate-300 bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'
                                    }`}
                                    placeholder="Full Name"
                                  />
                                </div>

                                <div>
                                  <PhoneInputWithCountry
                                    label="WhatsApp Contact"
                                    required
                                    value={formData.whatsapp}
                                    onChange={(fullPhone) => setFormData((p) => ({ ...p, whatsapp: fullPhone }))}
                                    disabled={!isManager}
                                    placeholder="e.g. 9876543210"
                                  />
                                </div>

                                {/* Row 2: Daily Rounds & Camp Track (symmetrical alignment) */}
                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center justify-between gap-1">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="whitespace-nowrap">Daily Rounds <span className="text-amber-600">*</span></span>
                                    </span>
                                    {formData.rounds ? (
                                      <span className="text-[9.5px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300 shrink-0 whitespace-nowrap">
                                        {formData.rounds} {Number(formData.rounds) === 1 ? 'Round' : 'Rounds'}
                                      </span>
                                    ) : null}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="64"
                                    name="rounds"
                                    value={formData.rounds}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="e.g. 16"
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all shadow-2xs"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center justify-between gap-1">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <Tent className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="whitespace-nowrap">Camp Track <span className="text-amber-600">*</span></span>
                                    </span>
                                    {selectedCamp.tracks && selectedCamp.tracks.length > availableTracksForDevotee.length && (
                                      <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 shrink-0 whitespace-nowrap">
                                        {availableTracksForDevotee.length}/{selectedCamp.tracks.length} eligible
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    name="campTrack"
                                    value={formData.campTrack}
                                    onChange={handleFormChange}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-xs font-semibold shadow-2xs outline-none transition-all cursor-pointer ${
                                      isCurrentTrackAlreadyRegistered
                                        ? 'border-amber-400 ring-4 ring-amber-300/30 text-amber-900 bg-amber-50/50'
                                        : 'border-slate-300 bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'
                                    }`}
                                  >
                                    {availableTracksForDevotee.length === 0 ? (
                                      <option value="" disabled>No eligible camps for {formData.rounds || 0} rounds</option>
                                    ) : (
                                      availableTracksForDevotee.map((t) => {
                                        const isTaken = activeRegisteredTracks.includes(t.trim());
                                        return (
                                          <option key={t} value={t} disabled={isTaken} className={isTaken ? 'text-gray-400 bg-gray-50' : ''}>
                                            {t} {isTaken ? '• (Already Registered)' : ''}
                                          </option>
                                        );
                                      })
                                    )}
                                  </select>
                                </div>

                                {/* Spanning Sub-camps note so inputs above are perfectly level */}
                                <div className="sm:col-span-2 -mt-1 px-3 py-1.5 bg-amber-50/60 border border-amber-200/60 rounded-lg text-[10.5px] text-amber-900 flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Sub-camps with minimum round criteria (e.g. Nistha) appear dynamically based on daily chanting rounds.</span>
                                </div>

                                {isCurrentTrackAlreadyRegistered && (
                                  <div className="sm:col-span-2 -mt-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                    <span>
                                      {isManager && selectedDevotee ? selectedDevotee.name : 'You'} already registered for &quot;{formData.campTrack}&quot;. Please select another camp.
                                    </span>
                                  </div>
                                )}

                                {/* Row 3: Gender / Category & Age */}
                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5 whitespace-nowrap">
                                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Gender / Category <span className="text-amber-600">*</span></span>
                                  </label>
                                  <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleFormChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none shadow-2xs transition-all cursor-pointer"
                                  >
                                    <option value="Male - Bachelor">Male - Bachelor</option>
                                    <option value="Male - Married">Male - Married</option>
                                    <option value="Female - Unmarried">Female - Unmarried</option>
                                    <option value="Female - Married">Female - Married</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5 whitespace-nowrap">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Age (Years) <span className="text-amber-600">*</span></span>
                                  </label>
                                  <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleFormChange}
                                    required
                                    min={5}
                                    max={100}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none shadow-2xs transition-all"
                                    placeholder="Age in years"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-slate-700 font-bold text-xs mb-1 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Participation Role *</span>
                                  </label>
                                  <select
                                    name="participantType"
                                    value={formData.participantType}
                                    onChange={handleFormChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50/30 text-slate-900 text-xs font-bold hover:border-amber-500 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none shadow-2xs transition-all cursor-pointer"
                                  >
                                    {((selectedCamp.participant_types && selectedCamp.participant_types.length > 0)
                                      ? selectedCamp.participant_types
                                      : ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari']
                                    ).map((role) => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Dynamic Role Perk / Waiver Notice */}
                                {(() => {
                                  const waivers = selectedCamp.special_waivers?.role_waivers || [];
                                  const w = waivers.find((x: any) => x.role.toLowerCase() === formData.participantType.toLowerCase());
                                  if (w) {
                                    const perks: string[] = [];
                                    if (w.fixed_token_fee !== null && w.fixed_token_fee !== undefined) {
                                      if (w.fixed_token_fee === 0) perks.push('100% Complimentary Registration (₹0)');
                                      else perks.push(`Fixed confirmation token fee: ₹${w.fixed_token_fee}`);
                                    } else {
                                      if (w.free_meals && w.free_accommodation) perks.push('Complimentary Meals & Accommodation');
                                      else if (w.free_meals) perks.push('Complimentary Meals (₹0)');
                                      else if (w.free_accommodation) perks.push('Complimentary Stay (₹0)');
                                    }

                                    if (perks.length > 0 || w.notice_message) {
                                      return (
                                        <div className="sm:col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                                          <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                          <div>
                                            <strong className="block text-amber-900 font-bold mb-0.5">
                                              {formData.participantType} Benefit: {perks.join(' • ')}
                                            </strong>
                                            {w.notice_message && <span className="text-amber-800">{w.notice_message}</span>}
                                          </div>
                                        </div>
                                      );
                                    }
                                  } else if (formData.participantType === 'Brahmachari') {
                                    return (
                                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 text-xs font-medium text-amber-950 shadow-2xs flex items-start gap-2.5">
                                        <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="block text-amber-900 font-bold mb-0.5">Brahmachari Notice:</strong>
                                          <span className="text-amber-800">
                                            {selectedCamp.special_waivers?.brahmachari_message
                                              ? selectedCamp.special_waivers.brahmachari_message.replace(/₹?\s*\d+/g, `₹${selectedCamp.special_waivers?.brahmachari_fee ?? 0}`)
                                              : `Brahmacharis pay a nominal confirmation fee of ₹${selectedCamp.special_waivers?.brahmachari_fee ?? 0} under Donate As You Like.`}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          )}

                          {/* SECTION: MEALS & STAY ITINERARY */}
                          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-50/40 via-slate-50 to-amber-50/20 border border-slate-300 shadow-xs space-y-3">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                              <Utensils className="w-4 h-4 text-amber-600" />
                              <span>Meals &amp; Stay Itinerary</span>
                            </div>

                            {/* Row 1: Arrival & Departure Schedule (2x2 on laptops, 4-across on wide screens) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                                  Arrival Meal Date <span className="text-amber-600">*</span>
                                </label>
                                <select
                                  name="firstMealDate"
                                  value={formData.firstMealDate}
                                  onChange={handleFormChange}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer shadow-2xs"
                                >
                                  {(selectedCamp.meal_pricing || []).map((m) => (
                                    <option key={String(m.date)} value={String(m.date)}>
                                      {formatMealOptionLabel(m, selectedCamp.start_date)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                                  Arrival Meal Slot <span className="text-amber-600">*</span>
                                </label>
                                <select
                                  name="firstMealType"
                                  value={formData.firstMealType}
                                  onChange={handleFormChange}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer shadow-2xs"
                                >
                                  <option value="Breakfast">Breakfast</option>
                                  <option value="Lunch">Lunch</option>
                                  <option value="Dinner">Dinner</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                                  Departure Meal Date <span className="text-amber-600">*</span>
                                </label>
                                <select
                                  name="lastMealDate"
                                  value={formData.lastMealDate}
                                  onChange={handleFormChange}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer shadow-2xs"
                                >
                                  {(selectedCamp.meal_pricing || []).map((m) => (
                                    <option key={String(m.date)} value={String(m.date)}>
                                      {formatMealOptionLabel(m, selectedCamp.start_date)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                                  Departure Meal Slot <span className="text-amber-600">*</span>
                                </label>
                                <select
                                  name="lastMealType"
                                  value={formData.lastMealType}
                                  onChange={handleFormChange}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer shadow-2xs"
                                >
                                  <option value="Breakfast">Breakfast</option>
                                  <option value="Lunch">Lunch</option>
                                  <option value="Dinner">Dinner</option>
                                </select>
                              </div>
                            </div>

                            {/* Row 2: Perfectly In-Line 50/50 Preferences & Accommodation */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2.5 border-t border-slate-200">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                                  Dinner Meal Preference
                                </label>
                                <select
                                  name="dinnerType"
                                  value={formData.dinnerType}
                                  onChange={handleFormChange}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer shadow-2xs"
                                >
                                  <option value="Dinner Meal">Complete Dinner Meal</option>
                                  <option value="Only Milk">Only Milk</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 whitespace-nowrap">
                                  Accommodation from CV
                                </label>
                                {formData.gender.startsWith('Female') && !selectedCamp.accommodation_pricing?.allow_female_cv_accommodation ? (
                                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-200/70 text-xs text-slate-700 font-semibold border border-slate-300 truncate">
                                    External (Matajis)
                                  </div>
                                ) : (
                                  <select
                                    name="accommodation"
                                    value={formData.accommodation}
                                    onChange={handleFormChange}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-slate-900 text-xs font-semibold outline-none transition-all cursor-pointer shadow-2xs ${
                                      isCvFullForSelectedDates && !isBrahmachari
                                        ? 'border-amber-400 bg-amber-50/50 text-amber-900'
                                        : 'border-slate-300 bg-white focus:border-amber-500'
                                    }`}
                                  >
                                    <option value="Yes" disabled={isCvFullForSelectedDates && !isBrahmachari}>
                                      {isCvFullForSelectedDates && !isBrahmachari ? 'CV Accommodation (FULL - Unavailable)' : 'Yes, need CV accommodation'}
                                    </option>
                                    <option value="No">No, do not need / arrange own stay</option>
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* SELF-ARRANGED / HOTEL RECOMMENDATION & RECEIPT UPLOAD SECTION */}
                            {isArrangingOwnStay && (
                              <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                                  {isCvFullForSelectedDates ? (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>CV Floor Accommodation is Full for this Batch</span>
                                    </>
                                  ) : (
                                    <>
                                      <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span>Self-Arranged Accommodation / Nearby Hotel</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-[11px] text-amber-900 leading-snug">
                                  {isCvFullForSelectedDates
                                    ? 'Devotee can still attend by arranging external stay at a nearby hotel/lodge and uploading booking proof.'
                                    : 'Devotee has opted for outside accommodation. Please provide hotel name and upload booking confirmation proof below.'}
                                </p>

                                {/* Recommended Hotels Directory */}
                                {recommendedHotelsList.length > 0 && (
                                  <div className="p-3 rounded-xl bg-white border border-amber-200/90 shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Building2 className="w-3.5 h-3.5 text-amber-600" />
                                        Recommended Nearby Hotels &amp; Lodges ({recommendedHotelsList.length})
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-semibold">Contact directly to book</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {recommendedHotelsList.map((h: any, i: number) => (
                                        <div key={h.id || i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1 hover:border-amber-300 transition-colors">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-black text-xs text-slate-900">{h.name}</span>
                                            {h.tariff && (
                                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                {h.tariff}
                                              </span>
                                            )}
                                          </div>
                                          {h.contact && (
                                            <div>
                                              <a href={`tel:${h.contact}`} className="text-[10.5px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded inline-flex items-center gap-1 hover:underline">
                                                <Phone className="w-3 h-3 text-amber-700" /> {h.contact}
                                              </a>
                                            </div>
                                          )}
                                          {h.address && (
                                            <p className="text-[10px] text-slate-600">
                                              {h.address.startsWith('http') ? (
                                                <a href={h.address} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
                                                  📍 View Location Map &rarr;
                                                </a>
                                              ) : (
                                                <span>📍 {h.address}</span>
                                              )}
                                            </p>
                                          )}
                                          {h.notes && (
                                            <p className="text-[9.5px] text-slate-500 italic">
                                              ℹ️ {h.notes}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Hotel Name</label>
                                    <input
                                      type="text"
                                      value={hotelBookingName}
                                      onChange={(e) => setHotelBookingName(e.target.value)}
                                      placeholder="e.g. Hotel Sai Palace"
                                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                                      Booking Receipt (Photo/PDF) * <span className="text-[9.5px] text-slate-400 font-normal">(Max 5MB)</span>
                                    </label>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={handleUploadHotelReceipt}
                                      disabled={uploadingReceipt}
                                      className="w-full text-xs"
                                    />
                                  </div>
                                </div>
                                {uploadingReceipt && <p className="text-[10px] text-indigo-700 font-bold">Uploading to Google Drive...</p>}
                                {hotelReceiptUrl && (
                                  <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    <span>Receipt attached successfully.</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Interactive Live Cost Preview Widget */}
                          {liveCost && (
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-slate-700">
                                <div>
                                  <span className="text-slate-400 block text-[10px] font-semibold">Meals ({liveCost.mealCount})</span>
                                  <span className="font-bold text-slate-900 text-sm sm:text-base">₹{liveCost.mealCost}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] font-semibold">Stay ({liveCost.daysOfStay}d)</span>
                                  <span className="font-bold text-slate-900 text-sm sm:text-base">₹{liveCost.accCost}</span>
                                </div>
                                {liveCost.acCost > 0 && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-semibold">
                                      {selectedCamp.accommodation_pricing?.facility_charge_label || 'Other'}
                                      {selectedCamp.accommodation_pricing?.ac_charge_billing_type !== 'fixed' && ` (${Math.max(1, liveCost.daysOfStay)}d)`}
                                    </span>
                                    <span className="font-bold text-slate-900 text-sm sm:text-base">₹{liveCost.acCost}</span>
                                  </div>
                                )}
                                {liveCost.baseCost > 0 && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-semibold">
                                      {liveCost.baseCostLabel || 'Booklet & Study'}
                                    </span>
                                    <span className="font-bold text-amber-800 text-sm sm:text-base">₹{liveCost.baseCost}</span>
                                  </div>
                                )}
                                {liveCost.lateFee > 0 && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-semibold">Late Fee</span>
                                    <span className="font-bold text-rose-600 text-sm sm:text-base">₹{liveCost.lateFee}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-right ml-auto">
                                <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">
                                  ENTRY FEE
                                </span>
                                <span className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
                                  ₹{liveCost.totalCost}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="submit"
                              disabled={isCurrentTrackAlreadyRegistered || !isDevoteeEligibleForCamp}
                              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-full text-xs font-bold transition-all shadow-md ${
                                isCurrentTrackAlreadyRegistered || !isDevoteeEligibleForCamp
                                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                              <span>
                                {!isDevoteeEligibleForCamp
                                  ? 'Center Ineligible for Camp'
                                  : isCurrentTrackAlreadyRegistered
                                  ? 'Already Registered for This Camp'
                                  : editIndex !== null
                                  ? 'Update Attendee'
                                  : isManager
                                  ? 'Add Devotee to Batch'
                                  : 'Confirm My Registration Entry'}
                              </span>
                            </button>
                          </div>
                        </form>
                      </>
                    )}
                  </div>

                  {/* List of Added Attendees */}
                  {entries.length > 0 && (
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3 sm:p-4.5 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                          Attendees in this Booking ({entries.length})
                        </h3>
                        <span className="text-xs font-bold text-amber-700">
                          Subtotal: ₹{grandTotalBeforeCoupon.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {entries.map((entry, idx) => {
                          const entryPalette = getTrackColorPalette(entry.campTrack);
                          return (
                          <div
                            key={idx}
                            className="p-2.5 sm:p-3 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-800 truncate">{entry.participantName}</span>
                                <span className={`px-1.5 py-0.2 rounded ${entryPalette.badgeBg} text-[9px] sm:text-[10px] font-bold inline-flex items-center gap-1`}>
                                  <span className={`w-1 h-1 rounded-full ${entryPalette.dotColor}`} />
                                  <span>{entry.campTrack}</span>
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 truncate">
                                WhatsApp: {entry.whatsapp} • Acc: {entry.accommodation} • Age: {entry.age}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                              <span className="font-bold text-gray-900 text-xs sm:text-sm">₹{entry.totalCost}</span>
                              <button
                                onClick={() => handleEditEntry(idx)}
                                className="p-1 text-gray-400 hover:text-amber-600 cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(idx)}
                                className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Col: Booking Summary & Checkout */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3.5 sm:p-5 shadow-xs space-y-3 sticky top-20">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
                      Booking Summary
                    </h3>

                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between text-gray-600">
                        <span>Camp:</span>
                        <span className="font-semibold text-gray-800 text-right truncate max-w-[180px]">{selectedCamp.title}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Participants:</span>
                        <span className="font-semibold text-gray-800">{entries.length} Devotee(s)</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-gray-800">₹{grandTotalBeforeCoupon.toLocaleString('en-IN')}</span>
                      </div>

                      {appliedCoupon && (
                        <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded-lg font-semibold text-xs">
                          <span>Promo ({appliedCoupon.code}):</span>
                          <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                        <span className="text-xs sm:text-sm font-bold text-gray-900">Total Payable:</span>
                        <span className="text-lg sm:text-xl font-black text-amber-700">
                          ₹{grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Coupon Input */}
                    <div className="pt-2 border-t border-gray-100">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                          <span className="font-bold text-emerald-800">Promo: {appliedCoupon.code}</span>
                          <button
                            onClick={handleRemoveCoupon}
                            className="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Promo Code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Apply
                          </button>
                        </form>
                      )}
                      {couponError && (
                        <p className="text-[10px] text-rose-600 mt-1 font-medium">{couponError}</p>
                      )}
                    </div>

                    {/* Error display if registration failed outside modal */}
                    {paymentError && !showPaymentModal && (
                      <div className="p-2.5 mb-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {/* Checkout Button: Direct Free Registration if total is ₹0 */}
                    {grandTotal === 0 ? (
                      <button
                        type="button"
                        onClick={submitFreeRegistration}
                        disabled={entries.length === 0 || isSubmitting || !isDevoteeEligibleForCamp}
                        className={`w-full py-2.5 sm:py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          entries.length > 0 && !isSubmitting && isDevoteeEligibleForCamp
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30 active:scale-[0.99]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Registering Devotees...</span>
                          </>
                        ) : (
                          <>
                            <Gift className="w-4 h-4" />
                            <span>Confirm Free Registration (₹0)</span>
                            <CheckCircle className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleProceedToPayment}
                          disabled={entries.length === 0 || !isDevoteeEligibleForCamp}
                          className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            entries.length > 0 && isDevoteeEligibleForCamp
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-600/30 active:scale-[0.99]'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span className="truncate">Proceed to Payment (₹{grandTotal.toLocaleString('en-IN')})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={savingDraft || entries.length === 0}
                          className="w-full py-2 rounded-xl font-bold text-xs border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Save progress now and resume anytime from any device"
                        >
                          {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                          <span>{savingDraft ? 'Saving...' : `Save Progress (${entries.length})`}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PAYMENT METHOD SELECTION MODAL: Matching Image 2 */}
      {showPaymentModal && selectedCamp && grandTotal > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-3.5 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                Select Payment Method
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedMethod(null);
                  setPaymentError(null);
                }}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {paymentError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {!selectedMethod ? (() => {
                const isManager = isCampManagerialUser(userData?.role, selectedCamp.payment_config?.allowed_managerial_roles);

                // IDT Center Authorization check: only managers whose center is in the authorized IDT list can see IDT
                const centerIdtList = (selectedCamp.payment_config?.center_idt_codes || []) as any[];
                const candidateCentersForIdt = [
                  managerAssignedCenter,
                  effectiveCenter,
                  formData.voiceName,
                  userData?.hierarchy?.currentCenter,
                  userData?.hierarchy?.center,
                  (userData as any)?.center,
                  (userData as any)?.current_center,
                  userData?.hierarchy?.otherCenter,
                  (userData as any)?.other_center,
                  entries[0]?.voiceName,
                  entries[0]?.voice_name,
                  entries[0]?.parentCenter,
                ].filter(Boolean).map((s: string) => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

                const isCenterAuthorizedForIdt = centerIdtList.length === 0 || centerIdtList.some((c: any) => {
                  const cNorm = String(c.center_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (!cNorm) return false;
                  return candidateCentersForIdt.some(
                    (cand: string) => cand === cNorm || cand.includes(cNorm) || cNorm.includes(cand)
                  );
                });

                const showIdtOption = Boolean(
                  selectedCamp.payment_config?.enable_idt &&
                  (selectedCamp.payment_config?.allow_student_idt === true || isManager) &&
                  isCenterAuthorizedForIdt
                );
                const showIttOption = Boolean(
                  selectedCamp.payment_config?.enable_itt &&
                  (selectedCamp.payment_config?.allow_student_itt === true || isManager)
                );

                return (
                <div className="space-y-3">
                  {selectedCamp.payment_config?.enable_razorpay !== false && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('RAZORPAY')}
                      className="w-full p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 bg-white flex items-center gap-3.5 text-left transition-all hover:shadow-md group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-100">
                        ₹
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            UPI / Online Payment
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {surchargePercent > 0
                            ? `GPay, PhonePe, Cards, NetBanking (${surchargePercent}% processing fee)`
                            : 'GPay, PhonePe, Cards, NetBanking (No extra fee)'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-sm font-black text-slate-900 block">
                          ₹{onlineTotalWithSurcharge.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </button>
                  )}

                  {showIdtOption && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod('IDT');
                        const centerIdtList = (selectedCamp?.payment_config?.center_idt_codes || []) as any[];
                        const userCenterCandidate = (
                          managerAssignedCenter ||
                          formData.voiceName ||
                          userData?.hierarchy?.currentCenter ||
                          userData?.hierarchy?.center ||
                          (userData as any)?.center ||
                          ''
                        ).trim().toLowerCase();
                        const matchedCodeObj = centerIdtList.find((c: any) => 
                          c.code && (
                            c.center_name.trim().toLowerCase() === userCenterCandidate ||
                            userCenterCandidate.includes(c.center_name.trim().toLowerCase()) ||
                            c.center_name.trim().toLowerCase().includes(userCenterCandidate)
                          )
                        ) || (centerIdtList.length === 1 ? centerIdtList[0] : null);
                        if (matchedCodeObj?.code && !idtPasscode) {
                          setIdtPasscode(matchedCodeObj.code);
                        }
                      }}
                      className="w-full p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 bg-white flex items-center gap-3.5 text-left transition-all hover:shadow-md group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                            IDT (Inter-Department Transfer)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                            ISKCON NVCC Only
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Deduct from VOICE Department account with authorization key.
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-sm font-black text-amber-600 block">
                          ₹{grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </button>
                  )}

                  {showIttOption && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('INTER_TEMPLE_TRANSFER')}
                      className="w-full p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white flex items-center gap-3.5 text-left transition-all hover:shadow-md group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                            Inter-Temple Transfer (ITT)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            Bank Transfer
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Direct bank transfer from other temple accounts with payment receipt upload.
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-sm font-black text-emerald-600 block">
                          ₹{grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
                );
              })() : selectedMethod === 'RAZORPAY' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Camp Contribution:</span>
                      <span className="font-bold text-slate-800">₹{grandTotalBeforeCoupon.toLocaleString('en-IN')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Coupon Discount ({appliedCoupon?.code}):</span>
                        <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {surchargePercent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Processing Fee ({surchargePercent}%):</span>
                        <span className="font-bold text-slate-800">₹{surchargeAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-indigo-200/60 font-black text-sm">
                      <span className="text-indigo-950">Total Payable:</span>
                      <span className="text-indigo-600">₹{onlineTotalWithSurcharge.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2.5 pb-1 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 mt-2 z-10">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="px-4 py-2.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRazorpayPayment}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting Gateway...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Pay ₹{onlineTotalWithSurcharge.toLocaleString('en-IN')} via Razorpay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : selectedMethod === 'IDT' ? (() => {
                const centerIdtList = (selectedCamp?.payment_config?.center_idt_codes || []) as any[];
                const userCenterCandidate = (
                  managerAssignedCenter ||
                  formData.voiceName ||
                  userData?.hierarchy?.currentCenter ||
                  userData?.hierarchy?.center ||
                  (userData as any)?.center ||
                  ''
                ).trim().toLowerCase();

                const matchedCodeObj = centerIdtList.find((c: any) => 
                  c.code && (
                    c.center_name.trim().toLowerCase() === userCenterCandidate ||
                    userCenterCandidate.includes(c.center_name.trim().toLowerCase()) ||
                    c.center_name.trim().toLowerCase().includes(userCenterCandidate)
                  )
                ) || (centerIdtList.length === 1 ? centerIdtList[0] : null);

                return (
                /* IDT FORM */
                <div className="space-y-4">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Available to authorized ISKCON &amp; VOICE connected centers.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Project Name (as per SERP) *
                    </label>
                    <input
                      type="text"
                      required
                      value={idtSource}
                      onChange={(e) => setIdtSource(e.target.value)}
                      placeholder="e.g. Enter Project Name / SERP Activity..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs outline-none focus:border-amber-500 font-semibold"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Manually type the SERP project name for IDT deduction accounting.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      <span>IDT Authorization Passcode *</span>
                      {matchedCodeObj && (
                        <span className="ml-1.5 text-amber-900 font-semibold text-[11px]">
                          (Enter the secret authorization code issued to {matchedCodeObj.center_name || 'your center'})
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={idtPasscode}
                      onChange={(e) => setIdtPasscode(e.target.value)}
                      placeholder="Enter your center's secret authorization key"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs outline-none focus:border-amber-500 font-mono tracking-wider font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Dedicated IDT authorization code for your assigned center.
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2.5 pb-1 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 mt-2 z-10">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="px-4 py-2.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={submitIdtPayment}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Authorizing IDT...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirm IDT (₹{grandTotal.toLocaleString('en-IN')})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                );
              })() : (
                /* INTER-TEMPLE TRANSFER FORM */
                <div className="space-y-2.5 sm:space-y-3.5">
                  {/* Bank Details Display Card */}
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-emerald-200/60">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" />
                        <span className="text-[11px] sm:text-xs font-black text-emerald-950 uppercase tracking-wider">
                          Temple Bank Details
                        </span>
                      </div>
                      <span className="text-[11px] sm:text-xs font-black text-emerald-700 shrink-0">
                        ₹{grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-xs">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Beneficiary Name</span>
                        <span className="font-bold text-slate-900 text-xs truncate block">{selectedCamp.payment_config?.itt_bank_details?.account_name || 'Central VOICE Pune'}</span>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Bank Name</span>
                        <span className="font-bold text-slate-900 text-xs truncate block">{selectedCamp.payment_config?.itt_bank_details?.bank_name || 'State Bank of India'}</span>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Account Number</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {selectedCamp.payment_config?.itt_bank_details?.account_number || '---'}
                          </span>
                          {selectedCamp.payment_config?.itt_bank_details?.account_number && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCamp.payment_config?.itt_bank_details?.account_number || '', 'acc')}
                              className="text-slate-400 hover:text-emerald-700 text-xs p-0.5 shrink-0"
                              title="Copy Account Number"
                            >
                              {copiedBankField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">IFSC Code</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {selectedCamp.payment_config?.itt_bank_details?.ifsc_code || '---'}
                          </span>
                          {selectedCamp.payment_config?.itt_bank_details?.ifsc_code && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCamp.payment_config?.itt_bank_details?.ifsc_code || '', 'ifsc')}
                              className="text-slate-400 hover:text-emerald-700 text-xs p-0.5 shrink-0"
                              title="Copy IFSC Code"
                            >
                              {copiedBankField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedCamp.payment_config?.itt_bank_details?.branch_name && (
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Branch</span>
                          <span className="font-medium text-slate-800 text-xs truncate block">{selectedCamp.payment_config.itt_bank_details.branch_name}</span>
                        </div>
                      )}

                      {selectedCamp.payment_config?.itt_bank_details?.upi_id && (
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">UPI ID / VPA</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-emerald-800 text-xs truncate">
                              {selectedCamp.payment_config.itt_bank_details.upi_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCamp.payment_config?.itt_bank_details?.upi_id || '', 'upi')}
                              className="text-slate-400 hover:text-emerald-700 text-xs p-0.5 shrink-0"
                              title="Copy UPI ID"
                            >
                              {copiedBankField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedCamp.payment_config?.itt_bank_details?.instructions && (
                      <div className="pt-1.5 border-t border-emerald-200/60 text-[10.5px] text-emerald-900 font-medium">
                        💡 {selectedCamp.payment_config.itt_bank_details.instructions}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">
                      Temple / Center Name (Sender) *
                    </label>
                    <input
                      type="text"
                      required
                      value={ittTempleName}
                      onChange={(e) => setIttTempleName(e.target.value)}
                      placeholder="e.g. ISKCON Bangalore, ISKCON NVCC"
                      className="w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">
                      Bank UTR / Transaction Reference Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={ittTransactionRef}
                      onChange={(e) => setIttTransactionRef(e.target.value)}
                      placeholder="e.g. UTR123456789012"
                      className="w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">
                      Transaction Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={ittTransactionDate}
                      onChange={(e) => setIttTransactionDate(e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">
                      Upload Bank Transfer Receipt Screenshot *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIttScreenshotFile(file);
                          const reader = new FileReader();
                          reader.onload = () => setIttScreenshotPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg sm:rounded-xl text-xs bg-slate-50 file:mr-2.5 file:py-0.5 sm:file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    {ittScreenshotPreview && (
                      <div className="mt-1.5">
                        <img
                          src={ittScreenshotPreview}
                          alt="Transfer Receipt Preview"
                          className="h-16 sm:h-20 w-auto rounded-lg border border-slate-200 object-cover shadow-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Compact Info Banner (No duplicate button) */}
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[10.5px] sm:text-[11px] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="leading-snug">
                      Waiting for temple accounts? Tap <strong>Save Draft</strong> below to resume anytime.
                    </span>
                  </div>

                  {/* Sticky Compact Action Bar */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-2 pb-0.5 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 mt-1 sm:mt-2 z-10">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 border border-slate-200 text-xs font-bold rounded-lg sm:rounded-xl text-slate-600 hover:bg-slate-50 shrink-0 cursor-pointer transition-colors"
                    >
                      &larr; <span className="hidden xs:inline">Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="px-2.5 sm:px-3 py-2 sm:py-2.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg sm:rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                      title="Save progress and complete payment later"
                    >
                      {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                      <span className="whitespace-nowrap">{savingDraft ? 'Saving...' : 'Save Draft'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || ittUploading}
                      onClick={submitIttPayment}
                      className="flex-1 min-w-0 py-2 sm:py-2.5 px-2.5 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {isSubmitting || ittUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span className="truncate">{ittUploading ? 'Uploading...' : 'Submitting...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate sm:hidden">Confirm (₹{grandTotal.toLocaleString('en-IN')})</span>
                          <span className="truncate hidden sm:inline">Submit Transfer (₹{grandTotal.toLocaleString('en-IN')})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW TICKET & PRASADAM PASS MODAL */}
      {viewTicketReg && !viewTicketReg.is_cancelled && (
        <CampPrasadamCard
          registration={viewTicketReg}
          userProfile={userData}
          onClose={() => setViewTicketReg(null)}
        />
      )}

      {/* CANCELLATION & REFUND MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-3 sm:p-5 shadow-2xl border border-slate-200 space-y-2.5 sm:space-y-3 max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Undo2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-tight">
                    Manage / Cancel Registration
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
                    Select camp and devotee(s) to cancel &amp; refund
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelRegs(null);
                  setCancelLookupQuery('');
                }}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SUCCESS CONFIRMATION VIEW */}
            {cancelSuccessResult ? (
              <div className="space-y-3 text-center py-2 animate-in zoom-in-95 duration-200">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>

                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1">
                    Request Submitted
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    Cancellation &amp; Refund Request Logged
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Your request has been forwarded to ISKCON NVCC Accounts team.
                  </p>
                </div>

                {/* Refund Summary Card */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/60 border border-amber-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-amber-200/60">
                    <span className="text-slate-600 font-medium">Calculated Refund:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      ₹{Number(cancelSuccessResult.refundAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {Number(cancelSuccessResult.breakdown?.base_fee_refund || 0) > 0 && (
                    <div className="flex justify-between py-0.5 text-[10px] sm:text-[11px]">
                      <span className="text-slate-500">Base Registration Fee:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{cancelSuccessResult.breakdown?.base_fee_refund || 0}
                      </span>
                    </div>
                  )}
                  {Number(cancelSuccessResult.breakdown?.meal_refund || 0) > 0 && (
                    <div className="flex justify-between py-0.5 text-[10px] sm:text-[11px]">
                      <span className="text-slate-500">Meals Cost Refund:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{cancelSuccessResult.breakdown?.meal_refund || 0}
                      </span>
                    </div>
                  )}
                  {Number(cancelSuccessResult.breakdown?.acc_refund || 0) > 0 && (
                    <div className="flex justify-between py-0.5 text-[10px] sm:text-[11px]">
                      <span className="text-slate-500">Stay Charges Refund:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{cancelSuccessResult.breakdown?.acc_refund || 0}
                      </span>
                    </div>
                  )}
                  {Number(cancelSuccessResult.refundAmount) === 0 && (
                    <div className="flex justify-between py-0.5 text-[10px] sm:text-[11px] text-rose-700 font-bold">
                      <span>Refund Status:</span>
                      <span>₹0 (Post-deadline cancellation)</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-amber-200/60 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Payout Target:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {cancelPayoutType === 'UPI' ? cancelUpiId : `A/c: ${cancelAccountNumber}`}
                    </span>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 bg-slate-100 rounded-xl text-[10px] sm:text-[11px] text-slate-600 leading-relaxed text-left">
                  ℹ️ <strong>Transfer Timeline:</strong> Refunds are credited manually via bank / UPI transfer by NVCC accounts within <strong>5-7 working days</strong>. Gateway processing fees are non-refundable.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelRegs(null);
                    setCancelLookupQuery('');
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Done &amp; Close
                </button>
              </div>
            ) : (
              /* DIRECT CAMP SELECTION & DEVOTEES CANCELLATION FORM */
              <form onSubmit={handleSubmitCancellation} className="space-y-2.5 sm:space-y-3">
                {/* 1. SELECT CAMP RETREAT */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10.5px] sm:text-xs font-black text-slate-900 uppercase tracking-wider">
                      Select Camp Retreat:
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {cancellationCamps.length} Camp{cancellationCamps.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                  <select
                    value={cancelCamp?.id || ''}
                    onChange={(e) => onSelectCampForCancel(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer shadow-2xs"
                  >
                    {cancellationCamps.map((c) => {
                      const count = userRegistrations.filter(r =>
                        (r.camp_id === c.id || r.camp_slug === c.slug) &&
                        !r.is_cancelled &&
                        r.payment_status !== 'cancelled' &&
                        r.payment_status !== 'refunded'
                      ).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.title} {count > 0 ? `(${count} active attendee${count !== 1 ? 's' : ''})` : '(0 active)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {cancelError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{cancelError}</span>
                  </div>
                )}

                {/* 2. ACTIVE DEVOTEES LIST (NO CANCELLED RECORDS SHOWN) */}
                {(() => {
                  const activeDevotees = (cancelRegs || []).filter(r => {
                    const isCancelled = r.is_cancelled || r.payment_status === 'cancelled' || r.payment_status === 'refunded';
                    if (isCancelled) return false;
                    if (!cancelDevoteeFilter.trim()) return true;
                    const q = cancelDevoteeFilter.toLowerCase().trim();
                    return (
                      (r.participant_name || '').toLowerCase().includes(q) ||
                      (r.whatsapp || '').includes(q) ||
                      (r.camp_track || '').toLowerCase().includes(q)
                    );
                  });

                  if (activeDevotees.length === 0) {
                    return (
                      <div className="p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                        <User className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          No Active Attendees to Cancel
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                          There are no active, non-cancelled devotee registrations found for <strong>{cancelCamp?.title || 'this camp'}</strong>. Devotees who have already been cancelled or refunded are not shown here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowLookupFallback(prev => !prev)}
                          className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                        >
                          {showLookupFallback ? 'Hide manual lookup' : 'Looking for another devotee? Search by WhatsApp / Group ID'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <label className="block text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-wider">
                          Select Active Devotee(s) to Cancel:
                        </label>
                        <div className="flex items-center gap-2 text-[10.5px]">
                          <span className="text-slate-500 font-bold">
                            {selectedRegIdsToCancel.length} of {activeDevotees.length} Selected
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedRegIdsToCancel.length === activeDevotees.length) {
                                setSelectedRegIdsToCancel([]);
                              } else {
                                setSelectedRegIdsToCancel(activeDevotees.map(r => r.id!));
                              }
                            }}
                            className="font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                          >
                            {selectedRegIdsToCancel.length === activeDevotees.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>

                      {/* Devotee search filter if center has many registrations */}
                      {(cancelRegs?.length || 0) > 3 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={cancelDevoteeFilter}
                            onChange={(e) => setCancelDevoteeFilter(e.target.value)}
                            placeholder="Filter devotees by name, phone or track..."
                            className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 outline-none"
                          />
                        </div>
                      )}

                      {/* Devotees List */}
                      <div className="space-y-1 max-h-36 sm:max-h-40 overflow-y-auto pr-1">
                        {activeDevotees.map((reg) => {
                          const isPendingApproval = reg.payment_status !== 'completed';
                          const isPendingIdt = isPendingApproval && String(reg.payment_method || '').toUpperCase() === 'IDT';
                          const isLocked = isPendingApproval && !isPendingIdt;
                          const isChecked = selectedRegIdsToCancel.includes(reg.id!);

                          return (
                            <div
                              key={reg.id}
                              className={`py-1.5 px-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 text-xs ${
                                isLocked
                                  ? 'bg-slate-100/90 border-slate-200 opacity-60'
                                  : isChecked
                                  ? 'bg-sky-50/90 border-sky-400 shadow-2xs ring-1 ring-sky-300/50'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <label className={`flex items-start sm:items-center gap-2 flex-1 min-w-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  disabled={isLocked}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRegIdsToCancel(prev => [...prev, reg.id!]);
                                    } else {
                                      setSelectedRegIdsToCancel(prev => prev.filter(id => id !== reg.id!));
                                    }
                                  }}
                                  className="mt-0.5 sm:mt-0 w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed shrink-0 accent-sky-600"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5 leading-tight">
                                    <span className="truncate">{reg.participant_name}</span>
                                    {isPendingApproval && (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9.5px] font-bold shrink-0 ${
                                          isPendingIdt
                                            ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                                        }`}
                                      >
                                        {isPendingIdt ? '⚡ Pending IDT' : '⏳ Awaiting ITT'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9.5px] sm:text-[10.5px] text-slate-500 truncate mt-0.5">
                                    {reg.camp_track} • {reg.gender} {reg.age ? `• ${reg.age} yrs` : ''}
                                  </div>
                                </div>
                              </label>

                              <div className="text-right shrink-0 pl-1">
                                <span className={`font-black block text-xs sm:text-sm leading-tight ${isChecked ? 'text-sky-950' : 'text-slate-900'}`}>
                                  ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[8.5px] text-slate-400 font-semibold">Camp Fee</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Optional manual lookup fallback if manager has external booking ID */}
                {showLookupFallback && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10.5px] font-bold text-slate-800 block">Manual Registration Lookup:</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={cancelLookupQuery}
                        onChange={(e) => setCancelLookupQuery(e.target.value)}
                        placeholder="Enter WhatsApp / Email / Group ID..."
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                      <button
                        type="button"
                        disabled={cancelLookupLoading || !cancelLookupQuery.trim()}
                        onClick={() => handleLookupForCancel()}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {cancelLookupLoading ? 'Searching...' : 'Lookup'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. FINANCIAL TRANSPARENCY BREAKDOWN (FULL ACCOUNTING AUDIT) */}
                {(() => {
                  const isSelectedAllPendingIdt = Boolean(
                    selectedRegIdsToCancel.length > 0 &&
                    selectedRegIdsToCancel.every(id => {
                      const found = (cancelRegs || []).find(r => r.id === id);
                      return found && String(found.payment_method || '').toUpperCase() === 'IDT' && found.payment_status !== 'completed';
                    })
                  );

                  if (isSelectedAllPendingIdt) {
                    const totalIdtDeduction = (cancelRegs || [])
                      .filter(r => selectedRegIdsToCancel.includes(r.id!))
                      .reduce((s, r) => s + Number(r.total_cost || 0), 0);

                    return (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-sky-900">
                          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>Direct Pre-Transfer Cancellation (IDT)</span>
                        </div>
                        <p className="text-[10.5px] text-sky-800 leading-relaxed">
                          Since this batch is awaiting IDT approval and has not been transferred by the Accounts Department yet, the selected {selectedRegIdsToCancel.length} devotee(s) will be directly removed from the batch.
                        </p>
                        <div className="p-1.5 rounded-lg bg-white/80 border border-sky-200 flex justify-between font-bold text-xs mt-0.5">
                          <span className="text-slate-700">Batch Total Deduction:</span>
                          <span className="text-emerald-700 font-black">
                            -₹{totalIdtDeduction.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-sky-600 font-medium">
                          ⚡ No Bank / UPI refund details required. The accountant will only execute the updated net balance.
                        </p>
                      </div>
                    );
                  }

                  const live = computeLiveRefund();

                  return (
                    <div className="rounded-xl sm:rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 overflow-hidden shadow-sm">
                      {/* Colorful Section Header with guaranteed deep indigo background */}
                      <div
                        className="bg-indigo-700 bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 px-3 py-2 flex items-center justify-between text-white"
                        style={{ backgroundColor: '#4338ca' }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Banknote className="w-4 h-4 text-indigo-200 shrink-0" />
                          <span className="font-black text-xs sm:text-sm tracking-tight truncate text-white">
                            Refund Policy &amp; Accounting Breakdown
                          </span>
                        </div>
                        <span className="text-[9.5px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 shrink-0 backdrop-blur-sm">
                          {live.tierLabel}
                        </span>
                      </div>

                      {/* Content Body with Distinct Colorful Section Divisions */}
                      <div className="p-2.5 sm:p-3 space-y-1.5 text-xs bg-white">
                        {/* Section Division 1: Paid & Gateway Surcharge (Sky/Slate Card) */}
                        {live.gatewayFee > 0 ? (
                          <div className="bg-sky-50/90 border border-sky-200 rounded-lg p-2 text-[11px] sm:text-xs space-y-0.5">
                            <div className="flex justify-between text-slate-700">
                              <span className="font-semibold text-slate-600">Total Paid at Checkout:</span>
                              <span className="font-black text-slate-900">₹{live.totalPaidAtCheckout.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Gateway Fee ({live.surchargePercent}% non-refundable):</span>
                              <span className="font-bold text-slate-700">-₹{live.gatewayFee.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between pt-0.5 border-t border-sky-200 text-sky-950 font-bold">
                              <span>Camp Base Fee:</span>
                              <span className="font-black text-sky-900">₹{live.originalTotal.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-sky-50/90 border border-sky-200 rounded-lg p-2 flex justify-between text-[11px] sm:text-xs text-slate-800 font-bold">
                            <span>Camp Base Fee Paid:</span>
                            <span className="font-black text-sky-900">₹{live.originalTotal.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Section Division 2: Policy Fee Deduction (Soft Rose Card) */}
                        {live.cancellationFee > 0 && (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] sm:text-xs">
                            <div className="flex items-center gap-1.5 text-rose-950 font-bold truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              <span className="truncate">Policy Deduction ({100 - live.baseRefundPercent}%):</span>
                            </div>
                            <span className="font-black text-rose-700 shrink-0">-₹{live.cancellationFee.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Late fee non-refundable deduction if any */}
                        {live.totalLateFee > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex justify-between text-[11px] sm:text-xs text-amber-950 font-medium">
                            <span>Late Registration Fee (Non-refundable):</span>
                            <span className="font-bold text-amber-900">-₹{live.totalLateFee.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Section Division 3: Final Refund Highlight Banner (Guaranteed Rich Emerald Background) */}
                        <div
                          className="rounded-xl p-2.5 sm:p-3 flex items-center justify-between shadow-sm text-white"
                          style={{ backgroundColor: live.totalRefund > 0 ? '#059669' : '#334155' }}
                        >
                          <div className="min-w-0 pr-1">
                            <div className="font-black text-xs sm:text-sm flex items-center gap-1 text-white">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                              <span>Total Net Refund Due:</span>
                            </div>
                            <span className="text-[9.5px] sm:text-[10px] text-emerald-100 block truncate font-medium">
                              {live.gatewayFee > 0
                                ? `₹${live.totalPaidAtCheckout} paid − ₹${live.gatewayFee} gateway − ₹${live.cancellationFee} deduction`
                                : `Net eligible payout to your destination`}
                            </span>
                          </div>
                          <span className="text-lg sm:text-xl font-black text-white shrink-0">
                            ₹{live.totalRefund.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Subtle 1-line policy note */}
                        <div className="text-[9.5px] sm:text-[10px] text-slate-500 text-center leading-tight pt-0.5">
                          {live.totalRefund === 0 ? (
                            <span className="text-rose-600 font-semibold">{live.reasonExplanation}</span>
                          ) : (
                            <span>ℹ️ {live.baseRefundPercent}% base fee refund eligible • Credited in 5-7 working days</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. PAYOUT DETAILS SECTION */}
                {(() => {
                  const isSelectedAllPendingIdt = Boolean(
                    selectedRegIdsToCancel.length > 0 &&
                    selectedRegIdsToCancel.every(id => {
                      const found = (cancelRegs || []).find(r => r.id === id);
                      return found && String(found.payment_method || '').toUpperCase() === 'IDT' && found.payment_status !== 'completed';
                    })
                  );

                  if (isSelectedAllPendingIdt) return null;

                  return (
                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-wider">
                            Select Payout Destination:
                          </label>
                          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700">
                            Eligible Refund: ₹{computeLiveRefund().totalRefund.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">Choose where NVCC Accounts will transfer your refund</span>
                      </div>

                      {/* 2-Column Responsive Segmented Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCancelPayoutType('UPI')}
                          className={`py-2 px-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 text-left ${
                            cancelPayoutType === 'UPI'
                              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-lg shrink-0">⚡</span>
                          <div className="min-w-0">
                            <span className="text-xs font-black block truncate">UPI ID / VPA</span>
                            <span className="text-[9.5px] opacity-75 font-medium block truncate">Instant transfer</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCancelPayoutType('BANK')}
                          className={`py-2 px-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 text-left ${
                            cancelPayoutType === 'BANK'
                              ? 'bg-blue-50/90 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-lg shrink-0">🏛️</span>
                          <div className="min-w-0">
                            <span className="text-xs font-black block truncate">Bank Account</span>
                            <span className="text-[9.5px] opacity-75 font-medium block truncate">NEFT / RTGS</span>
                          </div>
                        </button>
                      </div>

                      {cancelPayoutType === 'UPI' ? (
                        <div>
                          <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1">
                            Your UPI ID / VPA *
                          </label>
                          <input
                            type="text"
                            required
                            value={cancelUpiId}
                            onChange={(e) => setCancelUpiId(e.target.value)}
                            placeholder="e.g. devotee@okhdfcbank or 9876543210@paytm"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                              A/C Holder Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={cancelAccountName}
                              onChange={(e) => setCancelAccountName(e.target.value)}
                              placeholder="e.g. Radheshyam Das"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                              Bank Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={cancelBankName}
                              onChange={(e) => setCancelBankName(e.target.value)}
                              placeholder="e.g. State Bank of India"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                              Account Number *
                            </label>
                            <input
                              type="text"
                              required
                              value={cancelAccountNumber}
                              onChange={(e) => setCancelAccountNumber(e.target.value)}
                              placeholder="Account Number"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-semibold focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                              Confirm Account *
                            </label>
                            <input
                              type="text"
                              required
                              value={cancelConfirmAccount}
                              onChange={(e) => setCancelConfirmAccount(e.target.value)}
                              placeholder="Re-enter Number"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-semibold focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                              Bank IFSC Code *
                            </label>
                            <input
                              type="text"
                              required
                              value={cancelIfscCode}
                              onChange={(e) => setCancelIfscCode(e.target.value.toUpperCase())}
                              placeholder="e.g. SBIN0001234"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono uppercase font-semibold focus:border-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 5. REASON FOR CANCELLATION */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                    Reason for Cancellation
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none cursor-pointer"
                  >
                    <option value="Schedule Conflict">Schedule Conflict / Work Commitments</option>
                    <option value="Health / Medical Emergency">Health / Medical Emergency</option>
                    <option value="Family Obligation">Family Obligation</option>
                    <option value="Other">Other Reason</option>
                  </select>

                  {cancelReason === 'Other' && (
                    <input
                      type="text"
                      value={cancelReasonCustom}
                      onChange={(e) => setCancelReasonCustom(e.target.value)}
                      placeholder="Please specify your reason..."
                      className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:border-amber-500 outline-none"
                    />
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-2 pt-2.5 pb-1 sticky -bottom-3.5 sm:-bottom-6 bg-white border-t border-slate-100 mt-2 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelRegs(null);
                      setCancelLookupQuery('');
                    }}
                    className="px-3.5 py-2 sm:py-2.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer shrink-0"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={cancelSubmitting || selectedRegIdsToCancel.length === 0}
                    className="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer min-w-0"
                  >
                    {cancelSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : selectedRegIdsToCancel.length > 0 && selectedRegIdsToCancel.every(id => {
                        const found = (cancelRegs || []).find(r => r.id === id);
                        return found && String(found.payment_method || '').toUpperCase() === 'IDT' && found.payment_status !== 'completed';
                      }) ? (
                      <>
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Cancel {selectedRegIdsToCancel.length} Devotee{selectedRegIdsToCancel.length !== 1 ? 's' : ''} (Pre-IDT)
                        </span>
                      </>
                    ) : computeLiveRefund().totalRefund === 0 ? (
                      <>
                        <Undo2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Confirm &amp; Cancel Registration (₹0 Refund)
                        </span>
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          <span className="sm:hidden">Confirm Refund (₹{computeLiveRefund().totalRefund})</span>
                          <span className="hidden sm:inline">Confirm &amp; Submit Refund Request (₹{computeLiveRefund().totalRefund})</span>
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW REFUND STATUS MODAL (FOR MY PASSES TRANSPARENCY AUDIT) */}
      {viewingRefundStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    Refund &amp; Cancellation Status
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pass #{viewingRefundStatus.reg?.serial_no || viewingRefundStatus.reg?.token_no || 1} • {viewingRefundStatus.reg?.participant_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRefundStatus(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Banner */}
            {(() => {
              const status = viewingRefundStatus.refund?.status;
              const isRefunded = status === 'refunded';
              const isPending = status === 'pending';
              const isRejected = status === 'rejected';

              if (isRefunded) {
                return (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-xs sm:text-sm block text-emerald-900">
                        Refund Completed &amp; Disbursed
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Your refund has been approved and successfully processed by the ISKCON NVCC Accounts Department.
                      </p>
                    </div>
                  </div>
                );
              }

              if (isPending) {
                return (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-xs sm:text-sm block text-amber-900">
                        Cancellation Under Review
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        Your cancellation &amp; refund request is currently undergoing review and audit by the accounts team. Refunds are processed within 5-7 working days.
                      </p>
                    </div>
                  </div>
                );
              }

              if (isRejected) {
                return (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-xs sm:text-sm block text-rose-900">
                        Refund Request Rejected
                      </span>
                      <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                        {viewingRefundStatus.refund?.admin_notes || 'Request could not be approved per camp policies.'}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-start gap-2.5">
                  <Ban className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-xs sm:text-sm block text-slate-900">
                      Registration Cancelled
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {viewingRefundStatus.reg?.cancellation_reason || 'This registration pass was cancelled.'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Financial Transparency Summary */}
            {(() => {
              const reg = viewingRefundStatus.reg;
              const ref = viewingRefundStatus.refund;
              const originalPaid = Number(reg?.total_cost || ref?.original_total_amount || 0);
              const matchingAtt = ref?.cancelled_registrations?.find((cr: any) => cr.reg_id === reg?.id) as any;
              const netRefund = matchingAtt ? Number(matchingAtt.refund_amount) : Number(ref?.refund_amount ?? 0);
              const lateFee = Number(reg?.late_fee || matchingAtt?.late_fee || (ref?.breakdown as any)?.late_fee || 0);
              const isTransferOrFree = ['INTER_TEMPLE_TRANSFER', 'ITT', 'IDT', 'COUPON', 'ROLE_WAIVER', 'FREE'].includes(String(reg?.payment_method || '').toUpperCase());
              const configuredSurcharge = Number(
                reg?.camp_payment_config?.surcharge_percent ??
                (reg as any)?.camp?.payment_config?.surcharge_percent ??
                (ref?.breakdown as any)?.surcharge_percent ??
                0
              );
              const surchargePercent = isTransferOrFree ? 0 : configuredSurcharge;
              const gatewayFee = Math.round(originalPaid * (surchargePercent / 100));
              const cancellationDeduction = Math.max(0, originalPaid - lateFee - netRefund);

              return (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                    Financial Audit &amp; Calculation Breakdown
                  </span>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between py-0.5 text-slate-800">
                      <span className="font-medium">Total Amount Paid by Attendee:</span>
                      <span className="font-black text-slate-900">₹{originalPaid.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Itemized Paid Breakdown if components present */}
                    {(Number(reg?.meal_cost || 0) > 0 || Number(reg?.acc_cost || 0) > 0 || lateFee > 0) && (
                      <div className="py-1 px-2 rounded-lg bg-slate-100/90 border border-slate-200/90 space-y-0.5 text-[10.5px] text-slate-600">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Contribution Components</span>
                        {Number(reg?.meal_cost || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Prasadam / Meals:</span>
                            <span className="font-semibold text-slate-700">₹{Number(reg.meal_cost).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {Number(reg?.acc_cost || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Accommodation / Stay:</span>
                            <span className="font-semibold text-slate-700">₹{Number(reg.acc_cost).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {lateFee > 0 && (
                          <div className="flex justify-between text-amber-800 font-medium">
                            <span>Late Registration Fee:</span>
                            <span className="font-bold text-amber-900">₹{lateFee.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {lateFee > 0 && (
                      <div className="flex justify-between py-0.5 text-amber-900 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/80">
                        <div>
                          <span className="font-semibold">Late Registration Surcharge (Non-refundable):</span>
                          <span className="block text-[9.5px] text-amber-700">Strictly non-refundable enrollment charge</span>
                        </div>
                        <span className="font-bold text-amber-900">-₹{lateFee.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {surchargePercent > 0 && (
                      <div className="flex justify-between py-0.5 text-slate-600 border-t border-slate-200">
                        <div>
                          <span className="font-medium">Payment Gateway &amp; Processing Fee ({surchargePercent}%):</span>
                          <span className="block text-[10px] text-slate-400">Non-refundable gateway charge</span>
                        </div>
                        <span className="font-bold text-slate-600">-₹{gatewayFee.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {cancellationDeduction > 0 && (
                      <div className="flex justify-between py-0.5 text-rose-700 border-t border-slate-200">
                        <div>
                          <span className="font-medium">Cancellation Fee / Deduction:</span>
                          <span className="block text-[10px] text-rose-500">Per camp refund schedule</span>
                        </div>
                        <span className="font-bold text-rose-700">-₹{cancellationDeduction.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1.5 text-emerald-800 font-bold border-t-2 border-slate-300 text-sm">
                      <span>Total Net Refund Processed:</span>
                      <span className="text-base font-black text-emerald-700">₹{netRefund.toLocaleString('en-IN')}</span>
                    </div>

                    {ref?.admin_notes && (
                      <div className="mt-2 p-2 rounded-lg bg-purple-50/90 border border-purple-200 text-purple-950 text-[10.5px]">
                        <span className="font-black text-[9.5px] uppercase tracking-wider text-purple-800 block">Accounts Audit Remarks:</span>
                        <span className="italic mt-0.5 block">{ref.admin_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Payout & Transaction Details */}
            {viewingRefundStatus.refund && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  Payout &amp; Transaction Details
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Payout Method:</span>
                    <span className="font-bold text-slate-800">
                      {viewingRefundStatus.refund.payout_type === 'UPI' ? '⚡ UPI Transfer' : '🏛️ Bank NEFT / IMPS'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Payout Target:</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">
                      {viewingRefundStatus.refund.payout_type === 'UPI'
                        ? (viewingRefundStatus.refund.upi_id || 'UPI')
                        : `A/c: ${viewingRefundStatus.refund.account_number}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Transaction / UTR Reference:</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">
                      {viewingRefundStatus.refund.payout_txn_ref || viewingRefundStatus.refund.admin_notes || 'Pending Disbursement'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Refund Date:</span>
                    <span className="font-bold text-slate-800">
                      {viewingRefundStatus.refund.payout_date
                        ? new Date(viewingRefundStatus.refund.payout_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : viewingRefundStatus.refund.created_at
                        ? new Date(viewingRefundStatus.refund.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Under Review'}
                    </span>
                  </div>
                </div>

                {viewingRefundStatus.refund.reason && (
                  <div className="pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400 block text-[10px]">Cancellation Reason:</span>
                    <span className="text-slate-700 italic">&ldquo;{viewingRefundStatus.refund.reason}&rdquo;</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewingRefundStatus(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* DEDICATED PRE-IDT CANCELLATION MODAL */}
      {pendingIdtCancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Cancel Registration (Pre-IDT)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inter-Department Transfer (Pending Approval)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingIdtCancelTarget(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Devotee Info */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Devotee:</span>
                <span className="font-bold text-slate-900">{pendingIdtCancelTarget.participant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Track &amp; Gender:</span>
                <span className="font-bold text-slate-800">{pendingIdtCancelTarget.camp_track} • {pendingIdtCancelTarget.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Center:</span>
                <span className="font-bold text-slate-800">{pendingIdtCancelTarget.voice_name || pendingIdtCancelTarget.parent_temple || 'Center'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-extrabold">
                <span className="text-slate-700">Registration Amount:</span>
                <span className="text-rose-700">₹{Number(pendingIdtCancelTarget.total_cost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 text-sky-950 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sky-900">
                <span>⚡ No Bank / UPI Refund Required</span>
              </div>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                Because this batch is pending IDT transfer and has not been executed by Accounts yet, this devotee will be removed directly. The accountant will only process the updated total for active attendees.
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={pendingIdtCancelReason}
                onChange={(e) => setPendingIdtCancelReason(e.target.value)}
                placeholder="e.g. Devotee unable to attend / personal emergency"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-rose-500 outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingIdtCancelTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Keep Registration
              </button>
              <button
                type="button"
                disabled={isCancellingPendingIdt}
                onClick={handleConfirmPendingIdtCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCancellingPendingIdt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMP OVERVIEW & PRESENTATION MODAL */}
      {selectedPreviewCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-purple-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Hero / Poster Banner: Fully visible uncropped photo */}
            <div className="relative h-36 sm:h-44 md:h-48 w-full bg-slate-950 shrink-0 overflow-hidden flex items-center justify-center">
              {selectedPreviewCamp.poster_url ? (
                <>
                  {/* Ambient blurred backdrop so letterboxing looks rich and seamless */}
                  <img
                    src={getThumbnailUrl(selectedPreviewCamp.poster_url) || selectedPreviewCamp.poster_url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                  />
                  {/* Clean uncropped poster photo */}
                  <img
                    src={getThumbnailUrl(selectedPreviewCamp.poster_url) || selectedPreviewCamp.poster_url}
                    alt={selectedPreviewCamp.title}
                    className="relative max-h-60 sm:max-h-80 w-auto max-w-full object-contain z-10 transition-transform duration-300"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-800 via-indigo-900 to-purple-950 p-5 sm:p-7 flex flex-col justify-end text-white relative">
                  <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="z-10">
                    <h2 className="text-xl sm:text-3xl font-black text-white leading-tight drop-shadow-md">
                      {selectedPreviewCamp.title}
                    </h2>
                  </div>
                </div>
              )}

              {/* Close Button Top-Right */}
              <button
                type="button"
                onClick={() => setSelectedPreviewCamp(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-30 border border-white/20 shadow-lg"
                title="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Title overlay at the bottom if poster exists */}
              {selectedPreviewCamp.poster_url && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 sm:p-6 z-20 pointer-events-none">
                  <h2 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                    {selectedPreviewCamp.title}
                  </h2>
                </div>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 text-xs sm:text-sm">
              {/* Colorful Announcement / Welcome Message */}
              {selectedPreviewCamp.banner_message && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 border border-purple-200/80 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Special Camp Announcement</span>
                  </div>
                  <p className="text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed">
                    {selectedPreviewCamp.banner_message}
                  </p>
                </div>
              )}

              {/* Camp Description / About Retreat Section */}
              {selectedPreviewCamp.description && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 border border-blue-200/80 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>About this Camp & Retreat</span>
                  </div>
                  <p className="text-slate-800 text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-line">
                    {selectedPreviewCamp.description}
                  </p>
                </div>
              )}

              {/* Camp Eligibility & Criteria Box: Formatted Hierarchy & Alignment */}
              {selectedPreviewCamp.criteria_message && (
                <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-emerald-50/90 border border-emerald-300 shadow-xs space-y-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs uppercase tracking-wider border-b border-emerald-200/80 pb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Participant Eligibility &amp; Criteria</span>
                  </div>
                  <FormattedCriteriaMessage text={selectedPreviewCamp.criteria_message} />
                </div>
              )}

              {/* Retreat Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Schedule &amp; Dates</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {new Date(selectedPreviewCamp.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' to '}
                      {new Date(selectedPreviewCamp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Retreat Venue</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {selectedPreviewCamp.venue || 'Central VOICE, Pune'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Banknote className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Base Registration Fee</span>
                    <span className="font-black text-purple-900 text-xs sm:text-sm">
                      {Number(selectedPreviewCamp.special_waivers?.base_registration_fee) > 0
                        ? `₹${Number(selectedPreviewCamp.special_waivers?.base_registration_fee).toLocaleString('en-IN')}`
                        : 'Included with meals'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Registration Deadline</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      {selectedPreviewCamp.registration_deadline
                        ? new Date(selectedPreviewCamp.registration_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Open till slots fill'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Camps / Categories */}
              {selectedPreviewCamp.tracks && selectedPreviewCamp.tracks.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Available Camps:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPreviewCamp.tracks.map((t) => {
                      const tPalette = getTrackColorPalette(t);
                      return (
                        <span
                          key={t}
                          className={`px-3 py-1 rounded-xl ${tPalette.badgeBg} text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs`}
                        >
                          <span className={`w-2 h-2 rounded-full ${tPalette.dotColor}`} />
                          <span>{t}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Camp POC Contact Card for Connect in Modal */}
              {(selectedPreviewCamp.default_poc_name || selectedPreviewCamp.default_poc_contact) && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-amber-800" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black text-amber-900 tracking-wider block">
                        Camp Point of Contact (POC)
                      </span>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {selectedPreviewCamp.default_poc_name || 'Camp Coordinator'}
                      </div>
                      {selectedPreviewCamp.default_poc_contact && (
                        <div className="text-xs font-mono font-bold text-slate-700">
                          {selectedPreviewCamp.default_poc_contact}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedPreviewCamp.default_poc_contact && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${selectedPreviewCamp.default_poc_contact.replace(/[^0-9+]/g, '')}`}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call POC</span>
                      </a>
                      <a
                        href={`https://wa.me/91${selectedPreviewCamp.default_poc_contact.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hare Krishna! Regarding ${selectedPreviewCamp.title} Camp Registration:`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>WhatsApp Chat</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPreviewCamp(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const campToRegister = selectedPreviewCamp;
                  setSelectedPreviewCamp(null);
                  handleSelectCampForRegistration(campToRegister);
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-700/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <span>Register Devotee Pass</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff & Admin QR Pass Scanner Modal */}
      <AdminCampQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        defaultCampId={scannerCampId}
        defaultCampTitle={scannerCampTitle}
      />
    </>
  );
}

// Smart Criteria Message Formatter: converts bullet points, nested letters and Roman numerals into clean typography
function FormattedCriteriaMessage({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-slate-800 text-xs sm:text-[13px] leading-relaxed font-sans">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1" />;
        }

        // Top-level numbered items: "1.", "2.", "3.", etc.
        const numMatch = line.match(/^(\d+[\.\)])\s*(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="font-bold text-slate-900 text-xs sm:text-sm pt-2 first:pt-0 flex items-start gap-2 border-b border-emerald-100 pb-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black shrink-0 mt-0.5 shadow-2xs">
                {numMatch[1].replace(/[\.\)]/, '')}
              </span>
              <span className="flex-1">{numMatch[2]}</span>
            </div>
          );
        }

        // Sub-items: "a.", "b.", "c.", "a)", etc.
        const letterMatch = line.match(/^([a-zA-Z][\.\)])\s*(.*)$/);
        if (letterMatch) {
          const content = letterMatch[2];
          return (
            <div key={idx} className="pl-3 sm:pl-6 flex items-start gap-2 text-slate-700">
              <span className="font-extrabold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded text-[11px] shrink-0 mt-0.5 shadow-2xs">
                {letterMatch[1]}
              </span>
              <span className="flex-1 font-medium">{formatBoldKeywords(content)}</span>
            </div>
          );
        }

        // Sub-sub-items: "i.", "ii.", "iii.", "iv.", "v.", etc.
        const romanMatch = line.match(/^(i{1,3}|iv|v|vi|vii|viii|ix|x)[\.\)]\s*(.*)$/i);
        if (romanMatch) {
          return (
            <div key={idx} className="pl-7 sm:pl-11 flex items-start gap-2 text-slate-600">
              <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[10.5px] shrink-0 mt-0.5 border border-teal-200/70">
                {romanMatch[1]}.
              </span>
              <span className="flex-1 font-normal text-[11.5px] sm:text-xs leading-relaxed">{formatBoldKeywords(romanMatch[2])}</span>
            </div>
          );
        }

        // Bullet points: "-", "*", "•"
        if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
          const content = line.replace(/^[-*•]\s*/, '');
          return (
            <div key={idx} className="pl-4 sm:pl-7 flex items-start gap-2 text-slate-700">
              <span className="text-emerald-500 font-black text-sm shrink-0 leading-none mt-1">&bull;</span>
              <span className="flex-1 font-medium">{formatBoldKeywords(content)}</span>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <p key={idx} className="pl-1 text-slate-700 font-medium leading-relaxed">
            {formatBoldKeywords(line)}
          </p>
        );
      })}
    </div>
  );
}

function formatBoldKeywords(text: string) {
  const colonIndex = text.indexOf(':');
  if (colonIndex > 0 && colonIndex < 40) {
    const label = text.slice(0, colonIndex + 1);
    const rest = text.slice(colonIndex + 1);
    return (
      <>
        <strong className="text-slate-900 font-bold">{label}</strong>
        {rest}
      </>
    );
  }
  return text;
}

export default function UserCampDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Loading Camp Portal...</h2>
        </div>
      }
    >
      <CampDashboardContent />
    </Suspense>
  );
}

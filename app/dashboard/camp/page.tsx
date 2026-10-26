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
  Building, UserCheck, Award, Tag, Gift, Percent,
  Landmark, UploadCloud, Copy, Check, AlertTriangle,
  Undo2, Banknote, RefreshCw, Ticket, Download,
  ExternalLink, ArrowLeft, Info, Shield, QrCode,
  Users, FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Camp, CampMealConfig, CampRegistration, CampCoupon, CampRefundRequest } from '@/types';
import { calculateDynamicCampCost, CalculatedCostResult } from '@/lib/camp-cost';
import {
  getActiveCampsForUserAction,
  getUserCampRegistrationsAction,
  submitCampRefundRequestAction,
  lookupCampRegistrationsAction,
  getUserAllocatedCampsAction
} from '@/app/dashboard/admin/camps/actions';
import CampPrasadamCard from '@/components/camps/CampPrasadamCard';
import AdminCampQrScannerModal from '@/components/camps/AdminCampQrScannerModal';

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
    const isBoth = isSuper || allRoles.includes('both') || (allRoles.includes('attendance') && allRoles.includes('refunds'));

    const canScan = isSuper || isBoth || allRoles.includes('scan_pass') || allRoles.includes('attendance') || allRoles.includes('prasadam');
    const canAttendance = isSuper || isBoth || allRoles.includes('attendance');
    const canRefunds = isSuper || isBoth || allRoles.includes('refunds');
    const canPrasadam = isSuper || isBoth || allRoles.includes('prasadam') || allRoles.includes('attendance');

    if (isBoth) {
      return {
        title: 'Full Camp Coordinator',
        pill: 'Full Coordinator',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        desc: 'Complete operational management: QR pass scanning, attendee ledger, kitchen tally & refunds.',
        canScan: true,
        canAttendance: true,
        canRefunds: true,
        canPrasadam: true,
      };
    }

    if (allRoles.length > 1) {
      const labels: string[] = [];
      if (canAttendance) labels.push('Attendance');
      if (allRoles.includes('prasadam') && !labels.includes('Prasadam')) labels.push('Prasadam');
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
          canPrasadam: false
        };
      case 'attendance':
        return {
          title: 'Attendance & Registrations',
          pill: 'Attendance Manager',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          desc: 'Full attendee ledger access, Excel export, ITT payment verification, and meal counters.',
          canScan: true,
          canAttendance: true,
          canRefunds: false,
          canPrasadam: true
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
          canPrasadam: false
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
          canPrasadam: true
        };
      case 'both':
      case 'super_admin':
      default:
        return {
          title: 'Full Camp Coordinator',
          pill: 'Full Coordinator',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          desc: 'Complete operational management: QR pass scanning, attendee ledger, kitchen tally & refunds.',
          canScan: true,
          canAttendance: true,
          canRefunds: true,
          canPrasadam: true
        };
    }
  };

  // Camp Data State
  const [activeCamps, setActiveCamps] = useState<(Camp & { registration_count?: number })[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
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
  })[]>([]);
  const [userRefunds, setUserRefunds] = useState<CampRefundRequest[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Registration Form State (Devotee details come directly from DB!)
  const [formData, setFormData] = useState({
    voiceName: '',
    participantName: '',
    whatsapp: '',
    parentTemple: '',
    counselorName: '',
    campTrack: '',
    firstMealDate: '',
    firstMealType: 'Breakfast',
    lastMealDate: '',
    lastMealType: 'Dinner',
    dinnerType: 'Dinner Meal',
    accommodation: 'No',
    gender: 'Male - Bachelor',
    participantType: 'Camp Participant',
    age: '',
    marriedSinceYear: '',
  });

  // Batch Entries for Group / Multiple attendees
  const [entries, setEntries] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Live Cost Preview
  const [liveCost, setLiveCost] = useState<CalculatedCostResult | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'RAZORPAY' | 'IDT' | 'INTER_TEMPLE_TRANSFER' | null>(null);
  const [idtSource, setIdtSource] = useState('');
  const [idtPasscode, setIdtPasscode] = useState('');
  const [ittTempleName, setIttTempleName] = useState('');
  const [ittTransactionRef, setIttTransactionRef] = useState('');
  const [ittScreenshotFile, setIttScreenshotFile] = useState<File | null>(null);
  const [ittScreenshotPreview, setIttScreenshotPreview] = useState<string | null>(null);
  const [ittUploading, setIttUploading] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Coupon / Promo Code State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CampCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Success State
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

  // 1. Fetch Active Camps
  const fetchActiveCamps = async () => {
    setCampsLoading(true);
    setCampsError(null);
    try {
      const res = await getActiveCampsForUserAction();
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
  }, [campParam]);

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
    setEntries([]);
    setEditIndex(null);
    setAppliedCoupon(null);
    setCouponInput('');
    setRegistrationSuccess(null);

    const meals = camp.meal_pricing || [];
    const firstMeal = meals.length > 0 ? String(meals[0].date) : '';
    const lastMeal = meals.length > 0 ? String(meals[meals.length - 1].date) : '';
    const initialTrack = camp.tracks?.[0] || 'GS Camp - 1st Timer';

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

    // Auto-populate Attendee #1 with devotee profile from DB!
    const initialFormData = {
      participantName: userData?.name || '',
      whatsapp: userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '',
      parentTemple: resolvedUserTemple,
      counselorName: userData?.hierarchy?.brahmachariCounselor || (userData as any)?.brahmachari_counselor || '',
      voiceName: resolvedUserCenter,
      campTrack: initialTrack,
      firstMealDate: firstMeal,
      firstMealType: 'Breakfast',
      lastMealDate: lastMeal,
      lastMealType: 'Dinner',
      dinnerType: 'Dinner Meal',
      accommodation: 'No',
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
          accommodation: 'No',
          participantType: 'Camp Participant',
          campTrack: initialTrack,
        },
        isLate
      );
      setLiveCost(initialCost);
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'gender') {
      const isFemale = value.startsWith('Female');
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        accommodation: isFemale ? 'No' : prev.accommodation,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.participantName.trim()) {
      alert('Please enter Participant full name');
      return;
    }

    const cleanWhatsapp = formData.whatsapp.replace(/[^0-9]/g, '');
    if (cleanWhatsapp.length !== 10) {
      alert('WhatsApp number must be exactly 10 digits');
      return;
    }

    if (!formData.age || Number(formData.age) < 1) {
      alert('Please enter a valid age');
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

    const newEntry = {
      ...formData,
      current_center: formData.voiceName,
      currentCenter: formData.voiceName,
      current_temple: formData.parentTemple,
      currentTemple: formData.parentTemple,
      voice_name: formData.voiceName,
      parent_temple: formData.parentTemple,
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
    const meals = selectedCamp?.meal_pricing || [];
    setFormData((prev) => ({
      ...prev,
      participantName: '',
      whatsapp: '',
      age: '',
      gender: 'Male - Bachelor',
      accommodation: 'No',
      firstMealDate: meals.length > 0 ? String(meals[0].date) : '',
      firstMealType: 'Breakfast',
      lastMealDate: meals.length > 0 ? String(meals[meals.length - 1].date) : '',
      lastMealType: 'Dinner',
      dinnerType: 'Dinner Meal',
    }));
  };

  const handleEditEntry = (index: number) => {
    const item = entries[index];
    setFormData({
      voiceName: item.voiceName || '',
      participantName: item.participantName || '',
      whatsapp: item.whatsapp || '',
      parentTemple: item.parentTemple || '',
      counselorName: item.counselorName || '',
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

  // Apply Coupon Code
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(null);

    const clean = couponInput.trim().toUpperCase();
    const coupons: CampCoupon[] = selectedCamp?.special_waivers?.coupons || [];
    const found = coupons.find((c) => c.code.trim().toUpperCase() === clean);

    if (!found) {
      setCouponError(`Promo code "${clean}" is invalid or expired.`);
      return;
    }

    if (found.max_uses && (found.used_count || 0) >= found.max_uses) {
      setCouponError(`Promo code "${clean}" has reached its maximum usage limit.`);
      return;
    }

    setAppliedCoupon(found);
    setCouponError(null);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Open Payment Modal
  const handleProceedToPayment = () => {
    if (entries.length === 0) {
      alert('Please add at least one participant entry before proceeding.');
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
      const payerName = userData?.name || 'Devotee';
      const payerContact = userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '';
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

      setRegistrationSuccess({
        groupId: json.groupId,
        count: json.count,
        totalPaid: finalPaidAmount,
        paymentMethod: paymentDetails.paymentMethod,
        pocName: payerName,
        pocContact: payerContact,
        email: payerEmail,
        entries,
      });

      setShowPaymentModal(false);
      fetchUserRegistrations(); // refresh passes
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Cancellation Modal (either for specific pass or general lookup)
  const handleOpenCancelModal = async (reg?: any) => {
    setShowCancelModal(true);
    setCancelError(null);
    setCancelSuccessResult(null);
    setCancelLookupError(null);

    if (reg) {
      // Find matching camp in activeCamps or create camp object from reg metadata
      const campMatch = activeCamps.find(c => c.id === reg.camp_id || c.slug === reg.camp_slug) ||
        (selectedCamp?.id === reg.camp_id ? selectedCamp : null) ||
        ({
          id: reg.camp_id,
          slug: reg.camp_slug,
          title: reg.camp_title,
          venue: reg.camp_venue,
          refund_config: reg.camp_refund_config,
          online_payment_surcharge_percent: 2,
        } as unknown as Camp);

      setCancelCamp(campMatch);
      const rawContact = reg.poc_contact || reg.whatsapp || reg.email || userData?.phone || user?.email || '';
      const queryId = rawContact.includes('@')
        ? rawContact.trim()
        : (rawContact.replace(/[^0-9]/g, '').slice(-10) || rawContact.trim());
      setCancelLookupQuery(queryId);

      if (queryId && campMatch?.id) {
        setCancelLookupLoading(true);
        try {
          const res = await lookupCampRegistrationsAction(campMatch.id, queryId);
          if (res.success && res.registrations && res.registrations.length > 0) {
            setCancelRegs(res.registrations);
            setCancelExistingRefunds(res.existingRefunds || []);
            if (res.camp) setCancelCamp(res.camp);
            // Select registrations that are not cancelled OR whose previous refund request was rejected
            const activeIds = res.registrations
              .filter((r: any) => {
                const m = (res.existingRefunds || []).find((ref: any) =>
                  ref.registration_id === r.id ||
                  (Array.isArray(ref.cancelled_registrations) && ref.cancelled_registrations.some((cr: any) => cr.reg_id === r.id))
                );
                return !r.is_cancelled || m?.status === 'rejected';
              })
              .map((r: any) => r.id!);
            setSelectedRegIdsToCancel(activeIds.length > 0 ? activeIds : [reg.id]);
          } else {
            setCancelRegs([reg]);
            setSelectedRegIdsToCancel([reg.id]);
          }
        } catch {
          setCancelRegs([reg]);
          setSelectedRegIdsToCancel([reg.id]);
        } finally {
          setCancelLookupLoading(false);
        }
      } else {
        setCancelRegs([reg]);
        setSelectedRegIdsToCancel([reg.id]);
      }
    } else {
      const defaultCamp = selectedCamp || (activeCamps.length > 0 ? activeCamps[0] : null);
      if (defaultCamp) setCancelCamp(defaultCamp);
      setCancelRegs(null);
      setSelectedRegIdsToCancel([]);
      const phoneDigits = userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '';
      const defaultQuery = phoneDigits || (user?.email || '').trim();
      setCancelLookupQuery(defaultQuery);

      if (defaultCamp && defaultQuery) {
        handleLookupForCancel(undefined, defaultCamp.id, defaultQuery);
      }
    }
  };

  const handleLookupForCancel = async (e?: React.FormEvent, overrideCampId?: string, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = (overrideQuery || cancelLookupQuery).trim();
    if (!queryToUse) return;

    // Normalize phone number (strip +91, non-digits) if not an email address
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
    setCancelRegs(null);
    setSelectedRegIdsToCancel([]);

    try {
      const res = await lookupCampRegistrationsAction(targetCamp.id || targetCamp.slug, cleanSearchQuery);
      if (res.success && res.registrations && res.registrations.length > 0) {
        setCancelRegs(res.registrations);
        setCancelExistingRefunds(res.existingRefunds || []);
        if (res.camp) setCancelCamp(res.camp);
        const activeIds = res.registrations
          .filter((r: any) => {
            const m = (res.existingRefunds || []).find((ref: any) =>
              ref.registration_id === r.id ||
              (Array.isArray(ref.cancelled_registrations) && ref.cancelled_registrations.some((cr: any) => cr.reg_id === r.id))
            );
            return !r.is_cancelled || m?.status === 'rejected';
          })
          .map((r: any) => r.id!);
        setSelectedRegIdsToCancel(activeIds);
      } else {
        setCancelLookupError(res.error || 'No registrations found matching this Phone number or Email.');
      }
    } catch (err: any) {
      setCancelLookupError(err.message || 'Error occurred while looking up booking.');
    } finally {
      setCancelLookupLoading(false);
    }
  };

  const computeLiveRefund = () => {
    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !cancelCamp) {
      return { totalRefund: 0, baseRefund: 0, mealRefund: 0, accRefund: 0, originalTotal: 0, tierLabel: '', baseRefundPercent: 100 };
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

    const baseRefundPercent = matchedTier ? Number(matchedTier.refund_percent) : 100;
    const tierLabel = matchedTier ? matchedTier.label : `Standard Policy (${baseRefundPercent}% Refund)`;

    let originalTotal = 0;
    let baseRefund = 0;
    let mealRefund = 0;
    let accRefund = 0;

    for (const reg of selectedRegs) {
      const orig = Number(reg.total_cost || 0);
      originalTotal += orig;

      const entryCost = Number(reg.entry_cost || 0);
      const discount = Number(reg.discount_amount || 0);
      const netEntryCost = Math.max(0, entryCost - discount);

      const mealCost = Number(reg.meal_cost || 0);
      const accCost = Number(reg.acc_cost || 0) + Number(reg.ac_cost || 0);

      // Base fee is any net fee excluding meals & accommodation (e.g. token fee, camp overhead)
      const baseCost = Math.max(0, netEntryCost - mealCost - accCost);
      const thisBaseRefund = Math.round(baseCost * (baseRefundPercent / 100));
      baseRefund += thisBaseRefund;

      if (refundConfig.refund_meals !== false) {
        mealRefund += Math.round(mealCost * (baseRefundPercent / 100));
      }
      if (refundConfig.refund_accommodation !== false) {
        accRefund += Math.round(accCost * (baseRefundPercent / 100));
      }
    }

    const totalRefund = Math.min(originalTotal, baseRefund + mealRefund + accRefund);
    return { totalRefund, baseRefund, mealRefund, accRefund, originalTotal, tierLabel, baseRefundPercent };
  };

  // Handle Cancellation Submission
  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !cancelCamp) return;

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
      });

      if (res.success && res.refundRequest) {
        setCancelSuccessResult({
          refundRequest: res.refundRequest,
          refundAmount: res.refundAmount,
          breakdown: res.breakdown,
        });
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

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-28 sm:pb-12">
        {/* Header Greeting Banner */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold mb-2 border border-white/20">
                <Tent className="w-3 h-3 text-amber-200" />
                <span>Devotee Camp Portal</span>
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                Camp Retreats &amp; Registrations
              </h1>
              <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-xl">
                Hare Krishna, <span className="font-bold underline decoration-amber-300">{userData?.name || user?.email}</span>! Explore upcoming youth camps, register passes, and manage your booked retreats.
              </p>

              {allocatedCamps.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 text-amber-200 text-[11px] font-bold border border-white/20">
                    <Shield className="w-3 h-3 text-amber-300 shrink-0" />
                    <span>Delegated Staff ({allocatedCamps.length} Camp{allocatedCamps.length > 1 ? 's' : ''})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('staff');
                      setSelectedCamp(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-slate-900 text-[11px] font-black hover:bg-amber-50 shadow-md transition-all cursor-pointer"
                  >
                    <span>Open Staff Desk &rarr;</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Profile Pill: Compact on mobile */}
            <div className="bg-black/20 backdrop-blur-md p-2.5 sm:p-4 rounded-xl border border-white/15 text-xs flex flex-wrap md:flex-col items-center md:items-start gap-x-3 gap-y-1 w-full md:w-auto shrink-0">
              <div className="flex items-center gap-1.5 text-white/90">
                <UserCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-semibold text-white truncate text-[11px] sm:text-xs">{userData?.name || 'Devotee'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">{userData?.phone || 'No phone set'}</span>
              </div>
              {userData?.hierarchy?.center && (
                <div className="flex items-center gap-1.5 text-white/80">
                  <Building className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs">{userData.hierarchy.center}</span>
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
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Tent className="w-3.5 h-3.5 shrink-0" />
            <span>Active Camps</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'camps' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {activeCamps.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('registrations');
              setSelectedCamp(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'registrations'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">My Bookings &amp; Passes</span>
            <span className="sm:hidden">My Passes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'registrations' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
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
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 ring-1 ring-amber-400/40'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Staff &amp; Coordinator Duty</span>
              <span className="sm:hidden">Staff Duty</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'staff' ? 'bg-amber-500 text-slate-950' : 'bg-amber-200 text-amber-950'
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
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
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
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Loading active camps...</p>
              </div>
            ) : campsError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 text-sm">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p>{campsError}</p>
                <button
                  onClick={fetchActiveCamps}
                  className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : activeCamps.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <Tent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">No Active Camps Right Now</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  New youth camps, spiritual retreats, and yatras will be posted here as soon as registrations open.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCamps.map((camp) => {
                  const deadlinePassed = camp.registration_deadline && new Date() > new Date(camp.registration_deadline);
                  const notStarted = camp.registration_start_date && new Date() < new Date(camp.registration_start_date);

                  return (
                    <div
                      key={camp.id}
                      className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Camp Header / Banner: Compact on Mobile */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3.5 sm:p-5 text-white relative">
                          <span className="inline-block px-2 sm:px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] sm:text-[10px] font-bold tracking-wider uppercase mb-1 sm:mb-2 border border-white/20">
                            Active Camp
                          </span>
                          <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug line-clamp-2">
                            {camp.title}
                          </h3>
                        </div>

                        {/* Camp Details: Compact on Mobile */}
                        <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3.5 text-xs text-gray-600">
                          {/* Dates */}
                          <div className="flex items-start gap-2 sm:gap-2.5">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {new Date(camp.start_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                {' - '}
                                {new Date(camp.end_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-[10px] sm:text-[11px] text-gray-500">Camp Duration</p>
                            </div>
                          </div>

                          {/* Venue */}
                          <div className="flex items-start gap-2 sm:gap-2.5">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-gray-900 line-clamp-1">{camp.venue || 'Camp Location'}</p>
                            </div>
                          </div>

                          {/* Tracks */}
                          {camp.tracks && camp.tracks.length > 0 && (
                            <div className="flex items-start gap-2 sm:gap-2.5">
                              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {camp.tracks.map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 sm:px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] sm:text-[10px] font-medium"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Base Fee & Cost Preview */}
                          <div className="pt-1.5 sm:pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] sm:text-[11px] text-gray-500">Base Registration Fee:</span>
                            <span className="text-xs sm:text-sm font-black text-amber-700">
                              {Number(camp.special_waivers?.base_registration_fee) > 0 ? `₹${Number(camp.special_waivers?.base_registration_fee).toLocaleString('en-IN')}` : 'Included in meals'}
                            </span>
                          </div>

                          {/* Registration Deadline */}
                          {camp.registration_deadline && (
                            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500">
                              <span>Deadline:</span>
                              <span className={deadlinePassed ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'}>
                                {new Date(camp.registration_deadline).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Staff Duty Section on Card if user is assigned */}
                      {(() => {
                        const staffAlloc = allocatedCamps.find((a) => a.id === camp.id);
                        if (!staffAlloc) return null;
                        const meta = getStaffRoleMeta(staffAlloc.user_role, (staffAlloc as any).user_roles);
                        return (
                          <div className="px-3.5 sm:px-5 pb-3">
                            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 sm:p-3 text-white shadow-xs space-y-1.5 sm:space-y-2">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 truncate">
                                    Duty: {meta.pill}
                                  </span>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold shrink-0">
                                  Assigned
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-tight line-clamp-2">
                                {meta.desc}
                              </p>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {meta.canScan && (
                                  <button
                                    onClick={() => {
                                      setScannerCampId(camp.id);
                                      setScannerCampTitle(camp.title);
                                      setIsScannerOpen(true);
                                    }}
                                    className="flex-1 min-w-[120px] py-1.5 px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                                  >
                                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                                    <span>Pass Scanner</span>
                                  </button>
                                )}

                                {meta.canAttendance && (
                                  <Link
                                    href={`/dashboard/admin/camps/${camp.id}/registrations`}
                                    className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 border border-white/20 transition-all"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Attendees &amp; Excel</span>
                                  </Link>
                                )}

                                {meta.canPrasadam && (
                                  <Link
                                    href={`/dashboard/admin/camps/${camp.id}/registrations?view=prasadam`}
                                    className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 border border-white/20 transition-all"
                                  >
                                    <Utensils className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                    <span>Kitchen Tally</span>
                                  </Link>
                                )}

                                {meta.canRefunds && (
                                  <Link
                                    href={`/dashboard/admin/camps/${camp.id}/registrations?view=refunds`}
                                    className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 border border-white/20 transition-all"
                                  >
                                    <Undo2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>Refunds Desk</span>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card Action */}
                      <div className="p-5 pt-0">
                        {deadlinePassed ? (
                          <div className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-xl text-center font-bold text-xs">
                            Registrations Closed
                          </div>
                        ) : notStarted ? (
                          <div className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-xl text-center font-bold text-xs">
                            Opens {new Date(camp.registration_start_date!).toLocaleDateString('en-IN')}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectCampForRegistration(camp)}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-center font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>Register Devotee Pass</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">My Registered Camp Passes</h2>
                <p className="text-xs text-gray-500">
                  Passes registered under your mobile number ({userData?.phone || 'none'}) and email ({user?.email})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCancelModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Manage / Cancel Registration</span>
                </button>
                <button
                  onClick={fetchUserRegistrations}
                  disabled={regsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {regsLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Loading your passes...</p>
              </div>
            ) : userRegistrations.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">No Registrations Yet</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  You haven&apos;t registered for any camps yet. Browse active camps and book your retreat spot!
                </p>
                <button
                  onClick={() => setActiveTab('camps')}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20"
                >
                  Browse Active Camps
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRegistrations.map((reg) => {
                  const refund = userRefunds.find(
                    (ref) => ref.registration_id === reg.id || ref.group_id === reg.group_id
                  );

                  return (
                    <div
                      key={reg.id}
                      className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1">
                              {reg.camp_track || 'Camp Attendee'}
                            </span>
                            <h3 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                              {reg.camp_title}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                              Attendee: <span className="font-semibold text-gray-800">{reg.participant_name}</span>
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="text-right flex-shrink-0">
                            {refund?.status === 'refunded' ? (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                <Check className="w-3 h-3" />
                                Refunded (₹{refund.refund_amount})
                              </span>
                            ) : refund?.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                <Clock className="w-3 h-3" />
                                Refund Pending
                              </span>
                            ) : reg.is_cancelled ? (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <X className="w-3 h-3" />
                                Cancelled
                              </span>
                            ) : reg.payment_status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" />
                                Confirmed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Verification Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details grid: Compact on Mobile */}
                        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs space-y-1 sm:space-y-1.5 border border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Booking Group:</span>
                            <span className="font-mono font-bold text-gray-700">{reg.group_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Venue & City:</span>
                            <span className="font-medium text-gray-800 truncate max-w-[180px]">{reg.camp_venue}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Accommodation:</span>
                            <span className="font-medium text-gray-800">{reg.accommodation === 'Yes' ? 'Provided (Included)' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Paid:</span>
                            <span className="font-bold text-amber-700">₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pass Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2 pt-2.5 sm:pt-4 border-t border-gray-100 mt-2.5 sm:mt-4">
                        <button
                          onClick={() => setViewTicketReg({
                            ...reg,
                            center: (reg.voice_name && !['none', 'null', 'undefined', 'n/a', '-'].includes(reg.voice_name.toLowerCase()))
                              ? reg.voice_name
                              : (userData?.hierarchy?.center || (userData as any)?.center || '')
                          })}
                          className="flex-1 py-1.5 sm:py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg sm:rounded-xl text-[11px] sm:text-xs border border-amber-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>View Ticket Pass</span>
                        </button>

                        {!reg.is_cancelled && (!refund || refund.status === 'rejected') && (
                          <button
                            onClick={() => handleOpenCancelModal(reg)}
                            className="py-1.5 sm:py-2 px-2.5 sm:px-3 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-lg sm:rounded-xl text-[11px] sm:text-xs border border-rose-200 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
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
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl border border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center sm:items-start gap-2.5 sm:gap-3.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-2xl font-black tracking-tight text-white leading-tight">Staff &amp; Coordinator Duty</h2>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] sm:text-[11px] font-bold">
                        {allocatedCamps.length} Active {allocatedCamps.length === 1 ? 'Camp' : 'Camps'}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-sm text-slate-300 mt-0.5 sm:mt-1 max-w-2xl leading-relaxed">
                      Access your assigned operational desks below to verify attendee passes and manage registrations.
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchAllocatedCamps}
                  className="w-full sm:w-auto px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${allocationsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Duties</span>
                </button>
              </div>
            </div>

            {allocationsLoading ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Loading your delegated staff duties...</p>
              </div>
            ) : allocatedCamps.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">No Camp Staff Allocations</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  You are not currently delegated as a staff member or coordinator for any camp. Contact your temple camp administrator or super admin to assign your roles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {allocatedCamps.map((camp) => {
                  const meta = getStaffRoleMeta(camp.user_role, (camp as any).user_roles);
                  return (
                    <div
                      key={camp.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Camp Header */}
                        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-start justify-between gap-3 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${meta.badgeClass}`}>
                                {meta.pill}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                Status: {camp.status?.toUpperCase() || 'ACTIVE'}
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                              {camp.title}
                            </h3>
                          </div>
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 sm:p-5 space-y-3 text-xs text-gray-600">
                          {/* Role Scope Banner */}
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mb-1">
                              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>{meta.title}</span>
                            </div>
                            <p className="text-[11px] sm:text-[11.5px] text-amber-950 leading-relaxed">
                              {meta.desc}
                            </p>
                            {camp.staff_notes && (
                              <p className="text-[10.5px] text-amber-800/80 mt-1.5 pt-1.5 border-t border-amber-200/60 italic">
                                Note: &ldquo;{camp.staff_notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Camp Date & Venue */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-gray-900">
                                  {new Date(camp.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  {' - '}
                                  {new Date(camp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-gray-500">Camp Dates</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-gray-900 line-clamp-1">{camp.venue || 'Camp Venue'}</p>
                                <p className="text-[10px] text-gray-500">Location</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Tools / Counters */}
                      <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 bg-slate-50/50 mt-2">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 pt-3">
                          Authorized Action Desks:
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                          {meta.canScan && (
                            <button
                              onClick={() => {
                                setScannerCampId(camp.id);
                                setScannerCampTitle(camp.title);
                                setIsScannerOpen(true);
                              }}
                              className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                            >
                              <QrCode className="w-4 h-4 shrink-0" />
                              <span>Open Pass Scanner</span>
                            </button>
                          )}

                          {meta.canAttendance && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations`}
                              className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-300 shadow-sm transition-all text-center"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Attendees &amp; Excel</span>
                            </Link>
                          )}

                          {meta.canPrasadam && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations?view=prasadam`}
                              className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-orange-50 text-orange-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-orange-200 shadow-sm transition-all text-center"
                            >
                              <Utensils className="w-4 h-4 text-orange-600 shrink-0" />
                              <span>Prasadam &amp; Kitchen Tally</span>
                            </Link>
                          )}

                          {meta.canRefunds && (
                            <Link
                              href={`/dashboard/admin/camps/${camp.id}/registrations?view=refunds`}
                              className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-rose-200 shadow-sm transition-all text-center"
                            >
                              <Undo2 className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Refunds Desk</span>
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
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Camp Registration Confirmed!</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Hare Krishna! Your registration has been successfully recorded under group reference:{' '}
                    <span className="font-mono font-bold text-amber-700">{registrationSuccess.groupId}</span>
                  </p>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Profile Card & Attendee Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Step 1: Verified Devotee Profile (Automatic from DB) */}
                  <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          1
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">
                          Devotee Profile & POC (Auto-filled from Database)
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Profile
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Your name, contact number, and email are automatically applied to this booking. No manual re-typing required.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 rounded-xl p-3.5 border border-amber-200/60 text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Payer / Devotee</span>
                        <span className="font-bold text-gray-800">{userData?.name || 'Devotee'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Mobile / WhatsApp</span>
                        <span className="font-bold text-gray-800">{userData?.phone || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Email</span>
                        <span className="font-bold text-gray-800 truncate block">{user?.email}</span>
                      </div>
                      {userData?.hierarchy?.center && (
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Home Center</span>
                          <span className="font-medium text-gray-700">{userData.hierarchy.center}</span>
                        </div>
                      )}
                      {userData?.hierarchy?.brahmachariCounselor && (
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Counselor</span>
                          <span className="font-medium text-gray-700">{userData.hierarchy.brahmachariCounselor}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Attendee Form */}
                  <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          2
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">
                          {editIndex !== null ? 'Edit Attendee Details' : 'Add Attendee (Pre-filled for You)'}
                        </h3>
                      </div>
                      {editIndex !== null && (
                        <button
                          onClick={() => setEditIndex(null)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            Participant Full Name *
                          </label>
                          <input
                            type="text"
                            name="participantName"
                            value={formData.participantName}
                            onChange={handleFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Full Name"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            WhatsApp Contact *
                          </label>
                          <input
                            type="tel"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleFormChange}
                            required
                            maxLength={10}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="10-digit number"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            Camp Track *
                          </label>
                          <select
                            name="campTrack"
                            value={formData.campTrack}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                          >
                            {(selectedCamp.tracks || ['GS Camp - 1st Timer']).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            Gender / Category *
                          </label>
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                          >
                            <option value="Male - Bachelor">Male - Bachelor</option>
                            <option value="Male - Married">Male - Married</option>
                            <option value="Female - Unmarried">Female - Unmarried</option>
                            <option value="Female - Married">Female - Married</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            Age *
                          </label>
                          <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleFormChange}
                            required
                            min={5}
                            max={100}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Age"
                          />
                        </div>
                      </div>

                      {/* SECTION: MEALS & STAY ITINERARY (Matching Public Registration Page) */}
                      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3.5 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200/80">
                          <Utensils className="w-4 h-4 text-amber-600" />
                          <span>Meals &amp; Stay Itinerary</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Arrival First Meal Date *
                            </label>
                            <select
                              name="firstMealDate"
                              value={formData.firstMealDate}
                              onChange={handleFormChange}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                            >
                              {(selectedCamp.meal_pricing || []).map((m) => (
                                <option key={String(m.date)} value={String(m.date)}>
                                  {formatMealOptionLabel(m, selectedCamp.start_date)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              First Meal Slot *
                            </label>
                            <select
                              name="firstMealType"
                              value={formData.firstMealType}
                              onChange={handleFormChange}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                            >
                              <option value="Breakfast">Breakfast</option>
                              <option value="Lunch">Lunch</option>
                              <option value="Dinner">Dinner</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Departure Last Meal Date *
                            </label>
                            <select
                              name="lastMealDate"
                              value={formData.lastMealDate}
                              onChange={handleFormChange}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                            >
                              {(selectedCamp.meal_pricing || []).map((m) => (
                                <option key={String(m.date)} value={String(m.date)}>
                                  {formatMealOptionLabel(m, selectedCamp.start_date)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Last Meal Slot *
                            </label>
                            <select
                              name="lastMealType"
                              value={formData.lastMealType}
                              onChange={handleFormChange}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                            >
                              <option value="Breakfast">Breakfast</option>
                              <option value="Lunch">Lunch</option>
                              <option value="Dinner">Dinner</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Dinner Meal Preference
                            </label>
                            <select
                              name="dinnerType"
                              value={formData.dinnerType}
                              onChange={handleFormChange}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                            >
                              <option value="Dinner Meal">Complete Dinner Meal</option>
                              <option value="Only Milk">Only Milk</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Accommodation from Central VOICE
                            </label>
                            {formData.gender.startsWith('Female') && !selectedCamp.accommodation_pricing?.allow_female_cv_accommodation ? (
                              <div className="px-3 py-2 rounded-xl bg-slate-200/70 text-xs text-slate-700 font-semibold border border-slate-300">
                                Arranged externally for Matajis / Females
                              </div>
                            ) : (
                              <select
                                name="accommodation"
                                value={formData.accommodation}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                              >
                                <option value="Yes">Yes, I need accommodation from CV</option>
                                <option value="No">No, I do not need accommodation</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Live Cost Preview Widget (Matching Image 2) */}
                      {liveCost && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-amber-200/90 flex flex-wrap items-center justify-between gap-5 text-xs shadow-xs">
                          <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-slate-700">
                            <div>
                              <span className="text-slate-400 block text-[11px] font-semibold">Meals ({liveCost.mealCount})</span>
                              <span className="font-bold text-slate-900 text-base sm:text-lg">₹{liveCost.mealCost}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px] font-semibold">Stay ({liveCost.daysOfStay} days)</span>
                              <span className="font-bold text-slate-900 text-base sm:text-lg">₹{liveCost.accCost}</span>
                            </div>
                            {liveCost.acCost > 0 && (
                              <div>
                                <span className="text-slate-400 block text-[11px] font-semibold">
                                  {selectedCamp.accommodation_pricing?.facility_charge_label || 'Other Charges'}
                                </span>
                                <span className="font-bold text-slate-900 text-base sm:text-lg">₹{liveCost.acCost}</span>
                              </div>
                            )}
                            {liveCost.baseCost > 0 && (
                              <div>
                                <span className="text-slate-400 block text-[11px] font-semibold">
                                  {liveCost.baseCostLabel || 'Camp Booklet & Study Material'}
                                </span>
                                <span className="font-bold text-amber-800 text-base sm:text-lg">₹{liveCost.baseCost}</span>
                              </div>
                            )}
                            {liveCost.lateFee > 0 && (
                              <div>
                                <span className="text-slate-400 block text-[11px] font-semibold">Late Fee</span>
                                <span className="font-bold text-rose-600 text-base sm:text-lg">₹{liveCost.lateFee}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
                              ENTRY FEE
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
                              ₹{liveCost.totalCost}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 px-7 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{editIndex !== null ? 'Update Attendee' : 'Add Devotee to Batch'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* List of Added Attendees */}
                  {entries.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">
                          Attendees in this Booking ({entries.length})
                        </h3>
                        <span className="text-xs font-bold text-amber-700">
                          Subtotal: ₹{grandTotalBeforeCoupon.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {entries.map((entry, idx) => (
                          <div
                            key={idx}
                            className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800">{entry.participantName}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px]">
                                  {entry.campTrack}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                WhatsApp: {entry.whatsapp} • Acc: {entry.accommodation} • Age: {entry.age}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-800">₹{entry.totalCost}</span>
                              <button
                                onClick={() => handleEditEntry(idx)}
                                className="p-1 text-gray-400 hover:text-amber-600"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(idx)}
                                className="p-1 text-gray-400 hover:text-rose-600"
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

                {/* Right Col: Booking Summary & Checkout */}
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-4 sticky top-20">
                    <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
                      Booking Summary
                    </h3>

                    <div className="text-xs space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Camp:</span>
                        <span className="font-semibold text-gray-800 text-right">{selectedCamp.title}</span>
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
                        <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded-lg font-semibold">
                          <span>Promo ({appliedCoupon.code}):</span>
                          <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                        <span className="text-sm font-bold text-gray-900">Total Payable:</span>
                        <span className="text-xl font-black text-amber-700">
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
                            className="text-[11px] text-rose-600 font-semibold hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleApplyCoupon} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Coupon / Promo Code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold"
                          >
                            Apply
                          </button>
                        </form>
                      )}
                      {couponError && (
                        <p className="text-[10px] text-rose-600 mt-1 font-medium">{couponError}</p>
                      )}
                    </div>

                    {/* Checkout Button */}
                    <button
                      onClick={handleProceedToPayment}
                      disabled={entries.length === 0}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                        entries.length > 0
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-600/30'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed to Payment (₹{grandTotal.toLocaleString('en-IN')})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PAYMENT METHOD SELECTION MODAL: Matching Image 2 */}
      {showPaymentModal && selectedCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Select Payment Method
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedMethod(null);
                  setPaymentError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {paymentError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {!selectedMethod ? (
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

                  {selectedCamp.payment_config?.enable_idt && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('IDT')}
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

                  {selectedCamp.payment_config?.enable_itt && (
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
              ) : selectedMethod === 'RAZORPAY' ? (
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

                  <div className="flex gap-2">
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
              ) : selectedMethod === 'IDT' ? (
                /* IDT FORM */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>This option is only available to ISKCON NVCC connected centers.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      VOICE Name / Department (Deduction Source) *
                    </label>
                    <input
                      type="text"
                      required
                      value={idtSource}
                      onChange={(e) => setIdtSource(e.target.value)}
                      placeholder="e.g. Pune Camp VOICE, Nilachal Dept"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      IDT Authorization Passcode *
                    </label>
                    <input
                      type="password"
                      required
                      value={idtPasscode}
                      onChange={(e) => setIdtPasscode(e.target.value)}
                      placeholder="Enter security key"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Collect authorization passcode from Central VOICE.
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
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
              ) : (
                /* INTER-TEMPLE TRANSFER FORM */
                <div className="space-y-4">
                  {/* Bank Details Display Card */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                          Temple Bank Account Details
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-700">
                        Amount: ₹{grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Beneficiary Name</span>
                        <span className="font-bold text-slate-900">{selectedCamp.payment_config?.itt_bank_details?.account_name || 'Central VOICE Pune'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Bank Name</span>
                        <span className="font-bold text-slate-900">{selectedCamp.payment_config?.itt_bank_details?.bank_name || 'State Bank of India'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Account Number</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {selectedCamp.payment_config?.itt_bank_details?.account_number || '---'}
                          </span>
                          {selectedCamp.payment_config?.itt_bank_details?.account_number && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCamp.payment_config?.itt_bank_details?.account_number || '', 'acc')}
                              className="text-slate-400 hover:text-emerald-700 text-xs"
                              title="Copy Account Number"
                            >
                              {copiedBankField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">IFSC Code</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-slate-900">
                            {selectedCamp.payment_config?.itt_bank_details?.ifsc_code || '---'}
                          </span>
                          {selectedCamp.payment_config?.itt_bank_details?.ifsc_code && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCamp.payment_config?.itt_bank_details?.ifsc_code || '', 'ifsc')}
                              className="text-slate-400 hover:text-emerald-700 text-xs"
                              title="Copy IFSC Code"
                            >
                              {copiedBankField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedCamp.payment_config?.itt_bank_details?.branch_name && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Branch</span>
                          <span className="font-medium text-slate-800">{selectedCamp.payment_config.itt_bank_details.branch_name}</span>
                        </div>
                      )}

                      {selectedCamp.payment_config?.itt_bank_details?.upi_id && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">UPI ID / VPA</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-emerald-800">
                              {selectedCamp.payment_config.itt_bank_details.upi_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCamp.payment_config?.itt_bank_details?.upi_id || '', 'upi')}
                              className="text-slate-400 hover:text-emerald-700 text-xs"
                              title="Copy UPI ID"
                            >
                              {copiedBankField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedCamp.payment_config?.itt_bank_details?.instructions && (
                      <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-900 font-medium">
                        💡 {selectedCamp.payment_config.itt_bank_details.instructions}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Temple / Center Name (Sender) *
                    </label>
                    <input
                      type="text"
                      required
                      value={ittTempleName}
                      onChange={(e) => setIttTempleName(e.target.value)}
                      placeholder="e.g. ISKCON Bangalore, ISKCON NVCC"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bank UTR / Transaction Reference Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={ittTransactionRef}
                      onChange={(e) => setIttTransactionRef(e.target.value)}
                      placeholder="e.g. UTR123456789012"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    {ittScreenshotPreview && (
                      <div className="mt-2">
                        <img
                          src={ittScreenshotPreview}
                          alt="Transfer Receipt Preview"
                          className="h-24 w-auto rounded-lg border border-slate-200 object-cover shadow-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="px-4 py-2.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || ittUploading}
                      onClick={submitIttPayment}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting || ittUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading &amp; Submitting...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Submit Transfer Details (₹{grandTotal.toLocaleString('en-IN')})</span>
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
      {viewTicketReg && (
        <CampPrasadamCard
          registration={viewTicketReg}
          userProfile={userData}
          onClose={() => setViewTicketReg(null)}
        />
      )}

      {/* CANCELLATION & REFUND MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Undo2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Manage / Cancel Registration
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lookup your booking, select batch devotees to cancel, and request refunds
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
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SUCCESS CONFIRMATION VIEW */}
            {cancelSuccessResult ? (
              <div className="space-y-4 text-center py-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Request Submitted
                  </span>
                  <h4 className="text-lg font-black text-slate-900">
                    Cancellation &amp; Refund Request Logged
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your request has been forwarded to ISKCON NVCC Accounts team.
                  </p>
                </div>

                {/* Refund Summary Card */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-left text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-amber-200/60">
                    <span className="text-slate-600">Calculated Refund Amount:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      ₹{Number(cancelSuccessResult.refundAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {Number(cancelSuccessResult.breakdown?.base_fee_refund || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-amber-200/60 text-[11px]">
                      <span className="text-slate-500">Base Registration Fee Refund:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{cancelSuccessResult.breakdown?.base_fee_refund || 0}
                      </span>
                    </div>
                  )}
                  {Number(cancelSuccessResult.breakdown?.meal_refund || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-amber-200/60 text-[11px]">
                      <span className="text-slate-500">Meals Cost Refund:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{cancelSuccessResult.breakdown?.meal_refund || 0}
                      </span>
                    </div>
                  )}
                  {Number(cancelSuccessResult.breakdown?.acc_refund || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-amber-200/60 text-[11px]">
                      <span className="text-slate-500">Stay / Room Charges Refund:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{cancelSuccessResult.breakdown?.acc_refund || 0}
                      </span>
                    </div>
                  )}
                  {Number(cancelSuccessResult.breakdown?.base_fee_refund || 0) === 0 &&
                   Number(cancelSuccessResult.breakdown?.meal_refund || 0) === 0 &&
                   Number(cancelSuccessResult.breakdown?.acc_refund || 0) === 0 && (
                    <div className="flex justify-between py-1 border-b border-amber-200/60 text-[11px]">
                      <span className="text-slate-500">Refund Breakdown:</span>
                      <span className="font-semibold text-slate-800">₹0</span>
                    </div>
                  )}
                  <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Refund Payout Target:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {cancelPayoutType === 'UPI' ? cancelUpiId : `A/c: ${cancelAccountNumber}`}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed text-left">
                  ℹ️ <strong>Transfer Timeline:</strong> Refunds are credited manually via bank / UPI transfer by NVCC accounts within <strong>5-7 working days</strong>. Gateway processing fees are non-refundable.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelRegs(null);
                    setCancelLookupQuery('');
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Done &amp; Close
                </button>
              </div>
            ) : !cancelRegs ? (
              /* STEP 1: LOOKUP BOOKING */
              <div className="space-y-4">
                <form onSubmit={handleLookupForCancel} className="space-y-3">
                  {activeCamps.length > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Select Camp Retreat
                      </label>
                      <select
                        value={cancelCamp?.id || ''}
                        onChange={(e) => {
                          const found = activeCamps.find(c => c.id === e.target.value);
                          if (found) setCancelCamp(found);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none cursor-pointer"
                      >
                        {activeCamps.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Enter Your Registered WhatsApp Phone Number or Email *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={cancelLookupQuery}
                        onChange={(e) => setCancelLookupQuery(e.target.value)}
                        placeholder="e.g. 9876543210 or devotee@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                  </div>

                  {cancelLookupError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{cancelLookupError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={cancelLookupLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {cancelLookupLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching Booking...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Find My Registration</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Display Camp Refund Policy Tiers for Awareness */}
                {cancelCamp?.refund_config?.refund_policy_rules && cancelCamp.refund_config.refund_policy_rules.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Camp Cancellation &amp; Refund Policy:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-600">
                      {cancelCamp.refund_config.refund_policy_rules.map((tier, idx) => (
                        <li key={tier.id || idx} className="flex items-center justify-between">
                          <span>
                            {tier.cutoff_date ? `Before ${tier.cutoff_date}:` : 'Default / Late cutoff:'}
                          </span>
                          <span className="font-bold text-amber-700">
                            {tier.refund_percent}% of Base Fee ({tier.label})
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                      * Payment gateway surcharge ({Number((cancelCamp as any)?.online_payment_surcharge_percent ?? 2)}% processing fee) is non-refundable. Eligible unconsumed meals and accommodation are refunded.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* STEP 2: SELECT DEVOTEES TO CANCEL (TRAIN CANCELLATION STYLE) & ENTER PAYOUT DETAILS */
              <form onSubmit={handleSubmitCancellation} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Point of Contact</span>
                    <span className="font-bold text-slate-900">{cancelRegs[0]?.poc_name || userData?.name} ({cancelRegs[0]?.poc_contact || userData?.phone})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelRegs(null);
                      setCancelLookupQuery('');
                    }}
                    className="text-[11px] text-amber-600 hover:underline font-bold cursor-pointer"
                  >
                    Change Lookup
                  </button>
                </div>

                {cancelError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{cancelError}</span>
                  </div>
                )}

                {/* Devotees List with Checkboxes (Train Ticket Style) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Select Devotee(s) to Cancel:
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {selectedRegIdsToCancel.length} of {cancelRegs.length} Selected
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cancelRegs.map((reg) => {
                      const matchingRefund = cancelExistingRefunds.find(r => {
                        if (r.registration_id === reg.id) return true;
                        if (Array.isArray(r.cancelled_registrations)) {
                          return r.cancelled_registrations.some((cr: any) => cr.reg_id === reg.id);
                        }
                        return false;
                      });

                      const isRefundRejected = matchingRefund?.status === 'rejected';
                      const isAlreadyCancelled = reg.is_cancelled && !isRefundRejected;
                      const isChecked = selectedRegIdsToCancel.includes(reg.id!);

                      return (
                        <div
                          key={reg.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                            isAlreadyCancelled
                              ? 'bg-slate-100 border-slate-200 opacity-60'
                              : isChecked
                              ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              disabled={isAlreadyCancelled}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegIdsToCancel(prev => [...prev, reg.id!]);
                                } else {
                                  setSelectedRegIdsToCancel(prev => prev.filter(id => id !== reg.id!));
                                }
                              }}
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                <span>{reg.participant_name}</span>
                                {isAlreadyCancelled && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                    Already Cancelled {matchingRefund?.status === 'refunded' ? '(Refunded)' : '(Pending Payout)'}
                                  </span>
                                )}
                                {isRefundRejected && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-bold" title={matchingRefund?.admin_notes || 'Refund rejected'}>
                                    Previous Refund Rejected{matchingRefund?.admin_notes ? `: ${matchingRefund.admin_notes}` : ''} • Select to Re-apply
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {reg.camp_track} • {reg.gender} {reg.age ? `• ${reg.age} yrs` : ''}
                              </div>
                            </div>
                          </label>

                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900 block">
                              ₹{Number(reg.total_cost || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">Paid Fee</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Computed Refund Box */}
                {(() => {
                  const live = computeLiveRefund();
                  const surchargePercent = Number((cancelCamp as any)?.online_payment_surcharge_percent ?? 2);
                  return (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-amber-600" />
                          Refund Policy Applied
                        </span>
                        <span className="text-[11px] font-bold text-amber-800">
                          {live.tierLabel}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-600">
                        {live.baseRefundPercent === 0 ? (
                          <div className="flex justify-between text-rose-600 font-bold py-1">
                            <span>Refund Eligibility:</span>
                            <span>No Refund (0% policy applied)</span>
                          </div>
                        ) : (
                          <>
                            {live.baseRefund > 0 && (
                              <div className="flex justify-between">
                                <span>Base Fee Refund ({live.baseRefundPercent}%):</span>
                                <span className="font-bold text-slate-800">₹{live.baseRefund}</span>
                              </div>
                            )}
                            {cancelCamp?.refund_config?.refund_meals !== false && live.mealRefund > 0 && (
                              <div className="flex justify-between">
                                <span>Unconsumed Meals Refund ({live.baseRefundPercent}%):</span>
                                <span className="font-bold text-slate-800">₹{live.mealRefund}</span>
                              </div>
                            )}
                            {cancelCamp?.refund_config?.refund_accommodation !== false && live.accRefund > 0 && (
                              <div className="flex justify-between">
                                <span>Unconsumed Stay / Room Refund ({live.baseRefundPercent}%):</span>
                                <span className="font-bold text-slate-800">₹{live.accRefund}</span>
                              </div>
                            )}
                            {live.originalTotal > live.totalRefund && (
                              <div className="flex justify-between text-rose-700 font-semibold pt-1 border-t border-dashed border-amber-200">
                                <span>Cancellation Fee / Retained ({100 - live.baseRefundPercent}%):</span>
                                <span>-₹{(live.originalTotal - live.totalRefund).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between text-slate-400">
                          <span>Gateway Processing Fee {surchargePercent > 0 ? `(${surchargePercent}%)` : ''}:</span>
                          <span>Non-refundable</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-sm">
                        <span className="font-bold text-amber-950">Total Refund Due:</span>
                        <span className="text-base font-black text-emerald-700">
                          ₹{live.totalRefund.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Payout Details Section */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Select Payout Destination:
                    </label>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCancelPayoutType('UPI')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cancelPayoutType === 'UPI'
                            ? 'bg-white text-emerald-800 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        ⚡ UPI ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelPayoutType('BANK')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cancelPayoutType === 'BANK'
                            ? 'bg-white text-blue-800 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        🏛️ Bank Transfer
                      </button>
                    </div>
                  </div>

                  {cancelPayoutType === 'UPI' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Your UPI ID / VPA *
                      </label>
                      <input
                        type="text"
                        required
                        value={cancelUpiId}
                        onChange={(e) => setCancelUpiId(e.target.value)}
                        placeholder="e.g. devotee@okhdfcbank or 9876543210@paytm"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={cancelAccountName}
                          onChange={(e) => setCancelAccountName(e.target.value)}
                          placeholder="e.g. Radheshyam Das"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={cancelBankName}
                          onChange={(e) => setCancelBankName(e.target.value)}
                          placeholder="e.g. State Bank of India"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={cancelAccountNumber}
                          onChange={(e) => setCancelAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Confirm Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={cancelConfirmAccount}
                          onChange={(e) => setCancelConfirmAccount(e.target.value)}
                          placeholder="Re-enter Account Number"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Bank IFSC Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={cancelIfscCode}
                          onChange={(e) => setCancelIfscCode(e.target.value.toUpperCase())}
                          placeholder="e.g. SBIN0001234"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Reason for Cancellation
                    </label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none cursor-pointer"
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
                        className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-amber-500 outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelRegs(null);
                      setCancelLookupQuery('');
                    }}
                    className="px-4 py-2.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    &larr; Back
                  </button>

                  <button
                    type="submit"
                    disabled={cancelSubmitting || selectedRegIdsToCancel.length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {cancelSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-4 h-4" />
                        <span>Confirm &amp; Submit Refund Request (₹{computeLiveRefund().totalRefund})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
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

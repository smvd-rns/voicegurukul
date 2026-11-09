'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Undo2, Banknote, Ticket, UserCircle, UserPlus,
  Save, BookmarkCheck, RotateCcw
} from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import { useAuth } from '@/components/providers/AuthProvider';
import { isCampManagerialUser, userHasEligibleRole } from '@/lib/utils/roles';
import { Camp, CampMealConfig, CampRegistration, CampCoupon, CampRoleWaiver, CampRefundRequest } from '@/types';
import { calculateDynamicCampCost, CalculatedCostResult } from '@/lib/camp-cost';
import { lookupCampRegistrationsAction, submitCampRefundRequestAction, cancelPendingIdtRegistrationAction, getCenterDevoteesForCampRegistrationAction, getUserCampRegistrationsAction, validateCampCouponAction, getCampAccommodationCapacityStatusAction } from '@/app/dashboard/admin/camps/actions';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { validatePhoneNumber } from '@/lib/utils/phone-validation';

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

// Smart date label formatter to ensure the actual month is always shown instead of generic "Date"
function formatMealOptionLabel(m?: CampMealConfig | null, campStartDate?: string): string {
  if (!m) return '';
  const rawLabel = (m.label || `${m.date}`).trim();

  // If label contains the word "Date" (e.g. "14 - Date" or "14 Date")
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

  // If label is purely numbers like "14"
  if (/^\d+$/.test(rawLabel) && campStartDate) {
    const d = new Date(campStartDate);
    if (!isNaN(d.getTime())) {
      const monthStr = d.toLocaleString('en-IN', { month: 'short' });
      return `${rawLabel} - ${monthStr}`;
    }
  }

  return rawLabel;
}

function getMealDateDisplay(dateKey: string, camp?: Camp | null): string {
  if (!dateKey) return '';
  const found = camp?.meal_pricing?.find((m) => String(m.date) === String(dateKey));
  if (found) {
    return formatMealOptionLabel(found, camp?.start_date);
  }
  if (/^\d+$/.test(dateKey) && camp?.start_date) {
    const d = new Date(camp.start_date);
    if (!isNaN(d.getTime())) {
      return `${dateKey} - ${d.toLocaleString('en-IN', { month: 'short' })}`;
    }
  }
  return dateKey;
}

export default function PublicCampRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug || '');
  const { user, userData, loading: authLoading } = useAuth();

  // If user is already authenticated, redirect them directly to the authenticated camp dashboard
  useEffect(() => {
    if (!authLoading && user && slug) {
      router.push(`/dashboard/camp?camp=${slug}`);
    }
  }, [user, authLoading, slug, router]);

  // Camp Data State
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [campError, setCampError] = useState<string | null>(null);

  // POC Details
  const [pocDetails, setPocDetails] = useState({
    pocName: '',
    pocContact: '',
    email: '',
  });
  const [pocSaved, setPocSaved] = useState(false);

  // Registration Form State
  const [formData, setFormData] = useState({
    voiceName: '',
    participantName: '',
    whatsapp: '',
    rounds: '',
    parentTemple: '',
    counselorName: '',
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

  // Batch Entries
  const [entries, setEntries] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const isSuperAdmin = useMemo(() => {
    if (!userData) return false;
    const roles = (Array.isArray(userData.role) ? userData.role : [userData.role]).map((r: any) => Number(r));
    return roles.includes(8) || (userData as any).role === 'super_admin';
  }, [userData]);

  // Check if current user is center-eligible for restricted camps
  const isDevoteeEligibleForCamp = useMemo(() => {
    if (!camp) return true;
    const eligible = camp.eligible_centers;
    if (!Array.isArray(eligible) || eligible.length === 0) return true;
    if (isSuperAdmin) return true;

    if (userData) {
      const userCenters = [
        userData?.hierarchy?.currentCenter,
        userData?.hierarchy?.center,
        (userData as any)?.center,
        (userData as any)?.current_center,
        userData?.hierarchy?.otherCenter,
        (userData as any)?.other_center,
      ].filter(Boolean).map((s: string) => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

      return eligible.some((ec: string) => {
        const ecNorm = String(ec || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!ecNorm) return false;
        return userCenters.some((uc: string) => uc === ecNorm || uc.includes(ecNorm) || ecNorm.includes(uc));
      });
    }

    return true;
  }, [camp, userData, isSuperAdmin]);

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

  // Accommodation Capacity & Waiting List State
  const [capacityStatus, setCapacityStatus] = useState<any>(null);
  const [hotelBookingName, setHotelBookingName] = useState('');
  const [hotelReceiptUrl, setHotelReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Success State
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);

  // Lookup Past Registration State (For Closed/Past Camps)
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<CampRegistration[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Cancellation & Refund Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);

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
    setPocSaved(true);
    setDraftToast({
      type: 'success',
      message: `Restored saved draft with ${activeDraft.entries?.length || 0} devotee(s)!`,
    });
    setTimeout(() => setDraftToast(null), 5000);
    setActiveDraft(null);
  };

  const handleDiscardDraft = async () => {
    if (!camp?.id) return;
    try {
      const callerId = userData?.id || user?.id || '';
      await fetch(`/api/camps/draft?campId=${camp.id}&userId=${callerId}`, { method: 'DELETE' });
      setActiveDraft(null);
      setDraftToast({ type: 'success', message: 'Draft cleared.' });
      setTimeout(() => setDraftToast(null), 3000);
    } catch (err) {
      console.error('Error discarding draft:', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!camp?.id) return;
    if (entries.length === 0 && !formData.participantName) {
      setDraftToast({ type: 'error', message: 'Please add at least one attendee or fill in devotee details before saving.' });
      setTimeout(() => setDraftToast(null), 4000);
      return;
    }

    setSavingDraft(true);
    try {
      const callerId = userData?.id || user?.id || '';
      const payload = {
        campId: camp.id,
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

  // Re-check draft when camp or user profile changes
  useEffect(() => {
    if (camp?.id) {
      checkAndLoadDraft(camp.id);
    }
  }, [camp?.id, userData?.id]);
  const [cancelLookupQuery, setCancelLookupQuery] = useState('');
  const [cancelLookupLoading, setCancelLookupLoading] = useState(false);
  const [cancelLookupError, setCancelLookupError] = useState<string | null>(null);
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

  const handleLookupForCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = userData?.phone ? userData.phone.replace(/[^0-9]/g, '').slice(-10) : '';
    const userEmail = (user?.email || userData?.email || '').trim().toLowerCase();
    const queryToUse = user ? (phoneDigits || userEmail) : cancelLookupQuery.trim();

    if (!queryToUse) return;

    setCancelLookupLoading(true);
    setCancelLookupError(null);
    setCancelRegs(null);
    setSelectedRegIdsToCancel([]);

    try {
      const res = await lookupCampRegistrationsAction(camp?.id || slug, queryToUse, userData?.id);
      if (res.success && res.registrations && res.registrations.length > 0) {
        setCancelRegs(res.registrations);
        setCancelExistingRefunds(res.existingRefunds || []);
        // Select registrations that are CONFIRMED and not cancelled OR whose previous refund request was rejected
        const activeIds = res.registrations
          .filter((r: any) => {
            const isConfirmed = r.payment_status === 'completed';
            const m = (res.existingRefunds || []).find((ref: any) =>
              ref.registration_id === r.id ||
              (Array.isArray(ref.cancelled_registrations) && ref.cancelled_registrations.some((cr: any) => cr.reg_id === r.id))
            );
            return isConfirmed && (!r.is_cancelled || m?.status === 'rejected');
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
    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !camp) {
      return { totalRefund: 0, baseRefund: 0, mealRefund: 0, accRefund: 0, originalTotal: 0, totalPaidAtCheckout: 0, tierLabel: '', baseRefundPercent: 100, surchargePercent: 0, gatewayFee: 0, cancellationFee: 0 };
    }

    const selectedRegs = cancelRegs.filter(r => selectedRegIdsToCancel.includes(r.id!));
    const refundConfig = camp.refund_config || {
      enable_refunds: true,
      refund_policy_rules: [],
      refund_meals: true,
      refund_accommodation: true
    };

    // Determine applicable refund tier by current date (local date YYYY-MM-DD)
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
      const discount = Number(reg.discount_amount || 0);
      const isFree = ['COUPON', 'ROLE_WAIVER', 'FREE'].includes((reg.payment_method || '').toUpperCase()) || discount >= orig;
      const actualPaid = isFree ? 0 : Math.max(0, orig - discount);
      originalTotal += actualPaid;

      const entryCost = Number(reg.entry_cost || 0);
      const netEntryCost = Math.max(0, entryCost - discount);

      const mealCost = Number(reg.meal_cost || 0);
      const accCost = Number(reg.acc_cost || 0) + Number(reg.ac_cost || 0);

      // Base fee is any net fee excluding meals & accommodation (e.g. token fee, camp overhead)
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
      camp?.payment_config?.surcharge_percent ??
      (camp as any)?.online_payment_surcharge_percent ??
      0
    );
    const surchargePercent = isAllTransferOrFree ? 0 : configuredSurcharge;
    const gatewayFee = Math.round(originalTotal * (surchargePercent / 100));
    const totalPaidAtCheckout = originalTotal + gatewayFee;
    const totalRefund = Math.min(originalTotal, baseRefund + mealRefund + accRefund);
    const cancellationFee = Math.max(0, originalTotal - totalRefund);

    return { totalRefund, baseRefund, mealRefund, accRefund, originalTotal, totalPaidAtCheckout, tierLabel, baseRefundPercent, surchargePercent, gatewayFee, cancellationFee };
  };

  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !camp) return;

    const selectedRegs = cancelRegs.filter(r => selectedRegIdsToCancel.includes(r.id!));
    const isAllPendingIdt = selectedRegs.length > 0 && selectedRegs.every(r => (r.payment_method || '').toUpperCase() === 'IDT' && r.payment_status !== 'completed');

    if (isAllPendingIdt) {
      setCancelSubmitting(true);
      setCancelError(null);
      try {
        const finalReason = cancelReason === 'Other' ? (cancelReasonCustom.trim() || 'Other') : cancelReason;
        const res = await cancelPendingIdtRegistrationAction(selectedRegIdsToCancel, finalReason, userData?.id);
        if (res.success) {
          setCancelSuccessResult({
            refundRequest: {
              id: 'pre-idt-cancel',
              cancellation_reason: finalReason,
              status: 'completed',
              total_registered_amount: 0,
              calculated_refund_amount: 0,
            } as any,
            refundAmount: 0,
            breakdown: {}
          });
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
        campId: camp.id,
        poc_name: primaryReg.poc_name,
        poc_contact: primaryReg.poc_contact,
        email: primaryReg.email,
        cancellation_type: cancellationType,
        cancelled_reg_ids: selectedRegIdsToCancel,
        payout_type: cancelPayoutType,
        upi_id: cancelUpiId.trim(),
        account_name: cancelAccountName.trim(),
        account_number: cancelAccountNumber.trim(),
        bank_name: cancelBankName.trim(),
        ifsc_code: cancelIfscCode.trim().toUpperCase(),
        reason: finalReason
      }, userData?.id);

      if (res.success && res.refundRequest) {
        setCancelSuccessResult({
          refundRequest: res.refundRequest,
          refundAmount: res.refundAmount,
          breakdown: res.breakdown
        });
      } else {
        setCancelError(res.error || 'Failed to submit cancellation request.');
      }
    } catch (err: any) {
      setCancelError(err.message || 'Error occurred while submitting request.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // 1. Fetch Camp Config
  useEffect(() => {
    async function fetchCamp() {
      setLoading(true);
      try {
        const res = await fetch('/api/db-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'camps',
            method: 'select',
            filters: [{ type: 'eq', col: 'slug', val: slug }],
            singleRow: true,
          }),
        });
        const json = await res.json();
        if (json.data) {
          setCamp(json.data);
          getCampAccommodationCapacityStatusAction(slug)
            .then((capRes) => {
              if (capRes.success) setCapacityStatus(capRes);
            })
            .catch((e) => console.warn('Capacity status fetch error:', e));
          if (json.data.default_poc_name || json.data.default_poc_contact) {
            setPocDetails((prev) => ({
              ...prev,
              pocName: json.data.default_poc_name || prev.pocName,
              pocContact: json.data.default_poc_contact || prev.pocContact,
            }));
          }
          const meals = json.data.meal_pricing || [];
          if (meals.length > 0) {
            const initialTrack = json.data.tracks?.[0] || 'GS Camp - 1st Timer';
            const tf = (json.data.special_waivers?.track_fees || []).find(
              (t: any) => t.track.toLowerCase() === initialTrack.toLowerCase()
            );
            setFormData((prev) => ({
              ...prev,
              firstMealDate: tf?.start_date || String(meals[0].date),
              firstMealType: tf?.start_meal_type || 'Breakfast',
              lastMealDate: tf?.end_date || String(meals[meals.length - 1].date),
              lastMealType: tf?.end_meal_type || 'Dinner',
              campTrack: initialTrack,
            }));
          }
        } else {
          setCampError('Camp retreat not found.');
        }
      } catch (err: any) {
        setCampError(err.message || 'Failed to load camp details');
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchCamp();
  }, [slug]);

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
    const fromCamp = camp?.accommodation_pricing?.recommended_hotels;
    const fromStatus = capacityStatus?.recommendedHotels;
    return (Array.isArray(fromCamp) && fromCamp.length > 0)
      ? fromCamp
      : (Array.isArray(fromStatus) ? fromStatus : []);
  }, [camp?.accommodation_pricing?.recommended_hotels, capacityStatus?.recommendedHotels]);

  // When CV Floor is full for non-Brahmachari, default accommodation to 'No'
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
      data.append('campTitle', camp?.title || 'Camp');
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

  // 2. Recalculate Live Cost on Form Change
  useEffect(() => {
    if (!camp) return;

    if (formData.firstMealDate && formData.lastMealDate) {
      const isLate = Boolean(
        Number(camp.late_fee) > 0 &&
        camp.late_fee_start_date &&
        new Date() >= new Date(camp.late_fee_start_date)
      );

      const calc = calculateDynamicCampCost(
        camp,
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
  }, [camp, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'gender') {
      const isFemale = value.startsWith('Female');
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        accommodation: isFemale ? 'No' : prev.accommodation,
      }));
    } else if (name === 'campTrack') {
      const tf = (camp?.special_waivers?.track_fees || []).find(
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

  const isManager = isCampManagerialUser(userData?.role, camp?.payment_config?.allowed_managerial_roles);

  // Load center devotees for managerial fast registration
  useEffect(() => {
    if (camp && isManager) {
      setLoadingDevotees(true);
      getCenterDevoteesForCampRegistrationAction(camp.id, userData?.id)
        .then((res) => {
          setLoadingDevotees(false);
          if (res.success && res.devotees) {
            setCenterDevotees(res.devotees);
            const label = res.centerName || res.templeName || '';
            if (label) {
              setCenterNameFound(label);
              const assignedCenter = res.centerName ? res.centerName.split(',')[0].trim() : '';
              const assignedTemple = res.templeName ? res.templeName.split(',')[0].trim() : '';
              setFormData((prev) => ({
                ...prev,
                ...(assignedCenter ? { voiceName: assignedCenter } : {}),
                ...(assignedTemple ? { parentTemple: assignedTemple } : {})
              }));
            }
          } else {
            console.warn('[Camp] Devotees fetch failed:', res.error);
          }
        })
        .catch((err) => {
          console.error('[Camp] Devotees fetch error:', err);
          setLoadingDevotees(false);
        });
    } else {
      setCenterDevotees([]);
      setCenterNameFound('');
      setSelectedDevoteeId('');
      setDevoteeSearchTerm('');
    }
  }, [camp?.id, isManager, userData?.id]);

  // User's own registrations for this camp
  const [userRegistrations, setUserRegistrations] = useState<CampRegistration[]>([]);

  useEffect(() => {
    if (userData?.id) {
      getUserCampRegistrationsAction({ email: userData?.email, phone: userData?.phone, callerUserId: userData?.id }).then((res) => {
        if (res.success && res.registrations) {
          setUserRegistrations(res.registrations);
        }
      });
    }
  }, [userData?.id]);

  const userRegisteredTracks = useMemo(() => {
    if (!camp) return [];
    const myEmail = (userData?.email || user?.email || '').trim().toLowerCase();
    const myPhone = (userData?.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return userRegistrations
      .filter((r) => {
        if (r.camp_id !== camp.id || r.is_cancelled || r.payment_status === 'failed') return false;
        const rEmail = (r.email || '').trim().toLowerCase();
        const rPhone = (r.whatsapp || r.poc_contact || '').replace(/[^0-9]/g, '').slice(-10);
        return (myEmail && rEmail === myEmail) || (myPhone && rPhone === myPhone);
      })
      .map((r) => (r.camp_track || '').trim())
      .filter(Boolean);
  }, [camp?.id, userRegistrations, userData?.email, user?.email, userData?.phone]);

  const selectedDevotee = useMemo(() => {
    return centerDevotees.find((d) => d.id === selectedDevoteeId) || null;
  }, [centerDevotees, selectedDevoteeId]);

  const activeRegisteredTracks = useMemo(() => {
    if (isManager && selectedDevotee) {
      return selectedDevotee.registeredTracks || [];
    }
    return userRegisteredTracks;
  }, [isManager, selectedDevotee, userRegisteredTracks]);

  // Dynamically filter available camp tracks based on devotee chanting rounds & roles
  const availableTracksForDevotee = useMemo(() => {
    const allTracks = camp?.tracks && camp.tracks.length > 0 ? camp.tracks : ['GS Camp - 1st Timer'];
    const userRoundsNum = formData.rounds !== '' && formData.rounds !== undefined && formData.rounds !== null
      ? Number(formData.rounds)
      : 0;

    const attendeeRole = isManager && selectedDevotee ? selectedDevotee.role : userData?.role;
    const attendeeRoyal = isManager && selectedDevotee
      ? selectedDevotee.royalMember
      : (userData?.royalMember || (userData as any)?.royal_member || userData?.hierarchy?.royalMember);

    const trackFees = camp?.special_waivers?.track_fees || [];

    return allTracks.filter((t) => {
      const tf = trackFees.find((x) => x.track.toLowerCase() === t.toLowerCase());
      const minRounds = tf && tf.min_rounds !== undefined && tf.min_rounds !== null ? Number(tf.min_rounds) : 0;
      if (minRounds > 0 && userRoundsNum < minRounds) {
        return false;
      }
      if (tf?.applicable_roles && tf.applicable_roles.length > 0) {
        const isEligible = userHasEligibleRole(attendeeRole, attendeeRoyal, tf.applicable_roles);
        if (!isEligible) {
          return false;
        }
      }
      return true;
    });
  }, [camp, formData.rounds, isManager, selectedDevotee, userData]);

  // If current campTrack is not in the filtered available tracks, auto-select the first available track
  useEffect(() => {
    if (availableTracksForDevotee.length > 0 && !availableTracksForDevotee.includes(formData.campTrack)) {
      const firstAvailable = availableTracksForDevotee.find((t) => !activeRegisteredTracks.includes(t.trim())) || availableTracksForDevotee[0];
      const tf = (camp?.special_waivers?.track_fees || []).find(
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
  }, [availableTracksForDevotee, formData.campTrack, activeRegisteredTracks, camp]);

  const isCurrentTrackAlreadyRegistered = useMemo(() => {
    if (!formData.campTrack) return false;
    return activeRegisteredTracks.includes(formData.campTrack.trim());
  }, [formData.campTrack, activeRegisteredTracks]);

  const handleSelectDevotee = (devId: string) => {
    setSelectedDevoteeId(devId);
    if (!devId) return;
    const found = centerDevotees.find((d) => d.id === devId);
    if (found) {
      // If devotee already holds the currently selected track, auto-pick an available track
      let nextTrack = formData.campTrack;
      const devoteeTracks = found.registeredTracks || [];
      if (devoteeTracks.includes(nextTrack)) {
        const available = camp?.tracks?.find((t) => !devoteeTracks.includes(t));
        if (available) {
          nextTrack = available;
        }
      }
      setFormData((prev) => ({
        ...prev,
        participantName: found.name,
        whatsapp: found.phone ? found.phone.replace(/[^0-9]/g, '').slice(-10) : prev.whatsapp,
        rounds: found.rounds !== undefined && found.rounds !== null ? String(found.rounds) : '',
        age: found.age || prev.age,
        gender: (found.gender as any) || prev.gender,
        counselorName: found.counselor || prev.counselorName,
        voiceName: found.center || prev.voiceName,
        parentTemple: found.temple || prev.parentTemple,
        campTrack: nextTrack,
        ...(() => {
          const tf = (camp?.special_waivers?.track_fees || []).find(
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

  const handleSavePoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pocDetails.pocName.trim()) {
      alert('Please enter Point of Contact (POC) name');
      return;
    }
    const phoneRes = validatePhoneNumber(pocDetails.pocContact, '+91', true);
    if (!phoneRes.isValid) {
      alert(phoneRes.error || 'Please enter a valid POC Contact number');
      return;
    }
    if (!pocDetails.email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    setPocSaved(true);
    // If student, automatically pre-fill Attendee #1 with POC info
    if (!isManager && !formData.participantName) {
      setFormData((prev) => ({
        ...prev,
        participantName: pocDetails.pocName,
        whatsapp: pocDetails.pocContact,
      }));
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();

    // Center restriction check:
    const eligibleCenters = camp?.eligible_centers || [];
    if (eligibleCenters.length > 0) {
      const enteredCenter = (formData.voiceName || '').trim();
      const isAllowed = eligibleCenters.some((ec) =>
        ec.toLowerCase() === enteredCenter.toLowerCase() ||
        ec.toLowerCase().includes(enteredCenter.toLowerCase()) ||
        enteredCenter.toLowerCase().includes(ec.toLowerCase())
      );
      if (!isAllowed) {
        alert(`Registration for "${camp?.title}" is restricted to attendees from: ${eligibleCenters.join(', ')}. The center "${enteredCenter || 'Unspecified'}" is not eligible.`);
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
      alert(phoneRes.error || 'WhatsApp number must be a valid phone number');
      return;
    }
    const cleanWhatsapp = phoneRes.parsed.cleanNumber;

    if (!formData.age || Number(formData.age) < 1) {
      alert('Please enter a valid age');
      return;
    }

    // Chronological meal order validation
    if (formData.firstMealDate === formData.lastMealDate) {
      const order = { Breakfast: 1, Lunch: 2, Dinner: 3 };
      const fVal = order[formData.firstMealType as keyof typeof order] || 1;
      const lVal = order[formData.lastMealType as keyof typeof order] || 3;
      if (fVal > lVal) {
        alert('On the same day, First Meal must precede Last Meal (Breakfast → Lunch → Dinner)');
        return;
      }
    }

    if (!liveCost || liveCost.totalCost < 0) {
      alert('Invalid date or meal configuration selected.');
      return;
    }

    // Prevent duplicate registration for the same track in this camp
    if (isCurrentTrackAlreadyRegistered) {
      const personName = formData.participantName || (isManager && selectedDevotee ? selectedDevotee.name : 'Devotee');
      alert(`"${personName}" is already registered for "${formData.campTrack}" in this camp. Please select a different track.`);
      return;
    }

    // Enforce sub-camp minimum rounds requirement
    const selectedTrackFeeObj = (camp?.special_waivers?.track_fees || []).find(
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
        : (userData?.royalMember || (userData as any)?.royal_member || userData?.hierarchy?.royalMember);
      const isRoleEligible = userHasEligibleRole(attendeeRole, attendeeRoyal, selectedTrackFeeObj.applicable_roles);
      if (!isRoleEligible) {
        alert(`The "${formData.campTrack}" sub-camp is restricted to specific roles (${selectedTrackFeeObj.applicable_roles.join(', ')}). This devotee does not have an eligible role.`);
        return;
      }
    }

    // Prevent duplicate entries in the same batch for the same track
    const newEntryPhone = cleanWhatsapp;
    const newEntryTrack = (formData.campTrack || '').trim().toLowerCase();

    const isDuplicateInBatch = entries.some((e, idx) => {
      if (editIndex !== null && idx === editIndex) return false;
      const ePhone = String(e.whatsapp || e.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const eTrack = (e.campTrack || e.camp_track || '').trim().toLowerCase();
      return eTrack === newEntryTrack && ePhone === newEntryPhone;
    });

    if (isDuplicateInBatch) {
      alert(`"${formData.participantName || 'Devotee'}" is already added to this batch for track "${formData.campTrack}".`);
      return;
    }

    // Accommodation Capacity Check:
    const isWaiting = Boolean(isArrangingOwnStay);
    if (isWaiting && !hotelReceiptUrl) {
      alert(
        isCvFullForSelectedDates
          ? 'CV Floor Accommodation is completely full for your selected dates. Please book a nearby hotel / lodge and upload your booking receipt to proceed.'
          : 'For self-arranged accommodation / outside stay, please enter hotel name and upload your booking confirmation receipt to proceed.'
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
      rounds: formData.rounds !== undefined && formData.rounds !== null ? String(formData.rounds) : '0',
      ...pocDetails,
      pocName: pocDetails.pocName,
      pocContact: pocDetails.pocContact,
      poc_name: pocDetails.pocName,
      poc_contact: pocDetails.pocContact,
      participantName: formData.participantName,
      participant_name: formData.participantName,
      whatsapp: formData.whatsapp,
      participantType: formData.participantType || 'Camp Participant',
      participant_type: formData.participantType || 'Camp Participant',
      campTrack: formData.campTrack,
      camp_track: formData.campTrack,
      meal_cost: liveCost.mealCost,
      acc_cost: liveCost.accCost,
      ac_cost: liveCost.acCost,
      base_cost: liveCost.baseCost,
      late_fee: liveCost.lateFee,
      entry_cost: liveCost.entryCost,
      total_cost: liveCost.totalCost,
    };

    if (editIndex !== null) {
      const updated = [...entries];
      updated[editIndex] = newEntry;
      setEntries(updated);
      setEditIndex(null);
    } else {
      setEntries([...entries, newEntry]);
    }

    // Reset attendee specific fields
    setHotelReceiptUrl('');
    setHotelBookingName('');
    setFormData((prev) => ({
      ...prev,
      participantName: '',
      whatsapp: '',
      rounds: '',
      gender: 'Male - Bachelor',
      age: '',
      marriedSinceYear: '',
      participantType: 'Camp Participant',
      dinnerType: 'Dinner Meal',
      accommodation: isCvFullForSelectedDates ? 'No' : 'Yes',
    }));
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
      age: item.age ? String(item.age) : '',
      marriedSinceYear: item.marriedSinceYear ? String(item.marriedSinceYear) : '',
    });
    setEditIndex(index);
  };

  const handleDeleteEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
    if (editIndex === index) setEditIndex(null);
  };

  // Coupon apply handler (Server-side validation for maximum security)
  const [couponValidating, setCouponValidating] = useState(false);
  const handleApplyCoupon = async () => {
    setCouponError(null);
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    if (!camp?.id) return;
    setCouponValidating(true);
    try {
      const res = await validateCampCouponAction(camp.id, cleanCode);
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon as CampCoupon);
        setCouponInput('');
      } else {
        setCouponError(res.error || `Promo code "${cleanCode}" is invalid or expired.`);
      }
    } catch {
      setCouponError('Failed to validate promo code. Please try again.');
    } finally {
      setCouponValidating(false);
    }
  };

  // Grand Total & Discount Calculation
  const baseTotalAmount = entries.reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0);

  let discountAmount = 0;
  if (appliedCoupon && baseTotalAmount > 0) {
    if (appliedCoupon.discount_type === 'PERCENT') {
      discountAmount = Math.round((baseTotalAmount * appliedCoupon.discount_value) / 100);
    } else {
      discountAmount = Math.min(baseTotalAmount, appliedCoupon.discount_value);
    }
  }
  const finalTotalAmount = Math.max(0, baseTotalAmount - discountAmount);
  const surchargePercent = camp?.payment_config?.surcharge_percent ?? 2.0;
  const surchargeAmount = selectedMethod === 'RAZORPAY' && finalTotalAmount > 0 ? (finalTotalAmount * surchargePercent) / 100 : 0;
  const grandTotalWithSurcharge = Math.round(finalTotalAmount + surchargeAmount);

  // Check if current user possesses an allowed managerial role for special transfers (IDT / ITT)
  // IDT Center Authorization check: only managers/devotees whose center is in the authorized IDT list can see IDT
  const centerIdtList = (camp?.payment_config?.center_idt_codes || []) as any[];
  const candidateCentersForIdt = [
    centerNameFound,
    formData.voiceName,
    userData?.hierarchy?.currentCenter,
    userData?.hierarchy?.center,
    (userData as any)?.center,
    (userData as any)?.current_center,
    userData?.hierarchy?.otherCenter,
    (userData as any)?.other_center,
    entries[0]?.voiceName,
    entries[0]?.voice_name,
  ].filter(Boolean).map((s: string) => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const isCenterAuthorizedForIdt = centerIdtList.length === 0 || centerIdtList.some((c: any) => {
    const cNorm = String(c.center_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cNorm) return false;
    return candidateCentersForIdt.some(
      (cand: string) => cand === cNorm || cand.includes(cNorm) || cNorm.includes(cand)
    );
  });

  const showIdtOption = Boolean(
    camp?.payment_config?.enable_idt &&
    (camp?.payment_config?.allow_student_idt === true || isManager) &&
    isCenterAuthorizedForIdt
  );
  const showIttOption = Boolean(
    camp?.payment_config?.enable_itt &&
    (camp?.payment_config?.allow_student_itt === true || isManager) &&
    finalTotalAmount >= 10000
  );

  useEffect(() => {
    if (selectedMethod === 'INTER_TEMPLE_TRANSFER' && !showIttOption) {
      setSelectedMethod(null);
    }
  }, [selectedMethod, showIttOption]);

  // Submit Free Registration (Bypasses payment gateway when total is ₹0 via coupon or waiver)
  const submitFreeRegistration = async () => {
    setIsSubmitting(true);
    setPaymentError(null);
    await submitRegistrationsToBackend({
      paymentMethod: appliedCoupon ? 'COUPON' : 'ROLE_WAIVER',
      deductionSource: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : 'Complimentary Role Waiver',
      couponCode: appliedCoupon?.code
    });
  };

  // Trigger Razorpay Payment
  const initiateRazorpayPayment = async () => {
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      const currentWebsite = typeof window !== 'undefined' ? `${window.location.origin}/camps/${slug}` : '';

      const orderRes = await fetch('/api/camps/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: camp?.id,
          amount: grandTotalWithSurcharge,
          payerName: pocDetails.pocName,
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
        description: `${camp?.title} Registration (${entries.length} Devotees)`,
        order_id: orderData.id,
        notes: {
          payment_for: camp?.title || '',
          website: currentWebsite,
          payer_name: pocDetails.pocName || '',
        },
        prefill: {
          name: pocDetails.pocName,
          email: pocDetails.email,
          contact: pocDetails.pocContact,
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

  // Submit IDT Payment
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

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedBankField(fieldName);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIttScreenshotFile(file);
      setIttScreenshotPreview(URL.createObjectURL(file));
      setPaymentError(null);
    }
  };

  // Submit ISKCON to ISKCON Transfer
  const submitIttPayment = async () => {
    if (finalTotalAmount < 10000) {
      setPaymentError('ISKCON to ISKCON Transfer is only available for payments of ₹10,000 and above.');
      return;
    }
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
      const formData = new FormData();
      formData.append('file', ittScreenshotFile);
      formData.append('campTitle', camp?.title || 'Camp');
      formData.append('devoteeName', pocDetails.pocName || 'Attendee');

      const uploadRes = await fetch('/api/camps/upload-payment-proof', {
        method: 'POST',
        body: formData,
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
      setPaymentError(err.message || 'Failed to submit ISKCON to ISKCON Transfer');
      setIsSubmitting(false);
      setIttUploading(false);
    }
  };

  // Shared Backend Submission
  const submitRegistrationsToBackend = async (paymentDetails: any) => {
    try {
      const res = await fetch('/api/camps/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: camp?.id,
          entries,
          pocName: pocDetails.pocName,
          pocContact: pocDetails.pocContact,
          poc_name: pocDetails.pocName,
          poc_contact: pocDetails.pocContact,
          email: pocDetails.email,
          totalAmount: grandTotalWithSurcharge,
          couponCode: appliedCoupon?.code || undefined,
          discountAmount: discountAmount || undefined,
          ...paymentDetails,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Registration failed');
      }

      const finalPaymentStatus = paymentDetails.paymentStatus || (paymentDetails.paymentMethod === 'INTER_TEMPLE_TRANSFER' || paymentDetails.paymentMethod === 'IDT' ? 'processing' : 'completed');

      setRegistrationSuccess({
        groupId: json.groupId,
        count: json.count,
        totalPaid: grandTotalWithSurcharge,
        paymentMethod: paymentDetails.paymentMethod,
        paymentStatus: json.paymentStatus || finalPaymentStatus,
        pocName: pocDetails.pocName,
        pocContact: pocDetails.pocContact,
        email: pocDetails.email,
        entries,
      });

      setShowPaymentModal(false);

      // Clear any saved draft for this camp upon successful completion
      try {
        const callerId = userData?.id || user?.id || '';
        if (camp?.id) {
          fetch(`/api/camps/draft?campId=${camp.id}&userId=${callerId}`, { method: 'DELETE' }).catch(() => { });
        }
        setActiveDraft(null);
      } catch (e) { }
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Past Camp Lookup Handlers
  const handleLookupRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResults(null);

    try {
      const res = await fetch('/api/camps/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: camp?.id,
          query: lookupQuery.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.data && json.data.length > 0) {
        setLookupResults(json.data);
      } else {
        setLookupError(json.error || 'No existing registration found matching this WhatsApp phone, Email, or Booking ID.');
      }
    } catch (err: any) {
      setLookupError('Failed to lookup registration. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafcff]">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Loading Camp Portal...</h2>
          <p className="text-xs text-slate-500 mt-1">Preparing retreat itinerary and schedules</p>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (campError || !camp) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafcff]">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/90 text-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Camp Not Available</h2>
            <p className="text-xs text-slate-600 mt-2 mb-6">
              {campError || 'The camp you are looking for is currently unavailable.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full text-xs shadow-md shadow-orange-500/20"
            >
              Return to Home
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Confirmation Success View
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafcff]">
        <PublicNavbar />
        <div className="flex-1 py-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-amber-200/80 p-8 sm:p-10 shadow-2xl shadow-amber-500/5 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${registrationSuccess.paymentStatus === 'processing'
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
              {registrationSuccess.paymentStatus === 'processing' ? (
                <Clock className="w-9 h-9 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-9 h-9" />
              )}
            </div>

            <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider mb-2 ${registrationSuccess.paymentStatus === 'processing'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-emerald-100/60 text-emerald-800'
              }`}>
              {registrationSuccess.paymentStatus === 'processing'
                ? 'Camp Registration Submitted - Pending Verification ⏳'
                : 'Registration Successful'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {registrationSuccess.paymentStatus === 'processing'
                ? 'Registration Submitted for Verification'
                : "Hare Krishna! You're Confirmed"}
            </h2>
            <p className="text-sm text-slate-600 mt-1 mb-6">
              Your registration for <strong>{camp.title}</strong> has been recorded.
            </p>

            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 text-left text-xs space-y-3 mb-6">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Camp:</span>
                <span className="font-bold text-slate-900">{camp.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Batch Booking ID:</span>
                <span className="font-mono font-bold text-amber-600">{registrationSuccess.groupId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Devotees Registered:</span>
                <span className="font-bold text-slate-900">{registrationSuccess.count} Attendees</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Point of Contact:</span>
                <span className="font-bold text-slate-900">
                  {registrationSuccess.pocName} ({registrationSuccess.pocContact})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold text-emerald-600 uppercase">
                  {registrationSuccess.paymentMethod === 'INTER_TEMPLE_TRANSFER'
                    ? 'ISKCON to ISKCON Transfer'
                    : registrationSuccess.paymentMethod === 'IDT'
                      ? 'Inter-Department Transfer (IDT)'
                      : registrationSuccess.paymentMethod}
                </span>
              </div>
              {(registrationSuccess.paymentMethod === 'INTER_TEMPLE_TRANSFER' || registrationSuccess.paymentMethod === 'IDT') && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Payment Status: Under Verification (Processing)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    {registrationSuccess.paymentMethod === 'IDT'
                      ? 'Your IDT transfer request has been recorded. Central VOICE administration will verify the department passcode and approve your registration.'
                      : 'Your transfer receipt has been uploaded to Central VOICE records. Camp administration will verify the transaction UTR with bank statements and approve the final confirmation.'}
                  </p>
                </div>
              )}
              <div className="flex justify-between py-1 text-sm">
                <span className="text-slate-700 font-bold">Total Contribution:</span>
                <span className="font-black text-amber-600">
                  ₹{registrationSuccess.totalPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs hover:bg-slate-800 transition-all shadow-md"
              >
                Print / Save Registration Receipt
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 border border-slate-200 text-slate-700 font-semibold rounded-2xl text-xs hover:bg-slate-50 transition-colors"
              >
                Register Another Devotee / Batch
              </button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const now = new Date();
  const startDateStr = camp.start_date ? new Date(camp.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const endDateStr = camp.end_date ? new Date(camp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const isArchived = camp.status === 'archived';
  const isExplicitlyClosed = camp.status === 'closed' || camp.status === 'completed' || camp.status === 'draft';
  const isRegistrationNotStarted = Boolean(camp.registration_start_date && now < new Date(camp.registration_start_date));
  const isDeadlinePassed = Boolean(camp.registration_deadline && now > new Date(camp.registration_deadline));
  const isCampOverOrClosed = isArchived || isExplicitlyClosed || isDeadlinePassed;

  // Late fee active check
  const isLateFeeActive = Boolean(
    Number(camp.late_fee) > 0 &&
    camp.late_fee_start_date &&
    now >= new Date(camp.late_fee_start_date)
  );

  const regOpenDateStr = camp.registration_start_date
    ? new Date(camp.registration_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const lateFeeStartDateStr = camp.late_fee_start_date
    ? new Date(camp.late_fee_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const deadlineDateStr = camp.registration_deadline
    ? new Date(camp.registration_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen flex flex-col bg-[#fafcff] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">
        <PublicNavbar />

        {/* Ambient Top Glow Orbs (Matching Home Page) */}
        <div className="absolute top-16 right-10 w-[500px] h-[500px] bg-gradient-to-br from-amber-300/20 via-orange-200/15 to-purple-200/10 rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute top-80 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-sky-200/20 via-indigo-100/15 to-emerald-100/15 rounded-full blur-3xl pointer-events-none -z-0"></div>

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* HERO BANNER: Matches Home Screen Warm Spiritual Aesthetics */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-5 sm:p-8 md:p-10 text-white shadow-xl shadow-orange-500/15">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] sm:text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse shrink-0" />
                  <span className="truncate">VOICE Spiritual Retreat &amp; Leadership Camp</span>
                </div>

                <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                  {camp.title}
                </h1>

                <p className="text-xs sm:text-sm md:text-base text-amber-50/90 max-w-2xl font-normal leading-relaxed">
                  {camp.description || 'Join devotees and youth seekers for immersive sadhana, Vedic wisdom discourses, Sattvic feasts, and joyful devotional association.'}
                </p>

                <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 sm:pt-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5 bg-black/25 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-md">
                    <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-200 shrink-0" />
                    <span className="text-[11px] sm:text-xs">{startDateStr} &mdash; {endDateStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/25 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-md">
                    <MapPin className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-200 shrink-0" />
                    <span className="text-[11px] sm:text-xs truncate max-w-[200px] sm:max-w-none">{camp.venue || 'Central VOICE, Pune'}</span>
                  </div>
                  {camp.late_fee > 0 && !isCampOverOrClosed && (
                    <div className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl backdrop-blur-md font-semibold text-xs ${isLateFeeActive
                      ? 'bg-rose-950/60 border border-rose-300/40 text-rose-100 animate-pulse'
                      : 'bg-black/25 text-amber-100'
                      }`}>
                      <Clock className="w-4 h-4 text-amber-200" />
                      <span>
                        {isLateFeeActive
                          ? `Late Fee Active (+₹${camp.late_fee})`
                          : lateFeeStartDateStr
                            ? `Late Fee ₹${camp.late_fee} starts on ${lateFeeStartDateStr}`
                            : `Late Fee: ₹${camp.late_fee}`}
                      </span>
                    </div>
                  )}

                  {camp.eligible_centers && camp.eligible_centers.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-300/40 text-indigo-100 px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-md font-semibold text-xs">
                      <Building className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-200 shrink-0" />
                      <span>Exclusively for: {camp.eligible_centers.join(', ')}</span>
                    </div>
                  )}

                  {(camp.default_poc_name || camp.default_poc_contact) && (
                    <div className="flex items-center gap-1.5 bg-black/25 px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-md text-amber-100 text-xs font-semibold">
                      <UserCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-200 shrink-0" />
                      <span>Camp POC: <strong className="text-white">{camp.default_poc_name || 'Camp Coordinator'}</strong></span>
                      {camp.default_poc_contact && (
                        <a
                          href={`tel:${camp.default_poc_contact.replace(/[^0-9+]/g, '')}`}
                          className="font-mono text-amber-200 underline hover:text-white ml-0.5"
                        >
                          ({camp.default_poc_contact})
                        </a>
                      )}
                    </div>
                  )}

                  {camp.refund_config?.enable_refunds !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelModal(true);
                        setCancelError(null);
                        setCancelSuccessResult(null);
                        setCancelRegs(null);
                        setCancelLookupQuery('');
                      }}
                      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 rounded-xl backdrop-blur-md text-xs font-bold transition-all border border-white/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Undo2 className="w-4 h-4 text-amber-200" />
                      <span>Manage / Cancel Registration</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Center Restriction Notice Banner */}
            {camp.eligible_centers && camp.eligible_centers.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Center-Specific Camp Registration</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Hare Krishna! This camp is exclusively organized for devotees belonging to:
                  <strong className="ml-1 text-amber-950">{camp.eligible_centers.join(', ')}</strong>.
                  Only devotees associated with these centers are eligible to register.
                </p>
              </div>
            )}

            {/* IF LOGGED IN DEVOTEE IS NOT FROM THE ELIGIBLE CENTER */}
            {Boolean(userData && !isDevoteeEligibleForCamp && (camp.eligible_centers || []).length > 0) ? (
              <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-amber-300 p-8 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border bg-amber-50 text-amber-600 border-amber-300">
                  <Building className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Access Restricted to Eligible Centers</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Registration for <strong>{camp.title}</strong> is exclusively reserved for devotees and managers belonging to:
                </p>
                <div className="inline-block px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-950 font-bold text-xs border border-amber-300">
                  {(camp.eligible_centers || []).join(', ')}
                </div>
                <p className="text-[11px] text-slate-500">
                  Your registered center on file is <strong>{userData?.hierarchy?.currentCenter || userData?.hierarchy?.center || 'Other'}</strong>.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/camp"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-md"
                  >
                    <span>View Available Camps &rarr;</span>
                  </Link>
                </div>
              </div>
            ) : null}

            {/* IF REGISTRATION HAS NOT STARTED YET OR CAMP IS CLOSED / DEADLINE PASSED */}
            {isRegistrationNotStarted ? (
              <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border bg-amber-50 text-amber-600 border-amber-200">
                  <Calendar className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Registrations Opening Soon
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-1">
                    Online registration for <strong>{camp.title}</strong> opens on <strong>{regOpenDateStr}</strong>. Please check back then to register your batch!
                  </p>
                </div>
              </div>
            ) : isCampOverOrClosed ? (
              <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${isArchived ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {isArchived
                      ? 'This Camp has been Archived'
                      : isDeadlinePassed
                        ? `Registration Deadline Passed (${deadlineDateStr})`
                        : 'Registrations Concluded for this Camp'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-1">
                    {isArchived
                      ? 'This retreat has been archived and is not accepting registrations. Previous attendees can retrieve their confirmed booking pass below.'
                      : isDeadlinePassed
                        ? `Online registrations closed on ${deadlineDateStr}. If you already registered, retrieve your confirmed booking pass below or contact camp coordinators.`
                        : 'Registrations for this retreat are now closed. If you already registered, you can retrieve your confirmed booking details and pass below.'}
                  </p>
                </div>

                {/* Lookup Box */}
                <form onSubmit={handleLookupRegistration} className="max-w-md mx-auto flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="Enter WhatsApp No or Email..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-300 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full text-xs font-bold shadow-md shadow-orange-500/20 hover:opacity-95 transition-all disabled:opacity-50"
                  >
                    {lookupLoading ? 'Searching...' : 'Find My Pass'}
                  </button>
                </form>

                {lookupError && (
                  <p className="text-xs text-rose-600 font-medium">{lookupError}</p>
                )}

                {/* Lookup Results */}
                {lookupResults && (
                  <div className="pt-4 border-t border-slate-100 text-left space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Found {lookupResults.length} Confirmed Attendee{lookupResults.length > 1 ? 's' : ''}:
                    </h4>
                    <div className="space-y-3">
                      {lookupResults.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <span className="font-bold text-slate-900 block text-sm">{item.participant_name}</span>
                            <span className="text-slate-500">{item.camp_track} • {item.parent_temple || 'ISKCON'}</span>
                          </div>
                          <div className="text-slate-600">
                            <div>Stay: {getMealDateDisplay(item.first_meal_date, camp)} &rarr; {getMealDateDisplay(item.last_meal_date, camp)}</div>
                            <div>Accommodation: <strong>{item.accommodation}</strong></div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-emerald-700 font-bold block">PAID ({item.payment_method})</span>
                            <span className="font-black text-slate-900">₹{item.total_cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : !user ? (
              <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-amber-200/90 p-8 sm:p-12 shadow-xl text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
                  <Tent className="w-8 h-8" />
                </div>

                <div className="max-w-xl mx-auto space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    Account Required for Registration
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Sign In to Register for {camp.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    To ensure secure pass downloads, group bookings, verified records, and self-service cancellation / refund support, camp registration is now integrated with your devotee account.
                  </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left text-xs">
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Profile Auto-Fill</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your devotee name, mobile number, email, and center are pre-filled automatically.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-amber-600" />
                      <span>Digital Delegate Pass</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Instant entry ticket pass, payment receipt, and track details stored in your portal.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Undo2 className="w-4 h-4 text-rose-600" />
                      <span>Refund Security</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Cancel individual attendees or full bookings anytime with automated policy refunds.
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2">
                  <Link
                    href={`/auth/login?redirect=/dashboard/camp?camp=${slug}`}
                    className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <span>Log In to Register</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/auth/register?redirect=/dashboard/camp?camp=${slug}`}
                    className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all text-center"
                  >
                    Create Devotee Account
                  </Link>
                </div>

                <div className="max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>Immediate Camp Access:</strong> Newly created accounts can register for camps immediately, even while approval for other modules is pending!
                    </span>
                  </div>
                </div>

                {/* Existing Registration Lookup */}
                <div className="pt-6 border-t border-slate-100 max-w-md mx-auto space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    Already registered earlier? Retrieve your confirmed pass below:
                  </p>
                  <form onSubmit={handleLookupRegistration} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        placeholder="WhatsApp No or Email..."
                        className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="px-5 py-2 bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                      {lookupLoading ? 'Searching...' : 'Find Pass'}
                    </button>
                  </form>

                  {lookupError && (
                    <p className="text-xs text-rose-600 font-medium">{lookupError}</p>
                  )}

                  {lookupResults && (
                    <div className="pt-3 text-left space-y-2">
                      {lookupResults.map((item, idx) => {
                        const isCompleted = item.payment_status === 'completed';
                        const isCancelled = item.is_cancelled || item.payment_status === 'refunded';
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex justify-between items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block truncate">{item.participant_name}</span>
                              <span className="text-[11px] text-slate-500 block truncate">{item.camp_track} • {item.group_id}</span>
                              {!isCompleted && !isCancelled && (
                                <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                                  ⏳ Awaiting central verification for {item.payment_method || 'transfer'}. Pass inactive until approved.
                                </span>
                              )}
                            </div>
                            <span className={`font-bold px-2.5 py-1 rounded-full text-[10px] shrink-0 ${isCancelled
                              ? 'text-rose-700 bg-rose-50 border border-rose-200'
                              : isCompleted
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : 'text-amber-800 bg-amber-100 border border-amber-200 animate-pulse'
                              }`}>
                              {isCancelled ? 'Cancelled' : isCompleted ? 'Confirmed' : 'Pending Approval'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Saved Draft Notification Banner */}
                {activeDraft && (
                  <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-200/90 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300/80">
                        <BookmarkCheck className="w-5 h-5 text-amber-800" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-amber-950">
                            Saved Registration Progress Found ({activeDraft.entries?.length || 0} Devotees)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[9.5px]">
                            Saved Draft
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                          Last saved on <strong>{formatDisplayDateTime(activeDraft.updated_at)}</strong>. Continue where you left off or start fresh.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleDiscardDraft}
                        className="px-3.5 py-1.5 rounded-full border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={handleResumeDraft}
                        className="px-4 py-1.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Resume Progress</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Toast/Alert for Save Draft Feedback */}
                {draftToast && (
                  <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${draftToast.type === 'success'
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

                {/* STEP 1: POINT OF CONTACT (POC) */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs">
                        1
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Point of Contact (POC)
                        </h2>
                        <p className="text-xs text-slate-500">
                          Primary devotee / leader submitting this registration batch.
                        </p>
                      </div>
                    </div>
                    {pocSaved && (
                      <button
                        onClick={() => setPocSaved(false)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700"
                      >
                        Edit Contact
                      </button>
                    )}
                  </div>

                  {!pocSaved ? (
                    <form onSubmit={handleSavePoc} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Coordinator / Devotee Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={pocDetails.pocName}
                          onChange={(e) => setPocDetails({ ...pocDetails, pocName: e.target.value })}
                          placeholder="e.g. Anand Murti Das"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-slate-900 text-xs font-medium outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                        />
                      </div>

                      <div>
                        <PhoneInputWithCountry
                          label="WhatsApp Mobile Number"
                          required
                          value={pocDetails.pocContact}
                          onChange={(fullPhone) => setPocDetails((p) => ({ ...p, pocContact: fullPhone }))}
                          placeholder="e.g. 9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={pocDetails.email}
                          onChange={(e) => setPocDetails({ ...pocDetails, email: e.target.value })}
                          placeholder="devotee@example.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-slate-900 text-xs font-medium outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                        />
                      </div>

                      <div className="sm:col-span-3 flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-7 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Continue to Devotee Details &rarr;
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-amber-50/40 border border-amber-200/70 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs text-slate-700">
                      <div className="flex flex-wrap gap-6 items-center">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">POC Coordinator</span>
                          <span className="font-bold text-slate-900">{pocDetails.pocName}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">WhatsApp</span>
                          <span className="font-bold text-slate-900">{pocDetails.pocContact}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Email</span>
                          <span className="font-bold text-slate-900">{pocDetails.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-100/60 px-3 py-1 rounded-full text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified POC
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 2: PROFESSIONAL SEGMENTED ATTENDEE FORM */}
                {pocSaved && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-300/90 p-6 sm:p-8 shadow-md space-y-6 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                          2
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              {editIndex !== null
                                ? 'Edit Devotee Entry'
                                : isManager
                                  ? 'Add Devotees to Batch (Center Manager)'
                                  : 'Devotee Registration (Self-Registration)'}
                            </h2>
                            {!isManager ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border-2 border-blue-200">
                                Self Only
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border-2 border-emerald-300 shadow-2xs">
                                Multi-Devotee Allowed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {isManager
                              ? 'Select from your center devotees or type details to add multiple devotees in this booking batch.'
                              : 'Student registration is for yourself. Review your details and meal itinerary below.'}
                          </p>
                        </div>
                      </div>

                      {editIndex !== null && (
                        <button
                          type="button"
                          onClick={() => setEditIndex(null)}
                          className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    {/* Non-Manager Student Limit: If 1 entry already added and not currently editing */}
                    {!isManager && entries.length >= 1 && editIndex === null ? (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900">Your Attendee Registration is Added!</h4>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Student accounts register individually for themselves. Review your booking summary below and proceed to payment.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditEntry(0)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-800 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
                        >
                          Edit Details
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Manager Center Devotee Picker */}
                        {isManager && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-cyan-50/50 to-emerald-50 border-2 border-teal-300 space-y-3 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-teal-700" />
                                <span className="font-black text-xs text-teal-950">
                                  Center Devotee Fast-Select {centerNameFound ? `• ${centerNameFound}` : ''}
                                </span>
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-200/90 text-teal-900 border border-teal-300">
                                  {centerDevotees.length} Devotees
                                </span>
                              </div>

                              <div className="flex items-center bg-white rounded-lg p-0.5 border border-teal-200 text-[11px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => setEntryMode('select')}
                                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${entryMode === 'select'
                                    ? 'bg-teal-600 text-white shadow-2xs'
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
                                  }}
                                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${entryMode === 'manual'
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                  Manual Entry
                                </button>
                              </div>
                            </div>

                            {entryMode === 'select' && (
                              <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      value={devoteeSearchTerm}
                                      onChange={(e) => setDevoteeSearchTerm(e.target.value)}
                                      placeholder="Search devotee by name, phone, email..."
                                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-teal-300/80 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                  </div>
                                  <select
                                    value={selectedDevoteeId}
                                    onChange={(e) => handleSelectDevotee(e.target.value)}
                                    className="flex-1 sm:max-w-xs px-3 py-2 rounded-xl border border-teal-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                                  >
                                    <option value="">-- Click to Choose Devotee --</option>
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
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Devotee details auto-populated! Review track & meals below and add to batch.</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {entryMode === 'manual' && (
                              <div className="flex items-center gap-2 text-xs font-bold text-teal-950 bg-teal-100/80 px-3.5 py-2 rounded-xl border border-teal-300/80 mt-1">
                                <UserPlus className="w-4 h-4 text-teal-700 shrink-0" />
                                <span>Manual Devotee Mode: Enter devotee profile details below and add to batch.</span>
                              </div>
                            )}
                          </div>
                        )}

                        <form onSubmit={handleAddEntry} className="space-y-6">

                          {/* Section A: Personal & Contact Information */}
                          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3.5 shadow-xs">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200/80">
                              <User className="w-4 h-4 text-amber-600" />
                              <span>Devotee Personal Information</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Participant Full Name *
                                  {!isManager && (
                                    <span className="text-[10px] text-slate-400 font-normal ml-1.5">(Your Profile)</span>
                                  )}
                                </label>
                                <input
                                  type="text"
                                  required
                                  name="participantName"
                                  value={formData.participantName}
                                  onChange={handleChange}
                                  readOnly={!isManager}
                                  placeholder="Devotee / Student name"
                                  className={`w-full px-4 py-2.5 rounded-xl border-2 text-xs font-semibold shadow-xs outline-none transition-all placeholder:text-slate-400 ${!isManager
                                    ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                                    : 'border-slate-300 bg-white text-slate-900 hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'
                                    }`}
                                />
                              </div>

                              <div>
                                <PhoneInputWithCountry
                                  label="WhatsApp Number"
                                  required
                                  value={formData.whatsapp}
                                  onChange={(fullPhone) => setFormData((p) => ({ ...p, whatsapp: fullPhone }))}
                                  disabled={!isManager}
                                  placeholder="e.g. 9876543210"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Age (Years) *
                                </label>
                                <input
                                  type="number"
                                  required
                                  min={1}
                                  max={120}
                                  name="age"
                                  value={formData.age}
                                  onChange={handleChange}
                                  placeholder="e.g. 23"
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                  <span>No. of Rounds Chanting *</span>
                                  {formData.rounds && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                      {formData.rounds} {Number(formData.rounds) === 1 ? 'Round' : 'Rounds'} / day
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="number"
                                  required
                                  min={0}
                                  max={64}
                                  name="rounds"
                                  value={formData.rounds}
                                  onChange={handleChange}
                                  placeholder="e.g. 16 (Daily chanting rounds)"
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Sub-camps with minimum round requirements (e.g. Nistha) appear dynamically based on your daily chanting rounds.
                                </span>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Gender &amp; Marital Status *
                                </label>
                                <select
                                  name="gender"
                                  value={formData.gender}
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                >
                                  <option value="Male - Bachelor">Male - Bachelor</option>
                                  <option value="Male - Married">Male - Married</option>
                                  <option value="Female - Bachelor">Female - Bachelor</option>
                                  <option value="Female - Married">Female - Married</option>
                                </select>
                              </div>

                              {(formData.gender === 'Male - Married' || formData.gender === 'Female - Married') && (
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Married Since (Year) *
                                  </label>
                                  <input
                                    type="number"
                                    min={1950}
                                    max={new Date().getFullYear()}
                                    name="marriedSinceYear"
                                    value={formData.marriedSinceYear}
                                    onChange={handleChange}
                                    placeholder="e.g. 2019"
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section B: Temple and Centre */}
                          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3.5 shadow-xs">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200/80">
                              <Building className="w-4 h-4 text-amber-600" />
                              <span>Temple and Centre</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Parent Temple <span className="text-[10px] font-normal text-slate-500">(Temple where you connected for the 1st time)</span> *
                                </label>
                                <input
                                  type="text"
                                  required
                                  name="parentTemple"
                                  value={formData.parentTemple}
                                  onChange={handleChange}
                                  placeholder="e.g. NVCC Pune, ISKCON"
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  VOICE Centre Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  name="voiceName"
                                  value={formData.voiceName}
                                  onChange={handleChange}
                                  placeholder="e.g. Bageshree, Nilachal"
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Counselor / Mentor Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  name="counselorName"
                                  value={formData.counselorName}
                                  onChange={handleChange}
                                  placeholder="Counselor's name"
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section C: Camp Category & Track */}
                          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3.5 shadow-xs">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200/80">
                              <Award className="w-4 h-4 text-amber-600" />
                              <span>Camp &amp; Role</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                  <span>Select Camp (Category) *</span>
                                  {camp.tracks && camp.tracks.length > availableTracksForDevotee.length && (
                                    <span className="text-[10px] font-medium text-amber-700">
                                      ({availableTracksForDevotee.length}/{camp.tracks.length} eligible)
                                    </span>
                                  )}
                                </label>
                                <select
                                  name="campTrack"
                                  value={formData.campTrack}
                                  onChange={handleChange}
                                  className={`w-full px-4 py-2.5 rounded-xl border-2 text-slate-900 text-xs font-semibold shadow-xs outline-none transition-all cursor-pointer ${isCurrentTrackAlreadyRegistered
                                    ? 'border-amber-400 ring-4 ring-amber-300/30 text-amber-900 bg-amber-50/50'
                                    : 'border-slate-300 bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'
                                    }`}
                                >
                                  {availableTracksForDevotee.length === 0 ? (
                                    <option value="" disabled>No eligible camp tracks for {formData.rounds || 0} rounds</option>
                                  ) : (
                                    availableTracksForDevotee.map((track) => {
                                      const isTaken = activeRegisteredTracks.includes(track.trim());
                                      return (
                                        <option key={track} value={track} disabled={isTaken} className={isTaken ? 'text-gray-400 bg-gray-50' : ''}>
                                          {track} {isTaken ? '• (Already Registered)' : ''}
                                        </option>
                                      );
                                    })
                                  )}
                                </select>
                                {camp.tracks && camp.tracks.length > availableTracksForDevotee.length && (
                                  <p className="mt-1 text-[11px] text-slate-500 italic">
                                    * Sub-camps requiring higher chanting rounds (e.g. 16 rounds) unlock automatically when your chanting rounds meet the requirement.
                                  </p>
                                )}
                                {isCurrentTrackAlreadyRegistered && (
                                  <p className="mt-1 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                    <span>
                                      {isManager && selectedDevotee ? selectedDevotee.name : 'You'} is already registered for &quot;{formData.campTrack}&quot;. Please select another camp/track.
                                    </span>
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Participation Role *
                                </label>
                                <select
                                  name="participantType"
                                  value={formData.participantType}
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                >
                                  {((camp?.participant_types && camp.participant_types.length > 0)
                                    ? camp.participant_types
                                    : ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari']
                                  ).map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Dynamic Role Perk / Waiver Notice */}
                            {(() => {
                              const waivers: CampRoleWaiver[] = camp.special_waivers?.role_waivers || [];
                              const w = waivers.find((x) => x.role.toLowerCase() === formData.participantType.toLowerCase());
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
                                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
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
                                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs font-medium text-amber-950">
                                    <strong>Brahmachari Notice:</strong>{' '}
                                    {camp.special_waivers?.brahmachari_message
                                      ? camp.special_waivers.brahmachari_message.replace(/₹?\s*\d+/g, `₹${camp.special_waivers?.brahmachari_fee ?? 0}`)
                                      : `Brahmacharis are required to pay a nominal confirmation fee of ₹${camp.special_waivers?.brahmachari_fee ?? 0} under Donate As You Like.`}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Section D: Meals & Accommodation Itinerary */}
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
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                >
                                  {(camp.meal_pricing || []).map((m) => (
                                    <option key={m.date} value={m.date}>
                                      {formatMealOptionLabel(m, camp.start_date)}
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
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
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
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                >
                                  {(camp.meal_pricing || []).map((m) => (
                                    <option key={m.date} value={m.date}>
                                      {formatMealOptionLabel(m, camp.start_date)}
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
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
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
                                  onChange={handleChange}
                                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                                >
                                  <option value="Dinner Meal">Complete Dinner Meal</option>
                                  <option value="Only Milk">Only Milk</option>
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Accommodation from Central VOICE
                                </label>
                                {formData.gender.startsWith('Female') && !camp.accommodation_pricing?.allow_female_cv_accommodation ? (
                                  <div className="px-4 py-2.5 rounded-xl bg-slate-200/70 text-xs text-slate-700 font-semibold border border-slate-300">
                                    Arranged externally for Matajis / Females
                                  </div>
                                ) : (
                                  <select
                                    name="accommodation"
                                    value={formData.accommodation}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2.5 rounded-xl border-2 text-slate-900 text-xs font-semibold shadow-xs outline-none transition-all cursor-pointer ${isCvFullForSelectedDates && !isBrahmachari
                                      ? 'border-amber-400 bg-amber-50/50 text-amber-900'
                                      : 'border-slate-300 bg-white hover:border-amber-400 focus:border-amber-500'
                                      }`}
                                  >
                                    <option value="Yes" disabled={isCvFullForSelectedDates && !isBrahmachari}>
                                      {isCvFullForSelectedDates && !isBrahmachari
                                        ? 'CV Floor Accommodation (FULL - Unavailable)'
                                        : 'Yes, I need accommodation from CV'}
                                    </option>
                                    <option value="No">
                                      {isCvFullForSelectedDates && !isBrahmachari
                                        ? 'No, I will arrange own accommodation / Nearby Hotel'
                                        : 'No, I do not need accommodation'}
                                    </option>
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* SELF-ARRANGED / HOTEL RECOMMENDATION & RECEIPT UPLOAD SECTION */}
                            {isArrangingOwnStay && (
                              <div className="mt-3.5 space-y-3 pt-3 border-t border-amber-200/80">
                                {isCvFullForSelectedDates ? (
                                  <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span>CV Floor Accommodation is Full for Selected Dates</span>
                                    </div>
                                    <p className="text-[11px] text-amber-900 leading-snug">
                                      Due to limited capacity, CV accommodation is completely booked for this batch. You can still attend by booking a room at a nearby hotel/lodge and attaching your booking confirmation receipt below.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3.5 rounded-xl bg-indigo-50 border-2 border-indigo-200 text-indigo-950 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center gap-2 font-black text-xs text-indigo-900">
                                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                      <span>Self-Arranged Accommodation / Nearby Hotel</span>
                                    </div>
                                    <p className="text-[11px] text-indigo-900 leading-snug">
                                      You have selected to arrange your own stay outside CV floor. Please provide your hotel details and upload your booking confirmation receipt below so the administration can verify and issue your pass.
                                    </p>
                                  </div>
                                )}

                                {/* Recommended Hotels Directory */}
                                {recommendedHotelsList.length > 0 && (
                                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Building2 className="w-4 h-4 text-amber-600" />
                                        Recommended Nearby Hotels &amp; Lodges ({recommendedHotelsList.length})
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-semibold">Contact directly to book</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {recommendedHotelsList.map((h: any, i: number) => (
                                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                                          <span className="font-extrabold text-xs text-slate-900 block">{h.name}</span>
                                          {h.contact && (
                                            <a href={`tel:${h.contact}`} className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded inline-flex items-center gap-1 hover:underline">
                                              <Phone className="w-3 h-3 text-amber-700" /> {h.contact}
                                            </a>
                                          )}
                                          {h.address && (
                                            <p className="text-[10.5px] text-slate-600">
                                              {h.address.startsWith('http') ? (
                                                <a href={h.address} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
                                                  📍 View Location Map &rarr;
                                                </a>
                                              ) : (
                                                <span>📍 {h.address}</span>
                                              )}
                                            </p>
                                          )}
                                          {(h.tariff || h.notes) && (
                                            <p className="text-[10px] text-slate-500">
                                              {h.tariff ? `Tariff: ${h.tariff}` : ''}
                                              {h.tariff && h.notes ? ' • ' : ''}
                                              {h.notes}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Upload External Hotel Booking Receipt (Mandatory for Waiting List) */}
                                <div className="p-4 rounded-xl bg-indigo-50/70 border-2 border-indigo-200 shadow-2xs space-y-3">
                                  <div>
                                    <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
                                      <UploadCloud className="w-4 h-4 text-indigo-600" />
                                      Upload Hotel Booking Receipt (Mandatory) *
                                    </span>
                                    <p className="text-[11px] text-indigo-900 mt-0.5">
                                      Upload your hotel reservation receipt/invoice (Image or PDF). Your booking will enter the Waiting List for administrative bandwidth verification before pass issuance.
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Hotel / Lodge Name *</label>
                                      <input
                                        type="text"
                                        value={hotelBookingName}
                                        onChange={(e) => setHotelBookingName(e.target.value)}
                                        placeholder="e.g. Hotel Sai Palace, Katraj"
                                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:border-amber-400 focus:border-indigo-500 outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                        Upload Receipt (Photo/PDF) * <span className="text-[9.5px] text-slate-400 font-normal">(Max 5MB)</span>
                                      </label>
                                      <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleUploadHotelReceipt}
                                        disabled={uploadingReceipt}
                                        className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                      />
                                    </div>
                                  </div>

                                  {uploadingReceipt && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                      <span>Uploading receipt to Google Drive...</span>
                                    </div>
                                  )}

                                  {hotelReceiptUrl && (
                                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900 font-bold">
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        Receipt uploaded successfully
                                      </span>
                                      <a href={hotelReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline text-[11px] hover:text-emerald-900">
                                        View File &rarr;
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Interactive Live Cost Preview Widget */}
                          {liveCost && (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 to-orange-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                              <div className="flex flex-wrap items-center gap-5 text-slate-700">
                                <div>
                                  <span className="text-slate-400 block text-[10px] font-semibold">Meals ({liveCost.mealCount})</span>
                                  <span className="font-bold text-slate-900">₹{liveCost.mealCost}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] font-semibold">Stay ({liveCost.daysOfStay} days)</span>
                                  <span className="font-bold text-slate-900">₹{liveCost.accCost}</span>
                                </div>
                                {liveCost.acCost > 0 && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-semibold">
                                      {camp.accommodation_pricing?.facility_charge_label || 'Other Charges'}
                                      {camp.accommodation_pricing?.ac_charge_billing_type !== 'fixed' && ` (${Math.max(1, liveCost.daysOfStay)}d)`}
                                    </span>
                                    <span className="font-bold text-slate-900">₹{liveCost.acCost}</span>
                                  </div>
                                )}
                                {liveCost.baseCost > 0 && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-semibold">
                                      {liveCost.baseCostLabel || 'Material / Kit Fee'}
                                    </span>
                                    <span className="font-bold text-amber-800">₹{liveCost.baseCost}</span>
                                  </div>
                                )}
                                {liveCost.lateFee > 0 && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-semibold">Late Fee</span>
                                    <span className="font-bold text-rose-600">₹{liveCost.lateFee}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">
                                  Entry Fee
                                </span>
                                <span className="text-xl font-black text-amber-700">
                                  ₹{liveCost.totalCost}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={isCurrentTrackAlreadyRegistered}
                              className={`inline-flex items-center gap-2 px-7 py-3 rounded-full text-xs font-bold transition-all shadow-md ${isCurrentTrackAlreadyRegistered
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                                }`}
                            >
                              <Plus className="w-4 h-4" />
                              <span>
                                {isCurrentTrackAlreadyRegistered
                                  ? 'Already Registered for This Camp/Track'
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
                )}

                {/* STEP 3: BATCH DEVOTEES TABLE */}
                {entries.length > 0 && (
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs shrink-0">
                          3
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900">
                            Registered Batch Devotees ({entries.length})
                          </h2>
                          <p className="text-xs text-slate-500">
                            Review devotee roster before completing contribution.
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-semibold">Total Batch Contribution</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-600">
                          ₹{baseTotalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Participant</th>
                            <th className="py-3 px-3">WhatsApp</th>
                            <th className="py-3 px-3">Track</th>
                            <th className="py-3 px-3">Itinerary</th>
                            <th className="py-3 px-3 text-center">Acc.</th>
                            <th className="py-3 px-4 text-right">Fee (₹)</th>
                            <th className="py-3 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {entry.participantName}
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {entry.gender} • {entry.age} yrs
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-600 font-medium">
                                {entry.whatsapp}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                                  {entry.campTrack}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-500 text-[11px]">
                                {getMealDateDisplay(entry.firstMealDate, camp)} ({entry.firstMealType}) &rarr; {getMealDateDisplay(entry.lastMealDate, camp)} ({entry.lastMealType})
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${entry.accommodation === 'Yes' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {entry.accommodation}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                                ₹{entry.total_cost}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEditEntry(idx)}
                                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                                    title="Edit"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(idx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Promo Code & Coupon Box */}
                    <div className="p-4 rounded-2xl bg-white border-2 border-slate-200/90 shadow-2xs space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            Have a Promo Code or Student Coupon?
                          </span>
                        </div>

                        {appliedCoupon && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            {appliedCoupon.code} Applied ({appliedCoupon.discount_type === 'PERCENT' ? `${appliedCoupon.discount_value}% OFF` : `₹${appliedCoupon.discount_value} OFF`})
                            {appliedCoupon.max_uses ? (
                              <span className="text-[10px] text-amber-800 font-semibold ml-1">
                                ({Math.max(0, appliedCoupon.max_uses - (appliedCoupon.used_count || 0))} spot(s) remaining)
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => { setAppliedCoupon(null); setCouponError(null); }}
                              className="ml-1 text-slate-400 hover:text-rose-600 font-black"
                              title="Remove Coupon"
                            >
                              &times;
                            </button>
                          </span>
                        )}
                      </div>

                      {!appliedCoupon ? (
                        <div className="flex gap-2 max-w-md">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => { setCouponInput(e.target.value.toUpperCase().replace(/\s+/g, '')); setCouponError(null); }}
                            placeholder="Enter Code (e.g. STUDENTFREE)"
                            className="flex-1 px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-bold uppercase shadow-2xs hover:border-amber-400 focus:border-amber-500 outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all"
                          >
                            Apply Code
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-700">
                          {appliedCoupon.description ? `${appliedCoupon.description} • ` : ''}
                          Discount of ₹{discountAmount} will be deducted from your total.
                        </p>
                      )}

                      {couponError && (
                        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {couponError}
                        </p>
                      )}
                    </div>

                    {/* Checkout Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Ready to complete registration for {entries.length} devotee{entries.length > 1 ? 's' : ''}?
                        </span>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                          {discountAmount > 0 && (
                            <>
                              <span className="line-through text-slate-400">Total: ₹{baseTotalAmount}</span>
                              <span className="text-emerald-700 font-bold">Discount: -₹{discountAmount}</span>
                              <span>&bull;</span>
                            </>
                          )}
                          <span className="font-bold text-slate-800">
                            Final Amount: ₹{finalTotalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {finalTotalAmount === 0 ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={submitFreeRegistration}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-full text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Gift className="w-4 h-4" />
                          )}
                          <span>Confirm Free Registration (₹0)</span>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={savingDraft || entries.length === 0}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-400 font-bold rounded-full text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Save progress now and resume anytime from any device"
                          >
                            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-700" />}
                            <span>{savingDraft ? 'Saving...' : `Save Progress (${entries.length})`}</span>
                          </button>
                          <button
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold rounded-full text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Proceed to Payment (₹{finalTotalAmount.toLocaleString('en-IN')})</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>

        <PublicFooter />
      </div>

      {/* PAYMENT METHOD SELECTION MODAL: Clean, Spacious, Professional Styling */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-3.5 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Select Payment Method
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedMethod(null);
                  setPaymentError(null);
                }}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
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

              {!selectedMethod ? (
                <div className="space-y-3">
                  {camp.payment_config?.enable_razorpay && (
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
                          ₹{grandTotalWithSurcharge.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </button>
                  )}

                  {showIdtOption && (
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
                          ₹{finalTotalAmount.toLocaleString('en-IN')}
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
                            ISKCON to ISKCON Transfer
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            ₹10K+ Orders
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Direct bank transfer between ISKCON accounts with payment receipt upload (for bulk payments ₹10,000+).
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-sm font-black text-emerald-600 block">
                          ₹{finalTotalAmount.toLocaleString('en-IN')}
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
                      <span className="font-bold text-slate-800">₹{baseTotalAmount}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Coupon Discount ({appliedCoupon?.code}):</span>
                        <span>-₹{discountAmount}</span>
                      </div>
                    )}
                    {surchargePercent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Processing Fee ({surchargePercent}%):</span>
                        <span className="font-bold text-slate-800">₹{surchargeAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-indigo-200/60 font-black text-sm">
                      <span className="text-indigo-950">Total Payable:</span>
                      <span className="text-indigo-600">₹{grandTotalWithSurcharge}</span>
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
                      onClick={initiateRazorpayPayment}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Pay ₹{grandTotalWithSurcharge} via Razorpay
                    </button>
                  </div>
                </div>
              ) : selectedMethod === 'IDT' ? (() => {
                const centerIdtList = (camp?.payment_config?.center_idt_codes || []) as any[];
                const userCenterCandidate = (
                  centerNameFound ||
                  formData.voiceName ||
                  entries[0]?.voiceName ||
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
                        className="flex-1 py-2 sm:py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Confirm IDT (₹{baseTotalAmount})
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
                          ISKCON to ISKCON Transfer Bank Details
                        </span>
                      </div>
                      <span className="text-[11px] sm:text-xs font-black text-emerald-700 shrink-0">
                        ₹{finalTotalAmount}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-xs">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Beneficiary Name</span>
                        <span className="font-bold text-slate-900 text-xs truncate block">{camp.payment_config?.itt_bank_details?.account_name || 'Central VOICE Pune'}</span>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Bank Name</span>
                        <span className="font-bold text-slate-900 text-xs truncate block">{camp.payment_config?.itt_bank_details?.bank_name || 'State Bank of India'}</span>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Account Number</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {camp.payment_config?.itt_bank_details?.account_number || '---'}
                          </span>
                          {camp.payment_config?.itt_bank_details?.account_number && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.payment_config.itt_bank_details?.account_number || '', 'acc')}
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
                            {camp.payment_config?.itt_bank_details?.ifsc_code || '---'}
                          </span>
                          {camp.payment_config?.itt_bank_details?.ifsc_code && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.payment_config.itt_bank_details?.ifsc_code || '', 'ifsc')}
                              className="text-slate-400 hover:text-emerald-700 text-xs p-0.5 shrink-0"
                              title="Copy IFSC Code"
                            >
                              {copiedBankField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {camp.payment_config?.itt_bank_details?.branch_name && (
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">Branch</span>
                          <span className="font-medium text-slate-800 text-xs truncate block">{camp.payment_config.itt_bank_details.branch_name}</span>
                        </div>
                      )}

                      {camp.payment_config?.itt_bank_details?.upi_id && (
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-slate-500 block leading-tight">UPI ID / VPA</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-emerald-800 text-xs truncate">
                              {camp.payment_config.itt_bank_details.upi_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.payment_config?.itt_bank_details?.upi_id || '', 'upi')}
                              className="text-slate-400 hover:text-emerald-700 text-xs p-0.5 shrink-0"
                              title="Copy UPI ID"
                            >
                              {copiedBankField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {camp.payment_config?.itt_bank_details?.instructions && (
                      <div className="pt-1.5 border-t border-emerald-200/60 text-[10.5px] text-emerald-900 font-medium">
                        💡 {camp.payment_config.itt_bank_details.instructions}
                      </div>
                    )}
                  </div>

                  {/* Transfer Verification Form */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">
                        Transferring Temple / Center Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={ittTempleName}
                        onChange={(e) => setIttTempleName(e.target.value)}
                        placeholder="e.g. ISKCON Bangalore, Nigdi VOICE"
                        className="w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">
                        Bank Transaction UTR / Ref ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={ittTransactionRef}
                        onChange={(e) => setIttTransactionRef(e.target.value)}
                        placeholder="e.g. 412389123456 or IMPS/NEFT UTR"
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
                        Upload Transfer Screenshot / Receipt Proof *
                      </label>
                      <div className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 bg-slate-50 text-center transition-colors">
                        {ittScreenshotPreview ? (
                          <div className="space-y-1.5">
                            <img
                              src={ittScreenshotPreview}
                              alt="Payment Screenshot Preview"
                              className="max-h-20 sm:max-h-24 mx-auto rounded-lg border border-slate-200 object-contain shadow-xs"
                            />
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[10.5px] sm:text-[11px] text-emerald-700 font-bold">Screenshot ready to upload</span>
                              <label className="text-[10.5px] sm:text-[11px] text-slate-600 underline cursor-pointer hover:text-slate-900">
                                Change
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleScreenshotChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer block py-1.5 sm:py-2">
                            <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mx-auto mb-1" />
                            <span className="text-xs font-bold text-slate-700 block">Click to select screenshot</span>
                            <span className="text-[10px] text-slate-500">JPG, PNG, or WEBP receipt proof</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScreenshotChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[10.5px] sm:text-[11px] leading-relaxed">
                      ⏳ <strong>Note:</strong> Registration status will be set to <em>Processing</em> until verified by Central VOICE.
                    </div>
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
                          <span className="truncate">{ittUploading ? 'Uploading Receipt...' : 'Submitting...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate sm:hidden">Confirm (₹{finalTotalAmount})</span>
                          <span className="truncate hidden sm:inline">Submit Proof &amp; Confirm (₹{finalTotalAmount})</span>
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
      {/* DEVOTEE CANCELLATION & REFUND REQUEST MODAL (Train Cancellation Style) */}
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
                onClick={() => setShowCancelModal(false)}
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
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Done &amp; Close
                </button>
              </div>
            ) : !cancelRegs ? (
              /* STEP 1: LOOKUP BOOKING */
              <div className="space-y-4">
                <form onSubmit={handleLookupForCancel} className="space-y-3">
                  {user ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Registered Account Identity
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <UserCircle className="w-4 h-4 text-amber-600" />
                          {userData?.name || 'Devotee'}
                        </span>
                        {userData?.phone && (
                          <span className="flex items-center gap-1.5 font-mono text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-amber-600" />
                            {userData.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-amber-600" />
                          {user?.email || userData?.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Enter Booking Group ID (e.g. GRP_...) from confirmation email *
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={cancelLookupQuery}
                          onChange={(e) => setCancelLookupQuery(e.target.value)}
                          placeholder="e.g. GRP_ABCD1234EF"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                      </div>
                    </div>
                  )}

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

                {/* Display Current Camp Refund Policy Tiers for Awareness */}
                {camp.refund_config?.refund_policy_rules && camp.refund_config.refund_policy_rules.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Camp Cancellation &amp; Refund Policy:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-600">
                      {camp.refund_config.refund_policy_rules.map((tier, idx) => (
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
                      * Payment gateway surcharge ({surchargePercent}% processing fee) is non-refundable. Eligible unconsumed meals and accommodation are refunded.
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
                    <span className="font-bold text-slate-900">{cancelRegs[0]?.poc_name} ({cancelRegs[0]?.poc_contact})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelRegs(null);
                      setCancelLookupQuery('');
                    }}
                    className="text-[11px] text-amber-600 hover:underline font-bold"
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
                      // An attendee is only permanently locked out if already cancelled and their refund wasn't rejected
                      const isAlreadyCancelled = reg.is_cancelled && !isRefundRejected;
                      const isPendingApproval = reg.payment_status !== 'completed';
                      const isPendingIdt = isPendingApproval && String(reg.payment_method || '').toUpperCase() === 'IDT';
                      const isLocked = isAlreadyCancelled || (isPendingApproval && !isPendingIdt);
                      const isChecked = selectedRegIdsToCancel.includes(reg.id!);

                      return (
                        <div
                          key={reg.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${isLocked
                            ? 'bg-slate-100 border-slate-200 opacity-60'
                            : isChecked
                              ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                              : 'bg-white border-slate-200'
                            }`}
                        >
                          <label className={`flex items-center gap-3 flex-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
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
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div>
                              <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                <span>{reg.participant_name}</span>
                                {isPendingApproval && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isPendingIdt
                                    ? 'bg-sky-100 text-sky-900 border-sky-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}>
                                    {isPendingIdt
                                      ? '⚡ Pending IDT (Direct Cancel)'
                                      : '⏳ Awaiting Payment Approval (ISKCON to ISKCON Transfer) • Cannot Cancel Until Confirmed'}
                                  </span>
                                )}
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
                            <span className="text-[10px] text-slate-400">Camp Fee</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Computed Refund Box */}
                {(() => {
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
                          {live.baseRefundPercent === 0 ? (
                            <span className="text-rose-600 font-semibold">Post-deadline cancellation • Registrations non-refundable</span>
                          ) : (
                            <span>ℹ️ {live.baseRefundPercent}% base fee refund eligible • Credited in 5-7 working days</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payout Details Section */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
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
                      className={`py-2 px-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 text-left ${cancelPayoutType === 'UPI'
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
                      className={`py-2 px-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 text-left ${cancelPayoutType === 'BANK'
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
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Undo2, Banknote, Ticket
} from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import { useAuth } from '@/components/providers/AuthProvider';
import { Camp, CampMealConfig, CampRegistration, CampCoupon, CampRoleWaiver, CampRefundRequest } from '@/types';
import { calculateDynamicCampCost, CalculatedCostResult } from '@/lib/camp-cost';
import { lookupCampRegistrationsAction, submitCampRefundRequestAction } from '@/app/dashboard/admin/camps/actions';

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
  const { user, loading: authLoading } = useAuth();

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

  // Batch Entries
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

  // Lookup Past Registration State (For Closed/Past Camps)
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<CampRegistration[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Cancellation & Refund Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
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
    if (!cancelLookupQuery.trim()) return;

    setCancelLookupLoading(true);
    setCancelLookupError(null);
    setCancelRegs(null);
    setSelectedRegIdsToCancel([]);

    try {
      const res = await lookupCampRegistrationsAction(camp?.id || slug, cancelLookupQuery.trim());
      if (res.success && res.registrations && res.registrations.length > 0) {
        setCancelRegs(res.registrations);
        setCancelExistingRefunds(res.existingRefunds || []);
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
      return { totalRefund: 0, baseRefund: 0, mealRefund: 0, accRefund: 0, originalTotal: 0, tierLabel: '', baseRefundPercent: 100 };
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

  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelRegs || selectedRegIdsToCancel.length === 0 || !camp) return;

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
      });

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
          const meals = json.data.meal_pricing || [];
          if (meals.length > 0) {
            setFormData((prev) => ({
              ...prev,
              firstMealDate: String(meals[0].date),
              lastMealDate: String(meals[meals.length - 1].date),
              campTrack: json.data.tracks?.[0] || 'GS Camp - 1st Timer',
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
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSavePoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pocDetails.pocName.trim()) {
      alert('Please enter Point of Contact (POC) name');
      return;
    }
    const cleanPhone = pocDetails.pocContact.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit POC Contact number');
      return;
    }
    if (!pocDetails.email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    setPocSaved(true);
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

    const newEntry = {
      ...formData,
      ...pocDetails,
      pocName: pocDetails.pocName,
      pocContact: pocDetails.pocContact,
      poc_name: pocDetails.pocName,
      poc_contact: pocDetails.pocContact,
      participantName: formData.participantName,
      participant_name: formData.participantName,
      whatsapp: formData.whatsapp,
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
    setFormData((prev) => ({
      ...prev,
      participantName: '',
      whatsapp: '',
      gender: 'Male - Bachelor',
      age: '',
      marriedSinceYear: '',
      participantType: 'Camp Participant',
      dinnerType: 'Dinner Meal',
      accommodation: 'No',
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
      age: item.age ? String(item.age) : '',
      marriedSinceYear: item.marriedSinceYear ? String(item.marriedSinceYear) : '',
    });
    setEditIndex(index);
  };

  const handleDeleteEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
    if (editIndex === index) setEditIndex(null);
  };

  // Coupon apply handler
  const handleApplyCoupon = () => {
    setCouponError(null);
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    const coupons: CampCoupon[] = camp?.special_waivers?.coupons || [];
    const found = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);
    if (!found) {
      setCouponError(`Coupon "${cleanCode}" is invalid or expired.`);
      return;
    }
    if (found.max_uses && (found.used_count || 0) >= found.max_uses) {
      setCouponError(`Promo code "${cleanCode}" has reached its maximum usage limit (${found.max_uses} users).`);
      return;
    }
    setAppliedCoupon(found);
    setCouponInput('');
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

  // Submit Inter-Temple Transfer
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

      setRegistrationSuccess({
        groupId: json.groupId,
        count: json.count,
        totalPaid: grandTotalWithSurcharge,
        paymentMethod: paymentDetails.paymentMethod,
        pocName: pocDetails.pocName,
        pocContact: pocDetails.pocContact,
        email: pocDetails.email,
        entries,
      });

      setShowPaymentModal(false);
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
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100/60 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
              Registration Successful
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Hare Krishna! You&apos;re Confirmed
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
                  {registrationSuccess.paymentMethod === 'INTER_TEMPLE_TRANSFER' ? 'Inter-Temple Transfer' : registrationSuccess.paymentMethod}
                </span>
              </div>
              {registrationSuccess.paymentMethod === 'INTER_TEMPLE_TRANSFER' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Payment Status: Under Verification (Processing)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Your transfer receipt has been uploaded to Central VOICE records. Camp administration will verify the transaction UTR with bank statements and approve the final confirmation.
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
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-8 sm:p-10 text-white shadow-xl shadow-orange-500/15">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                  <span>VOICE Spiritual Retreat &amp; Leadership Camp</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  {camp.title}
                </h1>

                <p className="text-sm sm:text-base text-amber-50/90 max-w-2xl font-normal leading-relaxed">
                  {camp.description || 'Join devotees and youth seekers for immersive sadhana, Vedic wisdom discourses, Sattvic feasts, and joyful devotional association.'}
                </p>

                <div className="flex flex-wrap gap-3 pt-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5 bg-black/25 px-3.5 py-2 rounded-xl backdrop-blur-md">
                    <Calendar className="w-4 h-4 text-amber-200" />
                    <span>{startDateStr} &mdash; {endDateStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/25 px-3.5 py-2 rounded-xl backdrop-blur-md">
                    <MapPin className="w-4 h-4 text-rose-200" />
                    <span>{camp.venue || 'Central VOICE, Pune'}</span>
                  </div>
                  {camp.late_fee > 0 && !isCampOverOrClosed && (
                    <div className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl backdrop-blur-md font-semibold text-xs ${
                      isLateFeeActive
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
                  {deadlineDateStr && !isCampOverOrClosed && (
                    <div className="flex items-center gap-1.5 bg-black/25 px-3.5 py-2 rounded-xl backdrop-blur-md text-amber-100 text-xs font-semibold">
                      <Clock className="w-4 h-4 text-amber-200" />
                      <span>Registration Deadline: {deadlineDateStr}</span>
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                  isArchived ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'
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
                      {lookupResults.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900 block">{item.participant_name}</span>
                            <span className="text-[11px] text-slate-500">{item.camp_track} • {item.group_id}</span>
                          </div>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px]">
                            Confirmed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          WhatsApp Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={pocDetails.pocContact}
                          onChange={(e) => setPocDetails({ ...pocDetails, pocContact: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                          placeholder="10-digit mobile"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-slate-900 text-xs font-medium outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
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
                  <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs">
                        2
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          {editIndex !== null ? 'Edit Devotee Entry' : 'Add Devotee / Participant'}
                        </h2>
                        <p className="text-xs text-slate-500">
                          Fill details for this devotee. You can register multiple devotees in a single payment batch.
                        </p>
                      </div>
                    </div>

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
                            </label>
                            <input
                              type="text"
                              required
                              name="participantName"
                              value={formData.participantName}
                              onChange={handleChange}
                              placeholder="Devotee / Student name"
                              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              WhatsApp Number *
                            </label>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              name="whatsapp"
                              value={formData.whatsapp}
                              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                              placeholder="10-digit WhatsApp"
                              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all placeholder:text-slate-400"
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
                              Parent Temple *
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
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Select Camp (Category) *
                            </label>
                            <select
                              name="campTrack"
                              value={formData.campTrack}
                              onChange={handleChange}
                              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                            >
                              {(camp.tracks || []).map((track) => (
                                <option key={track} value={track}>
                                  {track}
                                </option>
                              ))}
                            </select>
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
                              {(camp.participant_types || ['Camp Participant', 'Mentor', 'Volunteer', 'Brahmachari']).map(
                                (role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                )
                              )}
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
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-semibold shadow-xs hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all cursor-pointer"
                              >
                                <option value="Yes">Yes, I need accommodation from CV</option>
                                <option value="No">No, I do not need accommodation</option>
                              </select>
                            )}
                          </div>
                        </div>
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
                          className="inline-flex items-center gap-2 px-7 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Plus className="w-4 h-4" />
                          {editIndex !== null ? 'Update Attendee' : 'Add Devotee to Batch'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEP 3: BATCH DEVOTEES TABLE */}
                {entries.length > 0 && (
                  <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs">
                          3
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">
                            Registered Batch Devotees ({entries.length})
                          </h2>
                          <p className="text-xs text-slate-500">
                            Review devotee roster before completing contribution.
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block font-semibold">Total Batch Contribution</span>
                        <span className="text-2xl font-black text-emerald-600">
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
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  entry.accommodation === 'Yes' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
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
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold rounded-full text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Proceed to Payment (₹{finalTotalAmount.toLocaleString('en-IN')})</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Select Payment Method
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedMethod(null);
                  setPaymentError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
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

                  {camp.payment_config?.enable_idt && (
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

                  {camp.payment_config?.enable_itt && (
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
                      onClick={initiateRazorpayPayment}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Pay ₹{grandTotalWithSurcharge} via Razorpay
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
                      placeholder="e.g. Bageshree VOICE, Nilachal Dept"
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
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Confirm IDT (₹{baseTotalAmount})
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
                        Amount: ₹{finalTotalAmount}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Beneficiary Name</span>
                        <span className="font-bold text-slate-900">{camp.payment_config?.itt_bank_details?.account_name || 'Central VOICE Pune'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Bank Name</span>
                        <span className="font-bold text-slate-900">{camp.payment_config?.itt_bank_details?.bank_name || 'State Bank of India'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Account Number</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {camp.payment_config?.itt_bank_details?.account_number || '---'}
                          </span>
                          {camp.payment_config?.itt_bank_details?.account_number && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.payment_config.itt_bank_details?.account_number || '', 'acc')}
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
                            {camp.payment_config?.itt_bank_details?.ifsc_code || '---'}
                          </span>
                          {camp.payment_config?.itt_bank_details?.ifsc_code && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.payment_config.itt_bank_details?.ifsc_code || '', 'ifsc')}
                              className="text-slate-400 hover:text-emerald-700 text-xs"
                              title="Copy IFSC Code"
                            >
                              {copiedBankField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {camp.payment_config?.itt_bank_details?.branch_name && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Branch</span>
                          <span className="font-medium text-slate-800">{camp.payment_config.itt_bank_details.branch_name}</span>
                        </div>
                      )}

                      {camp.payment_config?.itt_bank_details?.upi_id && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">UPI ID / VPA</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-emerald-800">
                              {camp.payment_config.itt_bank_details.upi_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.payment_config.itt_bank_details?.upi_id || '', 'upi')}
                              className="text-slate-400 hover:text-emerald-700 text-xs"
                              title="Copy UPI ID"
                            >
                              {copiedBankField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {camp.payment_config?.itt_bank_details?.instructions && (
                      <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-900 font-medium">
                        💡 {camp.payment_config.itt_bank_details.instructions}
                      </div>
                    )}
                  </div>

                  {/* Transfer Verification Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transferring Temple / Center Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={ittTempleName}
                        onChange={(e) => setIttTempleName(e.target.value)}
                        placeholder="e.g. ISKCON Bangalore, Nigdi VOICE"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bank Transaction UTR / Ref ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={ittTransactionRef}
                        onChange={(e) => setIttTransactionRef(e.target.value)}
                        placeholder="e.g. 412389123456 or IMPS/NEFT UTR"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-mono outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Upload Transfer Screenshot / Receipt Proof *
                      </label>
                      <div className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-3 bg-slate-50 text-center transition-colors">
                        {ittScreenshotPreview ? (
                          <div className="space-y-2">
                            <img
                              src={ittScreenshotPreview}
                              alt="Payment Screenshot Preview"
                              className="max-h-36 mx-auto rounded-lg border border-slate-200 object-contain shadow-xs"
                            />
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[11px] text-emerald-700 font-bold">Screenshot ready to upload</span>
                              <label className="text-[11px] text-slate-600 underline cursor-pointer hover:text-slate-900">
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
                          <label className="cursor-pointer block py-2">
                            <UploadCloud className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
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

                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                      ⏳ <strong>Note:</strong> Registration status will be set to <em>Processing</em>. Central VOICE administration will verify the UTR with bank statements to confirm the registration.
                    </div>
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
                          <span>{ittUploading ? 'Uploading Receipt...' : 'Submitting...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Proof & Confirm (₹{finalTotalAmount})</span>
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
                            {camp.refund_config?.refund_meals !== false && live.mealRefund > 0 && (
                              <div className="flex justify-between">
                                <span>Unconsumed Meals Refund ({live.baseRefundPercent}%):</span>
                                <span className="font-bold text-slate-800">₹{live.mealRefund}</span>
                              </div>
                            )}
                            {camp.refund_config?.refund_accommodation !== false && live.accRefund > 0 && (
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
    </>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, ShieldAlert, ArrowRightLeft, User, Phone, Mail, Building,
  Building2, Utensils, Home, Calendar, CreditCard, CheckCircle2,
  AlertCircle, Loader2, Search, Calculator, Sparkles, Check, RefreshCw
} from 'lucide-react';
import { Camp, CampRegistration } from '@/types';
import {
  superAdminSearchDevoteesAction,
  superAdminGetAvailableCampsAction,
  superAdminTransferCampPassAction
} from '@/app/dashboard/admin/camps/actions';
import { calculateDynamicCampCost } from '@/lib/camp-cost';

interface SuperAdminPassTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: CampRegistration | null;
  currentCamp: Camp;
  onTransferSuccess: (updatedReg: CampRegistration, targetCampTitle?: string) => void;
}

export default function SuperAdminPassTransferModal({
  isOpen,
  onClose,
  registration,
  currentCamp,
  onTransferSuccess,
}: SuperAdminPassTransferModalProps) {
  // Available Camps
  const [availableCamps, setAvailableCamps] = useState<Camp[]>([]);
  const [loadingCamps, setLoadingCamps] = useState(false);
  const [selectedCampId, setSelectedCampId] = useState<string>(currentCamp?.id || '');

  // Devotees State (Searchable Dropdown)
  const [allDevotees, setAllDevotees] = useState<any[]>([]);
  const [loadingDevotees, setLoadingDevotees] = useState(false);
  const [selectedDevoteeId, setSelectedDevoteeId] = useState<string>('');
  const [devoteeSearchQuery, setDevoteeSearchQuery] = useState('');

  // New Participant Form State
  const [formData, setFormData] = useState({
    participant_name: '',
    whatsapp: '',
    email: '',
    gender: 'Male',
    age: '',
    married_since_year: '',
    voice_name: '',
    parent_temple: '',
    counselor_name: '',
    poc_name: '',
    poc_contact: '',
    camp_track: '',
    participant_type: '',
    first_meal_date: '',
    first_meal_type: 'Breakfast',
    last_meal_date: '',
    last_meal_type: 'Lunch',
    dinner_type: 'Dinner Meal',
    accommodation: 'No',
  });

  // Transfer Options
  const [financialMode, setFinancialMode] = useState<'KEEP_FULL_PAYMENT' | 'CALCULATED'>('KEEP_FULL_PAYMENT');
  const [transferReason, setTransferReason] = useState('Pass transferred to another devotee by Super Admin');
  const [sendNewPassEmail, setSendNewPassEmail] = useState(true);
  const [notifyOriginalDevotee, setNotifyOriginalDevotee] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load available camps and all devotees when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialData = async () => {
      setLoadingCamps(true);
      setLoadingDevotees(true);
      try {
        const [campsRes, devoteesRes] = await Promise.all([
          superAdminGetAvailableCampsAction(),
          superAdminSearchDevoteesAction(),
        ]);

        if (campsRes.success && campsRes.camps) {
          setAvailableCamps(campsRes.camps);
        }
        if (devoteesRes.success && devoteesRes.devotees) {
          setAllDevotees(devoteesRes.devotees);
        } else if (!devoteesRes.success) {
          console.error('Failed to load devotees list:', devoteesRes.error);
        }
      } catch (e) {
        console.error('Failed to load modal initial data:', e);
      } finally {
        setLoadingCamps(false);
        setLoadingDevotees(false);
      }
    };

    fetchInitialData();
  }, [isOpen]);

  // Refresh devotees from database manually
  const reloadDevotees = async () => {
    setLoadingDevotees(true);
    try {
      const res = await superAdminSearchDevoteesAction();
      if (res.success && res.devotees) {
        setAllDevotees(res.devotees);
      } else {
        console.error('Failed to reload devotees list:', res.error);
      }
    } catch (e) {
      console.error('Failed to reload devotees list:', e);
    } finally {
      setLoadingDevotees(false);
    }
  };

  // Live debounced server search to guarantee any newly added or queried devotee is always retrieved
  useEffect(() => {
    const q = devoteeSearchQuery.trim();
    if (q.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        const res = await superAdminSearchDevoteesAction(q);
        if (res.success && res.devotees && res.devotees.length > 0) {
          setAllDevotees((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const newOnes = res.devotees.filter((d: any) => !existingIds.has(d.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });
        }
      } catch (err) {
        console.warn('Live devotee search error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [devoteeSearchQuery]);

  // Selected Camp object
  const activeCamp = useMemo(() => {
    if (!selectedCampId) return currentCamp;
    const found = availableCamps.find((c) => c.id === selectedCampId);
    return found || currentCamp;
  }, [selectedCampId, availableCamps, currentCamp]);

  // Reset form when registration changes or modal opens
  useEffect(() => {
    if (registration && isOpen) {
      setSelectedCampId(registration.camp_id || currentCamp?.id || '');
      setError(null);
      setSuccessMsg(null);
      setDevoteeSearchQuery('');
      setSelectedDevoteeId('');

      setFormData({
        participant_name: '',
        whatsapp: '',
        email: '',
        gender: registration.gender || 'Male',
        age: registration.age ? String(registration.age) : '',
        married_since_year: registration.married_since_year ? String(registration.married_since_year) : '',
        voice_name: registration.voice_name || '',
        parent_temple: registration.parent_temple || '',
        counselor_name: registration.counselor_name || '',
        poc_name: registration.poc_name || '',
        poc_contact: registration.poc_contact || '',
        camp_track: registration.camp_track || (currentCamp?.tracks?.[0] || ''),
        participant_type: registration.participant_type || (currentCamp?.participant_types?.[0] || ''),
        first_meal_date: registration.first_meal_date || '',
        first_meal_type: registration.first_meal_type || 'Breakfast',
        last_meal_date: registration.last_meal_date || '',
        last_meal_type: registration.last_meal_type || 'Lunch',
        dinner_type: registration.dinner_type || 'Dinner Meal',
        accommodation: registration.accommodation || 'No',
      });
    }
  }, [registration, isOpen, currentCamp]);

  // When target camp changes, adjust track and meal dates if needed
  const handleCampChange = (newCampId: string) => {
    setSelectedCampId(newCampId);
    const target = availableCamps.find((c) => c.id === newCampId);
    if (!target) return;

    setFormData((prev) => {
      const newTrack = target.tracks?.includes(prev.camp_track)
        ? prev.camp_track
        : (target.tracks?.[0] || prev.camp_track);

      const newType = target.participant_types?.includes(prev.participant_type)
        ? prev.participant_type
        : (target.participant_types?.[0] || prev.participant_type);

      return {
        ...prev,
        camp_track: newTrack,
        participant_type: newType,
      };
    });
  };

  // Filtered devotees based on search query (instant in-memory search with smart token matching)
  const filteredDevotees = useMemo(() => {
    const q = devoteeSearchQuery.trim().toLowerCase();
    if (!q) return allDevotees;
    const cleanDigits = q.replace(/\D/g, '');

    return allDevotees.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const phoneDigits = (u.phone || '').replace(/\D/g, '');
      const email = (u.email || '').toLowerCase();
      const center = (u.current_center || u.center || u.other_center || '').toLowerCase();
      const temple = (u.current_temple || u.parent_temple || '').toLowerCase();
      const counselor = (u.counselor_name || '').toLowerCase();

      return (
        name.includes(q) ||
        (cleanDigits.length >= 3 && phoneDigits.includes(cleanDigits)) ||
        phone.includes(q) ||
        email.includes(q) ||
        center.includes(q) ||
        temple.includes(q) ||
        counselor.includes(q)
      );
    });
  }, [allDevotees, devoteeSearchQuery]);

  // Selected devotee object
  const selectedDevotee = useMemo(() => {
    if (!selectedDevoteeId) return null;
    return allDevotees.find((u) => u.id === selectedDevoteeId) || null;
  }, [selectedDevoteeId, allDevotees]);

  // Select Devotee from dropdown or quick cards
  const handleSelectDevotee = (user: any) => {
    setSelectedDevoteeId(user.id || '');
    let cleanPhone = (user.phone || '').trim();
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.slice(3).trim();
    }

    setFormData((prev) => ({
      ...prev,
      participant_name: user.name || '',
      whatsapp: cleanPhone || user.phone || '',
      email: user.email || '',
      gender: user.gender || prev.gender,
      age: user.age ? String(user.age) : prev.age,
      voice_name: user.current_center || user.center || prev.voice_name,
      parent_temple: user.current_temple || user.parent_temple || prev.parent_temple,
      counselor_name: user.counselor_name || prev.counselor_name,
    }));
  };

  // Clear selected devotee
  const handleClearSelectedDevotee = () => {
    setSelectedDevoteeId('');
    setDevoteeSearchQuery('');
    setFormData((prev) => ({
      ...prev,
      participant_name: '',
      whatsapp: '',
      email: '',
      gender: 'Male',
      age: '',
      voice_name: '',
      parent_temple: '',
      counselor_name: '',
    }));
  };

  // Calculate live dynamic cost for target camp
  const dynamicCalc = useMemo(() => {
    if (!activeCamp) return null;
    return calculateDynamicCampCost(activeCamp, {
      firstMealDate: formData.first_meal_date,
      firstMealType: formData.first_meal_type,
      lastMealDate: formData.last_meal_date,
      lastMealType: formData.last_meal_type,
      accommodation: formData.accommodation,
      participantType: formData.participant_type,
      campTrack: formData.camp_track,
    });
  }, [activeCamp, formData]);

  // Submit Pass Transfer
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration?.id) return;

    if (!formData.participant_name.trim()) {
      setError('Please provide the new participant devotee name.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setError('Please provide the new participant WhatsApp/Mobile number.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please provide the new participant email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let overrideFinancials: any = undefined;
      if (financialMode === 'CALCULATED' && dynamicCalc) {
        overrideFinancials = {
          total_cost: dynamicCalc.totalCost,
          meal_cost: dynamicCalc.mealCost,
          acc_cost: dynamicCalc.accCost,
          discount_amount: 0,
        };
      }

      const res = await superAdminTransferCampPassAction({
        registrationId: registration.id,
        targetCampId: selectedCampId,
        newParticipant: {
          ...formData,
          age: formData.age ? Number(formData.age) : null,
          married_since_year: formData.married_since_year ? Number(formData.married_since_year) : null,
        },
        overrideFinancials,
        transferReason: transferReason.trim(),
        sendNewPassEmail,
        notifyOriginalDevotee,
      });

      if (!res.success || !res.registration) {
        throw new Error(res.error || 'Failed to transfer camp pass.');
      }

      setSuccessMsg(res.message || 'Pass transferred successfully!');
      setTimeout(() => {
        onTransferSuccess(res.registration as CampRegistration, res.targetCamp?.title);
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Pass transfer failed:', err);
      setError(err.message || 'Failed to execute pass transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !registration) return null;

  const isCampModified = selectedCampId && selectedCampId !== registration.camp_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-4 sm:p-5 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-300" />
                Super Admin Exclusive
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-purple-200 text-[10px] font-bold border border-white/20 font-mono">
                Booking #{registration.group_id || registration.id?.slice(0, 8)}
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-black text-white leading-tight flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-300" />
              Transfer Pass &amp; Entitlements to Another Devotee
            </h3>
            <p className="text-[11px] sm:text-xs text-purple-200/90 leading-relaxed max-w-xl">
              Reassign full payment, prasadam meal slots, and accommodation to a new attendee. You can also modify the camp to transfer between retreats.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmitTransfer} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* SOURCE PASS SUMMARY CARD */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Original Attendee (Current Pass Holder)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                Paid: ₹{registration.total_cost} ({registration.payment_method})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
              <div>Devotee: <strong className="text-slate-900 block truncate">{registration.participant_name}</strong></div>
              <div>Phone: <span className="font-mono text-slate-800 block truncate">{registration.whatsapp}</span></div>
              <div>Camp: <span className="font-semibold text-slate-800 block truncate">{currentCamp?.title}</span></div>
              <div>Track: <span className="font-semibold text-slate-800 block truncate">{registration.camp_track}</span></div>
            </div>
          </div>

          {/* STEP 1: TARGET CAMP SELECTION (OPTION TO MODIFY CAMP) */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-700" />
                Target Camp / Retreat
              </label>
              {isCampModified ? (
                <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 font-black text-[10px] animate-pulse">
                  Camp Modifying &rarr; {activeCamp?.title}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  Same Camp
                </span>
              )}
            </div>
            <p className="text-[11px] text-indigo-800/90 leading-tight">
              Select which camp the pass should belong to. You can keep the current camp or transfer to any active retreat.
            </p>

            <select
              value={selectedCampId}
              onChange={(e) => handleCampChange(e.target.value)}
              disabled={loadingCamps}
              className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white text-slate-900 text-xs font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none"
            >
              {availableCamps.length === 0 ? (
                <option value={currentCamp.id}>{currentCamp.title}</option>
              ) : (
                availableCamps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.id === currentCamp.id ? '(Current Camp)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* STEP 2: TARGET DEVOTEE IDENTITY & SEARCH */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-700" />
                New Devotee Details (Recipient)
              </h4>
              <span className="text-[10px] text-purple-700 font-bold">
                Auto-fill via search or enter manually
              </span>
            </div>

            {/* Devotee Search and Dropdown Combobox */}
            <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                  Search &amp; Pick Devotee from Database
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-purple-700">
                    {loadingDevotees
                      ? 'Loading devotees...'
                      : devoteeSearchQuery
                      ? `${filteredDevotees.length} of ${allDevotees.length} matching`
                      : `${allDevotees.length} devotees loaded`}
                  </span>
                  <button
                    type="button"
                    onClick={reloadDevotees}
                    disabled={loadingDevotees}
                    className="p-1 rounded-lg hover:bg-purple-200/60 text-purple-700 disabled:opacity-40 transition-colors cursor-pointer"
                    title="Reload devotees from database"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDevotees ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Search / Filter Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={devoteeSearchQuery}
                  onChange={(e) => setDevoteeSearchQuery(e.target.value)}
                  placeholder="Type name (e.g. SMVD), mobile number, email, or center to search..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-500 outline-none shadow-sm"
                />
                {devoteeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDevoteeSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    title="Clear filter"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown Selector */}
              <div>
                <select
                  value={selectedDevoteeId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setSelectedDevoteeId(uid);
                    const found = allDevotees.find((u) => u.id === uid);
                    if (found) {
                      handleSelectDevotee(found);
                    }
                  }}
                  disabled={loadingDevotees}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-semibold text-purple-950 focus:border-purple-600 focus:ring-1 focus:ring-purple-500 outline-none shadow-sm cursor-pointer disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingDevotees
                      ? '⏳ Loading all devotees...'
                      : devoteeSearchQuery
                      ? `-- Pick from ${filteredDevotees.length} matching devotee${filteredDevotees.length === 1 ? '' : 's'} --`
                      : `-- Select Devotee from Dropdown (${allDevotees.length} total) --`}
                  </option>
                  {filteredDevotees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.phone || 'No phone'} | {u.email || ''} ({u.current_center || u.center || 'Devotee'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick-pick cards when filtered */}
              {devoteeSearchQuery && filteredDevotees.length > 0 && filteredDevotees.length <= 8 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Quick Pick Matching Devotee ({filteredDevotees.length}):</span>
                    <span className="text-[10px] text-purple-600 font-normal">Click to auto-fill</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredDevotees.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectDevotee(u)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                          selectedDevoteeId === u.id
                            ? 'bg-purple-100 border-purple-500 shadow-sm ring-1 ring-purple-400'
                            : 'bg-white border-purple-200 hover:bg-purple-50/80 hover:border-purple-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                            {u.name}
                            {selectedDevoteeId === u.id && (
                              <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {u.phone || 'No phone'} • {u.email || 'No email'}
                          </div>
                          {u.counselor_name && (
                            <div className="text-[10px] text-purple-800 font-medium truncate">
                              Counselor: {u.counselor_name}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full inline-block">
                            {u.current_center || u.center || 'Devotee'}
                          </span>
                          {u.parent_temple && (
                            <div className="text-[9px] text-slate-500 truncate max-w-[130px] mt-0.5">
                              {u.parent_temple}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Devotee Confirmation Badge */}
              {selectedDevotee && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">
                        Selected: {selectedDevotee.name}{' '}
                        <span className="text-[10px] font-normal text-emerald-700">
                          ({selectedDevotee.current_center || selectedDevotee.center || 'Devotee'})
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-mono">
                        {selectedDevotee.phone || 'No phone'} • {selectedDevotee.email || 'No email'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedDevotee}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Devotee Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.participant_name}
                  onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  WhatsApp / Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. ramesh@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
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
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Center / VOICE</label>
                <input
                  type="text"
                  value={formData.voice_name}
                  onChange={(e) => setFormData({ ...formData, voice_name: e.target.value })}
                  placeholder="e.g. NVCC Youth VOICE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Parent Temple</label>
                <input
                  type="text"
                  value={formData.parent_temple}
                  onChange={(e) => setFormData({ ...formData, parent_temple: e.target.value })}
                  placeholder="e.g. ISKCON Pune"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Counselor Name</label>
                <input
                  type="text"
                  value={formData.counselor_name}
                  onChange={(e) => setFormData({ ...formData, counselor_name: e.target.value })}
                  placeholder="e.g. Radheshyam Das"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: CAMP TRACK, MEALS & STAY ALLOCATION */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-200 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-200/60 pb-1.5">
              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-purple-700" />
                Track, Prasadam Meals &amp; Accommodation
              </h4>
              {dynamicCalc && (
                <span className="text-[11px] text-purple-900 font-extrabold">
                  Schedule Cost: ₹{dynamicCalc.totalCost}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Camp Track</label>
                <select
                  value={formData.camp_track}
                  onChange={(e) => setFormData({ ...formData, camp_track: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  {(activeCamp?.tracks || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {formData.camp_track && !activeCamp?.tracks?.includes(formData.camp_track) && (
                    <option value={formData.camp_track}>{formData.camp_track}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Participant Type</label>
                <select
                  value={formData.participant_type}
                  onChange={(e) => setFormData({ ...formData, participant_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  {(activeCamp?.participant_types || []).map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                  {formData.participant_type && !activeCamp?.participant_types?.includes(formData.participant_type) && (
                    <option value={formData.participant_type}>{formData.participant_type}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Arrival Date &amp; First Meal</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.first_meal_date}
                    onChange={(e) => setFormData({ ...formData, first_meal_date: e.target.value })}
                    placeholder="e.g. 26-Dec"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                  />
                  <select
                    value={formData.first_meal_type}
                    onChange={(e) => setFormData({ ...formData, first_meal_type: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Departure Date &amp; Last Meal</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.last_meal_date}
                    onChange={(e) => setFormData({ ...formData, last_meal_date: e.target.value })}
                    placeholder="e.g. 31-Dec"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                  />
                  <select
                    value={formData.last_meal_type}
                    onChange={(e) => setFormData({ ...formData, last_meal_type: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Evening Prasadam Selection</label>
                <select
                  value={formData.dinner_type}
                  onChange={(e) => setFormData({ ...formData, dinner_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  <option value="Dinner Meal">Dinner Meal (Full Dinner)</option>
                  <option value="Milk Only">Milk Only</option>
                  <option value="Both Dinner & Milk">Both Dinner &amp; Milk</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Accommodation / Stay Included?</label>
                <select
                  value={formData.accommodation}
                  onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  <option value="Yes">Yes (Stay &amp; Bedding Included)</option>
                  <option value="No">No (Day Scholar / Outside Stay)</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 4: FINANCIAL & PAYMENT TRANSFER */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                Payment &amp; Financial Transfer Mode
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-extrabold text-[10px]">
                Paid: ₹{registration.total_cost}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-emerald-200 bg-white cursor-pointer hover:bg-emerald-50/50 transition-colors">
                <input
                  type="radio"
                  name="financialMode"
                  value="KEEP_FULL_PAYMENT"
                  checked={financialMode === 'KEEP_FULL_PAYMENT'}
                  onChange={() => setFinancialMode('KEEP_FULL_PAYMENT')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-black text-slate-900 block">
                    100% Full Payment Carried Over (₹{registration.total_cost})
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-snug">
                    Carries over the full original amount paid by the devotee. Zero extra charges.
                  </span>
                </div>
              </label>

              {dynamicCalc && dynamicCalc.totalCost !== Number(registration.total_cost) && (
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-emerald-200 bg-white cursor-pointer hover:bg-emerald-50/50 transition-colors">
                  <input
                    type="radio"
                    name="financialMode"
                    value="CALCULATED"
                    checked={financialMode === 'CALCULATED'}
                    onChange={() => setFinancialMode('CALCULATED')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-black text-slate-900 block">
                      Update Fee to Target Camp Schedule (₹{dynamicCalc.totalCost})
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-snug">
                      Adjusts ledger total to match the target camp&apos;s exact meal and stay rate.
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* STEP 5: TRANSFER REASON & NOTIFICATION CONTROLS */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Transfer Audit Reason *
              </label>
              <input
                type="text"
                required
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Devotee exam conflict; approved seat replacement"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:border-purple-500 outline-none"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNewPassEmail}
                  onChange={(e) => setSendNewPassEmail(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Email new devotee official camp welcome notice and active digital pass</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOriginalDevotee}
                  onChange={(e) => setNotifyOriginalDevotee(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Email courtesy transfer confirmation notice to original devotee ({registration.email || registration.participant_name})</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 hover:from-indigo-600 hover:to-purple-600 text-white font-black text-xs shadow-md shadow-indigo-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing Pass Transfer...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Confirm &amp; Transfer Pass to {formData.participant_name ? formData.participant_name.trim() : 'New Devotee'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

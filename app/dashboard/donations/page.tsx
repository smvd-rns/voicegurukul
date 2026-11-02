'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  Heart, 
  Search, 
  User, 
  Mail, 
  Phone, 
  Contact, 
  Loader2, 
  Share2, 
  ClipboardCheck,
  Zap,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Award,
  Wallet,
  MapPin,
  HeartHandshake,
  Users,
  CheckCircle2,
  Lock,
  Unlock,
  Clock,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/config';
import { 
  fetchUserDonations, 
  fetchActiveBehalfDevotees, 
  checkIfUserIsOnBehalfList, 
  fetchBehalfDonations,
  getUserBehalfStatus,
  freezeUserBehalfSelection,
  requestBehalfChange,
  cancelBehalfChangeRequest
} from './actions';
import { toast } from 'react-hot-toast';

export default function MyDonationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const statusParam = searchParams?.get('status') || 'captured';
  const pageParam = parseInt(searchParams?.get('page') || '1');

  const { user } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copying, setCopying] = useState(false);
  const [userSlug, setUserSlug] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(statusParam);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(pageParam);

  // Behalf Collection State
  const [behalfDevotees, setBehalfDevotees] = useState<any[]>([]);
  const [selectedBehalfDevoteeId, setSelectedBehalfDevoteeId] = useState<string>('');
  
  // Frozen Behalf State (Locked Selection & Change Request)
  const [frozenBehalfId, setFrozenBehalfId] = useState<string | null>(null);
  const [frozenBehalfName, setFrozenBehalfName] = useState<string | null>(null);
  const [behalfChangeStatus, setBehalfChangeStatus] = useState<string | null>(null);
  const [pendingBehalfId, setPendingBehalfId] = useState<string | null>(null);
  const [pendingBehalfName, setPendingBehalfName] = useState<string | null>(null);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [tempBehalfDevotee, setTempBehalfDevotee] = useState<any | null>(null);
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [targetBehalfId, setTargetBehalfId] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');
  const [isSubmittingBehalfAction, setIsSubmittingBehalfAction] = useState(false);
  
  // Section for users whose name is on the Behalf list
  const [isOnBehalfList, setIsOnBehalfList] = useState(false);
  const [behalfDevoteeInfo, setBehalfDevoteeInfo] = useState<any>(null);
  const [behalfDonations, setBehalfDonations] = useState<any[]>([]);
  const [behalfSearchQuery, setBehalfSearchQuery] = useState('');
  const [behalfStatusFilter, setBehalfStatusFilter] = useState('all');
  const [behalfCurrentPage, setBehalfCurrentPage] = useState(1);
  const [behalfPageSize, setBehalfPageSize] = useState(10);

  // Main Subsection Switcher: 'my-collections' vs 'behalf-collections'
  const tabParam = searchParams?.get('tab');
  const [activeSubsection, setActiveSubsection] = useState<'my-collections' | 'behalf-collections'>(
    tabParam === 'behalf-collections' ? 'behalf-collections' : 'my-collections'
  );

  // Sync state with URL for back button support
  useEffect(() => {
    if (statusParam && statusParam !== selectedStatus) {
      setSelectedStatus(statusParam);
    }
    if (pageParam && pageParam !== currentPage) {
      setCurrentPage(pageParam);
    }
    if (tabParam && (tabParam === 'my-collections' || tabParam === 'behalf-collections')) {
      setActiveSubsection(tabParam);
    }
  }, [statusParam, pageParam, tabParam, selectedStatus, currentPage]);

  const updateUrl = (newStatus?: string, newPage?: number, newTab?: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus) params.set('status', newStatus);
    if (newPage) params.set('page', newPage.toString());
    if (newTab) params.set('tab', newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !supabase) return;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        // 1. Fetch user slug
        const { data: userData } = await supabase
          .from('users')
          .select('donation_slug')
          .eq('id', user.id)
          .single();
        if (userData?.donation_slug) setUserSlug(userData.donation_slug);
        
        // 2. Fetch my personal donations
        const result = await fetchUserDonations(user.id, accessToken);
        if (result.success && result.donations) {
          setDonations(result.donations);
        }

        // 3. Fetch active behalf devotees list for the dropdown
        const behalfRes = await fetchActiveBehalfDevotees();
        if (behalfRes.success && behalfRes.devotees) {
          setBehalfDevotees(behalfRes.devotees);
        }

        // 4. Fetch user frozen behalf devotee and change request status
        const behalfStatusRes = await getUserBehalfStatus(user.id);
        if (behalfStatusRes.success && behalfStatusRes.status) {
          const s = behalfStatusRes.status;
          if (s.selected_behalf_id) {
            setFrozenBehalfId(s.selected_behalf_id);
            setFrozenBehalfName(s.selected_behalf_name);
            setSelectedBehalfDevoteeId(s.selected_behalf_id);
          }
          setBehalfChangeStatus(s.behalf_change_request_status || null);
          setPendingBehalfId(s.behalf_change_request_id || null);
          setPendingBehalfName(s.behalf_change_request_name || null);
        }

        // 5. Check if current user is on the Super Admin's behalf list
        const behalfCheck = await checkIfUserIsOnBehalfList(user.id);
        if (behalfCheck.success && behalfCheck.isOnList) {
          setIsOnBehalfList(true);
          setBehalfDevoteeInfo(behalfCheck.behalfDevotee);

          // Fetch donations collected on behalf of this user
          const behalfDonationsRes = await fetchBehalfDonations(user.id);
          if (behalfDonationsRes.success && behalfDonationsRes.donations) {
            setBehalfDonations(behalfDonationsRes.donations);
          }
        }
      } catch (err) {
        console.error('Error fetching donations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDropdownSelectBehalf = (devoteeId: string) => {
    if (!devoteeId) {
      setSelectedBehalfDevoteeId('');
      return;
    }
    const devotee = behalfDevotees.find(d => d.id === devoteeId);
    if (!devotee) return;
    setTempBehalfDevotee(devotee);
    setIsFreezeModalOpen(true);
  };

  const handleConfirmFreezeBehalf = async () => {
    if (!user || !tempBehalfDevotee) return;
    setIsSubmittingBehalfAction(true);
    try {
      const res = await freezeUserBehalfSelection(user.id, tempBehalfDevotee.id, tempBehalfDevotee.name);
      if (!res.success) {
        toast.error(res.error || 'Failed to lock behalf devotee.');
      } else {
        setFrozenBehalfId(tempBehalfDevotee.id);
        setFrozenBehalfName(tempBehalfDevotee.name);
        setSelectedBehalfDevoteeId(tempBehalfDevotee.id);
        setIsFreezeModalOpen(false);
        toast.success(`Locked donation collection behalf to ${tempBehalfDevotee.name}! Your link is ready.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error locking devotee');
    } finally {
      setIsSubmittingBehalfAction(false);
    }
  };

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!targetBehalfId) {
      toast.error('Please select a new devotee to request.');
      return;
    }
    const targetDevotee = behalfDevotees.find(d => d.id === targetBehalfId);
    if (!targetDevotee) {
      toast.error('Devotee not found.');
      return;
    }

    setIsSubmittingBehalfAction(true);
    try {
      const res = await requestBehalfChange(user.id, targetDevotee.id, targetDevotee.name, changeReason);
      if (!res.success) {
        toast.error(res.error || 'Failed to submit change request.');
      } else {
        setBehalfChangeStatus('pending');
        setPendingBehalfId(targetDevotee.id);
        setPendingBehalfName(targetDevotee.name);
        setIsChangeRequestModalOpen(false);
        setTargetBehalfId('');
        setChangeReason('');
        toast.success(`Change request submitted to Super Admin for approval.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error submitting change request');
    } finally {
      setIsSubmittingBehalfAction(false);
    }
  };

  const handleCancelChangeRequest = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel your pending change request?')) return;
    try {
      const res = await cancelBehalfChangeRequest(user.id);
      if (res.success) {
        setBehalfChangeStatus(null);
        setPendingBehalfId(null);
        setPendingBehalfName(null);
        toast.success('Pending change request cancelled.');
      } else {
        toast.error(res.error || 'Failed to cancel request');
      }
    } catch (err: any) {
      toast.error('Error cancelling request');
    }
  };

  const handleCopyLink = () => {
    if (!userSlug) {
      toast.error('Membership ID is missing or pending.');
      return;
    }

    const effectiveBehalfId = frozenBehalfId || selectedBehalfDevoteeId;
    const effectiveBehalfName = frozenBehalfName || behalfDevotees.find(d => d.id === effectiveBehalfId)?.name;

    if (!effectiveBehalfId || !effectiveBehalfName) {
      toast.error('Please select and confirm a devotee from the "Donation collection on the behalf" dropdown before copying.');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${baseUrl}/donate/${userSlug}?behalf=${effectiveBehalfId}&behalf_name=${encodeURIComponent(effectiveBehalfName)}`;
    navigator.clipboard.writeText(url);
    setCopying(true);
    toast.success(`Copied donation link on behalf of ${effectiveBehalfName}!`);
    setTimeout(() => setCopying(false), 2000);
  };

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const matchesSearch = (d.donor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.donor_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.payment_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.on_behalf_of_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' 
        ? true 
        : selectedStatus === 'captured' 
          ? (d.payment_status === 'captured' || d.payment_status === 'success')
          : d.payment_status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [donations, searchQuery, selectedStatus]);

  const totalPages = Math.ceil(filteredDonations.length / pageSize);
  const paginatedDonations = filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalAmount = filteredDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Behalf Donations calculations & filtering
  const filteredBehalfDonations = useMemo(() => {
    return behalfDonations.filter(d => {
      const q = behalfSearchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
                            (d.donor_name || '').toLowerCase().includes(q) ||
                            (d.donor_email || '').toLowerCase().includes(q) ||
                            (d.donor_phone || d.phone || '').toLowerCase().includes(q) ||
                            (d.payment_id || '').toLowerCase().includes(q) ||
                            (d.txnid || d.id || '').toLowerCase().includes(q) ||
                            (d.collector_name || '').toLowerCase().includes(q) ||
                            (d.collector_center || '').toLowerCase().includes(q);
      const matchesStatus = behalfStatusFilter === 'all'
        ? true
        : behalfStatusFilter === 'captured'
          ? (d.payment_status === 'captured' || d.payment_status === 'success')
          : d.payment_status === behalfStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [behalfDonations, behalfSearchQuery, behalfStatusFilter]);

  const behalfTotalAmount = useMemo(() => {
    return filteredBehalfDonations.reduce((sum, d) => {
      const isSuccess = d.payment_status === 'captured' || d.payment_status === 'success';
      return sum + (isSuccess ? Number(d.amount) || 0 : 0);
    }, 0);
  }, [filteredBehalfDonations]);

  const behalfSuccessCount = useMemo(() => {
    return filteredBehalfDonations.filter(d => d.payment_status === 'captured' || d.payment_status === 'success').length;
  }, [filteredBehalfDonations]);

  const behalfUniqueCollectors = useMemo(() => {
    return new Set(filteredBehalfDonations.map(d => d.collector_name || d.tag_user_id).filter(Boolean)).size;
  }, [filteredBehalfDonations]);

  const behalfTotalPages = Math.ceil(filteredBehalfDonations.length / behalfPageSize);
  const paginatedBehalfDonations = filteredBehalfDonations.slice((behalfCurrentPage - 1) * behalfPageSize, behalfCurrentPage * behalfPageSize);

  // My Collections Stats
  const mySuccessfulCount = useMemo(() => {
    return filteredDonations.filter(d => d.payment_status === 'captured' || d.payment_status === 'success').length;
  }, [filteredDonations]);

  const myUniqueDonors = useMemo(() => {
    return new Set(filteredDonations.map(d => d.donor_email).filter(Boolean)).size;
  }, [filteredDonations]);

  const myAvgDonation = useMemo(() => {
    return filteredDonations.length ? Math.round(totalAmount / filteredDonations.length) : 0;
  }, [filteredDonations, totalAmount]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Loading Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-3 sm:px-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 bg-[#FAFAFC]">
      
      {/* 🌟 Compact & Modern Header Banner (Responsive for Mobile & Desktop) 🌟 */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-3.5 sm:p-5 shadow-lg border border-indigo-800/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left Title & Subtext */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">Donation Dashboard</h1>
                {frozenBehalfName && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-300/30 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3 text-amber-300" />
                    Locked: {frozenBehalfName}
                  </span>
                )}
              </div>
              <p className="text-blue-200/80 text-xs font-medium max-w-md hidden sm:block">
                Track personal collections & donations received on your behalf with live verification.
              </p>
            </div>
          </div>

          {/* Right Controls: Stat + Devotee + Copy Link */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
            {/* Top row on mobile: 2 stat/behalf cards */}
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:w-auto">
              {/* Stat Badge */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 min-w-0">
                <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[8.5px] sm:text-[9px] font-bold text-blue-200 uppercase tracking-widest block leading-none truncate">Total Raised</span>
                  <span className="text-sm sm:text-base font-black text-white leading-tight truncate block">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Donation Collection on Behalf Selector / Frozen Display */}
              {frozenBehalfId ? (
                <div className="flex items-center justify-between gap-1.5 bg-white/10 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/20 min-w-0">
                  <div className="min-w-0 flex items-center gap-1 text-amber-300">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span className="text-xs font-black text-white truncate" title={frozenBehalfName || ''}>
                      {frozenBehalfName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetBehalfId('');
                      setChangeReason('');
                      setIsChangeRequestModalOpen(true);
                    }}
                    className="text-[9px] font-bold text-amber-300 hover:text-white bg-black/30 hover:bg-black/50 px-2 py-0.5 rounded-md border border-amber-300/30 transition-all shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/20 min-w-0">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <select
                    value={selectedBehalfDevoteeId}
                    onChange={(e) => handleDropdownSelectBehalf(e.target.value)}
                    className="w-full bg-white text-slate-900 rounded-lg px-2 py-1 text-xs font-bold outline-none border-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-sm truncate"
                  >
                    <option value="">Select Devotee</option>
                    {behalfDevotees.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.center ? `(${d.center})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Copy Link Button: Full width on mobile, auto on desktop */}
            <button 
              onClick={handleCopyLink}
              disabled={!userSlug || (!frozenBehalfId && !selectedBehalfDevoteeId)}
              title={(!frozenBehalfId && !selectedBehalfDevoteeId) ? "Please select a devotee first" : "Copy your personalized donation link"}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shadow-md shrink-0 ${
                copying 
                  ? 'bg-emerald-400 text-emerald-950 shadow-emerald-400/30' 
                  : (frozenBehalfId || selectedBehalfDevoteeId)
                    ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 hover:scale-[1.01] active:scale-95 shadow-amber-400/20'
                    : 'bg-white/20 text-blue-200 opacity-60 cursor-not-allowed'
              }`}
            >
              {copying ? <ClipboardCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{userSlug ? ((frozenBehalfId || selectedBehalfDevoteeId) ? 'Copy Link' : 'Select Devotee First') : 'Pending ID'}</span>
            </button>
          </div>
        </div>

        {/* Pending Change Alert Notice if on Mobile/Tablet */}
        {frozenBehalfId && behalfChangeStatus === 'pending' && (
          <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-bold text-amber-200 bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-400/30">
            <span className="flex items-center gap-1.5 truncate">
              <Clock className="w-3 h-3 text-amber-300 animate-spin shrink-0" />
              Pending change request to &ldquo;{pendingBehalfName}&rdquo;
            </span>
            <button
              type="button"
              onClick={handleCancelChangeRequest}
              className="text-rose-300 hover:text-rose-200 underline shrink-0 font-extrabold"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* Modern Membership ID Warning Box */}
      {!userSlug && (
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-white border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-100 shadow-sm">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">Assign Membership ID Required</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Your donation page requires a Membership ID to activate your link.</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shrink-0 text-center"
          >
            Go to Profile
          </button>
        </div>
      )}

      {/* 🧭 Clean, Compact Subsection Switcher Tabs (2-Column Grid on Mobile, Flex on Desktop) 🧭 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
          {/* Tab 1: My Collected Donations */}
          <button
            onClick={() => {
              setActiveSubsection('my-collections');
              updateUrl(undefined, undefined, 'my-collections');
            }}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubsection === 'my-collections'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="sm:hidden">My Collections</span>
            <span className="hidden sm:inline">My Collected Donations</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
              activeSubsection === 'my-collections' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {filteredDonations.length}
            </span>
          </button>

          {/* Tab 2: Donations on My Behalf */}
          <button
            onClick={() => {
              setActiveSubsection('behalf-collections');
              updateUrl(undefined, undefined, 'behalf-collections');
            }}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubsection === 'behalf-collections'
                ? 'bg-white text-purple-700 shadow-sm border border-purple-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="sm:hidden">On My Behalf</span>
            <span className="hidden sm:inline">Donations on My Behalf</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
              activeSubsection === 'behalf-collections' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {filteredBehalfDonations.length}
            </span>
            {isOnBehalfList && (
              <span className="hidden md:inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded-full border border-amber-300/60">
                Authorized
              </span>
            )}
          </button>
        </div>

        {/* Section Context Info */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 pr-3">
          {activeSubsection === 'my-collections' ? (
            <span className="flex items-center gap-1.5 text-blue-600">
              <Sparkles className="w-3.5 h-3.5" /> Direct Patron Collections
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-purple-600">
              <HeartHandshake className="w-3.5 h-3.5" /> Contributions Collected by Devotees for You
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔹 SUBSECTION 1: MY COLLECTED DONATIONS 🔹 */}
      {/* ========================================================================= */}
      {activeSubsection === 'my-collections' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
          
          {/* 4 Compact Metric Cards (2x2 on Mobile, 4x1 on Desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Card 1: Total Raised */}
            <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-blue-300 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Raised</p>
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Card 2: Total Records */}
            <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-slate-300 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Records</p>
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{filteredDonations.length}</p>
              </div>
            </div>

            {/* Card 3: Verified Successful */}
            <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-emerald-300 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">Successful</p>
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{mySuccessfulCount}</p>
              </div>
            </div>

            {/* Card 4: Unique Donors */}
            <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-indigo-200/80 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-indigo-300 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-indigo-700 uppercase tracking-wider truncate">Unique Patrons</p>
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{myUniqueDonors}</p>
              </div>
            </div>
          </div>

          {/* Toolbar: Filter + Search (Compact on Mobile) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Status:</span>
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedStatus(val);
                  updateUrl(val, 1);
                }}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="captured">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by patron, email, Txn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Container with Crisp Border */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
            {filteredDonations.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3 bg-gradient-to-b from-white to-slate-50/50">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 text-slate-400">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700">No records found</h3>
                  <p className="text-xs text-slate-500 font-medium">There are no donations matching your criteria yet.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Pro Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Donor</th>
                        <th className="py-3 px-4">On Behalf Of</th>
                        <th className="py-3 px-4">Payment Info</th>
                        <th className="py-3 px-4">Contact Identity</th>
                        <th className="py-3 px-4 text-right">Settled Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDonations.map((d: any) => (
                        <tr key={d.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{d.donor_name || 'Anonymous Patron'}</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {d.on_behalf_of_name ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-bold">
                                <HeartHandshake className="w-3 h-3 text-amber-600" />
                                {d.on_behalf_of_name}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 italic">Direct / Self</span>
                            )}
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-slate-600">
                                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{d.payment_id || d.txnid || 'N/A'}</span>
                              </div>
                              {d.donor_pan && d.donor_pan.toUpperCase() !== 'N/A' && (
                                <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.2">
                                  PAN: {d.donor_pan}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-0.5 text-[11px] font-medium text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[160px]">{d.donor_email || 'No Email'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{d.donor_mobile || 'No Phone'}</span>
                              </div>
                              {(d.donor_address || d.address) && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span className="truncate max-w-[160px]">{d.donor_address || d.address}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-sm font-black text-slate-900">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                                d.payment_status === 'captured' || d.payment_status === 'success'
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-full' 
                                  : d.payment_status === 'pending'
                                  ? 'text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full'
                                  : 'text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded-full'
                              }`}>
                                {d.payment_status === 'captured' || d.payment_status === 'success' ? 'Verified' : d.payment_status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 🌟 Polished Mobile Transaction Cards 🌟 */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {paginatedDonations.map((d: any) => (
                    <div key={d.id} className="p-3 sm:p-4 space-y-2.5">
                      {/* Top Row: Donor + Amount & Verified Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 shadow-inner">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{d.donor_name || 'Anonymous Patron'}</h4>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                            </span>
                          </div>
                        </div>

                        {/* Amount & Status Badge */}
                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-slate-900 block leading-tight">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                          <span className={`inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full mt-0.5 ${
                            d.payment_status === 'captured' || d.payment_status === 'success'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80' 
                              : d.payment_status === 'pending'
                              ? 'text-amber-700 bg-amber-50 border border-amber-200/80'
                              : 'text-rose-700 bg-rose-50 border border-rose-200/80'
                          }`}>
                            {d.payment_status === 'captured' || d.payment_status === 'success' ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Verified
                              </>
                            ) : (
                              d.payment_status
                            )}
                          </span>
                        </div>
                      </div>

                      {/* On Behalf Badge (if applicable) */}
                      {d.on_behalf_of_name && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50/90 rounded-lg text-amber-900 text-[10px] font-bold border border-amber-200/70">
                          <HeartHandshake className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>On behalf of: <strong>{d.on_behalf_of_name}</strong></span>
                        </div>
                      )}

                      {/* Contact & Payment Info Box */}
                      <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <Mail className="w-3 h-3 text-sky-500 shrink-0" />
                            <span className="truncate">{d.donor_email || 'No email provided'}</span>
                          </div>
                          {d.donor_mobile && (
                            <div className="flex items-center gap-1 shrink-0 text-slate-700 font-semibold">
                              <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{d.donor_mobile}</span>
                            </div>
                          )}
                        </div>

                        {/* Txn ID & PAN Details */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-200/50 text-[10px] font-mono text-slate-500">
                          <div className="flex items-center gap-1 truncate">
                            <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{d.payment_id || d.txnid || 'ID Pending'}</span>
                          </div>
                          {d.donor_pan && d.donor_pan.toUpperCase() !== 'N/A' && (
                            <span className="text-[9px] font-sans font-bold text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.2">
                              PAN: {d.donor_pan}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🌟 Compact Mobile & Desktop Pagination 🌟 */}
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rows:</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDonations.length)}</strong> of {filteredDonations.length}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        disabled={currentPage === 1} 
                        onClick={() => {
                          const next = Math.max(1, currentPage - 1);
                          setCurrentPage(next);
                          updateUrl(undefined, next);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold shadow-sm"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        disabled={currentPage === totalPages || totalPages === 0} 
                        onClick={() => {
                          const next = Math.min(totalPages, currentPage + 1);
                          setCurrentPage(next);
                          updateUrl(undefined, next);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold shadow-sm"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟣 SUBSECTION 2: DONATIONS COLLECTED ON MY BEHALF 🟣 */}
      {/* ========================================================================= */}
      {activeSubsection === 'behalf-collections' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
          
          {!isOnBehalfList ? (
            /* User is not on the Behalf Devotees list */
            <div className="bg-white border border-purple-200/80 rounded-2xl p-6 sm:p-8 text-center space-y-3 sm:space-y-4 shadow-sm">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100 shadow-sm">
                <HeartHandshake className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm sm:text-base font-black text-slate-800">You Are Not an Authorized On-Behalf Devotee</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This section displays donations collected by other devotees on your behalf. To receive contributions on your behalf, your profile must be added to the authorized devotee list by the Super Admin.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                Contact Super Admin to enable your name on the Behalf Devotee Directory
              </div>
            </div>
          ) : (
            /* User IS on the Behalf Devotees list */
            <>
              {/* 4 Compact Metric Cards (Purple / Amber Theme) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* Card 1: Total Raised For You */}
                <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-purple-200/90 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-purple-300 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-purple-700 uppercase tracking-wider truncate">Raised for You</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">₹{behalfTotalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Card 2: Total Collections */}
                <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-slate-300 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Records</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{filteredBehalfDonations.length}</p>
                  </div>
                </div>

                {/* Card 3: Verified Success */}
                <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-emerald-300 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">Verified</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{behalfSuccessCount}</p>
                  </div>
                </div>

                {/* Card 4: Active Collectors */}
                <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center gap-2.5 sm:gap-3 hover:border-amber-300 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-wider truncate">Collectors</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{behalfUniqueCollectors}</p>
                  </div>
                </div>
              </div>

              {/* Toolbar: Filter + Search (Compact on Mobile) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-purple-200/80 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-purple-600" />
                    <span>Status:</span>
                  </div>
                  <select
                    value={behalfStatusFilter}
                    onChange={(e) => {
                      setBehalfStatusFilter(e.target.value);
                      setBehalfCurrentPage(1);
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 bg-purple-50/50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="captured">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input 
                    type="text"
                    placeholder="Search by patron, collector, Txn..."
                    value={behalfSearchQuery}
                    onChange={(e) => {
                      setBehalfSearchQuery(e.target.value);
                      setBehalfCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-8 py-1.5 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  {behalfSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBehalfSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container with Crisp Border */}
              <div className="bg-white border border-purple-200/80 rounded-2xl shadow-sm overflow-hidden">
                {filteredBehalfDonations.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center space-y-3 bg-gradient-to-b from-white to-purple-50/30">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto border border-purple-100 text-purple-500">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">No donations collected on your behalf yet</h4>
                      <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                        When other devotees select your name and share their link, contributions made on your behalf will appear here automatically.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Pro Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-purple-100 bg-purple-50/50 text-[10px] font-black uppercase tracking-wider text-purple-700">
                            <th className="py-3 px-4">Donor</th>
                            <th className="py-3 px-4">Collected By (Devotee)</th>
                            <th className="py-3 px-4">Payment Info</th>
                            <th className="py-3 px-4 text-right">Settled Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-50">
                          {paginatedBehalfDonations.map((d: any) => (
                            <tr key={d.id} className="hover:bg-purple-50/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
                                    {d.donor_name ? d.donor_name[0]?.toUpperCase() : 'D'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{d.donor_name || 'Anonymous Donor'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-800">{d.collector_name || 'Fellow Devotee'}</p>
                                <p className="text-[10px] text-slate-400">{d.collector_center || d.collector_temple || d.collector_email || 'Verified Devotee'}</p>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-0.5 font-mono text-[10px] font-bold text-slate-600">
                                  <span>{d.txnid || d.payment_id || 'ID Pending'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase">{d.payment_method || 'Online'}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-sm font-black text-slate-900">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Verified
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 🌟 Polished Mobile Transaction Cards for Behalf Collections 🌟 */}
                    <div className="lg:hidden divide-y divide-purple-50">
                      {paginatedBehalfDonations.map((d: any) => (
                        <div key={d.id} className="p-3 sm:p-4 space-y-2.5">
                          {/* Top Row: Donor + Amount & Verified Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100 shadow-inner">
                                {d.donor_name ? d.donor_name[0]?.toUpperCase() : 'D'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{d.donor_name || 'Anonymous'}</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </p>
                              </div>
                            </div>

                            {/* Amount & Status Badge */}
                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base font-black text-slate-900 block leading-tight">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full mt-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Verified
                              </span>
                            </div>
                          </div>

                          {/* Collected By Box */}
                          <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100/80 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-purple-950">Collected by: </span>
                              <span className="text-purple-900 font-semibold">{d.collector_name || 'Fellow Devotee'}</span>
                              {d.collector_center && <span className="text-slate-500 text-[10px] ml-1">({d.collector_center})</span>}
                            </div>
                            <div className="text-[10px] font-mono text-purple-600 font-bold shrink-0">
                              {d.txnid || d.payment_id || ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 🌟 Compact Mobile & Desktop Pagination 🌟 */}
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-purple-100 bg-purple-50/30">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rows:</span>
                        <select 
                          value={behalfPageSize}
                          onChange={(e) => { setBehalfPageSize(Number(e.target.value)); setBehalfCurrentPage(1); }}
                          className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2.5 sm:gap-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <strong className="text-slate-800">{(behalfCurrentPage - 1) * behalfPageSize + 1}–{Math.min(behalfCurrentPage * behalfPageSize, filteredBehalfDonations.length)}</strong> of {filteredBehalfDonations.length}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button 
                            disabled={behalfCurrentPage === 1} 
                            onClick={() => setBehalfCurrentPage(prev => Math.max(1, prev - 1))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold shadow-sm"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            disabled={behalfCurrentPage === behalfTotalPages || behalfTotalPages === 0} 
                            onClick={() => setBehalfCurrentPage(prev => Math.min(behalfTotalPages, prev + 1))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold shadow-sm"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟣 SUBSECTION 2: DONATIONS COLLECTED ON MY BEHALF 🟣 */}
      {/* ========================================================================= */}
      {activeSubsection === 'behalf-collections' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {!isOnBehalfList ? (
            /* User is not on the Behalf Devotees list */
            <div className="bg-white border border-purple-200/80 rounded-2xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100 shadow-sm">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-800">You Are Not an Authorized On-Behalf Devotee</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This section displays donations collected by other devotees on your behalf. To receive contributions on your behalf, your profile must be added to the authorized devotee list by the Super Admin.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                Contact Super Admin to enable your name on the Behalf Devotee Directory
              </div>
            </div>
          ) : (
            /* User IS on the Behalf Devotees list */
            <>
              {/* 4 Compact Metric Cards (Purple / Amber Theme) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Card 1: Total Raised For You */}
                <div className="bg-white p-3.5 rounded-2xl border border-purple-200/90 shadow-sm flex items-center gap-3 hover:border-purple-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider truncate">Raised for You</p>
                    <p className="text-lg font-black text-slate-900 tracking-tight truncate">₹{behalfTotalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Card 2: Total Collections */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3 hover:border-slate-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Records</p>
                    <p className="text-lg font-black text-slate-900 tracking-tight">{filteredBehalfDonations.length}</p>
                  </div>
                </div>

                {/* Card 3: Verified Success */}
                <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-3 hover:border-emerald-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">Verified</p>
                    <p className="text-lg font-black text-slate-900 tracking-tight">{behalfSuccessCount}</p>
                  </div>
                </div>

                {/* Card 4: Active Collectors */}
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center gap-3 hover:border-amber-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider truncate">Collectors</p>
                    <p className="text-lg font-black text-slate-900 tracking-tight">{behalfUniqueCollectors}</p>
                  </div>
                </div>
              </div>

              {/* Toolbar: Filter + Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-purple-200/80 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Filter className="w-3.5 h-3.5 text-purple-600" />
                    <span>Status:</span>
                  </div>
                  <select
                    value={behalfStatusFilter}
                    onChange={(e) => {
                      setBehalfStatusFilter(e.target.value);
                      setBehalfCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-purple-50/50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="captured">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input 
                    type="text"
                    placeholder="Search by patron, collector, Txn..."
                    value={behalfSearchQuery}
                    onChange={(e) => {
                      setBehalfSearchQuery(e.target.value);
                      setBehalfCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-8 py-1.5 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  {behalfSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBehalfSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container with Crisp Border */}
              <div className="bg-white border border-purple-200/80 rounded-2xl shadow-sm overflow-hidden">
                {filteredBehalfDonations.length === 0 ? (
                  <div className="p-12 text-center space-y-3 bg-gradient-to-b from-white to-purple-50/30">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto border border-purple-100 text-purple-500">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">No donations collected on your behalf yet</h4>
                      <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                        When other devotees select your name and share their link, contributions made on your behalf will appear here automatically.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Pro Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-purple-100 bg-purple-50/50 text-[10px] font-black uppercase tracking-wider text-purple-700">
                            <th className="py-3 px-4">Donor</th>
                            <th className="py-3 px-4">Collected By (Devotee)</th>
                            <th className="py-3 px-4">Payment Info</th>
                            <th className="py-3 px-4 text-right">Settled Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-50">
                          {paginatedBehalfDonations.map((d: any) => (
                            <tr key={d.id} className="hover:bg-purple-50/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
                                    {d.donor_name ? d.donor_name[0]?.toUpperCase() : 'D'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{d.donor_name || 'Anonymous Donor'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-800">{d.collector_name || 'Fellow Devotee'}</p>
                                <p className="text-[10px] text-slate-400">{d.collector_center || d.collector_temple || d.collector_email || 'Verified Devotee'}</p>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-0.5 font-mono text-[10px] font-bold text-slate-600">
                                  <span>{d.txnid || d.payment_id || 'ID Pending'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase">{d.payment_method || 'Online'}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-sm font-black text-slate-900">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Verified
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden divide-y divide-purple-50">
                      {paginatedBehalfDonations.map((d: any) => (
                        <div key={d.id} className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
                                {d.donor_name ? d.donor_name[0]?.toUpperCase() : 'D'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{d.donor_name || 'Anonymous'}</p>
                                <p className="text-[10px] text-slate-400">
                                  {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-slate-900">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 bg-purple-50/50 p-2 rounded-xl border border-purple-100">
                            <span className="font-bold text-purple-900">Collected by: </span>
                            {d.collector_name || 'Fellow Devotee'} {d.collector_center ? `(${d.collector_center})` : ''}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Compact Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-purple-100 bg-purple-50/30">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rows:</span>
                        <select 
                          value={behalfPageSize}
                          onChange={(e) => { setBehalfPageSize(Number(e.target.value)); setBehalfCurrentPage(1); }}
                          className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <strong className="text-slate-800">{(behalfCurrentPage - 1) * behalfPageSize + 1}–{Math.min(behalfCurrentPage * behalfPageSize, filteredBehalfDonations.length)}</strong> of {filteredBehalfDonations.length}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button 
                            disabled={behalfCurrentPage === 1} 
                            onClick={() => setBehalfCurrentPage(prev => Math.max(1, prev - 1))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            disabled={behalfCurrentPage === behalfTotalPages || behalfTotalPages === 0} 
                            onClick={() => setBehalfCurrentPage(prev => Math.min(behalfTotalPages, prev + 1))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal 1: Confirmation to Freeze & Lock Behalf Selection */}
      <AnimatePresence>
        {isFreezeModalOpen && tempBehalfDevotee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-white max-w-md w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white text-center">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Lock Behalf Devotee</h3>
                <p className="text-blue-100 text-xs font-semibold mt-1">Permanent Selection Required</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Selected Recipient</p>
                  <p className="text-base font-black text-slate-900">{tempBehalfDevotee.name}</p>
                  {(tempBehalfDevotee.center || tempBehalfDevotee.temple) && (
                    <p className="text-xs text-slate-500 font-medium">
                      {tempBehalfDevotee.center || tempBehalfDevotee.temple}
                    </p>
                  )}
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    Once locked, this devotee will be frozen for all your future donation links and you will not be asked again. Any change will require Super Admin approval.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    disabled={isSubmittingBehalfAction}
                    onClick={handleConfirmFreezeBehalf}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                  >
                    {isSubmittingBehalfAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Confirm & Lock Selection
                  </button>
                  <button
                    disabled={isSubmittingBehalfAction}
                    onClick={() => {
                      setIsFreezeModalOpen(false);
                      setTempBehalfDevotee(null);
                      setSelectedBehalfDevoteeId('');
                    }}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-700 font-bold uppercase text-[10px] tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Request Change to Super Admin */}
      <AnimatePresence>
        {isChangeRequestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-white max-w-md w-full overflow-hidden"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <HeartHandshake className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-black tracking-tight">Request Behalf Change</h3>
                  </div>
                  <p className="text-slate-400 text-xs font-medium">
                    Submit a change request to Super Admin for approval.
                  </p>
                </div>
                <button
                  onClick={() => setIsChangeRequestModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitChangeRequest} className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Currently Locked To</span>
                  <span className="text-sm font-black text-slate-800">{frozenBehalfName}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Requested New Devotee *
                  </label>
                  <select
                    required
                    value={targetBehalfId}
                    onChange={(e) => setTargetBehalfId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select New Behalf Devotee --</option>
                    {behalfDevotees
                      .filter(d => d.id !== frozenBehalfId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.center ? `(${d.center})` : d.temple ? `(${d.temple})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Reason for Change (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g. Center relocation, assigned to a new counselor..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed font-medium">
                  <strong>Notice:</strong> Your current link with <em>{frozenBehalfName}</em> remains active until Super Admin approves your request.
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingBehalfAction || !targetBehalfId}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    {isSubmittingBehalfAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartHandshake className="w-4 h-4" />}
                    Submit Request to Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangeRequestModalOpen(false)}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  LayoutGrid, 
  List, 
  ArrowUpRight, 
  IndianRupee, 
  Users, 
  ShieldCheck,
  CreditCard,
  Zap,
  Info,
  Loader2,
  Lock,
  Mail,
  X,
  UserCheck,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/config';
import { fetchAllDonations } from './actions';

// Custom Modal Component for Secure Gateway Toggle
const ConfirmationModal = ({ isOpen, onClose, onConfirm, gateway, isLoading }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl border border-white max-w-md w-full overflow-hidden"
      >
        <div className="bg-orange-600 p-8 text-white relative flex flex-col items-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-white/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-center mb-2 tracking-tight">Security Approval</h2>
          <p className="text-orange-100 text-sm text-center font-bold opacity-80 uppercase tracking-widest">Action Required</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${gateway === 'razorpay' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
               <Zap className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Switching to</p>
               <h3 className="text-lg font-black text-slate-800">{gateway?.toUpperCase()}</h3>
            </div>
          </div>

          <p className="text-slate-500 text-sm font-bold leading-relaxed text-center px-4">
            For security, an approval link will be sent to <span className="text-orange-600">smvd@voicepune.com</span>. 
            The gateway will only change after email confirmation.
          </p>

          <div className="flex flex-col gap-3">
            <button 
              disabled={isLoading}
              onClick={onConfirm}
              className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />}
              Send Approval Email
            </button>
            <button onClick={onClose} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">
              I changed my mind
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function AdminDonationsPage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGateway, setActiveGateway] = useState('razorpay');
  const [pendingGateway, setPendingGateway] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [collectors, setCollectors] = useState<Record<string, {name: string, center: string}>>({});
  const [centers, setCenters] = useState<string[]>([]);
  const [usersWithoutSlugs, setUsersWithoutSlugs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'donations' | 'missing-links'>('donations');
  
  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('captured');
  const [selectedTemple, setSelectedTemple] = useState('all');
  const [templeList, setTempleList] = useState<string[]>([]);

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic Filter Options
  const availableTemples = useMemo(() => {
    const ts = new Set<string>();
    donations.forEach(d => { if (d.temple) ts.add(d.temple); });
    return Array.from(ts).sort();
  }, [donations]);

  const availableCenters = useMemo(() => {
    const cs = new Set<string>();
    donations.forEach(d => {
      const matchesTemple = selectedTemple === 'all' || d.temple === selectedTemple;
      if (matchesTemple && d.center) cs.add(d.center);
    });
    // Also include centers from collectors if no temple filter is active
    if (selectedTemple === 'all') {
      Object.values(collectors).forEach(c => { if (c.center) cs.add(c.center); });
    }
    return Array.from(cs).sort();
  }, [donations, selectedTemple, collectors]);

  const availableCollectors = useMemo(() => {
    const ids = new Set<string>();
    donations.forEach(d => {
      const matchesTemple = selectedTemple === 'all' || d.temple === selectedTemple;
      const matchesCenter = selectedCenter === 'all' || d.center === selectedCenter || (d.center === null && collectors[d.tag_user_id]?.center === selectedCenter);
      if (matchesTemple && matchesCenter && d.tag_user_id) ids.add(d.tag_user_id);
    });
    return Array.from(ids).map(id => ({ id, name: collectors[id]?.name || 'Unknown' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [donations, selectedTemple, selectedCenter, collectors]);

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const search = searchTerm.toLowerCase();
      const name = (d.donor_name || '').toLowerCase();
      const email = (d.donor_email || '').toLowerCase();
      const tx = (d.txnid || '').toLowerCase();
      const matchesSearch = name.includes(search) || email.includes(search) || tx.includes(search);
      const matchesCollector = selectedCollector === 'all' || d.tag_user_id === selectedCollector;
      const matchesCenter = selectedCenter === 'all' || d.center === selectedCenter || (d.center === null && collectors[d.tag_user_id]?.center === selectedCenter);
      const matchesTemple = selectedTemple === 'all' || d.temple === selectedTemple;
      const matchesStatus = selectedStatus === 'all' 
        ? true 
        : selectedStatus === 'captured' 
          ? (d.payment_status === 'captured' || d.payment_status === 'success')
          : d.payment_status === selectedStatus;
      return matchesSearch && matchesCollector && matchesCenter && matchesStatus && matchesTemple;
    });
  }, [donations, searchTerm, selectedCollector, selectedCenter, selectedStatus, selectedTemple, collectors]);

  const stats = useMemo(() => {
    const total = filteredDonations.reduce((acc, curr) => acc + curr.amount, 0);
    const unique = new Set(filteredDonations.map(d => d.donor_email)).size;
    return {
      totalAmount: total,
      uniqueDonors: unique,
      avgDonation: filteredDonations.length ? Math.round(total / filteredDonations.length) : 0
    };
  }, [filteredDonations]);

  useEffect(() => {
    fetchPlatformSettings();
    checkUser();
  }, []);

  useEffect(() => {
    if (user?.id && accessToken) {
      fetchData();
      fetchUsersWithoutSlugs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, accessToken]);

  const checkUser = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    setUser(user);
    setAccessToken(session?.access_token || null);
  };

  const fetchPlatformSettings = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 'active_payment_gateway')
        .single();
      
      if (data) {
        // Strip any leading/trailing quotes that might come from JSONB storage
        const active = String(data.value).replace(/^["']|["']$/g, '');
        const pending = data.pending_value ? String(data.pending_value).replace(/^["']|["']$/g, '') : null;
        
        setActiveGateway(active || 'razorpay');
        setPendingGateway(pending);
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      
      // 1. Fetch ALL Donations FIRST
      const result = await fetchAllDonations(accessToken || undefined);
      
      if (!result.success || !result.donations) {
         throw new Error(result.error || 'Failed to fetch donations');
      }

      const rawDonations = result.donations;
      setDonations(rawDonations);

      // Derived stats are now handled reactively by useMemo

      // 3. IDENTIFY ACTIVE COLLECTORS
      const activeCollectorIds = Array.from(new Set(rawDonations.map((d: any) => d.tag_user_id)));

      // 4. FETCH ONLY RELEVANT USERS
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, center')
        .in('id', activeCollectorIds);
      
      const userMap: Record<string, {name: string, center: string}> = {};
      const centerList = new Set<string>();

      ((userData || []) as any[]).forEach((u: any) => {
        userMap[u.id] = { 
          name: u.name || 'Unknown', 
          center: u.center || 'No Center' 
        };
        if (u.center) centerList.add(u.center);
      });

      setCollectors(userMap);
      setCenters(Array.from(centerList).sort());

      // 4. Identify unique temples from donations
      const uniqueTemples = Array.from(new Set(rawDonations.map((d: any) => d.temple).filter(Boolean))) as string[];
      setTempleList(uniqueTemples.sort());

    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUsersWithoutSlugs = async () => {
    setLoadingUsers(true);
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, center, created_at')
        .or('donation_slug.is.null,donation_slug.eq.""')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setUsersWithoutSlugs(data || []);
    } catch (err) {
      console.error('Error fetching users without slugs:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleGatewayToggleRequest = (gateway: string) => {
    if (gateway === activeGateway) return;
    setSelectedGateway(gateway);
    setModalOpen(true);
  };

  const handleConfirmGatewayChange = async () => {
    if (!selectedGateway || !user) return;
    setIsToggling(true);

    try {
      const response = await fetch('/api/donations/request-gateway-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextGateway: selectedGateway, userId: user.id })
      });

      const result = await response.json();
      if (result.success) {
        setPendingGateway(selectedGateway);
        setModalOpen(false);
      } else {
        alert(result.error || 'Failed to request gateway change');
      }
    } catch (err) {
      alert('Network error. Please check your connection.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm('Are you sure you want to cancel the pending gateway change?')) return;
    setIsToggling(true);

    try {
      const response = await fetch('/api/donations/cancel-gateway-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });

      const result = await response.json();
      if (result.success) {
        setPendingGateway(null);
        await fetchPlatformSettings(); 
      } else {
        alert(result.error || 'Failed to cancel request');
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8 pb-20">
      {/* Header & Stats Banner */}
      <div className="bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-2xl relative overflow-hidden mb-6 sm:mb-8">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6 lg:gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">Global Donation Audit</h1>
            </div>
            <p className="text-slate-400 font-bold text-sm max-w-sm">Centralized oversight of all platform contributions and user attribution</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/50 min-w-[140px] sm:min-w-[200px]">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Collected</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">₹{stats.totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/50 min-w-[110px] sm:min-w-[150px]">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Unique Donors</p>
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.uniqueDonors}</span>
            </div>
            
            <div className="h-20 w-px bg-slate-800 mx-4 hidden lg:block" />

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="bg-slate-950/50 p-1.5 sm:p-2 rounded-[2rem] border border-slate-800 flex items-center gap-2 relative overflow-x-auto">
                <button 
                  disabled={activeGateway === 'razorpay' || !!pendingGateway}
                  onClick={() => handleGatewayToggleRequest('razorpay')}
                  className={`px-6 py-4 rounded-3xl font-black flex items-center gap-3 transition-all ${
                    activeGateway === 'razorpay' 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                      : 'text-slate-500 hover:text-slate-300 disabled:opacity-30 cursor-not-allowed'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest">Razorpay</span>
                </button>
                <button 
                   disabled={activeGateway === 'easebuzz' || !!pendingGateway}
                   onClick={() => handleGatewayToggleRequest('easebuzz')}
                   className={`px-6 py-4 rounded-3xl font-black flex items-center gap-3 transition-all ${
                    activeGateway === 'easebuzz' 
                      ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20' 
                      : 'text-slate-500 hover:text-slate-300 disabled:opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest">Easebuzz</span>
                  {activeGateway === 'easebuzz' && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded text-white animate-pulse">ACTIVE & LIVE</span>}
                </button>
              </div>
              
              {pendingGateway && (
                <div className="flex items-center gap-3 px-6 py-2 bg-amber-950/20 border border-amber-900/30 rounded-full">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                    <Clock className="w-3 h-3 text-amber-500" />
                  </motion.div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500">
                    Switching to {pendingGateway.toUpperCase()} awaiting approval from smvd@voicepune.com
                  </span>
                  <button 
                    disabled={isToggling}
                    onClick={handleCancelRequest}
                    className="ml-2 p-1 hover:bg-rose-500/20 rounded-full transition-colors group"
                  >
                    <X className="w-3 h-3 text-rose-500 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-5%] w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-1 mb-6 sm:mb-10 bg-slate-900/50 p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl border border-slate-800 w-full sm:w-fit backdrop-blur-md overflow-x-auto">
        <button
          onClick={() => setActiveTab('donations')}
          className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap ${
            activeTab === 'donations' 
              ? 'bg-slate-800 text-emerald-500 shadow-xl border border-slate-700' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Live Audit Log
        </button>
        <button
          onClick={() => setActiveTab('missing-links')}
          className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 sm:gap-3 relative whitespace-nowrap ${
            activeTab === 'missing-links' 
              ? 'bg-slate-800 text-orange-500 shadow-xl border border-slate-700' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Collectors without Links
          {usersWithoutSlugs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
              {usersWithoutSlugs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'donations' && (
        <>
          {error && (
            <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4">
               <XCircle className="w-6 h-6 text-rose-500" />
               <p className="text-rose-500 font-bold text-sm tracking-tight">{error}</p>
               <button onClick={() => fetchData()} className="ml-auto px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors">Retry</button>
            </div>
          )}

          {/* Main Content Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
              <button 
                onClick={() => setView('grid')}
                className={`p-2.5 rounded-xl transition-all ${view === 'grid' ? 'bg-slate-800 text-emerald-500 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setView('table')}
                className={`p-2.5 rounded-xl transition-all ${view === 'table' ? 'bg-slate-800 text-emerald-500 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="col-span-2 relative flex-1 sm:w-64 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Donor or TRX ID..."
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-xl"
                />
              </div>

              <div className="relative group">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                <select
                  value={selectedTemple}
                  onChange={(e) => {
                    setSelectedTemple(e.target.value);
                    setSelectedCenter('all');
                    setSelectedCollector('all');
                  }}
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500/30 transition-all shadow-xl appearance-none cursor-pointer"
                >
                  <option value="all">All Temples</option>
                  {availableTemples.map(temple => (
                    <option key={temple} value={temple}>{temple}</option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                <select
                  value={selectedCenter}
                  onChange={(e) => {
                    setSelectedCenter(e.target.value);
                    setSelectedCollector('all');
                  }}
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500/30 transition-all shadow-xl appearance-none cursor-pointer"
                >
                  <option value="all">All Centers</option>
                  {availableCenters.map(center => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                <select
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500/30 transition-all shadow-xl appearance-none cursor-pointer"
                >
                  <option value="all">All Collectors</option>
                  {availableCollectors.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500/30 transition-all shadow-xl appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="captured">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed / Cancelled</option>
                </select>
              </div>

              <button className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 text-sm font-black text-white rounded-2xl hover:bg-emerald-500 active:scale-95 transition-all shadow-xl shadow-emerald-600/20">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Audit View */}
          {view === 'table' ? (
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              {/* Desktop Table — hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/30">
                      <th className="px-6 lg:px-8 py-5 lg:py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Center / Temple</th>
                      <th className="px-6 lg:px-8 py-5 lg:py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Collector / Ashram</th>
                      <th className="px-6 lg:px-8 py-5 lg:py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Donor Details</th>
                      <th className="px-6 lg:px-8 py-5 lg:py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Amount</th>
                      <th className="px-6 lg:px-8 py-5 lg:py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Trx ID</th>
                      <th className="px-6 lg:px-8 py-5 lg:py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((donation) => (
                      <tr key={donation.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 lg:px-8 py-5 lg:py-6">
                           <div className="flex flex-col gap-1">
                              <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg w-fit whitespace-nowrap">
                                 {donation.center || collectors[donation.tag_user_id]?.center || 'Global HQ'}
                              </span>
                              {donation.temple && (
                                <span className="text-blue-400 font-black text-[9px] uppercase tracking-widest px-3 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded-md w-fit whitespace-nowrap">
                                   {donation.temple}
                                </span>
                              )}
                           </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 lg:py-6">
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="text-white font-black text-sm tracking-tight truncate">
                                 {collectors[donation.tag_user_id]?.name || 'System Executive'}
                              </span>
                            </div>
                            {donation.ashram && (
                              <span className="text-[9px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 w-fit truncate">
                                {donation.ashram}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 lg:py-6">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-emerald-500 border border-slate-700 shrink-0">
                              {donation.donor_name.charAt(0)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-slate-200 font-black text-sm truncate">{donation.donor_name}</span>
                              <span className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {donation.donor_email}
                              </span>
                              {(donation.donor_address || donation.donor_pan) && (
                                <div className="flex gap-2 mt-1">
                                  {donation.donor_pan && (
                                    <span className="text-[8px] font-black bg-slate-800 text-amber-500 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1 shrink-0">
                                      PAN: {donation.donor_pan}
                                    </span>
                                  )}
                                  {donation.donor_address && (
                                    <span className="text-[8px] font-black bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1 truncate max-w-[80px]">
                                      {donation.donor_address}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 lg:py-6">
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1 text-white font-black text-lg">
                              <IndianRupee className="w-3.5 h-3.5" />
                              {donation.amount.toLocaleString()}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600">{donation.payment_method}</span>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 lg:py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 font-black text-[10px] tracking-tight truncate">{donation.txnid}</span>
                            <div className="flex items-center gap-2">
                              <Clock className="w-2.5 h-2.5 text-slate-600" />
                              <span className="text-[9px] font-bold text-slate-600">
                                 {new Date(donation.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 lg:py-6">
                           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border w-fit ${
                            donation.payment_status === 'captured' || donation.payment_status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{donation.payment_status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List — shown only on mobile */}
              <div className="md:hidden divide-y divide-slate-800/50">
                {filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((donation) => (
                  <div key={donation.id} className="p-5 space-y-4 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-sm font-black text-emerald-500 border border-slate-700 shrink-0 shadow-lg">
                          {donation.donor_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-200 font-black text-sm truncate tracking-tight">{donation.donor_name}</p>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-bold">
                            <Mail className="w-3 h-3" /> {donation.donor_email}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-white font-black text-lg">₹{donation.amount.toLocaleString()}</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase mt-1 ${
                          donation.payment_status === 'captured' || donation.payment_status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {donation.payment_status}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       <span className="text-emerald-500 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                         {donation.center || collectors[donation.tag_user_id]?.center || 'Global HQ'}
                       </span>
                       {donation.temple && (
                         <span className="text-blue-400 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                           {donation.temple}
                         </span>
                       )}
                       <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 ml-auto">
                         <Clock className="w-3 h-3" /> {new Date(donation.created_at).toLocaleDateString()}
                       </span>
                    </div>
                    <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center bg-slate-950/20 -mx-5 px-5 py-2 mt-2">
                       <p className="text-[9px] text-slate-600 font-black tracking-widest uppercase truncate max-w-[150px]">{donation.txnid}</p>
                       <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{donation.payment_method}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((donation) => (
                <div key={donation.id} className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-xl hover:border-emerald-500/30 transition-all group relative overflow-hidden flex flex-col">
                   <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-emerald-500 font-black text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded">Collector</span>
                        </div>
                        <h3 className="text-white font-black text-lg tracking-tight">{collectors[donation.tag_user_id]?.name || 'System Executive'}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{collectors[donation.tag_user_id]?.center || 'Global HQ'}</p>
                      </div>
                      <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                        <IndianRupee className="w-6 h-6 text-emerald-500" />
                      </div>
                   </div>
                   
                   <div className="space-y-6 flex-1">
                      <div className="flex items-center gap-4 p-4 bg-slate-950/40 rounded-3xl border border-slate-800/50 hover:border-emerald-500/20 transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center text-xl font-black text-emerald-500 border border-emerald-500/20 shadow-inner shrink-0">
                           {donation.donor_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-200 font-black truncate text-base">{donation.donor_name}</p>
                            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 truncate">
                               <Clock className="w-3.5 h-3.5" />
                               {new Date(donation.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest truncate mt-1">{donation.txnid}</p>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-800">
                      <div className="flex flex-col">
                         <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter">₹{donation.amount.toLocaleString()}</span>
                         <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{donation.payment_method}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border ${
                         donation.payment_status === 'captured' || donation.payment_status === 'success'
                           ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                           : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                       }`}>
                         <CheckCircle2 className="w-4 h-4 shadow-sm" />
                         <span className="text-[10px] font-black uppercase tracking-[0.15em]">{donation.payment_status}</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {filteredDonations.length === 0 && (
            <div className="p-20 sm:p-32 text-center space-y-6 bg-slate-900/30 rounded-[3rem] border border-slate-800/50 mt-8">
               <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-700 shadow-2xl relative overflow-hidden group">
                  <Search className="w-10 h-10 text-slate-600 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-white font-black text-2xl tracking-tight">No records discovered</h3>
                 <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto leading-relaxed">Adjust your filters or query parameters to broaden the search within our audit ledger.</p>
               </div>
            </div>
          )}

          {/* Pagination Controls */}
          {(() => {
            const totalPages = Math.ceil(filteredDonations.length / pageSize);
            if (filteredDonations.length === 0) return null;
            return (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8 border-t border-slate-800 bg-slate-950/20 mt-8 rounded-[2.5rem] border border-slate-800">
                <div className="flex items-center gap-4 order-2 md:order-1">
                  <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Page Size:</span>
                  <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-inner">
                    {[10, 20, 50].map(size => (
                      <button
                        key={size}
                        onClick={() => { setPageSize(size); setCurrentPage(1); }}
                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${pageSize === size ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800 text-slate-400 hover:text-slate-300'}`}
                      >{size}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 order-1 md:order-2">
                  <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest mr-4">
                    {((currentPage - 1) * pageSize) + 1} – {Math.min(currentPage * pageSize, filteredDonations.length)} <span className="text-slate-700 mx-1">/</span> {filteredDonations.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all font-black text-lg flex items-center justify-center border border-slate-700 shadow-xl"
                    >‹</button>
                    <div className="flex gap-1.5 px-2">
                       {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const page = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                        if (page > totalPages || page < 1) return null;
                        return (
                          <button 
                            key={page} 
                            onClick={() => setCurrentPage(page)}
                            className={`w-11 h-11 rounded-2xl text-[10px] font-black transition-all border ${currentPage === page ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 scale-110 z-10' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                          >{page}</button>
                        );
                      })}
                    </div>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all font-black text-lg flex items-center justify-center border border-slate-700 shadow-xl"
                    >›</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'missing-links' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  Collectors without Links
                  <span className="px-3 py-1 bg-orange-500/10 rounded-full text-[10px] text-orange-500 font-black border border-orange-500/20">
                    {usersWithoutSlugs.length} Pending
                  </span>
                </h2>
                <p className="text-slate-500 font-bold text-sm">Members who need a Membership ID generated to activate their donation page.</p>
              </div>
              
              <button 
                onClick={() => router.push('/dashboard/admin/membership')}
                className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all flex items-center gap-2 group shadow-xl shadow-orange-600/20"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                Go to Membership Management
              </button>
            </div>

            {loadingUsers ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scanning Database...</p>
              </div>
            ) : usersWithoutSlugs.length === 0 ? (
              <div className="py-32 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-white font-black text-xl tracking-tight">All Links Active</h3>
                <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-sm mx-auto">Every platform member currently has a personalized donation link assigned and ready for use.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {usersWithoutSlugs.map((user) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={user.id} 
                    className="bg-slate-950/50 rounded-3xl p-6 border border-slate-800 hover:border-orange-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-lg font-black text-white border border-slate-700 group-hover:border-orange-500/30 transition-colors">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div className="px-3 py-1 bg-slate-800 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-700">
                        {user.center || 'No Center'}
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-6">
                      <h4 className="text-white font-black tracking-tight line-clamp-1">{user.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 line-clamp-1 flex items-center gap-1.5 uppercase tracking-tighter">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-800">
                      <button 
                        onClick={() => router.push('/dashboard/admin/membership')}
                        className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                         Generate Link
                         <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            <div className="mt-10 p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 flex items-start gap-4">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-500/80 leading-relaxed">
                <span className="text-amber-500 font-black">Note:</span> A user&apos;s donation link is automatically activated when their unique Membership ID is generated. This ensures all contributions are correctly attributed to their official identity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmGatewayChange}
        gateway={selectedGateway}
        isLoading={isToggling}
      />
    </div>
  );
}

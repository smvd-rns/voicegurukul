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
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/config';
import { fetchUserDonations } from './actions';

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

  // Sync state with URL for back button support
  useEffect(() => {
    if (statusParam && statusParam !== selectedStatus) {
      setSelectedStatus(statusParam);
    }
    if (pageParam && pageParam !== currentPage) {
      setCurrentPage(pageParam);
    }
  }, [statusParam, pageParam, selectedStatus, currentPage]);

  const updateUrl = (newStatus?: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus) params.set('status', newStatus);
    if (newPage) params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !supabase) return;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const { data: userData } = await supabase
          .from('users')
          .select('donation_slug')
          .eq('id', user.id)
          .single();
        if (userData?.donation_slug) setUserSlug(userData.donation_slug);
        const result = await fetchUserDonations(user.id, accessToken);
        if (result.success && result.donations) {
          setDonations(result.donations);
        }
      } catch (err) {
        console.error('Error fetching donations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleCopyLink = () => {
    if (!userSlug) return;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${baseUrl}/donate/${userSlug}`;
    navigator.clipboard.writeText(url);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const matchesSearch = (d.donor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.donor_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.payment_id || '').toLowerCase().includes(searchQuery.toLowerCase());
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
  const totalAmount = filteredDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Loading Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 md:px-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[#FAFAFC]">
      
      {/* 🌟 Professional Deep Blue Hero 🌟 */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-900 via-blue-800 to-cyan-700 shadow-xl shadow-blue-900/20 w-full group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-all duration-1000" />
        
        <div className="relative z-10 p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
          <div className="space-y-3 flex-1 min-w-0 max-w-xl text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                <Wallet className="w-5 h-5 text-cyan-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-sm truncate">Donation Dashboard</h1>
            </div>
            <p className="text-blue-100 text-sm font-medium leading-relaxed drop-shadow-sm max-w-md hidden sm:block">
              Track contributions in real-time. Your personalized donation link insights are securely processed and verified.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 mt-4 lg:mt-0">
            {/* Elegant Glassmorphic Stat Block */}
            <div className="flex-1 w-full sm:w-auto sm:flex-none bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl min-w-[160px] hover:bg-white/20 transition duration-300">
              <div className="flex items-center gap-2 mb-1.5 opacity-90">
                 <Award className="w-4 h-4 text-cyan-400" />
                 <span className="text-[9px] font-bold text-blue-50 uppercase tracking-widest drop-shadow-sm">Total Raised</span>
              </div>
              <div className="flex items-baseline gap-1 text-white">
                 <span className="text-2xl md:text-3xl font-black tracking-tighter drop-shadow-md">₹{totalAmount.toLocaleString()}</span>
                 <span className="text-cyan-400 font-black text-[10px] uppercase drop-shadow-sm">INR</span>
              </div>
            </div>
            
            <button 
              onClick={handleCopyLink}
              disabled={!userSlug}
              className={`w-full sm:w-auto h-full flex items-center justify-center gap-2 px-6 py-4 md:py-5 min-h-[70px] rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl shrink-0 ${
                copying 
                  ? 'bg-emerald-400 text-emerald-950 shadow-emerald-400/40' 
                  : 'bg-amber-400 text-amber-950 hover:bg-amber-300 disabled:opacity-50 disabled:bg-white/20 disabled:text-blue-100 disabled:hover:-translate-y-0 disabled:hover:shadow-xl'
              }`}
            >
              {copying ? <ClipboardCheck className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              {userSlug ? 'Copy My Link' : 'Pending'}
            </button>
          </div>
        </div>
      </section>

      {/* Modern Warning Box */}
      {!userSlug && (
        <div className="px-6 py-5 bg-white border border-rose-200/60 rounded-[1.5rem] flex flex-col md:flex-row items-start md:items-center gap-5 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100 shadow-sm">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Assign Membership ID</h3>
            <p className="text-sm font-medium text-slate-500">
              Your donation page requires a Membership ID. Please generate one to activate your official donation link.
            </p>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 active:scale-95 transition-all text-center"
          >
            Go to Profile
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-blue-500 rounded-full shadow-sm shadow-blue-500/20" />
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Audit Log</h2>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 shadow-sm border border-blue-100 rounded-lg text-xs font-black">{filteredDonations.length}</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStatus(val);
                updateUrl(val, 1);
              }}
              className="w-full sm:w-auto px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text"
                placeholder="QUICK SEARCH PATRONS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Dense List Container */}
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm shadow-slate-200/50 overflow-hidden">
          {filteredDonations.length === 0 ? (
            <div className="p-20 text-center space-y-5 bg-gradient-to-b from-white to-slate-50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto border border-slate-200/60 shadow-sm">
                <PieChart className="w-8 h-8 text-slate-300" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-700">No records found</h3>
                <p className="text-slate-500 font-medium text-sm">There are no donations matching your criteria yet.</p>
              </div>
            </div>
          ) : (
            <>
              {/* ✅ Desktop Pro Table (lg and up) ✅ */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Donor</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Center / Temple</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Payment Info</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Contact Identity</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Settled Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDonations.map((d) => (
                      <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 tracking-tight">{d.donor_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                                {new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md w-fit">
                              {d.center || 'Main Center'}
                            </span>
                            {d.temple && (
                              <span className="text-blue-500 font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md w-fit">
                                {d.temple}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-slate-500"><CreditCard className="w-3 h-3" /></span>
                              <code className="text-[11px] font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">{d.payment_id || 'PENDING'}</code>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                              <Contact className="w-3 h-3 text-amber-500" />
                              PAN: {d.donor_pan || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                              <span className="w-5 h-5 bg-sky-50 rounded-md flex items-center justify-center text-sky-500"><Mail className="w-3 h-3" /></span>
                              {d.donor_email}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                              <span className="w-5 h-5 bg-emerald-50 rounded-md flex items-center justify-center text-emerald-500"><Phone className="w-3 h-3" /></span>
                              {d.donor_mobile}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-slate-900 tracking-tighter">₹{(d.amount || 0).toLocaleString()}</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded border mt-1 uppercase tracking-widest shadow-sm ${d.payment_status === 'captured' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                              {d.payment_status === 'captured' ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ✅ Mobile/Tablet Vibrant Grid (hidden on lg and up) ✅ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 lg:hidden bg-slate-50/50">
                {paginatedDonations.map((d) => (
                  <div key={d.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{d.donor_name}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                            {new Date(d.created_at).toLocaleDateString()}
                          </p>
                          {d.temple && (
                            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                              {d.temple}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 tracking-tighter">₹{(d.amount || 0).toLocaleString()}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${d.payment_status === 'captured' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {d.payment_status === 'captured' ? 'Recorded' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50/80 rounded-xl p-3 text-xs space-y-2.5 border border-slate-100 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-200/50 rounded flex items-center justify-center"><CreditCard className="w-3 h-3 text-slate-600" /></div>
                        <span className="font-bold text-slate-700 bg-white px-1.5 rounded">{d.payment_id || 'PENDING'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-sky-100/50 rounded flex items-center justify-center"><Mail className="w-3 h-3 text-sky-500" /></div>
                         <span className="font-medium text-slate-600 truncate">{d.donor_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-emerald-100/50 rounded flex items-center justify-center"><Phone className="w-3 h-3 text-emerald-500" /></div>
                         <span className="font-medium text-slate-600">{d.donor_mobile}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ✅ Premium Pagination Controls ✅ */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rows:</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDonations.length)}</strong> of {filteredDonations.length}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => {
                        const next = Math.max(1, currentPage - 1);
                        setCurrentPage(next);
                        updateUrl(undefined, next);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold"
                    >
                      <ChevronLeft className="w-4 h-4 ml-[-2px]" />
                    </button>
                    <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => {
                        const next = Math.min(totalPages, currentPage + 1);
                        setCurrentPage(next);
                        updateUrl(undefined, next);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all font-bold"
                    >
                      <ChevronRight className="w-4 h-4 mr-[-2px]" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

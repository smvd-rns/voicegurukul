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
  MapPin,
  RotateCcw
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
  const [collectors, setCollectors] = useState<Record<string, {
    name: string;
    parentCenter: string;
    parentTemple: string;
    currentCenter: string;
    currentTemple: string;
    center: string;
    temple: string;
  }>>({});
  const [centers, setCenters] = useState<string[]>([]);
  const [usersWithoutSlugs, setUsersWithoutSlugs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'donations' | 'missing-links'>('donations');
  
  // Helper to extract parent and current center/temple for any donation
  const getDonationCenters = (donation: any) => {
    const collector = collectors[donation.tag_user_id];
    const metaCollector = donation.metadata?.collector;

    const parentCenter = metaCollector?.parent_center || collector?.parentCenter || donation.center || 'None';
    const parentTemple = metaCollector?.parent_temple || collector?.parentTemple || donation.temple || 'None';
    const currentCenter = metaCollector?.current_center || collector?.currentCenter || 'None';
    const currentTemple = metaCollector?.current_temple || collector?.currentTemple || 'None';

    return { parentCenter, parentTemple, currentCenter, currentTemple };
  };

  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedCurrentTemple, setSelectedCurrentTemple] = useState('all');
  const [selectedCurrentCenter, setSelectedCurrentCenter] = useState('all');
  const [selectedParentTemple, setSelectedParentTemple] = useState('all');
  const [selectedParentCenter, setSelectedParentCenter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('captured');
  const [templeList, setTempleList] = useState<string[]>([]);

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic Filter Options - Current Hierarchy
  const availableCurrentTemples = useMemo(() => {
    const ts = new Set<string>();
    donations.forEach(d => {
      const { currentTemple } = getDonationCenters(d);
      if (currentTemple && currentTemple !== 'General' && currentTemple !== 'None') ts.add(currentTemple);
    });
    Object.values(collectors).forEach(c => {
      if (c.currentTemple && c.currentTemple !== 'General' && c.currentTemple !== 'None') ts.add(c.currentTemple);
    });
    return Array.from(ts).sort();
  }, [donations, collectors]);

  const availableCurrentCenters = useMemo(() => {
    const cs = new Set<string>();
    donations.forEach(d => {
      const { currentCenter, currentTemple } = getDonationCenters(d);
      const matchesTemple = selectedCurrentTemple === 'all' || currentTemple === selectedCurrentTemple;
      if (matchesTemple && currentCenter && currentCenter !== 'General' && currentCenter !== 'No Center' && currentCenter !== 'None') {
        cs.add(currentCenter);
      }
    });
    Object.values(collectors).forEach(c => {
      const matchesTemple = selectedCurrentTemple === 'all' || c.currentTemple === selectedCurrentTemple;
      if (matchesTemple && c.currentCenter && c.currentCenter !== 'General' && c.currentCenter !== 'No Center' && c.currentCenter !== 'None') {
        cs.add(c.currentCenter);
      }
    });
    return Array.from(cs).sort();
  }, [donations, selectedCurrentTemple, collectors]);

  // Dynamic Filter Options - Parent Hierarchy
  const availableParentTemples = useMemo(() => {
    const ts = new Set<string>();
    donations.forEach(d => {
      const { parentTemple } = getDonationCenters(d);
      if (parentTemple && parentTemple !== 'General' && parentTemple !== 'None') ts.add(parentTemple);
    });
    Object.values(collectors).forEach(c => {
      if (c.parentTemple && c.parentTemple !== 'General' && c.parentTemple !== 'None') ts.add(c.parentTemple);
    });
    return Array.from(ts).sort();
  }, [donations, collectors]);

  const availableParentCenters = useMemo(() => {
    const cs = new Set<string>();
    donations.forEach(d => {
      const { parentCenter, parentTemple } = getDonationCenters(d);
      const matchesTemple = selectedParentTemple === 'all' || parentTemple === selectedParentTemple;
      if (matchesTemple && parentCenter && parentCenter !== 'General' && parentCenter !== 'No Center' && parentCenter !== 'None') {
        cs.add(parentCenter);
      }
    });
    Object.values(collectors).forEach(c => {
      const matchesTemple = selectedParentTemple === 'all' || c.parentTemple === selectedParentTemple;
      if (matchesTemple && c.parentCenter && c.parentCenter !== 'General' && c.parentCenter !== 'No Center' && c.parentCenter !== 'None') {
        cs.add(c.parentCenter);
      }
    });
    return Array.from(cs).sort();
  }, [donations, selectedParentTemple, collectors]);

  const availableCollectors = useMemo(() => {
    const ids = new Set<string>();
    donations.forEach(d => {
      const { parentCenter, parentTemple, currentCenter, currentTemple } = getDonationCenters(d);
      const matchesCurrentTemple = selectedCurrentTemple === 'all' || currentTemple === selectedCurrentTemple;
      const matchesCurrentCenter = selectedCurrentCenter === 'all' || currentCenter === selectedCurrentCenter;
      const matchesParentTemple = selectedParentTemple === 'all' || parentTemple === selectedParentTemple;
      const matchesParentCenter = selectedParentCenter === 'all' || parentCenter === selectedParentCenter;
      if (matchesCurrentTemple && matchesCurrentCenter && matchesParentTemple && matchesParentCenter && d.tag_user_id) {
        ids.add(d.tag_user_id);
      }
    });
    return Array.from(ids).map(id => ({ id, name: collectors[id]?.name || 'Unknown' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [donations, selectedCurrentTemple, selectedCurrentCenter, selectedParentTemple, selectedParentCenter, collectors]);

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const search = searchTerm.toLowerCase().trim();
      const name = (d.donor_name || '').toLowerCase();
      const email = (d.donor_email || '').toLowerCase();
      const phone = (d.donor_phone || d.donor_mobile || '').toLowerCase();
      const pan = (d.donor_pan || '').toLowerCase();
      const tx = (d.txnid || d.id || '').toLowerCase();
      const collectorObj = collectors[d.tag_user_id];
      const collectorName = (collectorObj?.name || d.metadata?.collector?.name || '').toLowerCase();

      const matchesSearch = !search || 
        name.includes(search) || 
        email.includes(search) || 
        phone.includes(search) || 
        pan.includes(search) || 
        tx.includes(search) ||
        collectorName.includes(search);

      const matchesCollector = selectedCollector === 'all' || d.tag_user_id === selectedCollector;
      
      const { parentCenter, parentTemple, currentCenter, currentTemple } = getDonationCenters(d);
      const matchesCurrentTemple = selectedCurrentTemple === 'all' || currentTemple === selectedCurrentTemple;
      const matchesCurrentCenter = selectedCurrentCenter === 'all' || currentCenter === selectedCurrentCenter;
      const matchesParentTemple = selectedParentTemple === 'all' || parentTemple === selectedParentTemple;
      const matchesParentCenter = selectedParentCenter === 'all' || parentCenter === selectedParentCenter;
      
      const matchesStatus = selectedStatus === 'all' 
        ? true 
        : selectedStatus === 'captured' 
          ? (d.payment_status === 'captured' || d.payment_status === 'success')
          : d.payment_status === selectedStatus;

      return matchesSearch && matchesCollector && matchesCurrentTemple && matchesCurrentCenter && matchesParentTemple && matchesParentCenter && matchesStatus;
    });
  }, [donations, searchTerm, selectedCollector, selectedCurrentTemple, selectedCurrentCenter, selectedParentTemple, selectedParentCenter, selectedStatus, collectors]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedCollector !== 'all') count++;
    if (selectedCurrentTemple !== 'all') count++;
    if (selectedCurrentCenter !== 'all') count++;
    if (selectedParentTemple !== 'all') count++;
    if (selectedParentCenter !== 'all') count++;
    if (selectedStatus !== 'captured') count++;
    return count;
  }, [searchTerm, selectedCollector, selectedCurrentTemple, selectedCurrentCenter, selectedParentTemple, selectedParentCenter, selectedStatus]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCollector('all');
    setSelectedCurrentTemple('all');
    setSelectedCurrentCenter('all');
    setSelectedParentTemple('all');
    setSelectedParentCenter('all');
    setSelectedStatus('captured');
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    const total = filteredDonations.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const unique = new Set(filteredDonations.map(d => d.donor_email).filter(Boolean)).size;
    return {
      totalAmount: total,
      uniqueDonors: unique,
      avgDonation: filteredDonations.length ? Math.round(total / filteredDonations.length) : 0
    };
  }, [filteredDonations]);

  const formatDonationDate = (donation: any) => {
    const raw = donation.created_at || donation.metadata?.timestamp || donation.metadata?.created_at;
    if (!raw) return 'Recently';
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime()) || parsed.getFullYear() <= 1970) return 'Recently';
    return parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleExportCSV = () => {
    if (!filteredDonations.length) {
      alert('No donation records found to export.');
      return;
    }

    const headers = [
      'Donation Date',
      'Transaction ID',
      'Donor Name',
      'Donor Email',
      'Donor Phone',
      'Donor PAN',
      'Donor Address',
      'Collector Name',
      'Collector Parent Center',
      'Collector Parent Temple',
      'Collector Current Center',
      'Collector Current Temple',
      'Ashram / Category',
      'Amount (INR)',
      'Payment Gateway',
      'Payment Method',
      'Status'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredDonations.map(d => {
      const collector = collectors[d.tag_user_id];
      const { parentCenter, parentTemple, currentCenter, currentTemple } = getDonationCenters(d);
      const dateStr = formatDonationDate(d);

      return [
        escapeCsv(dateStr),
        escapeCsv(d.txnid || d.id),
        escapeCsv(d.donor_name),
        escapeCsv(d.donor_email),
        escapeCsv(d.donor_phone || ''),
        escapeCsv(d.donor_pan || ''),
        escapeCsv(d.donor_address || ''),
        escapeCsv(collector?.name || 'System Executive'),
        escapeCsv(parentCenter),
        escapeCsv(parentTemple),
        escapeCsv(currentCenter),
        escapeCsv(currentTemple),
        escapeCsv(d.ashram || ''),
        escapeCsv(Number(d.amount || 0)),
        escapeCsv(d.payment_gateway || activeGateway),
        escapeCsv(d.payment_method || 'Online'),
        escapeCsv(d.payment_status)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Donations_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchPlatformSettings();
    checkUser();
  }, []);

  useEffect(() => {
    fetchData();
    fetchUsersWithoutSlugs();
  }, []);

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
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 'active_payment_gateway')
        .single();
      
      if (data) {
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
      
      const result = await fetchAllDonations(accessToken || undefined);
      
      if (!result.success || !result.donations) {
         throw new Error(result.error || 'Failed to fetch donations');
      }

      const rawDonations = result.donations;
      setDonations(rawDonations);

      const activeCollectorIds = Array.from(new Set(rawDonations.map((d: any) => d.tag_user_id).filter(Boolean)));

      const { data: userData } = await supabase
        .from('users')
        .select('id, name, parent_center, other_parent_center, parent_temple, other_parent_temple, current_center, other_center, current_temple, other_temple, center')
        .in('id', activeCollectorIds);
      
      const userMap: Record<string, {
        name: string;
        parentCenter: string;
        parentTemple: string;
        currentCenter: string;
        currentTemple: string;
        center: string;
        temple: string;
      }> = {};
      const centerList = new Set<string>();

      ((userData || []) as any[]).forEach((u: any) => {
        // 1. Resolve Parent Center
        let parentCenter = 'None';
        if (u.parent_center && u.parent_center !== 'None' && u.parent_center !== 'General') {
          if (u.parent_center === 'Other') {
            parentCenter = u.other_parent_center ? u.other_parent_center.trim() : 'Other';
          } else {
            parentCenter = u.parent_center.trim();
          }
        }

        // 2. Resolve Parent Temple
        let parentTemple = 'None';
        if (u.parent_temple && u.parent_temple !== 'None' && u.parent_temple !== 'General') {
          if (u.parent_temple === 'Other') {
            parentTemple = u.other_parent_temple ? u.other_parent_temple.trim() : 'Other';
          } else {
            parentTemple = u.parent_temple.trim();
          }
        }

        // 3. Resolve Current Center
        let currentCenter = 'None';
        if (u.current_center && u.current_center !== 'None' && u.current_center !== 'General') {
          if (u.current_center === 'Other') {
            currentCenter = u.other_center ? u.other_center.trim() : 'Other';
          } else {
            currentCenter = u.current_center.trim();
          }
        } else if (u.center && u.center !== 'None') {
          currentCenter = u.center.trim();
        }

        // 4. Resolve Current Temple
        let currentTemple = 'None';
        if (u.current_temple && u.current_temple !== 'None' && u.current_temple !== 'General') {
          if (u.current_temple === 'Other') {
            currentTemple = u.other_temple ? u.other_temple.trim() : 'Other';
          } else {
            currentTemple = u.current_temple.trim();
          }
        }

        userMap[u.id] = { 
          name: u.name || 'Unknown', 
          parentCenter,
          parentTemple,
          currentCenter,
          currentTemple,
          center: parentCenter !== 'None' ? parentCenter : currentCenter,
          temple: parentTemple !== 'None' ? parentTemple : currentTemple
        };
        if (parentCenter !== 'None') centerList.add(parentCenter);
        if (currentCenter !== 'None') centerList.add(currentCenter);
      });

      setCollectors(userMap);
      setCenters(Array.from(centerList).sort());

      const uniqueTemples = new Set<string>();
      rawDonations.forEach((d: any) => {
        const c = userMap[d.tag_user_id];
        const t = c?.temple || d.temple;
        if (t && t !== 'General' && t !== 'None') uniqueTemples.add(t);
      });
      setTempleList(Array.from(uniqueTemples).sort());

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
    <div className="min-h-screen bg-[#FDFCF8] p-3 sm:p-5 lg:p-6 pb-20 space-y-5">
      {/* Header & Stats Banner - Voicegurukul Warm Light Theme */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 bg-orange-50 rounded-xl border border-orange-100">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Global Donation Audit</h1>
            </div>
            <p className="text-gray-500 text-xs font-semibold max-w-sm">Centralized oversight of all platform contributions and user attribution</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-orange-50/70 backdrop-blur-md rounded-xl sm:rounded-2xl px-4 py-3 border border-orange-100 min-w-[130px] sm:min-w-[150px]">
              <p className="text-[10px] font-extrabold text-orange-700 uppercase tracking-wider mb-0.5">Total Collected</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl sm:text-2xl font-black text-gray-900">₹{stats.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="bg-emerald-50/70 backdrop-blur-md rounded-xl sm:rounded-2xl px-4 py-3 border border-emerald-100 min-w-[100px] sm:min-w-[120px]">
              <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-0.5">Unique Donors</p>
              <span className="text-xl sm:text-2xl font-black text-gray-900">{stats.uniqueDonors}</span>
            </div>
            
            <div className="h-12 w-px bg-gray-200 mx-2 hidden lg:block" />

            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <div className="bg-gray-100/80 p-1 sm:p-1.5 rounded-2xl border border-gray-200/80 flex items-center gap-1.5">
                <button 
                  disabled={activeGateway === 'razorpay' || !!pendingGateway}
                  onClick={() => handleGatewayToggleRequest('razorpay')}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    activeGateway === 'razorpay' 
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                      : 'text-gray-600 hover:text-gray-900 disabled:opacity-40 cursor-not-allowed'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="text-[11px] uppercase tracking-wider">Razorpay</span>
                </button>
                <button 
                   disabled={activeGateway === 'easebuzz' || !!pendingGateway}
                   onClick={() => handleGatewayToggleRequest('easebuzz')}
                   className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    activeGateway === 'easebuzz' 
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                      : 'text-gray-600 hover:text-gray-900 disabled:opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[11px] uppercase tracking-wider">Easebuzz</span>
                  {activeGateway === 'easebuzz' && <span className="text-[8px] bg-white/20 px-1 py-0.5 rounded text-white animate-pulse">LIVE</span>}
                </button>
              </div>
              
              {pendingGateway && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                    <Clock className="w-3 h-3 text-amber-600" />
                  </motion.div>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-amber-700">
                    Switching to {pendingGateway.toUpperCase()} awaiting approval
                  </span>
                  <button 
                    disabled={isToggling}
                    onClick={handleCancelRequest}
                    className="ml-auto p-0.5 hover:bg-rose-100 rounded transition-colors group"
                  >
                    <X className="w-3 h-3 text-rose-500 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-5%] w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Primary Tab Switcher - Clean & Scrollbar-free */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-sm w-full sm:w-fit overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('donations')}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'donations' 
              ? 'bg-orange-600 text-white shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Live Audit Log
        </button>
        <button
          onClick={() => setActiveTab('missing-links')}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative whitespace-nowrap ${
            activeTab === 'missing-links' 
              ? 'bg-orange-600 text-white shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Collectors without Links
          {usersWithoutSlugs.length > 0 && (
            <span className="w-4 h-4 bg-rose-600 text-white text-[9px] flex items-center justify-center rounded-full ml-1">
              {usersWithoutSlugs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'donations' && (
        <>
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
               <XCircle className="w-5 h-5 text-rose-500" />
               <p className="text-rose-700 font-bold text-xs tracking-tight">{error}</p>
               <button onClick={() => fetchData()} className="ml-auto px-4 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors">Retry</button>
            </div>
          )}

          {/* Main Content Filters & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200/80 shadow-sm">
              <button 
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-orange-50 text-orange-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView('table')}
                className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-orange-50 text-orange-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 sm:justify-end">
              <div className="relative flex-1 sm:max-w-xs group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search donor, collector, PAN, TRX ID..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400 shadow-sm"
                />
              </div>

              <div className="relative group">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer pr-7 shadow-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="captured">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed / Cancelled</option>
                </select>
                <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Reset ({activeFiltersCount})</span>
                </button>
              )}

              <button 
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                title="Download CSV Audit Report"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Dedicated Hierarchy & Collector Filter Bar (Separate spaces for Current and Parent) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-3 shadow-md shadow-gray-100/60 mb-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* 1. Collector Current Section (Blue Theme) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 p-2 rounded-xl bg-blue-50/40 border border-blue-100">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100/80 border border-blue-200/80 rounded-lg text-blue-800 text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Collector Current
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <div className="relative group">
                  <select
                    value={selectedCurrentTemple}
                    onChange={(e) => {
                      setSelectedCurrentTemple(e.target.value);
                      setSelectedCurrentCenter('all');
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer pr-7 shadow-sm"
                  >
                    <option value="all">All Current Temples</option>
                    {availableCurrentTemples.map(temple => (
                      <option key={temple} value={temple}>{temple}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
                </div>

                <div className="relative group">
                  <select
                    value={selectedCurrentCenter}
                    onChange={(e) => {
                      setSelectedCurrentCenter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer pr-7 shadow-sm"
                  >
                    <option value="all">All Current Centers</option>
                    {availableCurrentCenters.map(center => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                  <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 2. Collector Parent Section (Orange Theme) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 p-2 rounded-xl bg-orange-50/40 border border-orange-100">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100/80 border border-orange-200/80 rounded-lg text-orange-800 text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                Collector Parent
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <div className="relative group">
                  <select
                    value={selectedParentTemple}
                    onChange={(e) => {
                      setSelectedParentTemple(e.target.value);
                      setSelectedParentCenter('all');
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-orange-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer pr-7 shadow-sm"
                  >
                    <option value="all">All Parent Temples</option>
                    {availableParentTemples.map(temple => (
                      <option key={temple} value={temple}>{temple}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-400 pointer-events-none" />
                </div>

                <div className="relative group">
                  <select
                    value={selectedParentCenter}
                    onChange={(e) => {
                      setSelectedParentCenter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-orange-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer pr-7 shadow-sm"
                  >
                    <option value="all">All Parent Centers</option>
                    {availableParentCenters.map(center => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                  <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 3. Collector Section */}
            <div className="flex items-center gap-2 xl:w-56 shrink-0 p-2 rounded-xl bg-gray-50 border border-gray-100">
              <div className="relative group w-full">
                <select
                  value={selectedCollector}
                  onChange={(e) => {
                    setSelectedCollector(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer pr-7 shadow-sm"
                >
                  <option value="all">All Collectors</option>
                  {availableCollectors.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <UserCheck className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Audit View - Table or Grid */}
          {view === 'table' ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-5 py-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">Collector</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold text-orange-600 uppercase tracking-wider whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Collector Parent
                        </span>
                      </th>
                      <th className="px-5 py-3 text-[10px] font-extrabold text-blue-600 uppercase tracking-wider whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Collector Current
                        </span>
                      </th>
                      <th className="px-5 py-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">Donor Details</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Amount</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">Trx ID</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((donation) => {
                      const collector = collectors[donation.tag_user_id];
                      const { parentCenter, parentTemple, currentCenter, currentTemple } = getDonationCenters(donation);

                      return (
                        <tr key={donation.id} className="hover:bg-orange-50/20 transition-colors group">
                          {/* 1. Collector Identity */}
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1 min-w-[130px]">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                <span className="text-gray-900 font-bold text-xs tracking-tight truncate">
                                   {collector?.name || 'System Executive'}
                                </span>
                              </div>
                              {donation.ashram && (
                                <span className="text-[9px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit truncate">
                                  {donation.ashram}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Collector Parent Column */}
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <span className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md w-fit whitespace-nowrap ${
                                parentCenter === 'None'
                                  ? 'text-gray-400 bg-gray-50 border border-gray-200'
                                  : 'text-orange-800 bg-orange-50 border border-orange-200/80 font-bold'
                              }`}>
                                {parentCenter}
                              </span>
                              {parentTemple && parentTemple !== 'None' ? (
                                <span className="text-stone-700 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-stone-100 border border-stone-200/80 rounded-md w-fit whitespace-nowrap">
                                  {parentTemple}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic">No Temple</span>
                              )}
                            </div>
                          </td>

                          {/* 3. Collector Current Column */}
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <span className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md w-fit whitespace-nowrap ${
                                currentCenter === 'None'
                                  ? 'text-gray-400 bg-gray-50 border border-gray-200'
                                  : 'text-blue-800 bg-blue-50 border border-blue-200/80 font-bold'
                              }`}>
                                {currentCenter}
                              </span>
                              {currentTemple && currentTemple !== 'None' ? (
                                <span className="text-sky-800 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-sky-50 border border-sky-200/80 rounded-md w-fit whitespace-nowrap">
                                  {currentTemple}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic">No Temple</span>
                              )}
                            </div>
                          </td>

                          {/* 4. Donor Details */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5 min-w-[180px]">
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-700 border border-orange-200/80 shrink-0">
                                {donation.donor_name ? donation.donor_name.charAt(0).toUpperCase() : 'D'}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-gray-900 font-bold text-xs truncate">{donation.donor_name}</span>
                                <span className="text-[10px] text-gray-500 truncate flex items-center gap-1 font-medium">
                                  <Mail className="w-2.5 h-2.5 text-gray-400" />
                                  {donation.donor_email}
                                </span>
                                {(donation.donor_address || donation.donor_pan) && (
                                  <div className="flex gap-1.5 mt-0.5">
                                    {donation.donor_pan && (
                                      <span className="text-[8px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 flex items-center shrink-0">
                                        PAN: {donation.donor_pan}
                                      </span>
                                    )}
                                    {donation.donor_address && (
                                      <span className="text-[8px] font-medium bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200 truncate max-w-[90px]">
                                        {donation.donor_address}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. Amount */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-0.5 text-gray-900 font-black text-sm sm:text-base">
                                <IndianRupee className="w-3 h-3 text-orange-600" />
                                {Number(donation.amount || 0).toLocaleString('en-IN')}
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                {donation.payment_method || 'Razorpay'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Trx ID */}
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-gray-700 font-mono text-[10px] tracking-tight truncate max-w-[140px]" title={donation.txnid}>
                                {donation.txnid}
                              </span>
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-[10px] font-medium text-gray-500">
                                   {formatDonationDate(donation)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 7. Status */}
                          <td className="px-5 py-3.5">
                             <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border w-fit ${
                              donation.payment_status === 'captured' || donation.payment_status === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">{donation.payment_status}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((donation) => {
                  const collector = collectors[donation.tag_user_id];
                  const { parentCenter, parentTemple, currentCenter, currentTemple } = getDonationCenters(donation);

                  return (
                    <div key={donation.id} className="p-4 space-y-3 hover:bg-orange-50/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-700 border border-orange-200/80 shrink-0 shadow-sm">
                            {donation.donor_name ? donation.donor_name.charAt(0).toUpperCase() : 'D'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-900 font-bold text-xs truncate tracking-tight">{donation.donor_name}</p>
                            <p className="text-[10px] text-gray-500 truncate flex items-center gap-1 font-medium">
                              <Mail className="w-2.5 h-2.5 text-gray-400" /> {donation.donor_email}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-gray-900 font-black text-sm">₹{Number(donation.amount || 0).toLocaleString('en-IN')}</p>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase mt-0.5 ${
                            donation.payment_status === 'captured' || donation.payment_status === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <CheckCircle2 className="w-2 h-2" />
                            {donation.payment_status}
                          </div>
                        </div>
                      </div>
                      {/* Separate spaces for Collector Parent and Collector Current */}
                      <div className="grid grid-cols-2 gap-2">
                         <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 flex flex-col gap-0.5">
                           <span className="text-[8px] font-black uppercase tracking-wider text-orange-700 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Collector Parent
                           </span>
                           <span className="font-bold text-[10px] text-orange-950 truncate">{parentCenter}</span>
                           <span className="text-[9px] text-stone-600 truncate">{parentTemple !== 'None' ? parentTemple : 'No Temple'}</span>
                         </div>
                         <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col gap-0.5">
                           <span className="text-[8px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Collector Current
                           </span>
                           <span className="font-bold text-[10px] text-blue-950 truncate">{currentCenter}</span>
                           <span className="text-[9px] text-sky-700 truncate">{currentTemple !== 'None' ? currentTemple : 'No Temple'}</span>
                         </div>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-500">
                         <span className="font-mono truncate max-w-[140px] text-gray-600">{donation.txnid}</span>
                         <span className="text-[9px] font-medium text-gray-500 flex items-center gap-1">
                           <Clock className="w-2.5 h-2.5" /> {formatDonationDate(donation)}
                         </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((donation) => {
                const collector = collectors[donation.tag_user_id];
                const { parentCenter, parentTemple, currentCenter, currentTemple } = getDonationCenters(donation);

                return (
                  <div key={donation.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md hover:border-orange-200 hover:shadow-lg transition-all group flex flex-col justify-between">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-orange-700 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-orange-50 border border-orange-200/70 rounded">Collector</span>
                              {donation.ashram && (
                                <span className="text-gray-600 font-semibold text-[9px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[130px]">
                                  {donation.ashram}
                                </span>
                              )}
                            </div>
                            <h3 className="text-gray-900 font-bold text-sm tracking-tight truncate">{collector?.name || 'System Executive'}</h3>
                          </div>
                          <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-100 shadow-inner group-hover:bg-orange-100/60 transition-all shrink-0">
                            <IndianRupee className="w-4 h-4 text-orange-600" />
                          </div>
                       </div>
                       
                       {/* Separate spaces for Collector Parent and Collector Current */}
                       <div className="grid grid-cols-2 gap-2 mb-4">
                         <div className="p-2 rounded-xl bg-orange-50/70 border border-orange-200/80 flex flex-col gap-0.5">
                           <span className="text-[8px] font-black uppercase tracking-wider text-orange-700 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Collector Parent
                           </span>
                           <span className="font-bold text-[10px] text-orange-950 truncate">{parentCenter}</span>
                           <span className="text-[9px] text-stone-600 truncate">{parentTemple !== 'None' ? parentTemple : 'No Temple'}</span>
                         </div>
                         <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col gap-0.5">
                           <span className="text-[8px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Collector Current
                           </span>
                           <span className="font-bold text-[10px] text-blue-950 truncate">{currentCenter}</span>
                           <span className="text-[9px] text-sky-700 truncate">{currentTemple !== 'None' ? currentTemple : 'No Temple'}</span>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-sm font-bold text-orange-700 border border-orange-200/80 shadow-sm shrink-0">
                             {donation.donor_name ? donation.donor_name.charAt(0).toUpperCase() : 'D'}
                          </div>
                          <div className="min-w-0">
                              <p className="text-gray-900 font-bold truncate text-xs">{donation.donor_name}</p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate font-medium">
                                 <Clock className="w-2.5 h-2.5 text-gray-400" />
                                 {formatDonationDate(donation)}
                              </p>
                              <p className="text-[9px] font-mono text-gray-500 truncate mt-0.5">{donation.txnid}</p>
                          </div>
                       </div>
                     </div>

                     <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex flex-col">
                           <span className="text-base font-black text-gray-900">₹{Number(donation.amount || 0).toLocaleString('en-IN')}</span>
                           <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{donation.payment_method || 'Razorpay'}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                           donation.payment_status === 'captured' || donation.payment_status === 'success'
                             ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                             : 'bg-amber-50 text-amber-700 border-amber-200'
                         }`}>
                           <CheckCircle2 className="w-3 h-3" />
                           <span className="text-[9px] font-bold uppercase tracking-wider">{donation.payment_status}</span>
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredDonations.length === 0 && (
            <div className="p-16 text-center space-y-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto border border-gray-200 shadow-sm">
                  <Search className="w-6 h-6 text-gray-400" />
               </div>
               <div className="space-y-1">
                 <h3 className="text-gray-900 font-bold text-base tracking-tight">No records discovered</h3>
                 <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">Adjust your filters or search query to find donations.</p>
               </div>
            </div>
          )}

          {/* Pagination Controls */}
          {(() => {
            const totalPages = Math.ceil(filteredDonations.length / pageSize);
            if (filteredDonations.length === 0) return null;
            return (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-5 py-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-3 order-2 md:order-1">
                  <span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider">Page Size:</span>
                  <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    {[10, 20, 50].map(size => (
                      <button
                        key={size}
                        onClick={() => { setPageSize(size); setCurrentPage(1); }}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pageSize === size ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'}`}
                      >{size}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 order-1 md:order-2">
                  <span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider mr-2">
                    {((currentPage - 1) * pageSize) + 1} – {Math.min(currentPage * pageSize, filteredDonations.length)} <span className="text-gray-400 mx-1">/</span> {filteredDonations.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="w-8 h-8 rounded-lg bg-white text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-all font-bold text-sm flex items-center justify-center border border-gray-200 shadow-sm"
                    >‹</button>
                    <div className="flex gap-1">
                       {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const page = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                        if (page > totalPages || page < 1) return null;
                        return (
                          <button 
                            key={page} 
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${currentPage === page ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                          >{page}</button>
                        );
                      })}
                    </div>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="w-8 h-8 rounded-lg bg-white text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-all font-bold text-sm flex items-center justify-center border border-gray-200 shadow-sm"
                    >›</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'missing-links' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/40 overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                  Collectors without Links
                  <span className="px-2.5 py-0.5 bg-orange-50 rounded-full text-[10px] text-orange-700 font-bold border border-orange-200">
                    {usersWithoutSlugs.length} Pending
                  </span>
                </h2>
                <p className="text-gray-500 text-xs">Members who need a Membership ID generated to activate their donation page.</p>
              </div>
              
              <button 
                onClick={() => router.push('/dashboard/admin/membership')}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-orange-700 transition-all flex items-center gap-2 group shadow-md shadow-orange-600/20"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                Go to Membership Management
              </button>
            </div>

            {loadingUsers ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Scanning Database...</p>
              </div>
            ) : usersWithoutSlugs.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-base tracking-tight">All Links Active</h3>
                <p className="text-gray-500 text-xs max-w-sm mx-auto">Every platform member currently has a personalized donation link assigned and ready for use.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usersWithoutSlugs.map((user) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={user.id} 
                    className="bg-gray-50/60 rounded-2xl p-4 border border-gray-200 hover:border-orange-300 hover:bg-white transition-all group shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-sm font-bold text-orange-700 border border-orange-200/80 group-hover:border-orange-300 transition-colors">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div className="px-2.5 py-0.5 bg-white rounded-md text-[8px] font-bold text-gray-600 uppercase tracking-wider border border-gray-200">
                        {user.center || 'No Center'}
                      </div>
                    </div>
                    
                    <div className="space-y-0.5 mb-4">
                      <h4 className="text-gray-900 font-bold text-sm tracking-tight line-clamp-1">{user.name}</h4>
                      <p className="text-[10px] text-gray-500 line-clamp-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {user.email}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <button 
                        onClick={() => router.push('/dashboard/admin/membership')}
                        className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold uppercase text-[9px] tracking-wider hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                         Generate Link
                         <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                <span className="font-bold">Note:</span> A user&apos;s donation link is automatically activated when their unique Membership ID is generated. This ensures all contributions are correctly attributed to their official identity.
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


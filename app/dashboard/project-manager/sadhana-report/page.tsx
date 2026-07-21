'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { fetchBulkSadhanaReports } from '@/lib/api/sadhana-client';
import { SadhanaReport, User } from '@/types';
import {
    Activity, Calendar, Users, BarChart2, Filter, ChevronLeft, ChevronRight,
    Search, AlertCircle, Eye
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import Link from 'next/link';

// Import the existing modal from managing-director
import UserDetailModal from '@/components/dashboard/UserDetailModal';

export default function SadhanaReportPage() {
    const { userData } = useAuth();
    const router = useRouter();

    const [loadingContext, setLoadingContext] = useState(true);
    const [centers, setCenters] = useState<{ id: string, name: string }[]>([]);
    const [selectedCenter, setSelectedCenter] = useState<string>('');
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Initial load from cache to prevent flicker
    useEffect(() => {
        const cachedCenters = localStorage.getItem('pm_sadhana_centers');
        const cachedCenter = localStorage.getItem('pm_sadhana_selected_center');

        if (cachedCenters) {
            try {
                const parsed = JSON.parse(cachedCenters);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    setCenters(parsed);
                    if (cachedCenter) setSelectedCenter(cachedCenter);
                    setLoadingContext(false);
                }
            } catch (e) {
                console.error('Failed to parse cached sadhana centers', e);
            }
        }
    }, []);

    const [dateRange, setDateRange] = useState({
        from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });

    const [reports, setReports] = useState<SadhanaReport[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Modal State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset pagination on search or limit change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    // Access Control
    const ALLOWED_ROLES = [14, 15, 16];
    const ALLOWED_ROLE_NAMES = ['project_advisor', 'project_manager', 'acting_manager'];
    const isProjectManager = userData && (Array.isArray(userData?.role) ? userData.role : [userData?.role]).some(r =>
        ALLOWED_ROLES.includes(Number(r)) || ALLOWED_ROLE_NAMES.includes(String(r))
    );

    useEffect(() => {
        if (!userData || !isProjectManager) {
            if (!isProjectManager && userData) {
                router.push('/dashboard');
            }
            return;
        }

        const fetchContext = async () => {
            if (!supabase) { setLoadingContext(false); return; }
            const session = await supabase.auth.getSession();
            if (!session.data.session) return;
            const adminId = session.data.session.user.id;

            // Only show full page loader if we don't have cached data
            setLoadingContext(centers.length === 0);
            try {
                const { data, error } = await supabase
                    .from('centers')
                    .select('id, name')
                    .or(`project_manager_id.eq.${adminId},project_advisor_id.eq.${adminId},acting_manager_id.eq.${adminId}`);

                if (error) throw error;

                if (data && data.length > 0) {
                    setCenters(data);
                    localStorage.setItem('pm_sadhana_centers', JSON.stringify(data));
                    // Only auto-select if no center is currently selected (e.g. from cache)
                    setSelectedCenter(prev => {
                        const next = prev || data[0].name;
                        localStorage.setItem('pm_sadhana_selected_center', next);
                        return next;
                    });
                } else {
                    // Fallback to hierarchy
                    const h = userData.hierarchy as any;
                    const cName = h?.currentCenter?.name || h?.currentCenter;
                    if (cName) {
                        setCenters([{ id: 'hierarchy', name: cName }]);
                        setSelectedCenter(cName);
                    } else {
                        toast.error('No center assignment found for your profile.');
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load centers.');
            } finally {
                setLoadingContext(false);
            }
        };

        fetchContext();
    }, [userData, isProjectManager, router, centers.length]);

    // Fetch Users when center changes
    useEffect(() => {
        if (!selectedCenter) return;

        const loadUsers = async () => {
            if (!supabase) return;
            try {
                // In a production scenario, we'd have a more robust mechanism, but for this scale
                // fetching all users matching current_center is fine.
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('current_center', selectedCenter);

                if (error) throw error;
                const mappedUsers: User[] = (data || []).map((user: any) => {
                    return {
                        ...user,
                        // Relative contact fields
                        relative1Name: user.relative_1_name,
                        relative1Relationship: user.relative_1_relationship,
                        relative1Phone: user.relative_1_phone,
                        relative2Name: user.relative_2_name,
                        relative2Relationship: user.relative_2_relationship,
                        relative2Phone: user.relative_2_phone,
                        relative3Name: user.relative_3_name,
                        relative3Relationship: user.relative_3_relationship,
                        relative3Phone: user.relative_3_phone,
                        // Health fields
                        healthChronicDisease: user.health_chronic_disease,
                        introducedToKcIn: user.introduced_to_kc_in || (user.hierarchy as any)?.introducedToKcIn,
                    } as User;
                });
                setUsers(mappedUsers);
            } catch (err) {
                console.error('Error loading center users', err);
                toast.error('Failed to load users for the selected center.');
            }
        };

        loadUsers();
    }, [selectedCenter]);

    // Fetch reports when users or date range changes
    // But we should probably use a "Fetch Data" button to avoid spamming the database
    // Let's implement an explicit fetch function
    const handleFetchReports = async () => {
        if (users.length === 0) {
            toast.error('No users found in this center.');
            return;
        }
        if (!dateRange.from || !dateRange.to) {
            toast.error('Please select a valid date range.');
            return;
        }

        setLoadingData(true);
        try {
            const userIds = users.map(u => u.id);
            const fetchedReports = await fetchBulkSadhanaReports(userIds, dateRange.from, dateRange.to);
            setReports(fetchedReports);
            toast.success('Reports updated successfully!');
        } catch (error) {
            console.error('Failed to fetch reports', error);
            toast.error('Failed to load sadhana reports.');
        } finally {
            setLoadingData(false);
        }
    };

    // Auto-fetch when users array is populated initially for the selected center
    useEffect(() => {
        if (users.length > 0 && reports.length === 0 && !loadingData) {
            handleFetchReports();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users]);


    // Aggregate Data for Chart and Table
    const aggregatedData = useMemo(() => {
        if (!users.length) return [];

        const totalDaysToDivide = Math.max(1, differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1);

        const dataByUserId = users.reduce((acc, user) => {
            acc[user.id] = {
                user,
                totalJapa: 0,
                totalHearing: 0,
                totalReading: 0,
                totalToBed: 0,
                totalWakeUp: 0,
                totalDailyFilling: 0,
                totalDaySleep: 0,
                reportsCount: 0
            };
            return acc;
        }, {} as Record<string, any>);

        reports.forEach(report => {
            if (dataByUserId[report.userId]) {
                const uData = dataByUserId[report.userId];
                uData.totalJapa += (report.japa || 0);
                uData.totalHearing += (report.hearing || 0);
                uData.totalReading += (report.reading || 0);
                uData.totalToBed += (report.toBed || 0);
                uData.totalWakeUp += (report.wakeUp || 0);
                uData.totalDailyFilling += (report.dailyFilling || 0);
                uData.totalDaySleep += (report.daySleep || 0);
                uData.reportsCount += 1;
            }
        });

        const result = Object.values(dataByUserId).map(uData => {
            // Calculate averages based on total days in the range (not just reported days)
            // Daily Max: Soul (7 rounds equivalent maxing out daily limits?), Soul = 30 max per day
            // Actually, we use the standard calculation: 
            // Soul % = (Japa + Hearing + Reading) / 30 per day
            // Body % = (ToBed + WakeUp + DailyFilling + DaySleep) / 40 per day
            const soulPercent = ((uData.totalJapa + uData.totalHearing + uData.totalReading) / (30 * totalDaysToDivide)) * 100;
            const bodyPercent = ((uData.totalToBed + uData.totalWakeUp + uData.totalDailyFilling + uData.totalDaySleep) / (40 * totalDaysToDivide)) * 100;

            return {
                id: uData.user.id,
                name: uData.user.name.split(' ')[0], // First name for chart
                fullName: uData.user.name,
                email: uData.user.email,
                user: uData.user,
                soulPercent: Math.min(100, Math.round(soulPercent * 10) / 10),
                bodyPercent: Math.min(100, Math.round(bodyPercent * 10) / 10),
                reportsSubmitted: uData.reportsCount
            };
        });

        // Filter by search query and sort by soul percent descending
        return result
            .filter(item => item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || item.email.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.soulPercent - a.soulPercent);

    }, [users, reports, dateRange, searchQuery]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return aggregatedData.slice(startIndex, startIndex + itemsPerPage);
    }, [aggregatedData, currentPage, itemsPerPage]);


    if (loadingContext) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-amber-200 border-t-amber-500 rounded-full"></div>
            </div>
        );
    }

    if (!isProjectManager) {
        return null;
    }

    return (
        <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Link href="/dashboard/project-manager" className="hover:text-amber-600 transition-colors flex items-center">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Back to Dashboard</span>
                        </Link>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 sm:gap-3">
                        <BarChart2 className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
                        Sadhana Report
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Bird&apos;s-eye view of spiritual progress for {selectedCenter}</p>
                </div>

                {centers.length > 1 && (
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Center</label>
                        <select
                            value={selectedCenter}
                            onChange={(e) => {
                                setSelectedCenter(e.target.value);
                                localStorage.setItem('pm_sadhana_selected_center', e.target.value);
                            }}
                            className="w-full sm:w-64 bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                        >
                            {centers.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end justify-between">
                <div className="flex flex-row gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    <div className="flex-1 min-w-[130px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> From
                        </label>
                        <input
                            type="date"
                            value={dateRange.from}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-bold py-1.5 px-2 sm:px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                        />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> To
                        </label>
                        <input
                            type="date"
                            value={dateRange.to}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-bold py-1.5 px-2 sm:px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                        />
                    </div>
                </div>

                <div className="w-full md:w-auto">
                    <button
                        onClick={handleFetchReports}
                        disabled={loadingData}
                        className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2 px-5 rounded-lg shadow-md shadow-orange-200/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
                    >
                        {loadingData ? (
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Activity className="h-3.5 w-3.5" />
                        )}
                        Analyze
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {loadingData && reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100">
                    <div className="animate-spin h-10 w-10 border-4 border-amber-200 border-t-amber-500 rounded-full mb-4"></div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Aggregating Data...</p>
                </div>
            ) : aggregatedData.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">

                    {/* Bird's Eye Chart */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2 mb-4">
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                            Aggregate Overview
                        </h2>

                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aggregatedData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #f1f5f9',
                                            borderRadius: '16px',
                                            padding: '12px',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                                        }}
                                        labelStyle={{ fontWeight: 800, color: '#0f172a', marginBottom: '8px', fontSize: '13px' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 700, fontSize: '12px', color: '#64748b' }} />
                                    <Bar dataKey="soulPercent" name="Soul %" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="bodyPercent" name="Body %" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Users List Filter & Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                                Devotee Breakdown
                            </h2>
                            <div className="relative w-full sm:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-gray-200 text-gray-800 text-xs sm:text-sm font-bold py-1.5 pl-9 pr-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white border-b border-gray-100">
                                        <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30">User</th>
                                        <th className="px-3 sm:px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30">Reports</th>
                                        <th className="px-3 sm:px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30 hidden sm:table-cell">Avg Soul %</th>
                                        <th className="px-3 sm:px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30 hidden sm:table-cell">Avg Body %</th>
                                        <th className="px-3 sm:px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 text-xs sm:text-sm font-bold shadow-sm">
                                                        {item.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-3 sm:ml-4">
                                                        <div className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{item.fullName}</div>
                                                        <div className="text-[9px] sm:text-[10px] font-medium text-gray-500 uppercase tracking-wide">{item.email}</div>

                                                        {/* Mobile-only stats */}
                                                        <div className="flex sm:hidden items-center gap-3 mt-1.5">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                <span className="text-[9px] font-bold text-gray-600">{item.soulPercent}%</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                <span className="text-[9px] font-bold text-gray-600">{item.bodyPercent}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center align-top sm:align-middle pt-4 sm:pt-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold ${item.reportsSubmitted === 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {item.reportsSubmitted} / {differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center hidden sm:table-cell">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.soulPercent}%` }} />
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-black text-gray-700 w-8 sm:w-10 text-right">{item.soulPercent}%</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center hidden sm:table-cell">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.bodyPercent}%` }} />
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-black text-gray-700 w-8 sm:w-10 text-right">{item.bodyPercent}%</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right align-top sm:align-middle pt-4 sm:pt-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(item.user);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 text-gray-700 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold hover:bg-gray-50 hover:border-gray-300 hover:text-amber-600 transition-all shadow-sm"
                                                >
                                                    <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                    <span className="hidden sm:inline">View Details</span>
                                                    <span className="sm:hidden">View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {aggregatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No users found matching your search.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {aggregatedData.length > 0 && (
                            <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                    <span>Rows per page:</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                        className="bg-gray-50 border border-gray-200 text-gray-800 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 py-1.5 px-2 outline-none transition-all font-bold"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500 font-medium">
                                        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, aggregatedData.length)} of {aggregatedData.length}
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(aggregatedData.length / itemsPerPage), prev + 1))}
                                            disabled={currentPage >= Math.ceil(aggregatedData.length / itemsPerPage)}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100 border-dashed">
                    <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-10 w-10 text-blue-300" />
                    </div>
                    <h3 className="text-lg font-black text-gray-700 mb-2">No Data Available</h3>
                    <p className="text-sm text-gray-500 font-medium text-center max-w-sm">No sadhana reports found for the selected center and date range. Please try adjusting the dates or confirm users have submitted reports.</p>
                </div>
            )}

            {/* User Details Modal */}
            <UserDetailModal
                user={selectedUser}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}

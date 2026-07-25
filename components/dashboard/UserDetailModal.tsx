'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, SadhanaReport } from '@/types';
import { fetchSadhanaReportsByRange } from '@/lib/api/sadhana-client';
import {
    X, Calendar, User as UserIcon, Activity, BookOpen,
    Moon, Sun, Coffee, Bed, ChevronRight, Check, AlertCircle,
    MapPin, Phone, Mail, Shield, Award, Briefcase, GraduationCap, Tent, Book, CheckCircle2, XCircle, Clock, Filter, Users, Search
} from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/roles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, parseISO, differenceInCalendarDays } from 'date-fns';
import { toast } from 'react-hot-toast';

const CAMP_MAPPINGS = [
    { key: 'campDys', label: 'DYS' },
    { key: 'campSankalpa', label: 'Sankalpa' },
    { key: 'campSphurti', label: 'Sphurti' },
    { key: 'campUtkarsh', label: 'Utkarsh' },
    { key: 'campSrcgdWorkshop', label: 'SRCGD Workshop' },
    { key: 'campNishtha', label: 'Nishtha' },
    { key: 'campFtec', label: 'FTEC' },
    { key: 'campAshraya', label: 'Ashraya' },
    { key: 'campMtec', label: 'MTEC' },
    { key: 'campSharanagati', label: 'Sharanagati' },
    { key: 'campIdc', label: 'IDC' },
];

const BOOK_MAPPINGS = {
    'Semester 3': [
        { key: 'spbookThirdSsr15', label: 'SSR (1-5)' },
        { key: 'spbookThirdComingBack', label: 'Coming Back' },
        { key: 'spbookThirdPqpa', label: 'Perfect Questions, Perfect Answers' },
        { key: 'spbookThirdMatchlessGift', label: 'Matchless Gift' },
        { key: 'spbookThirdRajaVidya', label: 'Raja Vidya' },
        { key: 'spbookThirdElevationKc', label: 'Elevation to KC' },
        { key: 'spbookThirdBeyondBirthDeath', label: 'Beyond Birth & Death' },
        { key: 'spbookThirdKrishnaReservoir', label: 'Krishna: Resvr. of Pleasure' },
    ],
    'Semester 4': [
        { key: 'spbookFourthSsr68', label: 'SSR (6-8)' },
        { key: 'spbookFourthLawsOfNature', label: 'Laws of Nature' },
        { key: 'spbookFourthDharma', label: 'Dharma' },
        { key: 'spbookFourthSecondChance', label: 'Second Chance' },
        { key: 'spbookFourthIsopanishad110', label: 'Isopanishad (1-10)' },
        { key: 'spbookFourthQueenKuntiVideo', label: 'Queen Kunti (Video)' },
        { key: 'spbookFourthEnlightenmentNatural', label: 'Enlightenment' },
        { key: 'spbookFourthKrishnaBook121', label: 'Krishna Book (1-21)' },
    ],
    'Semester 5': [
        { key: 'spbookFifthLifeFromLife', label: 'Life From Life' },
        { key: 'spbookFifthPrahladTeachings', label: 'Teachings of Prahlada' },
        { key: 'spbookFifthJourneySelfDiscovery', label: 'Journey of Self Discovery' },
        { key: 'spbookFifthQueenKuntiHearing', label: 'Queen Kunti (Hearing)' },
        { key: 'spbookFifthLordKapila', label: 'Lord Kapila' },
        { key: 'spbookFifthNectar16', label: 'Nectar of Instruction (1-6)' },
        { key: 'spbookFifthGita16', label: 'Gita (1-6)' },
        { key: 'spbookFifthKrishnaBook2428', label: 'Krishna Book (24-28)' },
    ],
    'Semester 6': [
        { key: 'spbookSixthNectar711', label: 'Nectar of Instruction (7-11)' },
        { key: 'spbookSixthPathPerfection', label: 'Path of Perfection' },
        { key: 'spbookSixthCivilisationTranscendence', label: 'Civilization & Transcendence' },
        { key: 'spbookSixthHareKrishnaChallenge', label: 'Hare Krishna Challenge' },
        { key: 'spbookSixthGita712', label: 'Gita (7-12)' },
        { key: 'spbookSixthSb1stCanto16', label: 'SB 1st Canto (1-6)' },
        { key: 'spbookSixthKrishnaBook3559', label: 'Krishna Book (35-59)' },
    ],
    'Semester 7': [
        { key: 'spbookSeventhGita1318', label: 'Gita (13-18)' },
        { key: 'spbookSeventhSb1stCanto713', label: 'SB 1st Canto (7-13)' },
        { key: 'spbookSeventhKrishnaBook6378', label: 'Krishna Book (63-78)' },
    ],
    'Semester 8': [
        { key: 'spbookEighthSb1stCanto1419', label: 'SB 1st Canto (14-19)' },
        { key: 'spbookEighthKrishnaBook7889', label: 'Krishna Book (78-89)' },
    ]
};

interface UserDetailModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'sadhana'>('profile');
    const [loadingSadhana, setLoadingSadhana] = useState(false);

    // Custom Date Range State
    const [dateRange, setDateRange] = useState({
        from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });

    const [reports, setReports] = useState<SadhanaReport[]>([]);

    // Reset state when modal opens/closes or user changes
    useEffect(() => {
        if (isOpen && user) {
            setActiveTab('profile');
            // Default to last 30 days
            setDateRange({
                from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                to: format(new Date(), 'yyyy-MM-dd'),
            });
            setReports([]);
        }
    }, [isOpen, user]);

    const loadSadhanaDetails = useCallback(async () => {
        if (!user) return;
        setLoadingSadhana(true);
        try {
            const fetchedReports = await fetchSadhanaReportsByRange(dateRange.from, dateRange.to, user.id);
            setReports(fetchedReports);
        } catch (error: any) {
            console.error('Error loading sadhana details:', error);
            toast.error(error.message || 'Failed to load sadhana details');
        } finally {
            setLoadingSadhana(false);
        }
    }, [user, dateRange]);

    // Fetch sadhana details based on date range
    useEffect(() => {
        if (isOpen && user && activeTab === 'sadhana') {
            loadSadhanaDetails();
        }
    }, [isOpen, user, activeTab, loadSadhanaDetails]);

    const weeklySummaries = useMemo(() => {
        const weeks: { [key: string]: any } = {};
        reports.forEach(r => {
            const date = r.date instanceof Date ? r.date : new Date(r.date);
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
            const key = format(weekStart, 'yyyy-MM-dd');
            if (!weeks[key]) {
                weeks[key] = {
                    weekStart,
                    weekEnd,
                    japa: 0,
                    hearing: 0,
                    reading: 0,
                    toBed: 0,
                    wakeUp: 0,
                    dailyFilling: 0,
                    daySleep: 0,
                    study: 0,
                    count: 0,
                    books: new Set()
                };
            }
            weeks[key].japa += r.japa || 0;
            weeks[key].hearing += r.hearing || 0;
            weeks[key].reading += r.reading || 0;
            weeks[key].toBed += r.toBed || 0;
            weeks[key].wakeUp += r.wakeUp || 0;
            weeks[key].dailyFilling += r.dailyFilling || 0;
            weeks[key].daySleep += r.daySleep || 0;
            weeks[key].study += Number(r.study || 0);
            weeks[key].count += 1;
            if (r.bookName) weeks[key].books.add(r.bookName);
        });

        return Object.values(weeks).map(w => {
            const soulPercent = (w.japa + w.hearing + w.reading) / 210 * 100;
            const bodyPercent = (w.toBed + w.wakeUp + w.dailyFilling + w.daySleep) / 280 * 100;
            return {
                ...w,
                soulPercent: Math.min(100, soulPercent),
                bodyPercent: Math.min(100, bodyPercent),
                bookNames: Array.from(w.books).join(', ')
            };
        }).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
    }, [reports]);

    // Prepare weekly aggregated data for Body & Soul percentage chart
    const getWeeklyChartData = () => {
        if (!reports.length) return [];

        const weeklyData: { [key: string]: { reports: SadhanaReport[], weekStart: Date, weekEnd: Date } } = {};

        reports.forEach((report) => {
            const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
            const weekStart = startOfWeek(reportDate, { weekStartsOn: 1 }); // Monday
            const weekEnd = endOfWeek(reportDate, { weekStartsOn: 1 }); // Sunday
            const weekKey = format(weekStart, 'yyyy-MM-dd');

            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { reports: [], weekStart, weekEnd };
            }
            weeklyData[weekKey].reports.push(report);
        });

        return Object.values(weeklyData)
            .map(({ reports: weekReports, weekStart, weekEnd }) => {
                // Calculate totals for the week
                const weeklyJapa = weekReports.reduce((sum, r) => sum + (r.japa || 0), 0);
                const weeklyHearing = weekReports.reduce((sum, r) => sum + (r.hearing || 0), 0);
                const weeklyReading = weekReports.reduce((sum, r) => sum + (r.reading || 0), 0);

                const weeklyToBed = weekReports.reduce((sum, r) => sum + (r.toBed || 0), 0);
                const weeklyWakeUp = weekReports.reduce((sum, r) => sum + (r.wakeUp || 0), 0);
                const weeklyDailyFilling = weekReports.reduce((sum, r) => sum + (r.dailyFilling || 0), 0);
                const weeklyDaySleep = weekReports.reduce((sum, r) => sum + (r.daySleep || 0), 0);

                // Weekly Soul Total Possible = 70 * 3 = 210
                const avgSoulPercent = ((weeklyJapa + weeklyHearing + weeklyReading) / 210) * 100;

                // Weekly Body Total Possible = 70 * 4 = 280
                const avgBodyPercent = ((weeklyToBed + weeklyWakeUp + weeklyDailyFilling + weeklyDaySleep) / 280) * 100;

                return {
                    week: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
                    bodyPercent: Math.min(100, Math.round(avgBodyPercent * 10) / 10),
                    soulPercent: Math.min(100, Math.round(avgSoulPercent * 10) / 10),
                };
            })
            .sort((a, b) => {
                const dateA = new Date(a.week.split(' - ')[0]);
                const dateB = new Date(b.week.split(' - ')[0]);
                return dateA.getTime() - dateB.getTime();
            });
    };

    const weeklyChartData = getWeeklyChartData();

    // Calculate aggregated stats for the selected period
    const getAggregatedStats = () => {
        if (!reports.length) return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };

        const totals = reports.reduce((acc, report) => ({
            japa: acc.japa + (report.japa || 0),
            hearing: acc.hearing + (report.hearing || 0),
            reading: acc.reading + (report.reading || 0),
            toBed: acc.toBed + (report.toBed || 0),
            wakeUp: acc.wakeUp + (report.wakeUp || 0),
            dailyFilling: acc.dailyFilling + (report.dailyFilling || 0),
            daySleep: acc.daySleep + (report.daySleep || 0),
        }), { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 });

        return totals;
    };

    const periodStats = getAggregatedStats();

    // Calculate averages based on total days in the selected range
    const totalDaysInRange = Math.max(1, differenceInCalendarDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1);

    const averages = {
        soulPercent: Math.round(((periodStats.japa + periodStats.hearing + periodStats.reading) / (30 * totalDaysInRange)) * 100),
        bodyPercent: Math.round(((periodStats.toBed + periodStats.wakeUp + periodStats.dailyFilling + periodStats.daySleep) / (40 * totalDaysInRange)) * 100)
    };


    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#fffdfa] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-orange-100/20 w-[92%] sm:w-full max-w-4xl overflow-hidden transform transition-all scale-100 border sm:border-amber-200 animate-in zoom-in-95 duration-300 relative flex flex-col h-[80vh] sm:h-auto sm:max-h-[90vh]">

                {/* Header */}
                <div className="relative z-10 px-4 py-4 sm:px-8 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight truncate">{user.name}</h2>
                            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest truncate">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all flex-shrink-0 ml-4"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5px]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-4 sm:px-8 py-1 bg-gray-50/50 border-b border-gray-100 flex gap-2 sm:gap-4">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-3 px-2 sm:px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'profile'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <UserIcon className="inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 mb-0.5" />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('sadhana')}
                        className={`py-3 px-2 sm:px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'sadhana'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Activity className="inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 mb-0.5" />
                        Sadhana
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#fffdfa]">

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Personal Info */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <UserIcon className="h-4 w-4 text-orange-500" /> Personal Information
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">Phone</span>
                                            <span className="text-sm font-bold text-gray-700">{user.phone || 'Not set'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight sm:tracking-normal">Date of Birth</span>
                                            <span className="text-sm font-bold text-gray-700">{user.birthDate || 'Not set'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">Roles</span>
                                            <div className="flex flex-wrap gap-1 sm:justify-end">
                                                {(Array.isArray(user.role) ? user.role : [user.role]).map((r: any, i: number) => {
                                                    const roleVal = Number(r);
                                                    return (
                                                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] sm:text-[10px] uppercase font-bold">
                                                            {getRoleDisplayName(roleVal as any)}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight sm:tracking-normal">Status</span>
                                            <span className={`w-fit px-2 py-1 rounded text-[10px] sm:text-xs font-bold uppercase ${user.verificationStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                                user.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {user.verificationStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Relative Contact Info */}
                                {(user.relative1Name || user.relative2Name || user.relative3Name) && (
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Users className="h-4 w-4 text-sky-500" /> Relative Contacts
                                        </h3>
                                        <div className="space-y-6">
                                            {[1, 2, 3].map((num) => {
                                                const name = (user as any)[`relative${num}Name`];
                                                const rel = (user as any)[`relative${num}Relationship`];
                                                const phone = (user as any)[`relative${num}Phone`];
                                                if (!name && !rel && !phone) return null;
                                                return (
                                                    <div key={num} className="space-y-2 last:border-0 border-b border-gray-50 pb-4 last:pb-0">
                                                        <div className="flex justify-between items-start">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold text-gray-800 truncate">{name || 'Unnamed'}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{rel || 'Relationship not set'}</p>
                                                            </div>
                                                            {phone && (
                                                                <a href={`tel:${phone}`} className="flex items-center gap-1.5 px-2 py-1 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-bold hover:bg-sky-100 transition-colors whitespace-nowrap ml-2">
                                                                    <Phone className="h-3 w-3" /> {phone}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Health Info */}
                                {user.healthChronicDisease && (
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm md:col-span-2">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-rose-500" /> Health Information
                                        </h3>
                                        <div className="p-4 bg-rose-50/30 rounded-2xl border border-rose-100/50">
                                            <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                                                {user.healthChronicDisease}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Hierarchy Info */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-purple-500" /> Spiritual Hierarchy
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">Temple</span>
                                            <span className="text-sm font-bold text-gray-700 sm:text-right">{(user.hierarchy?.currentTemple as any)?.name || user.hierarchy?.currentTemple || 'Not set'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">Center</span>
                                            <span className="text-sm font-bold text-gray-700 sm:text-right">
                                                {(() => {
                                                    const center = (user.hierarchy?.currentCenter as any)?.name || user.hierarchy?.currentCenter || (user.hierarchy?.center as any)?.name || user.hierarchy?.center;
                                                    const other = user.hierarchy?.otherCenter;
                                                    if (center === 'Other' || (!center && other)) {
                                                        return <span className="text-rose-600">Other: {other}</span>;
                                                    }
                                                    return center || (other ? `Other: ${other}` : 'Not set');
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">Counselor</span>
                                            <span className="text-sm font-bold text-gray-700 sm:text-right">
                                                {(() => {
                                                    const counselor = (user.hierarchy?.counselor as any)?.name || user.hierarchy?.counselor || user.hierarchy?.grihasthaCounselor || user.hierarchy?.brahmachariCounselor;
                                                    const other = user.hierarchy?.otherCounselor;
                                                    if (counselor === 'Other' || (!counselor && other)) {
                                                        return <span className="text-rose-600">Other: {other}</span>;
                                                    }
                                                    return counselor || (other ? `Other: ${other}` : 'Not set');
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight sm:tracking-normal">Ashram</span>
                                            <span className="text-sm font-bold text-gray-700 sm:text-right">{user.hierarchy?.ashram || 'Not set'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight sm:tracking-normal">Initiation</span>
                                            <span className="text-sm font-bold text-gray-700 sm:text-right">{user.hierarchy?.initiationStatus || 'Not set'}</span>
                                        </div>
                                        {user.introducedToKcIn && (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
                                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight sm:tracking-normal">Introduced to KC</span>
                                                <span className="text-sm font-bold text-gray-700 sm:text-right">
                                                    {(() => {
                                                        try {
                                                            const date = new Date(user.introducedToKcIn);
                                                            if (isNaN(date.getTime())) return user.introducedToKcIn;
                                                            // If it's just a year (4 digits), return as is
                                                            if (/^\d{4}$/.test(user.introducedToKcIn)) return user.introducedToKcIn;
                                                            return format(date, 'MMM d, yyyy');
                                                        } catch (e) {
                                                            return user.introducedToKcIn;
                                                        }
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Education and Work Experience */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Education */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-indigo-500" /> Education
                                    </h3>
                                    <div className="space-y-4">
                                        {user.education && user.education.length > 0 ? (
                                            user.education.map((edu, i) => (
                                                <div key={i} className="flex flex-col py-2 border-b border-gray-50 last:border-0">
                                                    <span className="text-sm font-black text-gray-800">{edu.degreeBranch}</span>
                                                    <span className="text-xs font-bold text-gray-500">{edu.institution}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                                        {edu.startYear ? edu.startYear : 'N/A'} - {edu.endYear ? edu.endYear : 'N/A'}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs font-medium text-gray-400 italic">No education details available.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Work Experience */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-emerald-500" /> Work Experience
                                    </h3>
                                    <div className="space-y-4">
                                        {user.workExperience && user.workExperience.length > 0 ? (
                                            user.workExperience.map((work, i) => (
                                                <div key={i} className="flex flex-col py-2 border-b border-gray-50 last:border-0">
                                                    <span className="text-sm font-black text-gray-800">{work.position}</span>
                                                    <span className="text-xs font-bold text-gray-500">{work.company}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                                        {work.startDate ? new Date(work.startDate).getFullYear() : 'N/A'} - {work.current ? 'Present' : (work.endDate ? new Date(work.endDate).getFullYear() : 'N/A')}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs font-medium text-gray-400 italic">No work experience details available.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sadhana Tab */}
                    {activeTab === 'sadhana' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

                            {/* Date Range Selection */}
                            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <Filter className="h-4 w-4 text-amber-500" />
                                        Select Period:
                                    </label>
                                    <div className="flex flex-row gap-2 sm:gap-4 w-full sm:w-auto overflow-hidden">
                                        <div className="flex-1 sm:flex-none">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
                                            <input
                                                type="date"
                                                value={dateRange.from}
                                                max={format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-bold text-gray-800 focus:border-amber-400 focus:outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1 sm:flex-none">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
                                            <input
                                                type="date"
                                                value={dateRange.to}
                                                max={format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-bold text-gray-800 focus:border-amber-400 focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {loadingSadhana ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="animate-spin h-8 w-8 border-4 border-amber-200 border-t-amber-500 rounded-full mb-4"></div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fetching spiritual data...</p>
                                </div>
                            ) : reports.length > 0 ? (
                                <div className="space-y-6">
                                    {/* Weekly Progress Chart */}
                                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                                        <h2 className="text-xl font-bold text-orange-700 mb-4 flex items-center justify-between">
                                            <div className="flex items-center">
                                                <Activity className="h-5 w-5 mr-2" />
                                                Weekly Progress
                                            </div>
                                        </h2>
                                        <div className="w-full h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={weeklyChartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fee2e2" />
                                                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9a3412' }} />
                                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9a3412' }} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="soulPercent" name="Soul %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="bodyPercent" name="Body %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Weekly Reports List */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-amber-500" /> Weekly Reports
                                            </h3>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {weeklySummaries.map((week, idx) => (
                                                <div key={idx} className="p-4 hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-bold text-gray-900">
                                                            {format(week.weekStart, 'MMM d')} - {format(week.weekEnd, 'MMM d, yyyy')}
                                                            <span className="ml-2 text-[10px] text-gray-400 font-normal">({week.count} reports)</span>
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                                                                Soul: {week.soulPercent?.toFixed(1)}%
                                                            </span>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                                                                Body: {week.bodyPercent?.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Japa:</span> <span className="font-bold text-gray-700">{week.japa}</span></div>
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Hear:</span> <span className="font-bold text-gray-700">{week.hearing}</span></div>
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Read:</span> <span className="font-bold text-gray-700">{week.reading}</span></div>
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Books:</span> <span className="font-bold text-gray-700 truncate">{week.bookNames || '-'}</span></div>
                                                         
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">To Bed:</span> <span className="font-bold text-violet-600">{Math.round(week.toBed / week.count)}m</span></div>
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Wake Up:</span> <span className="font-bold text-sky-600">{Math.round(week.wakeUp / week.count)}m</span></div>
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Filling:</span> <span className="font-bold text-blue-600">{Math.round(week.dailyFilling / week.count)}m</span></div>
                                                         <div className="text-[10px]"><span className="text-gray-400 font-bold uppercase">Day Nap:</span> <span className="font-bold text-rose-600">{Math.round(week.daySleep / week.count)}m</span></div>
                                                     </div>
                                                    {week.study > 0 && (
                                                        <div className="mt-2 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                                                            <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                <GraduationCap className="h-3 w-3" /> Educational Progress
                                                            </p>
                                                            <p className="text-xs text-gray-700 font-bold">
                                                                {week.study} Total Hours This Week
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                    <Activity className="h-10 w-10 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-black text-gray-700">No Reports Found</h3>
                                    <p className="text-sm text-gray-400 font-medium">Try selecting a wider date range.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

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

    const verificationStatusText = String(user.verificationStatus || (user as any).verification_status || 'approved');
    const isApproved = verificationStatusText.toLowerCase() === 'approved';
    const isRejected = verificationStatusText.toLowerCase() === 'rejected';

    const currentCenterName = (user as any)._currentCenterDisplay || (user.hierarchy?.currentCenter as any)?.name || user.hierarchy?.currentCenter || (user as any).current_center || (user as any).center || 'Not set';
    const parentCenterName = (user as any)._parentCenterDisplay || (user as any).parent_center || (user.hierarchy?.parentCenter as any)?.name || user.hierarchy?.parentCenter || 'None';
    const currentTempleName = (user as any)._currentTempleDisplay || (user.hierarchy?.currentTemple as any)?.name || user.hierarchy?.currentTemple || (user as any).current_temple || 'Not set';
    const voiceConnection = (user as any)._centerConnection;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-b-2 border-slate-200 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-xs flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                                    {user.name}
                                </h2>
                                {voiceConnection === 'alumni' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                                        🎓 Voice Alumni
                                    </span>
                                ) : voiceConnection === 'both' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                                        🔷 Current & Alumni
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                        🟢 Current Member
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors flex-shrink-0"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5 stroke-[2.5px]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-4 sm:px-6 bg-white border-b-2 border-slate-200 flex gap-4">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'profile'
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <UserIcon className="w-4 h-4" />
                        Profile Details
                    </button>
                    <button
                        onClick={() => setActiveTab('sadhana')}
                        className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'sadhana'
                                ? 'border-amber-500 text-amber-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        Sadhana Report
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 bg-slate-100/70 space-y-3">

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* 1. Personal & Contact Info */}
                                <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 shadow-2xs">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100 flex items-center gap-2">
                                        <UserIcon className="h-4 w-4 text-blue-600" />
                                        <span>Personal & Contact Info</span>
                                    </h3>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Phone</span>
                                            {user.phone ? (
                                                <a href={`tel:${user.phone}`} className="font-bold text-blue-700 hover:underline flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{user.phone}</span>
                                                </a>
                                            ) : (
                                                <span className="font-bold text-slate-400">Not set</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Date of Birth</span>
                                            <span className="font-bold text-slate-800">{user.birthDate || (user as any).birth_date || 'Not set'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Status</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                                isApproved ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                                isRejected ? 'bg-rose-100 text-rose-900 border-rose-300' :
                                                'bg-amber-100 text-amber-900 border-amber-300'
                                            }`}>
                                                {verificationStatusText.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-start justify-between py-1 border-b border-slate-100 gap-2">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Assigned Roles</span>
                                            <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                                                {(Array.isArray(user.role) ? user.role : [user.role]).map((r: any, i: number) => {
                                                    const roleVal = Number(r);
                                                    return (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] uppercase font-bold">
                                                            {getRoleDisplayName(roleVal as any)}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {(user as any).bv_group && (
                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">VOICE Group</span>
                                                <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px]">
                                                    {(user as any).bv_group}
                                                </span>
                                            </div>
                                        )}
                                        {user.hierarchy?.kcStatus && (
                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">KC Status</span>
                                                <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                                    {user.hierarchy.kcStatus}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Relative / Emergency Contacts */}
                                    {(user.relative1Name || user.relative2Name || user.relative3Name) && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                                            <p className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5 text-sky-600" />
                                                <span>Emergency / Relative Contacts</span>
                                            </p>
                                            <div className="space-y-1.5">
                                                {[1, 2, 3].map((num) => {
                                                    const name = (user as any)[`relative${num}Name`];
                                                    const rel = (user as any)[`relative${num}Relationship`];
                                                    const phone = (user as any)[`relative${num}Phone`];
                                                    if (!name && !rel && !phone) return null;
                                                    return (
                                                        <div key={num} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                                                            <div className="min-w-0">
                                                                <span className="font-black text-slate-800">{name || 'Contact'}</span>
                                                                {rel && <span className="text-slate-500 text-[10.5px] ml-1.5 font-bold">({rel})</span>}
                                                            </div>
                                                            {phone && (
                                                                <a href={`tel:${phone}`} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded border border-blue-200 text-[10.5px] font-bold transition-colors">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span>{phone}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Spiritual Hierarchy & Location */}
                                <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 shadow-2xs">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-purple-600" />
                                        <span>Spiritual Hierarchy</span>
                                    </h3>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Active Center</span>
                                            <span className="font-bold text-slate-800 text-right">{currentCenterName}</span>
                                        </div>
                                        {voiceConnection === 'alumni' && parentCenterName !== 'None' && (
                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-[10.5px] font-black text-purple-700 uppercase tracking-wider">Origin VOICE</span>
                                                <span className="font-black text-purple-800 text-right">{parentCenterName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Temple</span>
                                            <span className="font-bold text-slate-800 text-right">{currentTempleName}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Counselor</span>
                                            <span className="font-bold text-slate-800 text-right">
                                                {(() => {
                                                    const counselor = (user.hierarchy?.counselor as any)?.name || user.hierarchy?.counselor || user.hierarchy?.grihasthaCounselor || user.hierarchy?.brahmachariCounselor;
                                                    const other = user.hierarchy?.otherCounselor;
                                                    if (counselor === 'Other' || (!counselor && other)) {
                                                        return `Other: ${other}`;
                                                    }
                                                    return counselor || (other ? `Other: ${other}` : 'Not set');
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Ashram</span>
                                            <span className="font-bold text-slate-800 text-right">{user.hierarchy?.ashram || 'Not set'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Initiation</span>
                                            <span className="font-bold text-slate-800 text-right">{user.hierarchy?.initiationStatus || 'Not set'}</span>
                                        </div>
                                        {user.introducedToKcIn && (
                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">Introduced to KC</span>
                                                <span className="font-bold text-slate-800 text-right">
                                                    {(() => {
                                                        try {
                                                            const date = new Date(user.introducedToKcIn);
                                                            if (isNaN(date.getTime())) return user.introducedToKcIn;
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

                            {/* Health Information if present */}
                            {(user.healthChronicDisease || (user as any).health_chronic_disease) && (
                                <div className="bg-rose-50/70 p-3 sm:p-3.5 rounded-xl border border-rose-200">
                                    <h4 className="text-[11px] font-black text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <Activity className="h-3.5 w-3.5 text-rose-600" />
                                        <span>Health / Medical Information</span>
                                    </h4>
                                    <p className="text-xs text-rose-950 font-medium leading-relaxed whitespace-pre-wrap">
                                        {user.healthChronicDisease || (user as any).health_chronic_disease}
                                    </p>
                                </div>
                            )}

                            {/* 3. Education & Work Experience */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Education */}
                                <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 shadow-2xs">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-100 flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-indigo-600" />
                                        <span>Education</span>
                                    </h3>
                                    {user.education && user.education.length > 0 ? (
                                        <div className="space-y-2">
                                            {user.education.map((edu, i) => (
                                                <div key={i} className="py-1 border-b border-slate-100 last:border-0">
                                                    <p className="text-xs font-black text-slate-900">{edu.degreeBranch}</p>
                                                    <p className="text-[11px] font-bold text-slate-600">{edu.institution}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                        {edu.startYear ? edu.startYear : 'N/A'} - {edu.endYear ? edu.endYear : 'N/A'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-medium text-slate-400 italic py-1">No education details recorded.</p>
                                    )}
                                </div>

                                {/* Work Experience */}
                                <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 shadow-2xs">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-100 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-emerald-600" />
                                        <span>Work Experience</span>
                                    </h3>
                                    {user.workExperience && user.workExperience.length > 0 ? (
                                        <div className="space-y-2">
                                            {user.workExperience.map((work, i) => (
                                                <div key={i} className="py-1 border-b border-slate-100 last:border-0">
                                                    <p className="text-xs font-black text-slate-900">{work.position}</p>
                                                    <p className="text-[11px] font-bold text-slate-600">{work.company}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                        {work.startDate ? new Date(work.startDate).getFullYear() : 'N/A'} - {work.current ? 'Present' : (work.endDate ? new Date(work.endDate).getFullYear() : 'N/A')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-medium text-slate-400 italic py-1">No work experience recorded.</p>
                                    )}
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

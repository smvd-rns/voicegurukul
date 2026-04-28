'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    fetchSadhanaReportByDate,
    fetchSadhanaWeeklyTotals,
    submitSadhanaReportApi
} from '@/lib/api/sadhana-client';
import { Calendar, ChevronLeft, ChevronRight, Save, Loader2, CheckCircle2, AlertCircle, Sparkles, BookOpen, HeartPulse, Flower2, TrendingUp, Clock, BarChart3, Search, GraduationCap } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface SadhanaFormData {
    date: string;
    japa: number;
    hearing: number;
    reading: number;
    bookName: string;
    toBed: number;
    wakeUp: number;
    dailyFilling: number;
    daySleep: number;
    study: number;
}

const initialFormData: SadhanaFormData = {
    date: format(new Date(), 'yyyy-MM-dd'),
    japa: 0, hearing: 0, reading: 0, bookName: '',
    toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0,
    study: 0,
};

const SPIRITUAL_TILES = [
    { id: 'japa', label: 'Japa', icon: '📿', sub: 'rounds', ring: 'focus:ring-orange-400' },
    { id: 'hearing', label: 'Hearing', icon: '👂', sub: 'minutes', ring: 'focus:ring-amber-400' },
    { id: 'reading', label: 'Reading', icon: '📖', sub: 'minutes', ring: 'focus:ring-emerald-400' },
] as const;

const PHYSICAL_TILES = [
    { id: 'toBed', label: 'To Bed', icon: '🌙', sub: 'min', ring: 'focus:ring-indigo-400' },
    { id: 'wakeUp', label: 'Wake Up', icon: '☀️', sub: 'min', ring: 'focus:ring-sky-400' },
    { id: 'dailyFilling', label: 'Refilling', icon: '💧', sub: 'min', ring: 'focus:ring-blue-400' },
    { id: 'daySleep', label: 'Day Sleep', icon: '🛋️', sub: 'min', ring: 'focus:ring-violet-400' },
] as const;

export default function SadhanaPage() {
    const router = useRouter();
    const { userData } = useAuth();
    const [form, setForm] = useState<SadhanaFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [weeklyTotals, setWeeklyTotals] = useState<any>(null);
    const [reportUpdatedAt, setReportUpdatedAt] = useState<string>('');

    const loadData = useCallback(async () => {
        if (!userData?.id || !form.date) return;
        setLoading(true); setError('');
        try {
            const report = await fetchSadhanaReportByDate(form.date, userData.id);
            if (report) {
                setForm(p => ({
                    ...p,
                    japa: report.japa || 0,
                    hearing: report.hearing || 0,
                    reading: report.reading || 0,
                    bookName: (report as any).bookName || '',
                    toBed: report.toBed || 0,
                    wakeUp: report.wakeUp || 0,
                    dailyFilling: report.dailyFilling || 0,
                    daySleep: report.daySleep || 0,
                    study: (report as any).study || 0,
                }));
                // Check if updatedAt exists, fallback to submittedAt
                const updatedStr = report.updatedAt ? new Date(report.updatedAt).toLocaleString() : (report.submittedAt ? new Date(report.submittedAt).toLocaleString() : '');
                setReportUpdatedAt(updatedStr);
            } else {
                setForm(p => ({ ...initialFormData, date: p.date }));
                setReportUpdatedAt('');
            }

            const wTotals = await fetchSadhanaWeeklyTotals(form.date);
            setWeeklyTotals(wTotals);

        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [form.date, userData?.id]);

    useEffect(() => { loadData(); }, [loadData, refreshTrigger]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.id) return;
        setSaving(true); setError(''); setSuccess('');
        try {
            await submitSadhanaReportApi({ ...form, userId: userData.id } as any);
            setSuccess('Sadhana report saved successfully! 🌟');

            // Wait a moment for DB to strictly persist and calc triggers to finish
            await new Promise(r => setTimeout(r, 1500));

            // Force fetch latest fresh data and bust router cache
            await loadData();
            router.refresh();

            setRefreshTrigger(p => p + 1);
            setTimeout(() => setSuccess(''), 4000);
        } catch {
            setError('Failed to save. Please try again.');
        } finally { setSaving(false); }
    };

    const shiftDate = (days: number) =>
        setForm(p => ({ ...p, date: format(addDays(new Date(p.date), days), 'yyyy-MM-dd') }));

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isToday = form.date === todayStr;

    // Calculate Weekly Score percentages based on weeklyTotals
    let soulPercentStr = '0';
    let bodyPercentStr = '0';

    if (weeklyTotals) {
        const cappedSoulTotal = Math.min(70, weeklyTotals.japa || 0) + Math.min(70, weeklyTotals.hearing || 0) + Math.min(70, weeklyTotals.reading || 0);
        const soulRaw = (cappedSoulTotal / 210) * 100;
        soulPercentStr = Math.min(100, Math.max(0, soulRaw)).toFixed(1);

        const cappedBodyTotal = Math.min(70, weeklyTotals.toBed || 0) + Math.min(70, weeklyTotals.wakeUp || 0) + Math.min(70, weeklyTotals.dailyFilling || 0) + Math.min(70, weeklyTotals.daySleep || 0);
        const bodyRaw = (cappedBodyTotal / 280) * 100;
        bodyPercentStr = Math.min(100, Math.max(0, bodyRaw)).toFixed(1);
    }

    const currentWeekStart = startOfWeek(new Date(form.date), { weekStartsOn: 1 }); // Monday
    const currentWeekEnd = endOfWeek(new Date(form.date), { weekStartsOn: 1 }); // Sunday
    const weekDateRangeStr = `${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d, yyyy')}`;

    return (
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 pb-12 pt-4">
            {/* ── Tabs Navigation ── */}
            <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm max-w-fit">
                <button
                    onClick={() => router.push('/dashboard/sadhana')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-white text-orange-600 shadow-sm border border-orange-100"
                >
                    <BookOpen className="h-4 w-4" />
                    Daily Record
                </button>
                <button
                    onClick={() => router.push('/dashboard/sadhana/progress')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all text-gray-500 hover:text-gray-700 hover:bg-white/50"
                >
                    <BarChart3 className="h-4 w-4" />
                    My Progress
                </button>
            </div>

            {/* ── Header Section ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-orange-500" />
                        Daily Sadhana
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isToday ? "Record today's spiritual and physical practices" : `Report for ${format(new Date(form.date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}`}
                    </p>
                </div>

                {/* Date navigator */}
                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <button type="button" onClick={() => shiftDate(-1)}
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-gray-100">
                        <Calendar className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <input
                            type="date" value={form.date}
                            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                            className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-gray-700 cursor-pointer"
                        />
                    </div>
                    <button type="button" onClick={() => shiftDate(1)}
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600 hover:text-gray-900">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── Status Banners ── */}
            {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold animate-in slide-in-from-top-2 duration-300 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />{success}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold animate-in slide-in-from-top-2 duration-300 shadow-sm">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />{error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left Column: Form ── */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
                                <span className="text-sm font-medium text-gray-500">Loading your sadhana data...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* ── Spiritual Group ── */}
                                <section className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-rose-400"></div>

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
                                            <Flower2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Spiritual Practices</h2>
                                            <p className="text-sm text-gray-500 font-medium">Japa, hearing, and reading</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {SPIRITUAL_TILES.map(t => {
                                            const val = (form as any)[t.id] as number;
                                            const weeklyVal = Math.min(70, weeklyTotals?.[t.id] || 0);
                                            const progressPct = (weeklyVal / 70) * 100;
                                            return (
                                                <div key={t.id} className="flex flex-col">
                                                    <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-base">{t.icon}</span>
                                                            {t.label}
                                                        </span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            id={t.id}
                                                            value={val || ''}
                                                            onChange={e => setForm(p => ({ ...p, [t.id]: parseInt(e.target.value) || 0 }))}
                                                            className={`w-full py-3 px-4 pr-16 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 ${t.ring} focus:bg-white transition-all`}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                                                            {t.sub}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                                            <span className="text-gray-400">Week:</span>
                                                            <span className={weeklyVal >= 70 ? "text-emerald-500" : "text-gray-500"}>
                                                                {weeklyVal} / 70
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ease-out ${weeklyVal >= 70 ? 'bg-emerald-400' : 'bg-orange-300'}`}
                                                                style={{ width: `${progressPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="flex flex-col md:col-span-3 mt-2">
                                            <label htmlFor="bookName" className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                                                <span className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-emerald-500" />
                                                    Book Currently Reading
                                                </span>
                                            </label>
                                            <input
                                                id="bookName"
                                                type="text"
                                                placeholder="e.g., Bhagavad Gita As It Is"
                                                value={form.bookName}
                                                onChange={e => setForm(p => ({ ...p, bookName: e.target.value }))}
                                                className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
                                            />
                                        </div>

                                        <div className="flex flex-col md:col-span-3 mt-2">
                                            <label htmlFor="study" className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                                                <span className="flex items-center gap-2">
                                                    <GraduationCap className="h-4 w-4 text-orange-500" />
                                                    Education Study (Hours)
                                                </span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="study"
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    max="24"
                                                    placeholder="0"
                                                    value={form.study || ''}
                                                    onChange={e => setForm(p => ({ ...p, study: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all pr-12"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase tracking-widest">Hrs</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* ── Physical Group ── */}
                                <section className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-400"></div>

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                                            <HeartPulse className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Physical & Well-being</h2>
                                            <p className="text-sm text-gray-500 font-medium">Daily habits and routines</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                                        {PHYSICAL_TILES.map(t => {
                                            const val = (form as any)[t.id] as number;
                                            const weeklyVal = Math.min(70, weeklyTotals?.[t.id] || 0);
                                            const progressPct = (weeklyVal / 70) * 100;
                                            return (
                                                <div key={t.id} className="flex flex-col">
                                                    <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <span className="text-base flex-shrink-0">{t.icon}</span>
                                                            <span className="truncate">{t.label}</span>
                                                        </span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            id={t.id}
                                                            value={val || ''}
                                                            onChange={e => setForm(p => ({ ...p, [t.id]: parseInt(e.target.value) || 0 }))}
                                                            className={`w-full py-3 pl-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 ${t.ring} focus:bg-white transition-all`}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                                                            {t.sub}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                                            <span className="text-gray-400">Week:</span>
                                                            <span className={weeklyVal >= 70 ? "text-blue-500" : "text-gray-500"}>
                                                                {weeklyVal} / 70
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ease-out ${weeklyVal >= 70 ? 'bg-blue-400' : 'bg-sky-300'}`}
                                                                style={{ width: `${progressPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* ── Save Button ── */}
                                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        {reportUpdatedAt ? `Last updated: ${reportUpdatedAt}` : 'No report submitted for this date'}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3.5 px-8 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {saving ? 'Saving...' : 'Save Report'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* ── Right Column: Weekly Scoreboard ── */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Weekly Scoreboard</h2>
                                <p className="text-xs text-gray-500 font-medium">{weekDateRangeStr}</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
                            </div>
                        ) : !weeklyTotals ? (
                            <div className="text-sm text-gray-500 text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                No data available for this week yet.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Soul Percentage */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-bold text-gray-700">Soul Score (Spiritual)</span>
                                        <span className="text-xl font-black text-rose-500">{soulPercentStr}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-1000 ease-out rounded-full"
                                            style={{ width: `${soulPercentStr}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-semibold text-right">Target 210 units/week</p>
                                </div>

                                {/* Body Percentage */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-bold text-gray-700">Body Score (Physical)</span>
                                        <span className="text-xl font-black text-blue-500">{bodyPercentStr}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-1000 ease-out rounded-full"
                                            style={{ width: `${bodyPercentStr}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-semibold text-right">Target 280 units/week</p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                                        <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                                            Scores are calculated comprehensively from Monday to Sunday. Fill out your sadhana daily to maintain high scores! ✨
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

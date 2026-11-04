'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { getUserMessages } from '@/lib/supabase/messages';
import { SadhanaReport, Message } from '@/types';
import {
  BookOpen, TrendingUp, Calendar, Zap, ArrowRight, Heart,
  Sparkles, CheckCircle2, Flame, Tent, Clock, Info, X, ChevronRight,
  Share2, Award, Quote
} from 'lucide-react';
import { parseISO } from 'date-fns';
import Link from 'next/link';
import { getEventsForUser } from '@/lib/actions/events';
import { ManagedEvent } from '@/types';
import MembershipCard from './components/MembershipCard';
import { getDailySloka, DailySloka } from '@/lib/data/daily-slokas';
import {
  getNextEkadashi,
  getTodaysVaishnavaEvent,
  getUpcomingVaishnavaEvents,
  VaishnavaEvent,
  NextEkadashiInfo
} from '@/lib/data/vaishnava-calendar';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { userData } = useAuth();
  const [recentReports, setRecentReports] = useState<SadhanaReport[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome');
  const [events, setEvents] = useState<ManagedEvent[]>([]);

  // Spiritual Data
  const [dailySloka, setDailySloka] = useState<DailySloka | null>(null);
  const [nextEkadashi, setNextEkadashi] = useState<NextEkadashiInfo | null>(null);
  const [todaysEvent, setTodaysEvent] = useState<VaishnavaEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<VaishnavaEvent[]>([]);
  const [selectedEventModal, setSelectedEventModal] = useState<VaishnavaEvent | null>(null);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    setDailySloka(getDailySloka(now));
    setNextEkadashi(getNextEkadashi(now));
    setTodaysEvent(getTodaysVaishnavaEvent(now));
    setUpcomingEvents(getUpcomingVaishnavaEvents(4, now));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (userData) {
        setLoading(true);
        const [reports, messages, fetchedEvents] = await Promise.all([
          fetchSadhanaHistory(30),
          getUserMessages(userData.id, 10),
          getEventsForUser({
            userId: userData.id,
            ashram: userData.hierarchy?.ashram,
            role: String(Array.isArray(userData.role) ? userData.role[0] : userData.role),
            temple: userData.hierarchy?.temple || userData.currentTemple,
            center: userData.hierarchy?.center || userData.currentCenter,
            voiceGroup: userData.bv_group,
            completedCamps: Object.entries(userData)
              .filter(([key, val]) => key.startsWith('camp') && val === true)
              .map(([key]) => key),
            allLocations: [
              userData.hierarchy?.center,
              userData.hierarchy?.currentCenter,
              userData.hierarchy?.parentCenter,
              userData.hierarchy?.temple,
              userData.hierarchy?.currentTemple,
              userData.hierarchy?.parentTemple,
              userData.currentCenter,
              userData.parentCenter,
              userData.currentTemple,
              userData.parentTemple
            ].filter(Boolean) as string[],
          })
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeEvents = (fetchedEvents as any[]).filter((event: any) => {
          const dateToUse = event.eventDate || event.createdAt;
          if (!dateToUse) return false;
          const eventDate = new Date(dateToUse);
          return eventDate >= today;
        });

        setRecentReports(reports);
        setUnreadMessages((messages as any[]).filter((m: any) => !m.readBy?.includes(userData.id)));
        setEvents(activeEvents);
        setLoading(false);
      }
    };
    loadData();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReport = recentReports.find(r => {
    const reportDate = typeof r.date === 'string' ? r.date.split('T')[0] : (r.date as Date).toISOString().split('T')[0];
    return reportDate === todayStr;
  });

  // Calculate Streak
  let streak = 0;
  if (recentReports.length > 0) {
    const sorted = [...recentReports].sort((a, b) => {
      const da = typeof a.date === 'string' ? a.date.split('T')[0] : (a.date as Date).toISOString().split('T')[0];
      const db = typeof b.date === 'string' ? b.date.split('T')[0] : (b.date as Date).toISOString().split('T')[0];
      return db.localeCompare(da);
    });
    let currentCheckDate = new Date();
    const firstDateStr = typeof sorted[0].date === 'string' ? sorted[0].date.split('T')[0] : (sorted[0].date as Date).toISOString().split('T')[0];
    if (firstDateStr !== todayStr) {
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    }

    for (const report of sorted) {
      const reportDateStr = typeof report.date === 'string' ? report.date.split('T')[0] : (report.date as Date).toISOString().split('T')[0];
      const checkDateStr = currentCheckDate.toISOString().split('T')[0];

      if (reportDateStr === checkDateStr) {
        streak++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const handleCopySloka = () => {
    if (!dailySloka) return;
    const text = `📖 *${dailySloka.reference}*\n\n"${dailySloka.sanskrit}"\n\n_${dailySloka.translation}_\n\n✨ *Reflection:* ${dailySloka.reflection}\n\nShared via VOICE Gurukul`;
    navigator.clipboard.writeText(text);
    toast.success('Sloka copied to clipboard! Share with devotees.');
  };

  return (
    <div className="relative overflow-hidden px-2 sm:px-4 py-2 space-y-4 max-w-6xl mx-auto">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full t-blob-a blur-[90px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full t-blob-b blur-[90px]" />
      </div>

      {/* Hero Welcome Card */}
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/90 p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Hare Krishna</span>
              {todaysEvent && (
                <span className="ml-1 pl-1 border-l border-amber-300 font-extrabold text-orange-700">
                  • {todaysEvent.name}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {greeting}, <span className="text-amber-700">{userData?.name?.split(' ')[0] || 'Devotee'}</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              Welcome to your daily spiritual sanctuary. May your chanting and service bring you closer to Krishna today.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 shadow-2xs shrink-0 min-w-[100px]">
            <div className="text-2xl font-black text-amber-800 leading-none">{new Date().getDate()}</div>
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">{new Date().toLocaleString('default', { month: 'short' })}</div>
            <div className="text-[10px] font-semibold text-slate-400">{new Date().getFullYear()}</div>
          </div>
        </div>
      </div>

      {/* Next Ekadashi & Festival Alert Banner (Lively Spiritual Highlight) */}
      {nextEkadashi && (
        <div
          onClick={() => setSelectedEventModal(nextEkadashi.event)}
          className="group relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-4 sm:p-4.5 text-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none group-hover:scale-125 transition-transform" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs flex-shrink-0">
                <Sparkles className="w-5 h-5 text-amber-200 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                    Next Ekadashi
                  </span>
                  <span className="text-xs font-bold text-amber-200">
                    {nextEkadashi.label} ({new Date(nextEkadashi.event.date).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 group-hover:text-amber-100 transition-colors">
                  {nextEkadashi.event.name}
                </h3>
                <p className="text-xs text-amber-100/90 font-medium line-clamp-1">
                  {nextEkadashi.event.fasting || 'Fasting from grains & beans'} • {nextEkadashi.event.significance}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs font-bold bg-white/15 group-hover:bg-white/25 px-3 py-1.5 rounded-xl border border-white/20 transition-all shrink-0">
              <span>View Story & Rules</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {/* Compact 2x2 Mobile / 4-Col Desktop Stats Grid (Replaces the empty stacked cards!) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Today's Sadhana */}
        <Link
          href="/dashboard/sadhana"
          className="group bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-xl text-white shadow-xs ${
              todayReport ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'
            }`}>
              {todayReport ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              todayReport ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {todayReport ? 'Submitted' : 'Pending'}
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {todayReport ? (
                <span>Soul {todayReport.soulPercent?.toFixed(0) || 100}%</span>
              ) : (
                <span>Today&apos;s Sadhana</span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              {todayReport ? 'Practices recorded' : 'Record rounds & reading'}
            </p>
          </div>
        </Link>

        {/* Card 2: Sadhana Streak (with Animated Flame) */}
        <Link
          href="/dashboard/sadhana/progress"
          className="group bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-orange-400 transition-all relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-xs">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
              Streak
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              {streak > 0 ? 'Daily devotion active' : 'Start your streak today'}
            </p>
          </div>
        </Link>

        {/* Card 3: Communications / Notices */}
        <Link
          href="/dashboard/events"
          className="group bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            {events.filter(e => !e.userResponse).length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {events.filter(e => !e.userResponse).length} New
              </span>
            )}
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {events.length} Gatherings
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              Community broadcasts
            </p>
          </div>
        </Link>

        {/* Card 4: Upcoming Camps */}
        <Link
          href="/dashboard/camp"
          className="group bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
              <Tent className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Retreats
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Youth Camps
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              View & register
            </p>
          </div>
        </Link>
      </div>

      {/* Daily Bhagavad Gita Sloka Card (Transcendental Daily Inspiration) */}
      {dailySloka && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-50 rounded-2xl p-4 sm:p-6 border border-amber-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Sloka of the Day
                </span>
                <span className="text-xs font-extrabold text-amber-700 ml-2">
                  • {dailySloka.reference}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopySloka}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-amber-900 text-xs font-bold border border-amber-200 transition shadow-2xs cursor-pointer"
              title="Copy Sloka to share on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="font-serif italic text-sm sm:text-base font-bold text-amber-950 leading-relaxed">
              &quot;{dailySloka.sanskrit}&quot;
            </p>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {dailySloka.translation}
            </p>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200/60 text-xs text-amber-900 font-medium leading-relaxed">
              <strong className="font-bold text-amber-950">Daily Reflection:</strong> {dailySloka.reflection}
            </div>
          </div>
        </div>
      )}

      {/* Middle Grid: Upcoming Vaishnava Festivals & Recent Sadhana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left Column (2 Cols): Recent Sadhana History */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">Recent Sadhana Activity</h2>
            </div>
            <Link
              href="/dashboard/sadhana/progress"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {recentReports.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentReports.slice(0, 5).map((report, idx) => {
                const soul = report.soulPercent || 0;
                const body = report.bodyPercent || 0;
                const date = typeof report.date === 'string' ? parseISO(report.date) : report.date;

                return (
                  <div key={idx} className="py-2.5 sm:py-3 hover:bg-slate-50/60 transition rounded-xl px-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {date.getDate()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {date.toLocaleString('default', { weekday: 'short' })}, {date.toLocaleString('default', { month: 'short' })}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">{date.getFullYear()}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Day {30 - idx}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                          <span>Soul</span>
                          <span className={soul >= 80 ? 'text-emerald-600 font-extrabold' : 'text-slate-600'}>{soul.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${soul >= 80 ? 'bg-gradient-to-r from-orange-400 to-rose-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                            style={{ width: `${soul}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                          <span>Body</span>
                          <span className={body >= 80 ? 'text-teal-600 font-extrabold' : 'text-slate-600'}>{body.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${body >= 80 ? 'bg-gradient-to-r from-teal-400 to-emerald-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                            style={{ width: `${body}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Start Your Sadhana Journey</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-3">Record your daily rounds, reading, and hearing to watch your devotional practice bloom.</p>
              <Link
                href="/dashboard/sadhana"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black shadow-xs hover:shadow-md transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Submit Today&apos;s Sadhana</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Upcoming Vaishnava Festivals & Membership */}
        <div className="space-y-4">
          <MembershipCard />

          {/* Upcoming Festivals Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                Upcoming Auspicious Days
              </h2>
            </div>

            <div className="space-y-2.5">
              {upcomingEvents.map((evt, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedEventModal(evt)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-100 hover:border-amber-200 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 group-hover:text-amber-900 transition-colors">
                      {evt.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {new Date(evt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {evt.significance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vaishnava Event Detail Modal */}
      {selectedEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedEventModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {selectedEventModal.type.toUpperCase()}
                  </span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">
                    {selectedEventModal.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <div>
                  <span className="font-bold text-amber-900 block">Date</span>
                  <span className="text-slate-700">{new Date(selectedEventModal.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {selectedEventModal.fasting && (
                  <div className="text-right">
                    <span className="font-bold text-orange-900 block">Fasting Rule</span>
                    <span className="font-semibold text-orange-700">{selectedEventModal.fasting}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Significance</h4>
                <p className="text-xs font-semibold text-slate-800">{selectedEventModal.significance}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Story & Pastime</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedEventModal.description}</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedEventModal(null)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition"
                >
                  Hare Krishna • Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

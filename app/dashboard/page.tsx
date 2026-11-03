'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { getUserMessages } from '@/lib/supabase/messages';
import { SadhanaReport, Message } from '@/types';
import { BookOpen, TrendingUp, Calendar, Zap, ArrowRight, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import Link from 'next/link';
import { getEventsForUser } from '@/lib/actions/events';
import { ManagedEvent } from '@/types';
import MembershipCard from './components/MembershipCard';

const QUOTES = [
  "Chanting the holy name is the primary spiritual practice for this age.",
  "Always remember Krishna and never forget Him.",
  "Tolerance and humility are the ornaments of a devotee.",
  "Patience and enthusiasm are key to spiritual success.",
  "Service to the devotees is the highest of all services."
];

export default function DashboardPage() {
  const { userData } = useAuth();
  const [recentReports, setRecentReports] = useState<SadhanaReport[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [greeting, setGreeting] = useState('Welcome');
  const [events, setEvents] = useState<ManagedEvent[]>([]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
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

        const upcomingEvents = (fetchedEvents as any[]).filter((event: any) => {
          const dateToUse = event.eventDate || event.createdAt;
          if (!dateToUse) return false;
          const eventDate = new Date(dateToUse);
          return eventDate >= today;
        });

        setRecentReports(reports);
        setUnreadMessages((messages as any[]).filter((m: any) => !m.readBy.includes(userData.id)));
        setEvents(upcomingEvents);
        setLoading(false);
      }
    };
    loadData();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div>
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

  const stats = [
    {
      name: "Today's Sadhana",
      value: todayReport ? 'Completed' : 'Pending',
      icon: todayReport ? CheckCircle2 : BookOpen,
      gradient: todayReport ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600',
      href: '/dashboard/sadhana',
      subtext: todayReport ? 'Report Submitted' : 'Submit today',
    },
    {
      name: 'Sadhana Streak',
      value: `${streak} Days`,
      icon: Zap,
      gradient: 'from-purple-500 to-pink-600',
      href: '/dashboard/sadhana/progress',
      subtext: streak > 0 ? 'Active Practice' : 'Start streak today',
    },
    {
      name: 'Communications',
      value: events.length.toString(),
      icon: Calendar,
      gradient: 'from-blue-500 to-indigo-600',
      href: '/dashboard/events',
      subtext: events.length > 0 ? `${events.filter(e => !e.userResponse).length} New Announcements` : 'Up to date',
    },
  ];

  return (
    <div className="relative overflow-hidden px-1 sm:px-2 md:px-3">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full t-blob-a blur-[90px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full t-blob-b blur-[90px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4 lg:space-y-4.5 relative z-10">

        {/* Hero Section (Compact for 13/14-inch screens) */}
        <div className="relative bg-white/85 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-4 lg:p-5 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-28 h-28 sm:w-48 sm:h-48 rounded-full t-blob-a blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-20 h-20 sm:w-36 sm:h-36 rounded-full t-blob-b blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full t-bg-badge t-text-badge text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 shadow-2xs border t-border">
                <Sparkles className="w-3 h-3 t-text-accent" />
                <span>Hare Krishna</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                {greeting}, <span className="t-text-accent">{userData?.name?.split(' ')[0] || 'Devotee'}</span>
              </h1>
              <div className="flex items-start gap-2 mt-1.5 sm:mt-2">
                <div className="mt-1 w-0.5 sm:w-1 h-4 sm:h-5 t-bg-primary rounded-full shrink-0 opacity-70" />
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl italic font-medium leading-snug truncate sm:whitespace-normal">
                  &quot;{quote}&quot;
                </p>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center min-w-[85px] lg:min-w-[95px] p-2.5 sm:p-3 t-bg-light rounded-xl border t-border shadow-2xs shrink-0">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-black t-text-accent leading-none">{new Date().getDate()}</div>
                <div className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{new Date().toLocaleString('default', { month: 'short' })}</div>
                <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{new Date().getFullYear()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid (3 Balanced Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-3.5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="group relative overflow-hidden bg-white/80 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-3.5 lg:p-4 shadow-2xs border border-slate-200/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-amber-400"
              >
                <div className="absolute top-0 left-0 w-1 h-full t-gradient" />
                <div className="flex justify-between items-start mb-2 sm:mb-2.5">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl t-gradient text-white shadow-2xs group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="p-1 bg-slate-100 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 group-hover:bg-slate-200 group-hover:text-slate-700 transition-all transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-800 tracking-tight leading-tight">{stat.value}</h3>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-500 mt-0.5">{stat.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 font-semibold bg-slate-100/80 border border-slate-200/60 inline-block px-1.5 py-0.5 rounded-md">{stat.subtext}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Activity & Quick Actions Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-4.5 items-start">
          
          {/* Left/Main Column: Recent Sadhana Feed (Takes up 2 columns on large screens) */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden flex flex-col">
            <div className="p-3 sm:p-3.5 lg:p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-1.5 sm:p-2 t-bg-light rounded-lg border t-border shadow-2xs">
                  <TrendingUp className="w-4 h-4 t-text-accent" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">Recent Sadhana</h2>
              </div>
              <Link href="/dashboard/sadhana/progress" className="text-xs font-bold t-text-accent hover:opacity-80 flex items-center gap-1 group transition-opacity">
                <span>View All</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] lg:max-h-[420px] scrollbar-thin">
              {recentReports.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentReports.slice(0, 7).map((report, idx) => {
                    const soul = report.soulPercent || 0;
                    const body = report.bodyPercent || 0;
                    const date = typeof report.date === 'string' ? parseISO(report.date) : report.date;
                    
                    return (
                      <div key={idx} className="p-2.5 sm:p-3 hover:bg-slate-50/80 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200 shadow-2xs group-hover:t-border group-hover:t-bg-light group-hover:t-text-accent transition-all shrink-0">
                              {date.getDate()}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">{date.toLocaleString('default', { weekday: 'short' })}, {date.toLocaleString('default', { month: 'short' })}</p>
                              <p className="text-[10px] font-semibold text-slate-400">{date.getFullYear()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full t-bg-badge t-text-badge text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider border t-border">
                             <Sparkles className="w-2.5 h-2.5 t-text-accent" />
                             Day {30 - idx}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                              <span>Soul</span>
                              <span className={soul >= 80 ? 'text-emerald-600' : 'text-slate-600'}>{soul.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div className={`h-full rounded-full transition-all duration-700 ${soul >= 80 ? 'bg-gradient-to-r from-orange-400 to-rose-500' : soul >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`} style={{ width: `${soul}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                              <span>Body</span>
                              <span className={body >= 80 ? 'text-emerald-600' : 'text-slate-600'}>{body.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div className={`h-full rounded-full transition-all duration-700 ${body >= 80 ? 'bg-gradient-to-r from-teal-400 to-emerald-500' : body >= 50 ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`} style={{ width: `${body}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-14 h-14 t-bg-light rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border t-border">
                     <BookOpen className="w-7 h-7 t-text-accent" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Your Path Starts Here</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium leading-relaxed">View your progress and streak on the Progress page.</p>
                  <Link href="/dashboard/sadhana/progress" className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl t-gradient t-text-on-bg text-xs font-bold hover:shadow-md hover:opacity-95 transition-all">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Progress</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right/Sidebar Column: Membership & Quick Actions */}
          <div className="flex flex-col gap-3.5 sm:gap-4 lg:col-span-1">
            <MembershipCard />
            
            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl sm:rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden relative flex flex-col">
              <div className="absolute top-0 right-0 w-48 h-48 t-blob-a rounded-full blur-3xl opacity-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-36 h-36 t-blob-b rounded-full blur-2xl opacity-20 pointer-events-none" />

              <div className="p-3.5 sm:p-4 border-b border-white/10 relative z-10">
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 fill-current" />
                  <span>Quick Actions</span>
                </h2>
              </div>

              <div className="p-3.5 sm:p-4 flex-1 flex flex-col gap-2.5 sm:gap-3 relative z-10">
                <Link href="/dashboard/sadhana" className="group flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all">
                  <div className="w-10 h-10 rounded-xl t-gradient flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight group-hover:text-amber-200 transition-colors truncate">Submit Sadhana</h3>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Record today&apos;s practices</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/15 transition-colors shrink-0">
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white" />
                  </div>
                </Link>

                <Link href="/dashboard/events" className="group flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all">
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                    {events.filter(e => !e.userResponse).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black border-2 border-slate-900">
                        {events.filter(e => !e.userResponse).length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight group-hover:text-blue-300 transition-colors truncate">Communications</h3>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Community Gatherings</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/15 transition-colors shrink-0">
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-300" />
                  </div>
                </Link>

                <div className="mt-1 pt-2 border-t border-white/5">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/5 relative overflow-hidden group">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Heart className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Inspiration</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 italic leading-snug">
                      &quot;Service to the devotees is the highest of all services.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';
import { Tent, Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';

export const dynamic = 'force-dynamic';

export default async function CampsDirectoryPage() {
  const res = await query(
    "SELECT * FROM camps WHERE status NOT IN ('archived', 'draft') ORDER BY created_at DESC"
  );
  const allCamps = res.rows;
  const activeCamps = allCamps.filter((c: any) => c.status === 'active');

  // If exactly one active camp, redirect directly to its registration portal
  if (activeCamps.length === 1) {
    redirect(`/camps/${activeCamps[0].slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafcff] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      <PublicNavbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-amber-200/90 shadow-sm text-amber-900 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>VOICE Retreats &amp; Youth Gurukul</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Spiritual Camps &amp; Retreats
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Select an active camp to view dates, dynamic meal &amp; stay schedules, and register devotees.
            </p>
          </div>

          {allCamps.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/90 text-center shadow-sm">
              <Tent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Camps Available Currently</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please check back soon or contact your central VOICE coordinator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {allCamps.map((camp: any) => {
                const startStr = new Date(camp.start_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const endStr = new Date(camp.end_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const isActive = camp.status === 'active';

                return (
                  <div
                    key={camp.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all"
                  >
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isActive ? 'Registration Open' : 'Concluded / Past Camp'}
                      </span>
                      <h2 className="text-xl font-black text-slate-900 mb-2">
                        {camp.title}
                      </h2>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                        {camp.description || 'Spiritual Camp & Devotee Retreat'}
                      </p>

                      <div className="space-y-1.5 text-xs text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>{startStr} &mdash; {endStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{camp.venue || 'Central VOICE, Pune'}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/camps/${camp.slug}`}
                      className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-orange-500/20"
                    >
                      <span>{isActive ? 'Register Devotees' : 'View Details & Passes'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

'use client';

import { HeartCrack, Quote } from 'lucide-react';
import { DE_ADDICTION_DATA } from './activityData';
import DeAddictionGraph from './DeAddictionGraph';
import ActivityPhotoGallery3D from './ActivityPhotoGallery3D';

export default function DeAddictionSection() {
  return (
    <section id="de-addiction" className="space-y-6 scroll-mt-28">
      {/* Top Card with PM Modi Quote & NCRB Fact */}
      <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-rose-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs font-mono font-black tracking-widest text-rose-400 uppercase">
              03 // NATIONAL EMERGENCY
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              Vice &amp; Drug Abuse Prevention
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display">
            De-Addiction Workshops &amp; Campus Campaigns
          </h2>

          <div className="relative p-5 sm:p-7 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md space-y-3.5">
            <Quote className="w-7 h-7 text-rose-400/60" />
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light italic">
              &ldquo;{DE_ADDICTION_DATA.quote}&rdquo;
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/10 text-xs sm:text-sm text-rose-300 font-semibold">
              <span className="flex items-center gap-2">
                <HeartCrack className="w-4 h-4 text-rose-400 shrink-0" />
                {DE_ADDICTION_DATA.statCallout}
              </span>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs border border-rose-400/30 shrink-0">
                14th Dec 2014 &ldquo;Mann Ki Baat&rdquo; Address
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Interactive NCRB Graph */}
      <DeAddictionGraph />

      {/* 5 Captured Workshop Moments Photo Slider */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-rose-200/60 shadow-lg space-y-3">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            On-Ground Awareness Rallies &amp; Seminars
          </h3>
        </div>

        <ActivityPhotoGallery3D photos={DE_ADDICTION_DATA.photos} reverse={false} />
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import ProgrammesVideoIntro from '@/components/activities/ProgrammesVideoIntro';
import ActivityHero from '@/components/activities/ActivityHero';
import ActivityQuickNav from '@/components/activities/ActivityQuickNav';
import ActivitySectionCard from '@/components/activities/ActivitySectionCard';
import DeAddictionSection from '@/components/activities/DeAddictionSection';
import CorporateSection from '@/components/activities/CorporateSection';
import { ACTIVITIES_DATA } from '@/components/activities/activityData';

export default function ActivitiesPage() {
  const valueBasedSeminars = ACTIVITIES_DATA.find((a) => a.id === 'value-based-seminars')!;
  const softwareTraining = ACTIVITIES_DATA.find((a) => a.id === 'software-training')!;
  const teachersProgram = ACTIVITIES_DATA.find((a) => a.id === 'teachers-program')!;
  const festivals = ACTIVITIES_DATA.find((a) => a.id === 'festivals')!;
  const musicAndArt = ACTIVITIES_DATA.find((a) => a.id === 'music-and-art')!;
  const publicPresentation = ACTIVITIES_DATA.find((a) => a.id === 'public-presentation')!;

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdff] text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <PublicNavbar />

      <main className="flex-1">
        {/* Featured Video Showcase Before Card Sections */}
        <ProgrammesVideoIntro />

        {/* Restored Hero Section with Full Brochure Content */}
        <ActivityHero />

        {/* Sticky Horizontal Quick Jump Nav */}
        <ActivityQuickNav />

        {/* Clean Activity Sections with Horizontal Image Sliders (No tilt, No next-up buttons) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-12 sm:space-y-14">
          {/* 1. Value Based Seminars (Moves Left) */}
          {valueBasedSeminars && (
            <ActivitySectionCard
              activity={valueBasedSeminars}
              index={0}
              reverse={false}
            />
          )}

          {/* 2. Software Training Workshop (Moves Right) */}
          {softwareTraining && (
            <ActivitySectionCard
              activity={softwareTraining}
              index={1}
              reverse={true}
            />
          )}

          {/* 3. De-Addiction Workshops & Live NCRB Graph (Moves Left) */}
          <DeAddictionSection />

          {/* 4. Corporate Activities, Counters & Logo Slider */}
          <div id="corporate" className="scroll-mt-28">
            <CorporateSection />
          </div>

          {/* 5. Teachers Program (Moves Right) */}
          {teachersProgram && (
            <ActivitySectionCard
              activity={teachersProgram}
              index={2}
              reverse={true}
            />
          )}

          {/* 6. Cultural Festivals (Moves Left) */}
          {festivals && (
            <ActivitySectionCard
              activity={festivals}
              index={3}
              reverse={false}
            />
          )}

          {/* 7. Music and Art (Moves Right) */}
          {musicAndArt && (
            <ActivitySectionCard
              activity={musicAndArt}
              index={4}
              reverse={true}
            />
          )}

          {/* 8. Public Presentation & Group Discussion (Moves Left) */}
          {publicPresentation && (
            <ActivitySectionCard
              activity={publicPresentation}
              index={5}
              reverse={false}
            />
          )}
        </div>

        {/* Bottom Sponsorship & Donation Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 fill-amber-400" />
                <span>80G Tax-Exempt Impact</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black font-display text-white">
                Sponsor a Student&apos;s Value Education &amp; Meals
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Empower youth through subsidised seminar literature, holistic counselling, study facilities, and sanctified meals across India.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Link
                href="/donate/2026GUW00001?amount=1500"
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold hover:scale-105 transition-all text-center"
              >
                ₹1,500 <span className="text-[10px] text-slate-400 block font-normal">Meals (30 Days)</span>
              </Link>
              <Link
                href="/donate/2026GUW00001?amount=5000"
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold hover:scale-105 transition-all text-center"
              >
                ₹5,000 <span className="text-[10px] text-slate-400 block font-normal">Semester Kit</span>
              </Link>
              <Link
                href="/donate/2026GUW00001?amount=15000"
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold hover:scale-105 transition-all text-center"
              >
                ₹15,000 <span className="text-[10px] text-slate-400 block font-normal">Full Residency</span>
              </Link>
              <Link
                href="/donate/2026GUW00001"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl hover:scale-105 transition-all flex items-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 fill-slate-950" />
                <span>Sponsor a Student</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}

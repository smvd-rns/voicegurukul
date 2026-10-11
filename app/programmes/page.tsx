'use client';

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
          {/* 1. Value Based Seminars */}
          {valueBasedSeminars && (
            <ActivitySectionCard
              activity={valueBasedSeminars}
              index={0}
            />
          )}

          {/* 2. Software Training Workshop */}
          {softwareTraining && (
            <ActivitySectionCard
              activity={softwareTraining}
              index={1}
            />
          )}

          {/* 3. De-Addiction Workshops & Live NCRB Graph */}
          <DeAddictionSection />

          {/* 4. Corporate Activities, Counters & Logo Slider */}
          <div id="corporate" className="scroll-mt-28">
            <CorporateSection />
          </div>

          {/* 5. Teachers Program */}
          {teachersProgram && (
            <ActivitySectionCard
              activity={teachersProgram}
              index={2}
            />
          )}

          {/* 6. Cultural Festivals */}
          {festivals && (
            <ActivitySectionCard
              activity={festivals}
              index={3}
            />
          )}

          {/* 7. Music and Art */}
          {musicAndArt && (
            <ActivitySectionCard
              activity={musicAndArt}
              index={4}
            />
          )}

          {/* 8. Public Presentation & Group Discussion */}
          {publicPresentation && (
            <ActivitySectionCard
              activity={publicPresentation}
              index={5}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}

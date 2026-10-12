'use client';

import { ActivitySectionItem } from './activityData';
import ActivityPhotoGallery3D from './ActivityPhotoGallery3D';

interface ActivitySectionCardProps {
  activity: ActivitySectionItem;
  index: number;
  reverse?: boolean;
}

const SECTION_THEMES = [
  // 0: Value Based Seminars - Amber
  {
    gradient: 'from-amber-500/5 via-yellow-500/5 to-transparent',
    border: 'border-amber-200/80',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
  },
  // 1: Software Training - Cyan / Sky
  {
    gradient: 'from-sky-500/5 via-indigo-500/5 to-transparent',
    border: 'border-sky-200/80',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-300',
  },
  // 2: Teachers Program - Emerald
  {
    gradient: 'from-emerald-500/5 via-teal-500/5 to-transparent',
    border: 'border-emerald-200/80',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
  },
  // 3: Festivals - Saffron / Rose
  {
    gradient: 'from-rose-500/5 via-orange-500/5 to-transparent',
    border: 'border-rose-200/80',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
  },
  // 4: Music and Art - Violet
  {
    gradient: 'from-purple-500/5 via-indigo-500/5 to-transparent',
    border: 'border-purple-200/80',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
  },
  // 5: Public Presentation - Blue
  {
    gradient: 'from-blue-500/5 via-cyan-500/5 to-transparent',
    border: 'border-blue-200/80',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
  },
];

export default function ActivitySectionCard({
  activity,
  index,
  reverse,
}: ActivitySectionCardProps) {
  const theme = SECTION_THEMES[index % SECTION_THEMES.length];
  const sectionNum = String(index + 1).padStart(2, '0');
  const isReverse = reverse !== undefined ? reverse : index % 2 !== 0;

  return (
    <section
      id={activity.id}
      className={`scroll-mt-28 relative rounded-3xl p-5 sm:p-8 lg:p-10 bg-white border ${theme.border} shadow-xl shadow-slate-900/5 overflow-hidden transition-all space-y-5 sm:space-y-6`}
    >
      {/* Background soft tint */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} pointer-events-none opacity-50`}
      />

      <div className="relative z-10 space-y-5">
        {/* Clean Header: No overflowing text on mobile */}
        <div className="space-y-2 pb-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs font-mono font-black tracking-widest text-slate-400 uppercase">
              {sectionNum} / {activity.category}
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span
              className={`px-3 py-1 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} text-[10px] sm:text-[11px] font-black uppercase tracking-wider whitespace-nowrap shadow-2xs`}
            >
              {activity.badge}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display">
            {activity.title}
          </h2>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl font-light">
            {activity.summary}
          </p>
        </div>

        {/* Auto-Rotating Image Slider (Alternating direction) */}
        <ActivityPhotoGallery3D
          photos={activity.photos}
          reverse={isReverse}
        />
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { Building2, Users, Presentation, Award } from 'lucide-react';
import { CORPORATE_DATA, ActivityPhoto } from './activityData';
import DriveImage from './DriveImage';
import PhotoLightboxModal from './PhotoLightboxModal';

export default function CorporateSection() {
  const [selectedPhoto, setSelectedPhoto] = useState<ActivityPhoto | null>(null);

  // Repeat logos 3x for seamless infinite marquee
  const tripleLogos = [...CORPORATE_DATA.logos, ...CORPORATE_DATA.logos, ...CORPORATE_DATA.logos];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden border border-indigo-900/60">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="max-w-3xl space-y-2 sm:space-y-3 relative z-10 mb-5 sm:mb-10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[11px] sm:text-xs font-mono font-black tracking-widest text-indigo-400 uppercase">
            04 // CORPORATE SPHERE
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            Executive Well-Being
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display leading-tight">
          Corporate Activities &amp; Mindful Leadership
        </h2>
        <p className="text-xs sm:text-base text-slate-300 leading-relaxed font-light">
          Bringing calmness, values, and mental clarity to high-pressure corporate work cultures through executive retreats and wellness seminars.
        </p>
      </div>

      {/* Counters Grid: Compact 3-Column on Mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 relative z-10 mb-6 sm:mb-10">
        <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-6 border border-white/10 hover:border-indigo-400/40 transition-all hover:-translate-y-1 group flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 mb-1.5 sm:mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-lg sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display">
            10,000+
          </div>
          <div className="text-[9px] sm:text-xs font-semibold text-indigo-300 mt-0.5 sm:mt-1 uppercase tracking-tight sm:tracking-wide leading-tight">
            Individuals Touched
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-6 border border-white/10 hover:border-amber-400/40 transition-all hover:-translate-y-1 group flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 mb-1.5 sm:mb-4 group-hover:scale-110 transition-transform">
            <Presentation className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-lg sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display">
            500+
          </div>
          <div className="text-[9px] sm:text-xs font-semibold text-amber-300 mt-0.5 sm:mt-1 uppercase tracking-tight sm:tracking-wide leading-tight">
            Sessions Conducted
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-6 border border-white/10 hover:border-emerald-400/40 transition-all hover:-translate-y-1 group flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-1.5 sm:mb-4 group-hover:scale-110 transition-transform">
            <Building2 className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-lg sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display">
            50+
          </div>
          <div className="text-[9px] sm:text-xs font-semibold text-emerald-300 mt-0.5 sm:mt-1 uppercase tracking-tight sm:tracking-wide leading-tight">
            Companies Benefitted
          </div>
        </div>
      </div>

      {/* Main Corporate Workshop Photo Frame */}
      <div className="relative z-10 mb-6 sm:mb-10">
        <div className="bg-white/5 rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 border border-white/10 hover:border-indigo-400/50 transition-all group">
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] max-h-[360px]">
            <DriveImage
              driveId={CORPORATE_DATA.mainPhoto.driveId}
              alt={CORPORATE_DATA.mainPhoto.title}
              size={1200}
              className="w-full h-full"
              onClick={() => setSelectedPhoto(CORPORATE_DATA.mainPhoto)}
            />
          </div>
        </div>
      </div>

      {/* Continuous Marquee Slider of Corporate Logos */}
      <div className="relative z-10 pt-1 pb-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-indigo-300 uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            <span>Trusted Corporate Partners</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
            50+ Partner Organizations
          </span>
        </div>

        <div className="relative overflow-hidden w-full rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10 p-2 sm:p-5">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-24 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-24 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-10" />

          <div className="flex items-center gap-3 sm:gap-8 w-max animate-corporate-scroll hover:[animation-play-state:paused] active:[animation-play-state:paused]">
            {tripleLogos.map((logoId, index) => (
              <div
                key={`${logoId}-${index}`}
                onClick={() =>
                  setSelectedPhoto({
                    driveId: logoId,
                    title: `Corporate Partner Logo #${(index % 12) + 1}`,
                    caption: 'Corporate partner organization where VOICE conducted executive well-being programs.'
                  })
                }
                className="w-24 sm:w-44 h-14 sm:h-24 bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 flex items-center justify-center shrink-0 shadow-sm hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://lh3.googleusercontent.com/d/${logoId}=s400`}
                  alt={`Corporate Partner Logo ${index + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="max-h-full max-w-full object-contain filter contrast-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('thumbnail?id=')) {
                      target.src = `https://drive.google.com/thumbnail?id=${logoId}&sz=w400`;
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <PhotoLightboxModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}

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
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden border border-indigo-900/60">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="max-w-3xl space-y-3 relative z-10 mb-8 sm:mb-10">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-black tracking-widest text-indigo-400 uppercase">
            04 // CORPORATE SPHERE
          </span>
          <span className="text-slate-500">•</span>
          <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-widest">
            Executive Well-Being
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display">
          Corporate Activities &amp; Mindful Leadership
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
          Bringing calmness, values, and mental clarity to high-pressure corporate work cultures through executive retreats and wellness seminars.
        </p>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10 mb-10">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-indigo-400/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-display">
            10,000+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-indigo-300 mt-1 uppercase tracking-wide">
            Individuals Touched
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-amber-400/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 mb-4 group-hover:scale-110 transition-transform">
            <Presentation className="w-6 h-6" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-display">
            500+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-amber-300 mt-1 uppercase tracking-wide">
            Sessions Conducted
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-emerald-400/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-4 group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-display">
            50+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-emerald-300 mt-1 uppercase tracking-wide">
            Companies Benefitted
          </div>
        </div>
      </div>

      {/* Main Corporate Workshop Photo Frame */}
      <div className="relative z-10 mb-10">
        <div className="bg-white/5 rounded-3xl p-2.5 sm:p-3 border border-white/10 hover:border-indigo-400/50 transition-all group">
          <div className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] max-h-[440px]">
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
      <div className="relative z-10 pt-2 pb-2">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-widest">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Trusted Corporate Partners</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            50+ Partner Organizations
          </span>
        </div>

        <div className="relative overflow-hidden w-full rounded-2xl bg-white/[0.04] border border-white/10 p-3 sm:p-5">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-10" />

          <div className="flex items-center gap-6 sm:gap-8 w-max animate-corporate-scroll hover:[animation-play-state:paused]">
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
                className="w-36 sm:w-44 h-20 sm:h-24 bg-white rounded-xl p-3 flex items-center justify-center shrink-0 shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-slate-200"
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

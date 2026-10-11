'use client';

import { useState } from 'react';
import { 
  Play, 
  Sparkles, 
  Volume2, 
  Brain, 
  Heart, 
  Activity, 
  ShieldCheck, 
  ChevronDown 
} from 'lucide-react';

export default function ProgrammesVideoIntro() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const videoId = 'crWSgZ1Hm7A';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  const thumbnailUrl = thumbError
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const scrollToPillars = () => {
    const el = document.getElementById('welfare-pillars');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-[#f8fbff] via-sky-50/30 to-[#fcfdff] py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-sky-100/60">
      {/* Ambient decorative glowing backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-rose-400/10 via-indigo-400/10 to-amber-400/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-rose-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Introduction */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-rose-500/15 via-indigo-500/15 to-amber-500/15 border border-rose-300/80 text-slate-900 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Youth Crisis &amp; Holistic Recovery • How VOICE Helps</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Overcoming Physical, Mental &amp; Emotional Crises:{' '}
            <span className="bg-gradient-to-r from-rose-600 via-indigo-600 to-amber-600 bg-clip-text text-transparent">
              How VOICE Transforms Lives
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Today&apos;s youth face immense academic pressure, depression, screen addiction, and emotional distress. 
            Watch how VOICE provides empathetic 1-on-1 mentorship, de-addiction, and holistic character training.
          </p>
        </div>

        {/* Video Player Card */}
        <div className="relative rounded-[28px] sm:rounded-[36px] p-2.5 sm:p-4 bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12)] max-w-4xl mx-auto group">
          <div className="relative aspect-video w-full rounded-2xl sm:rounded-[24px] overflow-hidden bg-slate-950 shadow-inner">
            {isPlaying ? (
              <iframe
                className="w-full h-full"
                src={embedUrl}
                title="VOICE Gurukul Youth Social Welfare Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div
                onClick={() => setIsPlaying(true)}
                className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center group/player"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setIsPlaying(true);
                  }
                }}
                aria-label="Play VOICE Youth Crisis and Solutions Video"
              >
                {/* YouTube Video Thumbnail */}
                <img
                  src={thumbnailUrl}
                  alt="VOICE Gurukul Youth Challenges & Solutions Preview"
                  onError={() => setThumbError(true)}
                  className="w-full h-full object-cover group-hover/player:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Subtle Cinematic Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/40 group-hover/player:from-slate-950/70 transition-colors" />

                {/* Top Badge Overlay */}
                <div className="absolute top-3 sm:top-5 left-3 sm:left-5 z-10 flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-md flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Watch Full Video</span>
                  </span>
                </div>

                {/* Center Glowing Play Button */}
                <div className="relative z-10 flex flex-col items-center space-y-3">
                  <div className="relative">
                    {/* Pulsing halo */}
                    <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600 opacity-40 blur-lg group-hover/player:opacity-75 transition duration-500 animate-pulse" />

                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-orange-950/50 group-hover/player:scale-110 transition-transform duration-300">
                      <Play className="w-7 h-7 sm:w-9 sm:h-9 ml-1 fill-white" />
                    </div>
                  </div>

                  <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs sm:text-sm font-semibold text-white/95 border border-white/10 group-hover/player:border-white/30 transition-colors">
                    Click to Play Video
                  </span>
                </div>

                {/* Bottom Footer Overlay */}
                <div className="absolute bottom-3 sm:bottom-4 left-4 right-4 z-10 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-medium truncate pr-2">VOICE Gurukul • Empowering Youth Across 100+ Colleges</span>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">YouTube • No Cookies</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3 Pillars of Problem & The VOICE Solution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto pt-2">
          {/* Mental Well-being */}
          <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Mental Clarity</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tackling exam anxiety, cognitive overload, depression &amp; building focus.
            </p>
          </div>

          {/* Emotional Balance */}
          <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Emotional Balance</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1-on-1 compassionate counseling, empathy, and positive peer community.
            </p>
          </div>

          {/* Physical Wellness */}
          <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Physical Health</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Escaping digital addictions, substance traps &amp; developing healthy habits.
            </p>
          </div>

          {/* The VOICE Solution */}
          <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">VOICE Mentorship</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-character volunteer mentors providing root-cause transformation.
            </p>
          </div>
        </div>

        {/* Scroll Cue to Card Sections Below */}
        <div className="flex justify-center pt-2">
          <button
            onClick={scrollToPillars}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors group cursor-pointer"
          >
            <span>Explore Core Welfare Pillars Below</span>
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

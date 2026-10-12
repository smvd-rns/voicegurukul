'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX,
  Brain, 
  Heart, 
  Activity, 
  ShieldCheck, 
  ChevronDown,
  Sparkles 
} from 'lucide-react';

// Direct Archive.org video stream (No YouTube dependency)
const VIDEO_URL = 'https://ia601006.us.archive.org/5/items/current-youth-challenges_20261012/Current%20Youth%20Challenges.mp4';

export default function ProgrammesVideoIntro() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Guarantee muted autoplay on mount without needing initial user click
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  // Sync mute state when toggled via button
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted) {
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else {
      video.play().catch(() => {});
    }
  }, [isMuted]);

  const scrollToPillars = () => {
    const el = document.getElementById('welfare-pillars');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-[#f8fbff] via-sky-50/30 to-[#fcfdff] py-6 sm:py-10 lg:py-14 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-sky-100/60">
      {/* Ambient decorative glowing backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-rose-400/10 via-indigo-400/10 to-amber-400/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-rose-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
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
        <div className="relative rounded-[28px] sm:rounded-[36px] p-2.5 sm:p-4 bg-white/95 backdrop-blur-2xl border-2 border-sky-400/60 shadow-[0_25px_60px_-15px_rgba(56,189,248,0.25)] max-w-4xl mx-auto group">
          <div className="relative aspect-video w-full rounded-2xl sm:rounded-[24px] overflow-hidden bg-black shadow-inner">
            {/* HTML5 Native Video Stream */}
            <video
              ref={videoRef}
              controls
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              className="w-full h-full object-contain bg-black"
            >
              <source src={VIDEO_URL} type="video/mp4" />
              Your browser does not support HTML5 video streaming.
            </video>

            {/* Floating Audio Toggle Button */}
            <div className="absolute top-3.5 right-3.5 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/25 text-white text-xs font-semibold transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
                title="Toggle Audio"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-amber-400" />
                    <span>Click for Sound 🔊</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Sound On 🔊</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4 Pillars of Problem & The VOICE Solution: Compact 2x2 Grid on Mobile, 4-Col on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto pt-1 sm:pt-2">
          {/* Mental Well-being */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1 sm:space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">Mental Clarity</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              Tackling exam anxiety, cognitive overload &amp; focus.
            </p>
          </div>

          {/* Emotional Balance */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1 sm:space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">Emotional Balance</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              1-on-1 counseling, empathy &amp; positive peer circles.
            </p>
          </div>

          {/* Physical Wellness */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1 sm:space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">Physical Health</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              Escaping digital addictions &amp; healthy habits.
            </p>
          </div>

          {/* The VOICE Solution */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1 sm:space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">VOICE Mentorship</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              Volunteer mentors providing root-cause transformation.
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

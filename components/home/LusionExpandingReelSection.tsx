'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

// ─── VIDEO SOURCE ──────────────────────────────────────────────────────────────
// Paste your archive.org direct .mp4 URL here once you've uploaded
// Example: https://archive.org/download/your-item-id/youth-challenges.mp4
const VIDEO_URL = 'https://ia601006.us.archive.org/5/items/current-youth-challenges_20261012/Current%20Youth%20Challenges.mp4';
// ──────────────────────────────────────────────────────────────────────────────

export default function LusionExpandingReelSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const isInViewRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

  // Detect when the section enters the viewport
  const isInView = useInView(containerRef, { amount: 0.15, once: false });

  // Track scroll progress through this pinned transition section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 24,
    mass: 0.25,
  });

  // Keep ref in sync with isInView so global listener always reads current value
  useEffect(() => {
    isInViewRef.current = isInView;
  }, [isInView]);

  // =========================================================================
  // AUTOPLAY & MUTE CONTROL — imperative via refs (guarantees autoplay)
  // =========================================================================
  useEffect(() => {
    [desktopVideoRef.current, mobileVideoRef.current].forEach((video) => {
      if (!video) return;
      video.defaultMuted = true;
      video.muted = true;
      video.play().catch(() => {});
    });
  }, []);

  useEffect(() => {
    [desktopVideoRef.current, mobileVideoRef.current].forEach((video) => {
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
    });
  }, [isMuted]);

  // =========================================================================
  // GLOBAL INTERACTION LISTENER: First click/touch anywhere unmutes audio
  // =========================================================================
  useEffect(() => {
    const handleGlobalInteraction = () => {
      if (isInViewRef.current) {
        setIsMuted(false);
      }
    };
    window.addEventListener('click', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction);
    return () => {
      window.removeEventListener('click', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
    };
  }, []); // Empty deps — ref keeps value fresh

  // =========================================================================
  // AUTO-SCROLL: Fires on every entry (resets when section leaves viewport)
  // =========================================================================
  useEffect(() => {
    if (isInView && !hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true;
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetScroll = scrollTop + rect.top + (containerRef.current.offsetHeight * 0.44);
          window.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
      }, 450);
      return () => clearTimeout(timer);
    }
    if (!isInView) {
      // Reset flag — auto-scroll fires again next time user returns
      hasAutoScrolledRef.current = false;
    }
  }, [isInView]);

  // Click card: toggle audio + trigger smooth expansion scroll
  const handleCardClick = () => {
    setIsMuted((prev) => !prev);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetScroll = scrollTop + rect.top + (containerRef.current.offsetHeight * 0.44);
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  };

  // Responsive detection for mobile / tablet screens
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // =========================================================================
  // RIGHT-SIDE NARRATIVE TEXT (Shrinks smaller & smaller, then fades)
  // =========================================================================
  const textScale = useTransform(smoothProgress, [0.02, 0.35, 0.65], [1.0, 0.72, 0.42]);
  const textOpacity = useTransform(smoothProgress, [0.02, 0.35, 0.6], [1.0, 0.55, 0]);
  const textY = useTransform(smoothProgress, [0.02, 0.6], ['0px', '-50px']);
  const textX = useTransform(smoothProgress, [0.02, 0.6], ['0px', '40px']);

  // =========================================================================
  // DYNAMIC 3D MORPHING SHAPE (Desktop & Mobile adapted)
  // =========================================================================
  const cardScale = useTransform(smoothProgress, [0.02, 0.44, 0.82, 0.98], [0.38, 0.72, 0.94, 1.0]);
  const cardScaleMobile = useTransform(smoothProgress, [0.02, 0.44, 0.82, 0.98], [0.65, 0.85, 0.96, 1.0]);
  
  const cardX = useTransform(smoothProgress, [0.02, 0.48, 0.85], ['-22vw', '-8vw', '0vw']);
  const cardY = useTransform(smoothProgress, [0.02, 0.48, 0.85], ['14vh', '5vh', '0vh']);
  const cardYMobile = useTransform(smoothProgress, [0.02, 0.48, 0.85], ['6vh', '2vh', '0vh']);

  const cardRotateZ = useTransform(smoothProgress, [0.02, 0.45, 0.85], [-8.5, -3.2, 0]);
  const cardRotateY = useTransform(smoothProgress, [0.02, 0.45, 0.85], [22, 8, 0]);
  const cardRotateX = useTransform(smoothProgress, [0.02, 0.45, 0.85], [11, 4, 0]);
  const cardSkewY = useTransform(smoothProgress, [0.02, 0.45, 0.85], [-4.5, -1.5, 0]);

  const cardBorderRadius = useTransform(
    smoothProgress,
    [0.02, 0.45, 0.82],
    ['36px 16px 28px 14px', '20px 14px 16px 12px', '0px']
  );

  const cardBorderWidth = useTransform(smoothProgress, [0.02, 0.50, 0.82], [8, 3, 0]);
  const cardBorderColor = useTransform(
    smoothProgress,
    [0.02, 0.50, 0.82],
    ['rgba(56, 189, 248, 1)', 'rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0)']
  );
  const cardShadow = useTransform(
    smoothProgress,
    [0.02, 0.50, 0.82],
    ['0 25px 60px -15px rgba(56, 189, 248, 0.35)', '0 12px 30px -10px rgba(56, 189, 248, 0.15)', 'none']
  );
  const hintOpacity = useTransform(smoothProgress, [0.02, 0.60, 0.82], [1, 0.4, 0]);

  // Glowing 3D background ribbon flow
  const pathLength = useTransform(smoothProgress, [0.02, 0.85], [0.15, 1]);
  const ribbonOpacity = useTransform(smoothProgress, [0.02, 0.75, 0.95], [0.85, 0.7, 0.2]);

  return (
    <>
      {/* =========================================================================
          1. MOBILE VIEW (Visible on < 768px):
          - True 16:9 Aspect Ratio: Zero cropping, full video frame perfectly visible!
          - Natural section height with snug vertical padding.
          - Interactive sound toggle button & tap-to-unmute.
         ========================================================================= */}
      <section className="block md:hidden w-full py-8 sm:py-12 px-4 sm:px-6 bg-gradient-to-b from-[#fafcff] via-amber-50/20 to-[#fafcff]">
        <div className="max-w-lg mx-auto space-y-4">
          
          {/* Mobile Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>Timeless Wisdom</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Timeless Wisdom,{' '}
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 bg-clip-text text-transparent">
                Brought to Life.
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
              From university hostel circles to high-impact leadership summits.
            </p>
          </div>

          {/* 16:9 Mobile Video Player Card */}
          <div
            onClick={() => setIsMuted((prev) => !prev)}
            className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200/90 shadow-xl bg-black cursor-pointer"
          >
            <video
              ref={mobileVideoRef}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              className="w-full h-full object-cover pointer-events-none"
            >
              <source src={VIDEO_URL} type="video/mp4" />
            </video>

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

            {/* Audio Toggle Button */}
            <div className="absolute top-3 right-3 z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-lg active:scale-95 transition-all cursor-pointer"
                title="Toggle Audio"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>Click for Sound 🔊</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Sound On 🔊</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          2. DESKTOP & LAPTOP VIEW (Visible on >= 768px):
          - Full-screen expanding 3D reel covering device screen.
          - Untouched exactly as configured for laptop view.
         ========================================================================= */}
      <section
        ref={containerRef}
        className="hidden md:block relative h-[250vh] bg-gradient-to-b from-[#fafcff] via-amber-50/20 to-[#fafcff]"
      >
        {/* STICKY STAGE — Full viewport container */}
        <div className="sticky top-20 h-[calc(100vh-5rem)] w-full overflow-hidden [perspective:1500px]">

          {/* Dynamic Curved Ribbon Track */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <motion.svg
              style={{ opacity: ribbonOpacity }}
              className="w-full h-full"
              viewBox="0 0 1440 900"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="lusionRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="35%" stopColor="#f97316" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#6366f1" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
                </linearGradient>
                <filter id="ribbonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="12" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <motion.path
                d="M -40 200 C 320 80, 520 620, 880 340 S 1320 720, 1500 480"
                stroke="url(#lusionRibbonGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                filter="url(#ribbonGlow)"
                style={{ pathLength }}
              />
              <motion.path
                d="M -40 200 C 320 80, 520 620, 880 340 S 1320 720, 1500 480"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
                style={{ pathLength }}
              />
            </motion.svg>
          </div>

          {/* NARRATIVE TEXT — positioned responsively on desktop */}
          <motion.div
            style={{ scale: textScale, opacity: textOpacity, y: textY, x: textX }}
            className="absolute top-6 sm:top-10 lg:top-14 right-4 sm:right-10 lg:right-16 max-w-sm sm:max-w-md lg:max-w-lg z-10 pointer-events-none select-none origin-top text-left"
          >
            <h2 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] font-sans">
              Timeless Wisdom, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 bg-clip-text text-transparent">
                Brought to Life.
              </span>
            </h2>
            <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm lg:text-base text-slate-600 font-medium leading-relaxed">
              From university hostel circles to high-impact leadership summits. As you scroll, this video expands to full view.
            </p>
          </motion.div>

          {/* THE EXPANDING VIDEO CARD — Edge-to-edge full device screen expansion */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden">
            <motion.div
              style={{
                scale: cardScale,
                x: cardX,
                y: cardY,
                rotateZ: cardRotateZ,
                rotateY: cardRotateY,
                rotateX: cardRotateX,
                skewY: cardSkewY,
                borderRadius: cardBorderRadius,
                borderWidth: cardBorderWidth,
                borderColor: cardBorderColor,
                boxShadow: cardShadow,
              }}
              onClick={handleCardClick}
              className="group pointer-events-auto relative w-full h-full overflow-hidden border-solid will-change-transform bg-black cursor-pointer flex items-center justify-center"
            >
              {/*
                Native HTML5 video stream directly from archive.org.
                object-cover ensures 100% full screen coverage with zero empty white margins!
              */}
              <video
                ref={desktopVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
              >
                <source src={VIDEO_URL} type="video/mp4" />
              </video>

              {/* Audio Toggle Button */}
              <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted((prev) => !prev);
                  }}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/30 text-white text-xs sm:text-sm font-semibold transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
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
            </motion.div>
          </div>

          {/* Bottom scroll hint */}
          <motion.div
            style={{ opacity: hintOpacity }}
            className="absolute bottom-3 right-6 sm:right-10 z-10 pointer-events-none flex items-center text-xs text-slate-400"
          >
            <span className="font-medium text-[11px] bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/50 shadow-2xs">
              Scroll to continue ↓
            </span>
          </motion.div>

        </div>
      </section>
    </>
  );
}

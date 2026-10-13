'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

// ─── VIDEO SOURCE (Compressed 7.2MB faststart MP4 for bufferless web playback) ───
const VIDEO_URL = 'https://ia903108.us.archive.org/15/items/current-youth-challenges_20261013/Current%20Youth%20Challenges.mp4';
const POSTER_URL = 'https://archive.org/download/current-youth-challenges_20261012/current-youth-challenges_20261012.thumbs/Current%20Youth%20Challenges_000030.jpg';
// ──────────────────────────────────────────────────────────────────────────────

export default function LusionExpandingReelSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection for mobile / desktop viewports
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect when the section enters the viewport
  const isInView = useInView(containerRef, { amount: 0.1, once: false });

  // Track scroll progress through this pinned transition section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    mass: 0.25,
  });

  // Safe playback trigger — auto plays and handles autoplay policy
  const playActiveVideo = useCallback(async () => {
    const video = isMobile ? mobileVideoRef.current : desktopVideoRef.current;
    if (!video) return;

    try {
      video.muted = isMuted;
      if (video.paused) {
        await video.play();
      }
    } catch {
      // Fallback to muted playback if browser policy requires it
      try {
        video.muted = true;
        setIsMuted(true);
        await video.play();
      } catch {
        // Silently handled
      }
    }
  }, [isMobile, isMuted]);

  // Ensure playback starts/resumes whenever this section scrolls into view
  useEffect(() => {
    const video = isMobile ? mobileVideoRef.current : desktopVideoRef.current;
    if (!video) return;

    if (isInView) {
      playActiveVideo();
    } else {
      // Pause when scrolled out of view to preserve bandwidth and system resources
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isInView, isMobile, playActiveVideo]);

  // Resume playback when the browser tab becomes active
  useEffect(() => {
    const handleVisibility = () => {
      const video = isMobile ? mobileVideoRef.current : desktopVideoRef.current;
      if (!video) return;

      if (document.visibilityState === 'visible' && isInView) {
        playActiveVideo();
      } else if (document.visibilityState === 'hidden' && !video.paused) {
        video.pause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isInView, isMobile, playActiveVideo]);

  // Sync mute state when toggled via user interaction
  useEffect(() => {
    const video = isMobile ? mobileVideoRef.current : desktopVideoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted) {
      video.volume = 1.0;
    }
    if (isInView && video.paused) {
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    }
  }, [isMuted, isMobile, isInView]);

  const toggleSound = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  const handleCardClick = () => {
    const video = isMobile ? mobileVideoRef.current : desktopVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      toggleSound();
    }
  };

  // =========================================================================
  // RIGHT-SIDE NARRATIVE TEXT (Starts crystal clear, fades as video expands)
  // =========================================================================
  const textScale = useTransform(smoothProgress, [0.05, 0.38, 0.65], [1.0, 0.85, 0.5]);
  const textOpacity = useTransform(smoothProgress, [0.08, 0.35, 0.58], [1.0, 0.6, 0]);
  const textY = useTransform(smoothProgress, [0.05, 0.58], ['0px', '-45px']);
  const textX = useTransform(smoothProgress, [0.05, 0.58], ['0px', '40px']);

  // =========================================================================
  // DYNAMIC 3D EXPANDING SHAPE (Lusion-style: starts small on left, grows bigger & bigger!)
  // - Starts small (scale: 0.38) at left (-22vw) with 3D tilt, leaving text 100% visible
  // - Expands smoothly to full screen (scale: 1.0, center, 0 tilt, 0 borders)
  // =========================================================================
  const cardScale = useTransform(smoothProgress, [0.05, 0.45, 0.75, 0.95], [0.38, 0.72, 0.96, 1.0]);
  const cardX = useTransform(smoothProgress, [0.05, 0.48, 0.80], ['-22vw', '-8vw', '0vw']);
  const cardY = useTransform(smoothProgress, [0.05, 0.48, 0.80], ['12vh', '4vh', '0vh']);

  const cardRotateZ = useTransform(smoothProgress, [0.05, 0.45, 0.80], [-8, -3, 0]);
  const cardRotateY = useTransform(smoothProgress, [0.05, 0.45, 0.80], [22, 8, 0]);
  const cardRotateX = useTransform(smoothProgress, [0.05, 0.45, 0.80], [11, 4, 0]);
  const cardSkewY = useTransform(smoothProgress, [0.05, 0.45, 0.80], [-4, -1.5, 0]);

  const cardBorderRadius = useTransform(
    smoothProgress,
    [0.05, 0.45, 0.80],
    ['32px 16px 28px 14px', '18px 12px 16px 10px', '0px']
  );

  const cardBorderWidth = useTransform(smoothProgress, [0.05, 0.50, 0.80], [6, 2, 0]);
  const cardBorderColor = useTransform(
    smoothProgress,
    [0.05, 0.50, 0.80],
    ['rgba(56, 189, 248, 0.8)', 'rgba(56, 189, 248, 0.3)', 'rgba(56, 189, 248, 0)']
  );
  const cardShadow = useTransform(
    smoothProgress,
    [0.05, 0.50, 0.80],
    ['0 25px 60px -15px rgba(56, 189, 248, 0.35)', '0 12px 30px -10px rgba(56, 189, 248, 0.15)', 'none']
  );
  const hintOpacity = useTransform(smoothProgress, [0.05, 0.55, 0.80], [1, 0.4, 0]);

  // Glowing 3D background ribbon flow
  const pathLength = useTransform(smoothProgress, [0.02, 0.85], [0.15, 1]);
  const ribbonOpacity = useTransform(smoothProgress, [0.02, 0.65, 0.90], [0.85, 0.6, 0.15]);

  return (
    <>
      {/* =========================================================================
          1. MOBILE VIEW (Visible on < 768px):
          - True 16:9 Aspect Ratio with zero cropping.
          - Interactive sound toggle button & tap-to-play.
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

          {/* 16:9 Mobile Video Player Card (100% full frame visible) */}
          <div
            onClick={handleCardClick}
            className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200/90 shadow-xl bg-black cursor-pointer flex items-center justify-center"
          >
            <video
              ref={mobileVideoRef}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              poster={POSTER_URL}
              onCanPlay={() => {
                if (isInView && mobileVideoRef.current?.paused) {
                  mobileVideoRef.current.play().catch(() => {});
                }
              }}
              className="w-full h-full object-cover pointer-events-none"
            >
              {isMobile && <source src={VIDEO_URL} type="video/mp4" />}
            </video>

            {/* Audio Toggle Button */}
            <div className="absolute top-3 right-3 z-30">
              <button
                onClick={toggleSound}
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
          - Expanding 3D reel: Starts small on the left, grows bigger and bigger!
          - Text on right is 100% clear and legible without overlap.
          - 16:9 aspect-matched card: Video is 100% visible, no black bars, no zoom!
          - Faststart video playback with no freeze or stall.
         ========================================================================= */}
      <section
        ref={containerRef}
        className="hidden md:block relative h-[230vh] bg-gradient-to-b from-[#fafcff] via-amber-50/20 to-[#fafcff]"
      >
        {/* STICKY STAGE */}
        <div className="sticky top-20 h-[calc(100vh-5rem)] w-full overflow-hidden [perspective:1500px] bg-[#fafcff]">

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

          {/* NARRATIVE TEXT — Positioned clearly on the right half, zero overlap with small video */}
          <motion.div
            style={{ scale: textScale, opacity: textOpacity, y: textY, x: textX }}
            className="absolute top-10 sm:top-14 lg:top-20 right-6 sm:right-10 lg:right-16 xl:right-24 max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl z-10 pointer-events-none select-none origin-top-right text-left space-y-3"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Timeless Wisdom in Action</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] font-sans">
              Timeless Wisdom, <br />
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 bg-clip-text text-transparent">
                Brought to Life.
              </span>
            </h2>
            <p className="text-sm lg:text-base text-slate-600 font-medium leading-relaxed max-w-lg">
              From university hostel circles to high-impact leadership summits. As you scroll, this video expands to full theater view.
            </p>
          </motion.div>

          {/* THE EXPANDING VIDEO CARD — Starts small on left, grows bigger & bigger to fill screen */}
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
              className="group pointer-events-auto relative w-[min(94vw,calc((100vh-6rem)*16/9))] aspect-video overflow-hidden will-change-transform bg-black cursor-pointer flex items-center justify-center"
            >
              {/*
                Native HTML5 faststart video stream directly from archive.org.
                With 16:9 aspect-matched card, the 16:9 video fills 100% of the card with zero cropping and zero zoom!
              */}
              <video
                ref={desktopVideoRef}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="auto"
                poster={POSTER_URL}
                onCanPlay={() => {
                  if (isInView && desktopVideoRef.current?.paused) {
                    desktopVideoRef.current.play().catch(() => {});
                  }
                }}
                className="w-full h-full object-cover z-10 pointer-events-none"
              >
                {!isMobile && <source src={VIDEO_URL} type="video/mp4" />}
              </video>

              {/* Audio Toggle Button */}
              <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30">
                <button
                  onClick={toggleSound}
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
            className="absolute bottom-4 right-6 sm:right-10 z-10 pointer-events-none flex items-center text-xs text-slate-400"
          >
            <span className="font-medium text-[11px] bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-200/60 shadow-2xs">
              Scroll to expand video ↓
            </span>
          </motion.div>

        </div>
      </section>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Award,
  Compass,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import DriveImage from '@/components/activities/DriveImage';

const PILLARS_DATA = [
  {
    id: '01',
    tag: 'Campus Wellness',
    tabLabel: 'Lifestyle',
    title: 'Drug-Free & Inspiring VOICE Lifestyle',
    desc: 'Clean, supportive student hostels near top universities providing peaceful study environments and positive peer culture.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    driveId: '16DDNYKy6WSL41Gb6rLVaS5tYi7-E5eyt',
    icon: ShieldCheck,
    highlights: [
      '100% substance-free living code of conduct',
      'Quiet, digital-detox study circles near campuses',
      'Daily wholesome, pure vegetarian sattvic meals',
    ],
    linkText: 'Explore VOICE Lifestyle',
    href: '/centres',
  },
  {
    id: '02',
    tag: 'Mental Resilience',
    tabLabel: 'Mind Power',
    title: 'Mind Power & Exam Stress Mastery',
    desc: 'Scientific meditation and concentration tools that help engineering & medical students convert stress into peak focus.',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    driveId: '1s3Ai7y4ZxfhWqvG68mANk4tKMSlEm9mP',
    icon: Zap,
    highlights: [
      'Evidence-based study of habit loops and emotional control',
      'Scientific mantra meditation inducing deep alpha brainwaves',
      'Transmuting competitive exam panic into unshakable confidence',
    ],
    linkText: 'View Mind Workshops',
    href: '/programmes',
  },
  {
    id: '03',
    tag: 'Leadership',
    tabLabel: 'Leadership',
    title: 'Character with High Competence',
    desc: 'Blending professional ethics and integrity with cutting-edge academic excellence for enduring life success.',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    driveId: '1dgEsq4Yy9q5kWfVpCYIeBqRGOWxXRNsV',
    icon: Award,
    highlights: [
      '1-on-1 mentoring from IIT, NIT alumni and corporate leaders',
      'Universal principles of principled decision making and honesty',
      'Building ethical visionaries for society and technology',
    ],
    linkText: 'Discover Leadership Tracks',
    href: '/programmes',
  },
  {
    id: '04',
    tag: 'Timeless Wisdom',
    tabLabel: 'Mentorship',
    title: 'Vedic Leadership & Life Mentorship',
    desc: 'Personal 1-on-1 guidance from IIT, NIT alumni and corporate mentors to navigate careers and relationships gracefully.',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    driveId: '1TdrXQ3W_jWAzbqd-SfiFMztLPTgfMXhs',
    icon: Compass,
    highlights: [
      'Wisdom distilled from Bhagavad Gita and Ramayana',
      'Authentic life purpose navigation for graduating seniors',
      'Over 26,500+ successful alumni across the world',
    ],
    linkText: 'Read Student Stories',
    href: '/stories',
  },
];

// Helper to calculate circular distance and position in 3D carousel
function getCardOffset(index: number, activeIndex: number, total: number) {
  let diff = index - activeIndex;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

// 3D positioning styles for Laptop / Desktop stage
function get3DStyles(diff: number) {
  if (diff === 0) {
    // Active Center Card
    return {
      x: '0%',
      y: '0%',
      z: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      opacity: 1,
      zIndex: 30,
      pointerEvents: 'auto' as const,
      filter: 'blur(0px)',
    };
  }
  if (diff === -1) {
    // Left Angled 3D Card
    return {
      x: '-44%',
      y: '0%',
      z: -180,
      rotateY: 22,
      rotateZ: 1.2,
      scale: 0.88,
      opacity: 0.6,
      zIndex: 15,
      pointerEvents: 'auto' as const,
      filter: 'blur(0.5px)',
    };
  }
  if (diff === 1) {
    // Right Angled 3D Card
    return {
      x: '44%',
      y: '0%',
      z: -180,
      rotateY: -22,
      rotateZ: -1.2,
      scale: 0.88,
      opacity: 0.6,
      zIndex: 15,
      pointerEvents: 'auto' as const,
      filter: 'blur(0.5px)',
    };
  }
  // Far back hidden card
  return {
    x: diff < 0 ? '-75%' : '75%',
    y: '0%',
    z: -360,
    rotateY: diff < 0 ? 32 : -32,
    rotateZ: 0,
    scale: 0.72,
    opacity: 0,
    zIndex: 5,
    pointerEvents: 'none' as const,
    filter: 'blur(4px)',
  };
}

// Single 3D Cylindrical Card Component for Desktop / Laptop
function DesktopPillar3DCard({
  pillar,
  index,
  activeIndex,
  total,
  onSelect,
}: {
  pillar: (typeof PILLARS_DATA)[0];
  index: number;
  activeIndex: number;
  total: number;
  onSelect: () => void;
}) {
  const diff = getCardOffset(index, activeIndex, total);
  const styles = get3DStyles(diff);
  const isCenter = diff === 0;

  const [hoverRotX, setHoverRotX] = useState(0);
  const [hoverRotY, setHoverRotY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCenter) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    setHoverRotX(-((my - cy) / cy) * 5);
    setHoverRotY(((mx - cx) / cx) * 5);
    setGlarePos({
      x: (mx / rect.width) * 100,
      y: (my / rect.height) * 100,
      opacity: 0.14,
    });
  };

  const handleMouseLeave = () => {
    setHoverRotX(0);
    setHoverRotY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const Icon = pillar.icon;

  return (
    <motion.div
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: styles.x,
        y: styles.y,
        z: styles.z,
        rotateY: styles.rotateY + (isCenter ? hoverRotY : 0),
        rotateX: isCenter ? hoverRotX : 0,
        rotateZ: styles.rotateZ,
        scale: styles.scale,
        opacity: styles.opacity,
        filter: styles.filter,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 28,
        mass: 0.8,
      }}
      style={{
        zIndex: styles.zIndex,
        pointerEvents: styles.pointerEvents,
      }}
      className={`absolute w-full max-w-4xl lg:max-w-5xl rounded-[32px] lg:rounded-[36px] bg-white border border-slate-200/90 p-6 lg:p-8 flex flex-col justify-between group transition-shadow duration-300 antialiased select-none cursor-pointer ${
        isCenter
          ? 'shadow-2xl hover:shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20'
          : 'shadow-lg hover:opacity-80'
      }`}
    >
      {/* Dynamic Specular Glare (Center active card only) */}
      {isCenter && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-[32px] lg:rounded-[36px]"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
            opacity: glarePos.opacity,
          }}
        />
      )}

      {/* Non-center card click overlay pill */}
      {!isCenter && (
        <div className="absolute inset-0 bg-slate-900/5 hover:bg-slate-900/0 transition-colors z-40 rounded-[32px] lg:rounded-[36px] flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-full bg-slate-900/80 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
            Click to view Pillar {pillar.id}
          </span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative z-30">
        <div className="flex items-center space-x-3">
          <span className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tighter">
            {pillar.id}
          </span>
          <span className="text-slate-300">•</span>
          <span className={`px-3 py-0.5 rounded-full text-xs font-bold border shadow-xs ${pillar.badgeBg}`}>
            {pillar.tag}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
          <span>PILLAR {pillar.id} OF 04</span>
        </div>
      </div>

      {/* Card Content Grid (2 columns on Desktop) */}
      <div className="grid md:grid-cols-12 gap-6 lg:gap-8 items-center my-3 relative z-30">
        {/* Left Column: Descriptive Content & Highlights */}
        <div className="md:col-span-7 space-y-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
            <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>

          <h3 className="text-2xl lg:text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {pillar.title}
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed font-normal">
            {pillar.desc}
          </p>

          {/* Concise Bullet Points with Emerald Dots */}
          <div className="space-y-1.5 pt-1">
            {pillar.highlights.map((h: string, i: number) => (
              <div key={i} className="flex items-center space-x-3 text-sm text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Photo Frame */}
        <div className="md:col-span-5 flex justify-center">
          <div className="w-full max-w-sm md:max-w-md aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden bg-slate-100 shadow-xl border border-slate-200 relative group/img">
            <DriveImage
              driveId={pillar.driveId}
              alt={pillar.title}
              size={800}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-700 pointer-events-none"
              showZoomIcon={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none z-10">
              <span className="text-xs font-bold text-white drop-shadow">
                {pillar.tag} • VOICE Gurukul
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 relative z-30">
        <span className="text-xs text-slate-500 font-medium">
          Empowering university youth with character and composure.
        </span>

        <Link
          href={pillar.href}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="inline-flex items-center space-x-1.5 text-sm font-bold text-amber-700 hover:text-amber-900 group-hover:translate-x-1 transition-all"
        >
          <span>{pillar.linkText}</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

export default function VoicegurukulHorizontalPillars() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const pillars = PILLARS_DATA;

  const nextSlide = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % pillars.length);
  }, [pillars.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : pillars.length - 1));
  }, [pillars.length]);

  const goToSlide = useCallback(
    (idx: number) => {
      setDirection(idx >= activeIndex ? 1 : -1);
      setActiveIndex(idx);
    },
    [activeIndex]
  );

  // Continuous auto-scroll effect: smoothly advances every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [nextSlide]);

  const activePillar = pillars[activeIndex];
  const ActiveIcon = activePillar.icon;

  // Horizontal motion variants for mobile smooth sliding
  const mobileSlideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 70 : -70,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 340, damping: 30 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -70 : 70,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring' as const, stiffness: 340, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      },
    }),
  };

  return (
    <>
      {/* =========================================================================
          1. MOBILE & TABLET COMPACT HORIZONTAL CAROUSEL (Visible on < 1024px)
          - Horizontal auto-scroll + Touch swipe gestures + 1-tap tabs.
          - Smooth direction-aware sliding animation.
          - Auto-pause on hover/touch with live timer line on active tab.
         ========================================================================= */}
      <section className="block lg:hidden w-full py-4 sm:py-6 px-3 sm:px-6 bg-gradient-to-b from-[#fafcff] via-amber-50/20 to-[#fafcff]">
        <div className="max-w-md sm:max-w-xl mx-auto space-y-3 sm:space-y-4">
          
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>Core Pillars of VOICE Gurukul</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              A Safe Oasis for University Youth
            </h2>
          </div>

          {/* Interactive Pillar Selector Tabs with Auto-Scroll Progress Line */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
            {pillars.map((p, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <button
                  key={p.id}
                  onClick={() => goToSlide(idx)}
                  className={`relative py-1.5 px-1 rounded-lg text-center transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-white text-slate-900 font-black shadow-sm border border-slate-200 scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                  }`}
                >
                  {/* Continuous auto-advance progress indicator bar on active tab */}
                  {isSelected && (
                    <motion.div
                      key={`timer-bar-${idx}-${activeIndex}`}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-[2.5px] bg-amber-500 rounded-full"
                    />
                  )}
                  <div className="text-[10px] font-mono text-amber-600 font-black">{p.id}</div>
                  <div className="text-[10px] sm:text-xs truncate leading-tight">{p.tabLabel}</div>
                </button>
              );
            })}
          </div>

          {/* Active Card Container with Horizontal Swipe */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activePillar.id}
                custom={direction}
                variants={mobileSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, { offset, velocity }) => {
                  if (offset.x < -35 || velocity.x < -300) {
                    nextSlide();
                  } else if (offset.x > 35 || velocity.x > 300) {
                    prevSlide();
                  }
                }}
                className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg p-4 sm:p-6 flex flex-col space-y-3 sm:space-y-4 touch-pan-y cursor-grab active:cursor-grabbing select-none"
              >
                {/* Card Top Strip */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tighter">
                      {activePillar.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${activePillar.badgeBg}`}>
                      {activePillar.tag}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    PILLAR {activePillar.id} OF 04
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                      <ActiveIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {activePillar.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {activePillar.desc}
                  </p>
                </div>

                {/* Compact Highlights List */}
                <div className="space-y-1.5 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                  {activePillar.highlights.map((h, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span className="font-medium leading-snug">{h}</span>
                    </div>
                  ))}
                </div>

                {/* Snug Image Frame */}
                <div className="w-full aspect-[16/9] max-h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative shadow-2xs">
                  <DriveImage
                    driveId={activePillar.driveId}
                    alt={activePillar.title}
                    size={600}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover object-center pointer-events-none"
                    showZoomIcon={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
                    <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow">
                      {activePillar.tag} • VOICE Gurukul
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Pillar {activePillar.id}
                  </span>
                  <Link
                    href={activePillar.href}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>{activePillar.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Controls: Prev / Dots / Next */}
          <div className="flex items-center justify-between pt-0.5 px-1">
            <button
              onClick={prevSlide}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              aria-label="Previous Pillar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Indicator Dots */}
            <div className="flex items-center space-x-1.5">
              {pillars.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx
                      ? 'w-5 bg-amber-500'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to pillar ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              aria-label="Next Pillar"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          2. DESKTOP & LAPTOP 3D CYLINDRICAL CAROUSEL STAGE (Visible on >= 1024px)
          - TRUE 3D CYLINDER: Visible adjacent cards angled inward in 3D perspective!
          - Continuous horizontal auto-scroll without pause interruption.
          - 1-click tabs, floating 3D arrows, and clickable side cards.
         ========================================================================= */}
      <section className="hidden lg:block relative py-12 lg:py-16 bg-gradient-to-b from-[#fafcff] via-amber-50/25 to-[#fafcff] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-6">

          {/* Top Header Strip */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Core Pillars of VOICE Gurukul</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
                A Safe Oasis for University Youth
              </h2>
            </div>

            {/* Desktop Tabs with Auto-scroll Timer Bar */}
            <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
              {pillars.map((p, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <button
                    key={p.id}
                    onClick={() => goToSlide(idx)}
                    className={`relative px-4 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-white text-slate-900 font-black shadow-sm border border-slate-200 scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-white/60'
                    }`}
                  >
                    {/* Live countdown timer bar */}
                    {isSelected && (
                      <motion.div
                        key={`desktop-timer-${idx}-${activeIndex}`}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 5, ease: 'linear' }}
                        className="absolute bottom-0 left-0 h-[2.5px] bg-amber-500 rounded-full"
                      />
                    )}
                    <span className="text-xs font-mono text-amber-600 font-black mr-1.5">{p.id}</span>
                    <span className="text-xs font-bold">{p.tabLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3D Cylindrical Stage */}
          <div className="relative w-full h-[520px] lg:h-[560px] flex items-center justify-center [perspective:1400px] [transform-style:preserve-3d] my-3">
            {/* Left Floating Arrow */}
            <button
              onClick={prevSlide}
              className="absolute left-2 lg:left-6 z-40 p-3 rounded-full bg-white/90 hover:bg-white border border-slate-200 text-slate-700 hover:text-amber-600 shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-sm"
              title="Previous Pillar"
              aria-label="Previous Pillar"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* 3D Cards */}
            {pillars.map((pillar, idx) => (
              <DesktopPillar3DCard
                key={pillar.id}
                pillar={pillar}
                index={idx}
                activeIndex={activeIndex}
                total={pillars.length}
                onSelect={() => goToSlide(idx)}
              />
            ))}

            {/* Right Floating Arrow */}
            <button
              onClick={nextSlide}
              className="absolute right-2 lg:right-6 z-40 p-3 rounded-full bg-white/90 hover:bg-white border border-slate-200 text-slate-700 hover:text-amber-600 shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-sm"
              title="Next Pillar"
              aria-label="Next Pillar"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Bar: Indicators & Action CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
            <div className="flex items-center space-x-1.5">
              {pillars.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => goToSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx
                      ? 'w-7 bg-amber-500'
                      : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to pillar ${p.id}`}
                />
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">
                Pillar {pillars[activeIndex].id} of 04
              </span>
              <Link
                href={pillars[activeIndex].href}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all"
              >
                <span>{pillars[activeIndex].linkText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

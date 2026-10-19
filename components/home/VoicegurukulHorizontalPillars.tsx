'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, MotionValue, AnimatePresence } from 'framer-motion';
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
    iconBoxBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
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
    iconBoxBg: 'bg-sky-50 text-sky-600 border-sky-200',
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
    iconBoxBg: 'bg-amber-50 text-amber-600 border-amber-200',
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
    iconBoxBg: 'bg-purple-50 text-purple-600 border-purple-200',
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

interface Pillar3DCardProps {
  pillar: (typeof PILLARS_DATA)[0];
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
  onSelect?: () => void;
}

// 3D Curved Card for Desktop (>= 1024px) driven by vertical page scroll
function Pillar3DCard({ pillar, index, total, scrollYProgress, onSelect }: Pillar3DCardProps) {
  const steps = total - 1;
  const c = index / steps;
  const s = 1 / steps;

  const inputPoints = [
    c - s * 2,
    c - s,
    c - s * 0.5,
    c,
    c + s * 0.5,
    c + s,
    c + s * 2,
  ];

  const [hoverRotX, setHoverRotX] = useState(0);
  const [hoverRotY, setHoverRotY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  // 1. Horizontal Curved Trajectory: Inactive cards pushed off-screen (120vw / -120vw)
  const x = useTransform(
    scrollYProgress,
    inputPoints,
    ['120vw', '100vw', '70vw', '0vw', '-70vw', '-100vw', '-120vw']
  );

  // 2. 3D Cylindrical Curvature (rotateY):
  const scrollRotateY = useTransform(
    scrollYProgress,
    inputPoints,
    [-22, -14, -7, 0, 7, 14, 22]
  );

  // 3. 3D Banking Tilt along curve (rotateZ):
  const rotateZ = useTransform(
    scrollYProgress,
    inputPoints,
    [2, 1.2, 0.5, 0, -0.5, -1.2, -2]
  );

  // 4. 3D Depth along Z axis:
  const z = useTransform(
    scrollYProgress,
    inputPoints,
    [-300, -180, -60, 0, -60, -180, -300]
  );

  // 5. Scale Arc:
  const scale = useTransform(
    scrollYProgress,
    inputPoints,
    [0.88, 0.93, 0.98, 1, 0.98, 0.93, 0.88]
  );

  // 6. Smooth Opacity Curve: ZERO OVERLAP (inactive cards fade cleanly)
  const opacity = useTransform(
    scrollYProgress,
    inputPoints,
    [0, 0, 0.1, 1, 0.1, 0, 0]
  );

  // 7. Dynamic Z-Index Stacking:
  const zIndex = useTransform(
    scrollYProgress,
    inputPoints,
    [1, 5, 10, 30, 10, 5, 1]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 lg:px-8 pointer-events-none [transform-style:preserve-3d]">
      <motion.div
        onClick={onSelect}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          x,
          rotateY: scrollRotateY,
          rotateZ,
          rotateX: hoverRotX,
          scale,
          z,
          opacity,
          zIndex,
        }}
        className="pointer-events-auto w-full max-w-4xl lg:max-w-5xl rounded-2xl lg:rounded-3xl xl:rounded-[32px] bg-white border border-slate-200/90 shadow-2xl p-5 lg:p-6 xl:p-7 relative overflow-hidden flex flex-col justify-between group transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/10 cursor-pointer antialiased select-none"
      >
        {/* Dynamic Subtle Specular Glare */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-2xl lg:rounded-3xl xl:rounded-[32px]"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
            opacity: glarePos.opacity,
          }}
        />

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 relative z-30">
          <div className="flex items-center space-x-3">
            <span className="text-xl lg:text-2xl xl:text-3xl font-black text-slate-900 font-mono tracking-tighter">
              {pillar.id}
            </span>
            <span className="text-slate-300">•</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] xl:text-xs font-bold border shadow-2xs ${pillar.badgeBg}`}>
              {pillar.tag}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] xl:text-xs font-bold text-slate-400">
            <span>PILLAR {pillar.id} OF 04</span>
          </div>
        </div>

        {/* Card Body Grid (2 columns on Desktop) */}
        <div className="grid md:grid-cols-12 gap-5 lg:gap-7 items-center my-2.5 xl:my-3 relative z-30">
          {/* Left Column: Descriptive Content & Highlights */}
          <div className="md:col-span-7 space-y-2.5 xl:space-y-3">
            <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl flex items-center justify-center border shadow-xs ${pillar.iconBoxBg}`}>
              <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>

            <h3 className="text-xl lg:text-2xl xl:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {pillar.title}
            </h3>

            <p className="text-xs lg:text-[13px] xl:text-sm text-slate-600 leading-relaxed font-normal">
              {pillar.desc}
            </p>

            {/* Concise Bullet Points with Emerald Dots */}
            <div className="space-y-1.5 pt-1">
              {pillar.highlights.map((h: string, i: number) => (
                <div key={i} className="flex items-center space-x-2.5 text-xs lg:text-sm text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Photo Frame */}
          <div className="md:col-span-5 flex justify-center">
            <div className="w-full max-w-sm md:max-w-md aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden bg-slate-100 shadow-lg border border-slate-200 relative group/img">
              <DriveImage
                driveId={pillar.driveId}
                alt={pillar.title}
                size={800}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-700 pointer-events-none"
                showZoomIcon={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex flex-col justify-end p-3.5 pointer-events-none z-10">
                <span className="text-xs font-bold text-white drop-shadow">
                  {pillar.tag} • VOICE Gurukul
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 relative z-30">
          <span className="text-[11px] xl:text-xs text-slate-500 font-medium truncate max-w-[70%]">
            Empowering university youth with character and composure.
          </span>

          <Link
            href={pillar.href}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center space-x-1.5 text-xs xl:text-sm font-bold text-amber-700 hover:text-amber-900 group-hover:translate-x-1 transition-all shrink-0"
          >
            <span>{pillar.linkText}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function VoicegurukulHorizontalPillars() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  const [mobilePillarIndex, setMobilePillarIndex] = useState(0);

  const pillars = PILLARS_DATA;

  // Measure vertical scroll progress of this container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  // Dynamically track active pillar index for navigation tab highlight on desktop
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      if (latest < 0.167) {
        setActivePillarIndex(0);
      } else if (latest < 0.50) {
        setActivePillarIndex(1);
      } else if (latest < 0.833) {
        setActivePillarIndex(2);
      } else {
        setActivePillarIndex(3);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Click handler on desktop navigation tabs to smoothly scroll to that pillar
  const scrollToPillar = (idx: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight;
    const scrollTarget = containerTop + (idx / (pillars.length - 1)) * (containerHeight - window.innerHeight);
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  };

  const activeMobilePillar = pillars[mobilePillarIndex];
  const MobilePillarIcon = activeMobilePillar.icon;

  return (
    <>
      {/* =========================================================================
          1. MOBILE & TABLET COMPACT HORIZONTAL CAROUSEL (Visible on < 1024px)
          - ZERO AUTO-SCROLL: Stays put and respects user control!
          - Manual Touch Swipe + Tab Buttons + Prev/Next Controls.
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

          {/* Interactive Pillar Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
            {pillars.map((p, idx) => {
              const isSelected = mobilePillarIndex === idx;
              return (
                <button
                  key={p.id}
                  onClick={() => setMobilePillarIndex(idx)}
                  className={`py-1.5 px-1 rounded-lg text-center transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 font-black shadow-sm border border-slate-200 scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                  }`}
                >
                  <div className="text-[10px] font-mono text-amber-600 font-black">{p.id}</div>
                  <div className="text-[10px] sm:text-xs truncate leading-tight">{p.tabLabel}</div>
                </button>
              );
            })}
          </div>

          {/* Active Card Container with Horizontal Swipe */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMobilePillar.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, { offset, velocity }) => {
                  if (offset.x < -35 || velocity.x < -300) {
                    setMobilePillarIndex((prev) => (prev < pillars.length - 1 ? prev + 1 : 0));
                  } else if (offset.x > 35 || velocity.x > 300) {
                    setMobilePillarIndex((prev) => (prev > 0 ? prev - 1 : pillars.length - 1));
                  }
                }}
                className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg p-4 sm:p-6 flex flex-col space-y-3 sm:space-y-4 touch-pan-y cursor-grab active:cursor-grabbing select-none"
              >
                {/* Card Top Strip */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tighter">
                      {activeMobilePillar.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${activeMobilePillar.badgeBg}`}>
                      {activeMobilePillar.tag}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    PILLAR {activeMobilePillar.id} OF 04
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                      <MobilePillarIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {activeMobilePillar.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {activeMobilePillar.desc}
                  </p>
                </div>

                {/* Compact Highlights List */}
                <div className="space-y-1.5 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                  {activeMobilePillar.highlights.map((h, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span className="font-medium leading-snug">{h}</span>
                    </div>
                  ))}
                </div>

                {/* Snug Image Frame */}
                <div className="w-full aspect-[16/9] max-h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative shadow-2xs">
                  <DriveImage
                    driveId={activeMobilePillar.driveId}
                    alt={activeMobilePillar.title}
                    size={600}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover object-center pointer-events-none"
                    showZoomIcon={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
                    <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow">
                      {activeMobilePillar.tag} • VOICE Gurukul
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Pillar {activeMobilePillar.id}
                  </span>
                  <Link
                    href={activeMobilePillar.href}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>{activeMobilePillar.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Controls: Prev / Dots / Next */}
          <div className="flex items-center justify-between pt-0.5 px-1">
            <button
              onClick={() => setMobilePillarIndex((prev) => (prev > 0 ? prev - 1 : pillars.length - 1))}
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
                  onClick={() => setMobilePillarIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    mobilePillarIndex === idx
                      ? 'w-5 bg-amber-500'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to pillar ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setMobilePillarIndex((prev) => (prev < pillars.length - 1 ? prev + 1 : 0))}
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
          2. DESKTOP 3D CURVED PILLAR STAGE (Visible on >= 1024px)
          - SCROLL TO MOVE HORIZONTALLY: Vertical page scroll drives horizontal 3D card movement!
          - ZERO OVERLAP: Cards smoothly glide in and out along 3D trajectory without colliding.
          - Top interactive navigation tabs + bottom progress line.
          - NO AUTO-SCROLL: Stays aligned precisely with scroll position.
         ========================================================================= */}
      <section
        ref={containerRef}
        id="pillars"
        className="hidden lg:block relative h-[380vh] bg-gradient-to-b from-[#fafcff] via-amber-50/20 to-[#fafcff]"
      >
        <div className="sticky top-20 h-[calc(100vh-5rem)] max-h-[720px] w-full overflow-hidden flex flex-col justify-between pt-2 pb-2 xl:pt-3 xl:pb-3 z-20">
          
          {/* Top Header Strip with Interactive Pillar Tabs */}
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-4 z-30 shrink-0">
            <div className="space-y-0.5 xl:space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-amber-600 animate-pulse" />
                <span>Core Pillars of VOICE Gurukul</span>
              </div>
              <h2 className="text-2xl lg:text-3xl xl:text-4xl font-black text-slate-900 tracking-tight font-sans">
                A Safe Oasis for University Youth
              </h2>
            </div>

            {/* Interactive Navigation Tabs */}
            <div className="flex items-center gap-1.5 xl:gap-2">
              {pillars.map((pillar, idx) => (
                <button
                  key={pillar.id}
                  onClick={() => scrollToPillar(idx)}
                  className={`px-3 xl:px-4 py-1.5 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                    activePillarIndex === idx
                      ? 'bg-slate-900 text-white shadow-md scale-105'
                      : 'bg-white/80 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono text-amber-600 mr-1 text-[11px]">{pillar.id}</span>
                  <span>{pillar.tabLabel}</span>
                </button>
              ))}

              <Link
                href="/centres"
                className="inline-flex items-center space-x-1.5 px-3 xl:px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors ml-1"
              >
                <span>Explore Centres</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* The 3D Curved Horizontal Pillar Stage */}
          <div className="relative w-full flex-1 min-h-[340px] max-h-[540px] flex items-center justify-center [perspective:1300px] [transform-style:preserve-3d] my-auto">
            {pillars.map((pillar, idx) => (
              <Pillar3DCard
                key={pillar.id}
                pillar={pillar}
                index={idx}
                total={pillars.length}
                scrollYProgress={scrollYProgress}
                onSelect={() => scrollToPillar(idx)}
              />
            ))}
          </div>

          {/* Bottom Pinned Progress Line */}
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-center z-30 pt-1.5 xl:pt-2 border-t border-slate-200/80 shrink-0">
            <div className="w-56 sm:w-72 xl:w-80 h-2 rounded-full bg-slate-200/90 overflow-hidden relative shadow-inner">
              <motion.div
                style={{ width: progressWidth }}
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full"
              />
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

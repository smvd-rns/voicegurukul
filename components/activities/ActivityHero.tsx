'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, MotionValue, AnimatePresence } from 'framer-motion';
import {
  Award,
  ShieldCheck,
  Zap,
  Compass,
  Sparkles,
  GraduationCap,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import DriveImage from './DriveImage';

const PILLARS_DATA = [
  {
    id: '01',
    tabLabel: 'Since 1996',
    tag: 'Since 1996 • 120+ Colleges',
    title: 'Two Decades of Youth Social Welfare',
    desc: 'Voluntary youth forum conducting self-help and motivational seminars for university youth across India.',
    color: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    driveId: '1LsL3AN27Q5yjUtF1_XY9gVf9EMS0rKL1',
    icon: Award,
    highlights: [
      'Over 5,000 motivational seminars conducted nationwide',
      'Active student communities in 120+ colleges across India',
      'Addiction-free, purposeful lifestyle training',
      'Serving IITs, NITs, COEP, and premier engineering hubs',
    ],
    footerTag: 'Two decades of proven youth transformation across India.',
  },
  {
    id: '02',
    tabLabel: 'Youth Crisis',
    tag: 'Modern Youth Crisis',
    title: 'Why Standard Education Alone is Not Enough',
    desc: 'Addressing the large-scale erosion of values, ethics, and emotional balance among college students.',
    color: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    driveId: '1BWVkVMX96aEGzrjsxoSKJ28vzzuoLfug',
    icon: ShieldCheck,
    highlights: [
      'Overcoming harmful habits driven by instant pleasure',
      'Managing academic overload, deadlines & exam anxiety',
      'Proven cognitive techniques to conquer stress and depression',
      'Schools and homes need expert forums like VOICE to fight this together',
    ],
    footerTag: 'Equipping youth with self-mastery to avoid burnout.',
  },
  {
    id: '03',
    tabLabel: 'Methodology',
    tag: 'Core Methodology',
    title: 'Root Cause Treatment & Mentorship',
    desc: 'Empowering students with personalized attention from high-character exemplary mentors.',
    color: 'from-sky-500 to-indigo-600',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    driveId: '1hKiWojzwVOUiAhdP33WdoDBq3mfY4f7u',
    icon: Zap,
    highlights: [
      'Removing the root cause of bad habits while managing symptoms',
      'Personalized 1-on-1 counseling and empathetic attention',
      'Self-driven volunteer mentors living exemplary vice-free lives',
      'Guided by commitment, compassion, respect & affordability',
    ],
    footerTag: 'Personalized attention from exemplary volunteer mentors.',
  },
  {
    id: '04',
    tabLabel: 'Wellness',
    tag: 'Societal Wellness Model',
    title: 'Proactive Vice Prevention & Skill Training',
    desc: 'Enlightening students and corporates before they fall prey to destructive habits.',
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    driveId: '1yoyB3wLOpCaIOrsoFoxzAHwSWXSjOKq0',
    icon: Compass,
    highlights: [
      'Proactive training for smoking, alcohol & substance prevention',
      'Facilitation centres inculcating moral and spiritual values',
      'Vocational training, soft skills & software bootcamps',
      'Inspiring case studies, healthy peer circles & counseling',
    ],
    footerTag: 'All-round wellness model for lasting societal welfare.',
  },
];

// Single 3D Curved Cylindrical Card Component
function ActivityPillarCard({
  pillar,
  index,
  scrollYProgress,
  onSelect,
}: {
  pillar: (typeof PILLARS_DATA)[0];
  index: number;
  scrollYProgress: MotionValue<number>;
  onSelect?: () => void;
}) {
  const c = index / 3;
  const s = 1 / 3;

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

  // 1. Horizontal Curved Trajectory along cylinder
  const x = useTransform(
    scrollYProgress,
    inputPoints,
    ['110vw', '58vw', '28vw', '0vw', '-28vw', '-58vw', '-110vw']
  );

  // 2. 3D Cylindrical Curvature (rotateY):
  const scrollRotateY = useTransform(
    scrollYProgress,
    inputPoints,
    [-26, -18, -9, 0, 9, 18, 26]
  );

  // 3. 3D Banking Tilt along curve (rotateZ):
  const rotateZ = useTransform(
    scrollYProgress,
    inputPoints,
    [2.2, 1.5, 0.7, 0, -0.7, -1.5, -2.2]
  );

  // 4. 3D Depth along Z axis:
  const z = useTransform(
    scrollYProgress,
    inputPoints,
    [-360, -200, -70, 0, -70, -200, -360]
  );

  // 5. Scale Arc:
  const scale = useTransform(
    scrollYProgress,
    inputPoints,
    [0.85, 0.92, 0.97, 1, 0.97, 0.92, 0.85]
  );

  // 6. Smooth Opacity Curve:
  const opacity = useTransform(
    scrollYProgress,
    inputPoints,
    [0, 0.7, 0.95, 1, 0.95, 0.7, 0]
  );

  // 7. Dynamic Z-Index Stacking:
  const zIndex = useTransform(
    scrollYProgress,
    inputPoints,
    [5, 10, 20, 30, 20, 10, 5]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    setHoverRotX(-((my - cy) / cy) * 6);
    setHoverRotY(((mx - cx) / cx) * 6);
    setGlarePos({
      x: (mx / rect.width) * 100,
      y: (my / rect.height) * 100,
      opacity: 0.12,
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
        className="pointer-events-auto w-full max-w-4xl lg:max-w-5xl h-full max-h-[520px] lg:max-h-[550px] rounded-[36px] bg-white border border-slate-200/90 shadow-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden flex flex-col justify-between group transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] cursor-pointer antialiased"
      >

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative z-30">
          <div className="flex items-center space-x-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tighter">
              {pillar.id}
            </span>
            <span className="text-slate-300">•</span>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold border shadow-xs ${pillar.badgeBg}`}
            >
              {pillar.tag}
            </span>
          </div>
        </div>

        {/* Card Content Grid (2 Columns) */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center my-auto py-2 relative z-30">
          {/* Left Column: Descriptive Content & 4 Bullets */}
          <div className="lg:col-span-7 space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {pillar.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {pillar.desc}
            </p>

            {/* Exactly 4 Concise Bullet Points with Emerald Dots */}
            <div className="space-y-1.5 pt-1">
              {pillar.highlights.map((h, i) => (
                <div key={i} className="flex items-center space-x-3 text-xs sm:text-sm text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Clean Rounded Photo Frame with Google Drive Image */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm sm:max-w-md aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 shadow-xl border border-slate-200/90 relative group/img">
              <DriveImage
                driveId={pillar.driveId}
                alt={pillar.title}
                size={900}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Card Footer with Tagline */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium relative z-30">
          <span>{pillar.footerTag}</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function ActivityHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const scrollToPillar = (idx: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const start = container.offsetTop;
    const totalScroll = container.offsetHeight - window.innerHeight;
    const targetScroll = start + (idx / 3) * totalScroll;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Mobile Slider State (1-card at a time, zero overlap, true 3D slider feel)
  const [mobileIndex, setMobileIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll every 5 seconds on mobile
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setMobileIndex((prev) => (prev + 1) % PILLARS_DATA.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [mobileIndex, isPaused]);

  const paginateMobile = (newDirection: number) => {
    setDirection(newDirection);
    setMobileIndex((prev) => (prev + newDirection + PILLARS_DATA.length) % PILLARS_DATA.length);
  };

  const goToMobilePillar = (idx: number) => {
    setDirection(idx > mobileIndex ? 1 : -1);
    setMobileIndex(idx);
  };

  const activeMobilePillar = PILLARS_DATA[mobileIndex];
  const MobilePillarIcon = activeMobilePillar.icon;

  const mobile3DVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 70 : -70,
      rotateY: dir > 0 ? 22 : -22,
      opacity: 0,
      scale: 0.94,
    }),
    center: {
      x: 0,
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 280, damping: 28 },
        rotateY: { duration: 0.35, ease: 'easeOut' as const },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 70 : -70,
      rotateY: dir < 0 ? 22 : -22,
      opacity: 0,
      scale: 0.94,
      transition: {
        x: { type: 'spring' as const, stiffness: 280, damping: 28 },
        rotateY: { duration: 0.25, ease: 'easeIn' as const },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      },
    }),
  };

  return (
    <div className="relative">
      {/* 
        =========================================================================
        1. DEDICATED MOBILE & TABLET 3D SLIDER CARDS (< 1024px)
        - ZERO OVERLAP: Renders exactly 1 active card at a time with 3D perspective!
        - ZERO SCROLL-TRAP: Natural height, no 380vh scroll trap on phone screens.
        - Swipeable & Auto-scrolling (5s timer per slide with countdown line).
        - 4 Quick-select tabs, Prev / Next controls, and visual dot indicators.
        =========================================================================
      */}
      <section
        id="welfare-pillars-mobile"
        className="block lg:hidden w-full py-6 px-3 sm:px-6 bg-gradient-to-b from-sky-50/70 via-indigo-50/20 to-[#fafcff]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div className="max-w-md sm:max-w-xl mx-auto space-y-4">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-amber-500/15 border border-sky-300/80 text-sky-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>VOICE Core Initiatives • Youth Social Welfare</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Activities &amp; Core Welfare Pillars
            </h2>
          </div>

          {/* 4 Interactive Quick Tabs with Auto-Scroll Countdown Bar */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-2xs">
            {PILLARS_DATA.map((p, idx) => {
              const isSelected = mobileIndex === idx;
              return (
                <button
                  key={p.id}
                  onClick={() => goToMobilePillar(idx)}
                  className={`relative py-1.5 px-1 rounded-xl text-center transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-white text-slate-900 font-black shadow-sm border border-slate-200 scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      key={`mob-pillar-timer-${idx}-${mobileIndex}`}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-[2px] bg-amber-500 rounded-full"
                    />
                  )}
                  <div className="text-[10px] font-mono text-amber-600 font-black">{p.id}</div>
                  <div className="text-[10px] sm:text-xs truncate leading-tight">{p.tabLabel}</div>
                </button>
              );
            })}
          </div>

          {/* 3D Perspective Card Container (Only 1 card mounted, 0% overlap) */}
          <div className="relative w-full [perspective:1000px] overflow-hidden py-1">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeMobilePillar.id}
                custom={direction}
                variants={mobile3DVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (offset.x < -40 || swipe < -400) {
                    paginateMobile(1);
                  } else if (offset.x > 40 || swipe > 400) {
                    paginateMobile(-1);
                  }
                }}
                className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xl p-5 sm:p-6 flex flex-col space-y-3.5 select-none touch-pan-y"
              >
                {/* Card Top Strip */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tighter">
                      {activeMobilePillar.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${activeMobilePillar.badgeBg}`}
                    >
                      {activeMobilePillar.tag}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    PILLAR {activeMobilePillar.id} / 04
                  </span>
                </div>

                {/* Pillar Icon & Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs shrink-0">
                      <MobilePillarIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {activeMobilePillar.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {activeMobilePillar.desc}
                  </p>
                </div>

                {/* 4 Concise Highlights with Emerald Dots */}
                <div className="space-y-1.5 bg-slate-50/90 p-2.5 sm:p-3 rounded-2xl border border-slate-100">
                  {activeMobilePillar.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start space-x-2 text-xs text-slate-700 font-medium"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <span className="leading-snug">{h}</span>
                    </div>
                  ))}
                </div>

                {/* Responsive Image Showcase */}
                <div className="w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 shadow-md border border-slate-200/90 relative">
                  <DriveImage
                    driveId={activeMobilePillar.driveId}
                    alt={activeMobilePillar.title}
                    size={800}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Bottom Tagline */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="truncate">{activeMobilePillar.footerTag}</span>
                  <span className="text-amber-600 font-bold shrink-0 ml-2">Swipe ↔</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls: Prev / Indicators / Next */}
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              onClick={() => paginateMobile(-1)}
              className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Previous Pillar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 4 Interactive Dots */}
            <div className="flex items-center space-x-2">
              {PILLARS_DATA.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToMobilePillar(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    mobileIndex === idx
                      ? 'w-7 bg-amber-500 shadow-xs'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => paginateMobile(1)}
              className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Next Pillar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* 
        =========================================================================
        2. DESKTOP 3D CURVED CYLINDRICAL STAGE (Visible on >= 1024px)
        - Locked at sticky top-20 h-[calc(100vh-5rem)] over 380vh of scroll.
        - Cards glide smoothly along curved horizontal 3D cylindrical trajectory.
        =========================================================================
      */}
      <section
        id="welfare-pillars"
        ref={containerRef}
        className="hidden lg:block relative h-[380vh] bg-gradient-to-b from-sky-50/70 via-indigo-50/20 to-[#fafcff]"
      >
        <div className="sticky top-20 h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col justify-between pt-3 pb-4 z-20">
          
          {/* Top Header Strip (Always fully visible below navbar) */}
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between z-30">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-amber-500/15 border border-sky-300/80 text-sky-950 text-[11px] font-black uppercase tracking-widest shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>VOICE Core Initiatives • Youth Social Welfare</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
                Activities &amp; Core Welfare Pillars
              </h1>
            </div>
          </div>

          {/* The 3D Curved Horizontal Stage (Smooth side-by-side transition, 3D depth, crystal clear text!) */}
          <div className="relative w-full h-[calc(100vh-13rem)] flex items-center justify-center [perspective:1300px] [transform-style:preserve-3d] overflow-hidden">
            {PILLARS_DATA.map((pillar, idx) => (
              <ActivityPillarCard
                key={pillar.id}
                pillar={pillar}
                index={idx}
                scrollYProgress={scrollYProgress}
                onSelect={() => scrollToPillar(idx)}
              />
            ))}
          </div>

          {/* Bottom Pinned Minimal Progress Line */}
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-center z-30 pt-2 border-t border-slate-200/80">
            <div className="w-56 sm:w-96 h-2 rounded-full bg-slate-200/90 overflow-hidden relative shadow-inner">
              <motion.div
                style={{ width: progressWidth }}
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-full"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Modern High-Impact Milestone Showcase (Harmonious Light Theme) */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#fafcff] via-sky-50/30 to-white border-b border-slate-100 overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-amber-400/10 via-sky-400/10 to-amber-400/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto rounded-[36px] p-8 sm:p-12 lg:p-14 bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.12)] overflow-hidden">
          {/* Internal Atmospheric Glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center space-y-6">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-300/80 text-amber-900 text-xs font-bold uppercase tracking-widest shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>VOICE Social Welfare Milestone • 3-Year Record</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>

            {/* Heroic Headline without any zig-zag underline */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight font-sans max-w-4xl mx-auto">
              In the last 3 years, VOICE has touched the lives of{' '}
              <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                1 Lakh+ Youths &amp; Teenagers
              </span>
            </h2>

            {/* 4 Clean Light-Theme Metric Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 max-w-4xl mx-auto">
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-200/80 transition-all text-center group shadow-xs hover:shadow-md">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">5,000+</div>
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold pt-0.5">Seminars Conducted</div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-200/80 transition-all text-center group shadow-xs hover:shadow-md">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">120+</div>
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold pt-0.5">Colleges Nationwide</div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/60 hover:bg-sky-50 border border-sky-200/80 transition-all text-center group shadow-xs hover:shadow-md">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">Since 1996</div>
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold pt-0.5">Pune Founding Hub</div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/80 transition-all text-center group shadow-xs hover:shadow-md">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">50+</div>
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold pt-0.5">Corporate Partners</div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}

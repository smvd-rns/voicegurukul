'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, MotionValue, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Zap, 
  Award, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface Course3DCardProps {
  course: any;
  index: number;
  scrollYProgress: MotionValue<number>;
  onSelect?: () => void;
}

// 3D Curved Card for Desktop (>= 1024px)
function Course3DCard({ course, index, scrollYProgress, onSelect }: Course3DCardProps) {
  const c = index / 2;
  const s = 1 / 2;

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

  // 1. Horizontal Curved Trajectory: Inactive cards pushed off-screen (100vw / -100vw)
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

  // 6. Smooth Opacity Curve: ZERO OVERLAP (inactive cards are invisible)
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

  const Icon = course.icon;

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
        className="pointer-events-auto w-full max-w-4xl lg:max-w-5xl rounded-2xl lg:rounded-3xl xl:rounded-[32px] bg-white border border-slate-200 shadow-2xl p-4 sm:p-5 lg:p-5 xl:p-7 relative overflow-hidden flex flex-col justify-between group transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(79,70,229,0.25)] cursor-pointer antialiased"
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
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 xl:pb-2.5 relative z-30">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl lg:text-2xl xl:text-3xl font-black text-slate-900 font-mono tracking-tighter">
              {course.id}
            </span>
            <span className="text-slate-300">•</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] xl:text-xs font-bold border shadow-xs ${course.badgeBg}`}>
              {course.badge}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] xl:text-xs font-bold text-slate-400">
            <span>COURSE {course.id} OF 03</span>
          </div>
        </div>

        {/* Card Body Grid (2 columns on Desktop) */}
        <div className="grid md:grid-cols-12 gap-4 lg:gap-6 xl:gap-8 items-center my-2 xl:my-3 relative z-30">
          {/* Left Column: Descriptive Copy */}
          <div className="md:col-span-6 space-y-2 lg:space-y-2.5 xl:space-y-3.5">
            <div className={`w-9 h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl lg:rounded-2xl flex items-center justify-center border shadow-xs ${course.iconBoxBg}`}>
              <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>

            <h3 className="text-xl lg:text-2xl xl:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {course.title}
            </h3>

            <p className="text-xs lg:text-[13px] xl:text-sm text-slate-600 leading-relaxed font-normal line-clamp-3 xl:line-clamp-none">
              {course.desc}
            </p>

            <div className="pt-0.5">
              <Link
                href="/programmes"
                className="px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] xl:text-xs uppercase tracking-wider shadow-md inline-flex items-center space-x-2 transition-colors group/btn"
              >
                <span>Explore Detailed Curriculum</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Column: Featured Interactive Modules */}
          <div className="md:col-span-6 bg-slate-50/90 rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-slate-200/90 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between pb-0.5">
              <h4 className="text-[10px] xl:text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Featured Modules &amp; Practical Sessions:
              </h4>
              <span className="text-[9px] xl:text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Interactive
              </span>
            </div>

            {course.modules.map((mod: string, mIdx: number) => (
              <div
                key={mIdx}
                className="flex items-center space-x-2 text-[11px] lg:text-xs text-slate-800 font-semibold py-1.5 px-2.5 rounded-lg lg:rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:translate-x-1 transition-transform"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{mod}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 xl:pt-2.5 relative z-30">
          <span className="text-[11px] xl:text-xs text-slate-500 font-medium truncate max-w-[70%]">
            Systematic 8-level wisdom curriculum across top university campuses.
          </span>

          <Link
            href="/programmes"
            className="inline-flex items-center space-x-1.5 text-xs xl:text-sm font-bold text-indigo-700 hover:text-indigo-900 group-hover:translate-x-1 transition-all shrink-0"
          >
            <span>Course Syllabus</span>
            <ChevronRight className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function VoicegurukulCourseCards() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const [mobileCourseIndex, setMobileCourseIndex] = useState(0);

  // Measure vertical scroll progress of this container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const courses = [
    {
      id: '01',
      title: 'Discover Yourself (DYS)',
      tabLabel: 'DYS Foundation',
      badge: 'Foundation • 6 Modules',
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      iconBoxBg: 'bg-amber-50 text-amber-600 border-amber-200',
      icon: BookOpen,
      desc: 'Scientific exploration of mind mechanics, habits, the purpose of human life, and practical techniques to conquer anxiety and digital addiction.',
      modules: [
        'Art of Mind Control & Positive Thinking',
        'Scientific Evidence for Soul & Consciousness',
        'Laws of Karma & Destiny vs Free Will',
        'Why Do Bad Things Happen to Good People?',
        'Yoga for Modern Times & Mantra Science',
      ],
    },
    {
      id: '02',
      title: 'Stress to Strength',
      tabLabel: 'Stress Mastery',
      badge: 'Mind Mastery • 8 Workshops',
      color: 'from-sky-500 to-indigo-600',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-200',
      iconBoxBg: 'bg-sky-50 text-sky-600 border-sky-200',
      icon: Zap,
      desc: 'Converting academic pressure into laser focus, mastering emotional intelligence, and building resilience against peer pressure and depression.',
      modules: [
        'Overcoming Procrastination & Screen Addiction',
        'Memory Enhancement & Exam Concentration',
        'Handling Rejection, Breakups & Failure',
        'Conflict Resolution & Interpersonal Harmony',
        'Healthy Diet, Circadian Rhythm & High Energy',
      ],
    },
    {
      id: '03',
      title: 'Vedic Leadership & Ethics',
      tabLabel: 'Leadership',
      badge: 'Leadership • 10 Modules',
      color: 'from-purple-500 to-rose-600',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-200',
      iconBoxBg: 'bg-purple-50 text-purple-600 border-purple-200',
      icon: Award,
      desc: 'Universal principles of visionary governance from the Ramayana, Mahabharata, and Chanakya Niti tailored for modern corporate and entrepreneurial leaders.',
      modules: [
        'Principle-Centered Leadership & Integrity',
        'Servant Leadership vs Ego-Driven Management',
        'Strategic Decision Making Under Uncertainty',
        'Building High-Trust Youth Teams',
        'Holistic Work-Life Balance for Executives',
      ],
    },
  ];

  // Dynamically track active course index for navigation tab highlight on desktop
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      if (latest < 0.35) {
        setActiveCourseIndex(0);
      } else if (latest < 0.70) {
        setActiveCourseIndex(1);
      } else {
        setActiveCourseIndex(2);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Auto-scroll exclusively for Mobile view (cycles through courses every 5s)
  useEffect(() => {
    const timer = setInterval(() => {
      setMobileCourseIndex((prev) => (prev + 1) % courses.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [mobileCourseIndex, courses.length]);

  // Click handler on desktop navigation tabs to scroll to that course
  const scrollToCourse = (idx: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight;
    const scrollTarget = containerTop + (idx / 2) * (containerHeight - window.innerHeight);
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  };

  const activeMobileCourse = courses[mobileCourseIndex];
  const MobileCourseIcon = activeMobileCourse.icon;

  return (
    <>
      {/* =========================================================================
          1. MOBILE & TABLET COMPACT COURSE CAROUSEL (Visible on < 1024px)
          - ZERO OVERLAP: Only ONE card is rendered at any time!
          - ZERO WASTED SPACE: Tight, snug vertical padding (py-4 sm:py-6).
          - Tab buttons + Prev/Next controls.
         ========================================================================= */}
      <section className="block lg:hidden w-full py-4 sm:py-6 px-3 sm:px-6 bg-gradient-to-b from-[#fafcff] via-sky-50/20 to-[#fafcff]">
        <div className="max-w-md sm:max-w-xl mx-auto space-y-3 sm:space-y-4">

          {/* Snug Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-sky-100/90 border border-sky-200 text-sky-900 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-sky-600 animate-pulse" />
              <span>Systematic Curriculum</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Our Flagship Youth Courses
            </h2>
          </div>

          {/* Interactive Course Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
            {courses.map((c, idx) => {
              const isSelected = mobileCourseIndex === idx;
              return (
                <button
                  key={c.id}
                  onClick={() => setMobileCourseIndex(idx)}
                  className={`relative py-1.5 px-1 rounded-lg text-center transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-white text-slate-900 font-black shadow-sm border border-slate-200 scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                  }`}
                >
                  {/* Subtle auto-scroll countdown timer line */}
                  {isSelected && (
                    <motion.div
                      key={`mob-course-timer-${idx}-${mobileCourseIndex}`}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-[2px] bg-indigo-600 rounded-full"
                    />
                  )}
                  <div className="text-[10px] font-mono text-indigo-600 font-black">{c.id}</div>
                  <div className="text-[10px] sm:text-xs truncate leading-tight">{c.tabLabel}</div>
                </button>
              );
            })}
          </div>

          {/* Active Card Container (100% isolated, zero overlap, snug height) */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMobileCourse.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg p-4 sm:p-6 flex flex-col space-y-3 sm:space-y-4"
              >
                {/* Card Top Strip */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tighter">
                      {activeMobileCourse.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${activeMobileCourse.badgeBg}`}>
                      {activeMobileCourse.badge}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    COURSE {activeMobileCourse.id} OF 03
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs ${activeMobileCourse.iconBoxBg}`}>
                      <MobileCourseIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {activeMobileCourse.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {activeMobileCourse.desc}
                  </p>
                </div>

                {/* Featured Interactive Modules */}
                <div className="space-y-1.5 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between pb-0.5">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Featured Modules:
                    </h4>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Interactive
                    </span>
                  </div>
                  {activeMobileCourse.modules.map((mod: string, mIdx: number) => (
                    <div
                      key={mIdx}
                      className="flex items-start space-x-2 text-xs text-slate-800 font-semibold p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{mod}</span>
                    </div>
                  ))}
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href="/programmes"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>View Syllabus</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href="/programmes"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Enroll Now →
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Controls: Prev / Next + Dots (No empty gap below) */}
          <div className="flex items-center justify-between pt-0.5 px-1">
            <button
              onClick={() => setMobileCourseIndex((prev) => (prev > 0 ? prev - 1 : courses.length - 1))}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Indicator Dots */}
            <div className="flex items-center space-x-1.5">
              {courses.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setMobileCourseIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    mobileCourseIndex === idx
                      ? 'w-5 bg-indigo-600'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to course ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setMobileCourseIndex((prev) => (prev < courses.length - 1 ? prev + 1 : 0))}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          2. DESKTOP 3D CURVED COURSE STAGE (Visible on >= 1024px)
          - Snug vertical container without empty voids.
          - 0% Overlap guarantee: Inactive cards have opacity: 0 and do not collide.
         ========================================================================= */}
      <section
        ref={containerRef}
        id="programmes"
        className="hidden lg:block relative h-[320vh] bg-gradient-to-b from-[#fafcff] via-sky-50/20 to-[#fafcff]"
      >
        <div className="sticky top-20 h-[calc(100vh-5rem)] max-h-[720px] w-full overflow-hidden flex flex-col justify-between pt-2 pb-2 xl:pt-3 xl:pb-3 z-20">
          
          {/* Top Header Strip with Interactive Course Tabs */}
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-4 z-30 shrink-0">
            <div className="space-y-0.5 xl:space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-sky-100/90 border border-sky-200 text-sky-900 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-sky-600 animate-pulse" />
                <span>Systematic Curriculum</span>
              </div>
              <h2 className="text-2xl lg:text-3xl xl:text-4xl font-black text-slate-900 tracking-tight font-sans">
                Our Flagship Youth Courses
              </h2>
            </div>

            {/* Interactive Navigation Tabs */}
            <div className="flex items-center gap-1.5 xl:gap-2">
              {courses.map((course, idx) => (
                <button
                  key={course.id}
                  onClick={() => scrollToCourse(idx)}
                  className={`px-3 xl:px-4 py-1.5 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                    activeCourseIndex === idx
                      ? 'bg-slate-900 text-white shadow-md scale-105'
                      : 'bg-white/80 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{course.title.split(' ')[0]}</span>
                  <span className="ml-1 opacity-75 font-mono text-[10px]">0{idx + 1}</span>
                </button>
              ))}

              <Link
                href="/programmes"
                className="inline-flex items-center space-x-1.5 px-3 xl:px-3.5 py-1.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors ml-1"
              >
                <span>View Full Syllabus</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* The 3D Curved Horizontal Course Stage (Flex-1 fills available space smoothly) */}
          <div className="relative w-full flex-1 min-h-[320px] max-h-[520px] flex items-center justify-center [perspective:1300px] [transform-style:preserve-3d] my-auto">
            {courses.map((course, idx) => (
              <Course3DCard
                key={course.id}
                course={course}
                index={idx}
                scrollYProgress={scrollYProgress}
                onSelect={() => scrollToCourse(idx)}
              />
            ))}
          </div>

          {/* Bottom Pinned Progress Line */}
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-center z-30 pt-1.5 xl:pt-2 border-t border-slate-200/80 shrink-0">
            <div className="w-56 sm:w-72 xl:w-80 h-2 rounded-full bg-slate-200/90 overflow-hidden relative shadow-inner">
              <motion.div
                style={{ width: progressWidth }}
                className="h-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 rounded-full"
              />
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

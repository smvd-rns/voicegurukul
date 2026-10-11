'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Zap, 
  Award, 
  ChevronRight 
} from 'lucide-react';

interface Course3DCardProps {
  course: any;
  index: number;
  scrollYProgress: MotionValue<number>;
  onSelect?: () => void;
}

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
        className="pointer-events-auto w-full max-w-4xl lg:max-w-5xl h-full max-h-[530px] lg:max-h-[560px] rounded-[36px] bg-white border border-slate-200/90 shadow-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden flex flex-col justify-between group transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(79,70,229,0.25)] cursor-pointer antialiased"
      >

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative z-30">
          <div className="flex items-center space-x-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tighter">
              {course.id}
            </span>
            <span className="text-slate-300">•</span>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border shadow-xs ${course.badgeBg}`}>
              {course.badge}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
            <span>COURSE {course.id} OF 03</span>
          </div>
        </div>

        {/* Card Body Grid */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center my-auto py-2 relative z-30">
          {/* Left Column: Descriptive Copy */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border shadow-xs ${course.iconBoxBg}`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {course.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {course.desc}
            </p>

            <div className="pt-1">
              <Link
                href="/programmes"
                className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md inline-flex items-center space-x-2 transition-colors group/btn"
              >
                <span>Explore Detailed Curriculum</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Column: Featured Interactive Modules */}
          <div className="lg:col-span-6 bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-2 shadow-inner">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Featured Modules &amp; Practical Sessions:
              </h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Interactive
              </span>
            </div>

            {course.modules.map((mod: string, mIdx: number) => (
              <div
                key={mIdx}
                className="flex items-center space-x-2.5 text-xs text-slate-800 font-semibold p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:translate-x-1 transition-transform"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{mod}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 relative z-30">
          <span className="text-xs text-slate-500 font-medium">
            Systematic 8-level wisdom curriculum across top university campuses.
          </span>

          <Link
            href="/programmes"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-indigo-700 hover:text-indigo-900 group-hover:translate-x-1 transition-all"
          >
            <span>Course Syllabus</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function VoicegurukulCourseCards() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);

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
      badge: 'Foundation Course • 6 Modules',
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
      badge: 'Advanced Leadership • 10 Modules',
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

  // Dynamically track active course index for navigation tab highlight
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

  // Click handler on navigation tabs to scroll to that course
  const scrollToCourse = (idx: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight;
    const scrollTarget = containerTop + (idx / 2) * (containerHeight - window.innerHeight);
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  };

  return (
    <section
      ref={containerRef}
      id="programmes"
      className="relative h-[380vh] bg-gradient-to-b from-[#fafcff] via-sky-50/20 to-[#fafcff]"
    >
      {/* 
        CRITICAL PINNING:
        Locked at `sticky top-20 h-[calc(100vh-5rem)]` directly below the 80px navbar!
        Ensures the header "Our Flagship Youth Courses" is always 100% visible and NEVER clipped.
      */}
      <div className="sticky top-20 h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col justify-between pt-3 pb-4 z-20">
        
        {/* Top Header Strip with Interactive Course Tabs (Fully visible below navbar) */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-30">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-sky-100/90 border border-sky-200 text-sky-900 text-[11px] font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              <span>Systematic Curriculum</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
              Our Flagship Youth Courses
            </h2>
          </div>

          {/* Interactive Navigation Tabs that track and link to horizontal scroll */}
          <div className="flex items-center gap-2">
            {courses.map((course, idx) => (
              <button
                key={course.id}
                onClick={() => scrollToCourse(idx)}
                className={`px-4 py-1.5 rounded-2xl text-xs font-bold transition-all duration-300 ${
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
              className="hidden lg:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors ml-1"
            >
              <span>View Full Syllabus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* The 3D Curved Horizontal Course Stage (Smooth side-by-side transition, 3D depth, crystal clear text!) */}
        <div className="relative w-full h-[calc(100vh-13rem)] flex items-center justify-center [perspective:1300px] [transform-style:preserve-3d] overflow-hidden">
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
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-center z-30 pt-2 border-t border-slate-200/80">
          <div className="w-48 sm:w-80 h-2 rounded-full bg-slate-200/90 overflow-hidden relative shadow-inner">
            <motion.div
              style={{ width: progressWidth }}
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 rounded-full"
            />
          </div>
        </div>

      </div>
    </section>
  );
}

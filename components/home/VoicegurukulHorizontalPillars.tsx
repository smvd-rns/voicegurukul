'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Award,
  Compass,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import DriveImage from '@/components/activities/DriveImage';

// Single 3D Curved Card Component
function Pillar3DCard({
  pillar,
  index,
  scrollYProgress,
  onSelect,
}: {
  pillar: any;
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

  // 1. Horizontal Curved Trajectory: smooth side-by-side transition along cylinder
  const x = useTransform(
    scrollYProgress,
    inputPoints,
    ['110vw', '58vw', '28vw', '0vw', '-28vw', '-58vw', '-110vw']
  );

  // 2. 3D Cylindrical Curvature (rotateY):
  // Entering: angled inward (-26deg) facing center
  // Center: perfectly flat (0deg) for crystal-clear readability
  // Exiting: angled inward (+26deg) facing center
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
  // Background cards sit back at -360px; active card sits at exact 0px (native 1:1 plane)
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
        className="pointer-events-auto w-full max-w-4xl lg:max-w-5xl h-full max-h-[530px] lg:max-h-[560px] rounded-[36px] bg-white border border-slate-200/90 shadow-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden flex flex-col justify-between group transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] cursor-pointer antialiased"
      >

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative z-30">
          <div className="flex items-center space-x-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tighter">
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

        {/* Card Content Grid */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center my-auto py-2 relative z-30">
          {/* Left Column: Descriptive Content & Highlights */}
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

            {/* Concise Bullet Points with Emerald Dots */}
            <div className="space-y-1.5 pt-1">
              {pillar.highlights.map((h: string, i: number) => (
                <div key={i} className="flex items-center space-x-3 text-xs sm:text-sm text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Photo Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm sm:max-w-md aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 shadow-xl border border-slate-200/90 relative group/img">
              <DriveImage
                driveId={pillar.driveId}
                alt={pillar.title}
                size={800}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-700"
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
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-900 group-hover:translate-x-1 transition-all"
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

  // Measure vertical scroll progress of this container
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

  const pillars = [
    {
      id: '01',
      tag: 'Campus Wellness',
      title: 'Drug-Free & Inspiring VOICE Lifestyle',
      desc: 'Clean, supportive student hostels near top universities providing peaceful study environments and positive peer culture.',
      color: 'from-emerald-500 to-teal-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentColor: '#10b981',
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
      title: 'Mind Power & Exam Stress Mastery',
      desc: 'Scientific meditation and concentration tools that help engineering & medical students convert stress into peak focus.',
      color: 'from-sky-500 to-indigo-700',
      badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
      accentColor: '#0284c7',
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
      title: 'Character with High Competence',
      desc: 'Blending professional ethics and integrity with cutting-edge academic excellence for enduring life success.',
      color: 'from-amber-500 to-orange-700',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      accentColor: '#f59e0b',
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
      title: 'Vedic Leadership & Life Mentorship',
      desc: 'Personal 1-on-1 guidance from IIT, NIT alumni and corporate mentors to navigate careers and relationships gracefully.',
      color: 'from-purple-500 to-rose-700',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      accentColor: '#8b5cf6',
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

  return (
    <section
      ref={containerRef}
      className="relative h-[380vh] bg-gradient-to-b from-[#fafcff] via-amber-50/25 to-[#fafcff]"
    >
      {/* 
        CRITICAL PINNING:
        Locked at `sticky top-20 h-[calc(100vh-5rem)]` directly below the 80px navbar!
        Ensures the header "A Safe Oasis for University Youth" is always 100% visible and NEVER clipped.
      */}
      <div className="sticky top-20 h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col justify-between pt-3 pb-4 z-20">

        {/* Top Header Strip (Fully visible below navbar) */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between z-30">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-[11px] font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Core Pillars of VOICE Gurukul</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
              A Safe Oasis for University Youth
            </h2>
          </div>
        </div>

        {/* The 3D Curved Horizontal Stage (Smooth side-by-side transition, 3D depth, crystal clear text!) */}
        <div className="relative w-full h-[calc(100vh-13rem)] flex items-center justify-center [perspective:1300px] [transform-style:preserve-3d] overflow-hidden">
          {pillars.map((pillar, idx) => (
            <Pillar3DCard
              key={pillar.id}
              pillar={pillar}
              index={idx}
              scrollYProgress={scrollYProgress}
              onSelect={() => scrollToPillar(idx)}
            />
          ))}
        </div>

        {/* Bottom Pinned Progress Line */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-center z-30 pt-2 border-t border-slate-200/80">
          <div className="w-48 sm:w-80 h-2 rounded-full bg-slate-200/90 overflow-hidden relative shadow-inner">
            <motion.div
              style={{ width: progressWidth }}
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-full"
            />
          </div>
        </div>

      </div>
    </section>
  );
}

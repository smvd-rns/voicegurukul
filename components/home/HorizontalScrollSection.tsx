'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  ShieldCheck, 
  Zap, 
  Award, 
  MapPin, 
  ArrowUpRight, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import DriveImage from '@/components/activities/DriveImage';

export default function HorizontalScrollSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Measure vertical scroll progress of this container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Smooth spring for high-end cinematic glide
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 75,
    damping: 22,
    mass: 0.5,
  });

  // Translate horizontal track across 4 panels
  const x = useTransform(smoothProgress, [0, 1], ['0%', '-75%']);
  const progressWidth = useTransform(smoothProgress, [0, 1], ['15%', '100%']);

  const portals = [
    {
      id: '01',
      sector: 'SECTOR-ALPHA // VOICE LIFESTYLE SANCTUARY',
      title: 'Drug-Free VOICE Lifestyle',
      tagline: 'Clean, supportive student hostels near premier universities.',
      depthZ: '-62.4m',
      accent: '#00f0ff',
      borderGlow: 'hover:border-[#00f0ff]/60 hover:shadow-[0_0_50px_rgba(0,240,255,0.25)]',
      stats: [
        { label: 'Substance-Free', val: '100%' },
        { label: 'Nutritious Meals', val: 'Sattvic Daily' },
        { label: 'Focus Index', val: '99.4%' },
      ],
      points: [
        'Pure living environment free from smoking, alcohol, and late-night digital burnout',
        'Peaceful study halls fostering intense focus and joyful academic camaraderie',
        'Daily wholesome vegetarian prasadam nourishing physical vitality and clarity',
      ],
      driveId: '16DDNYKy6WSL41Gb6rLVaS5tYi7-E5eyt',
    },
    {
      id: '02',
      sector: 'SECTOR-BETA // VEDIC MIND LAB',
      title: 'Scientific Mind Mastery',
      tagline: 'Discover Yourself (DYS) — Systematic ancient psychology for modern youth.',
      depthZ: '-68.2m',
      accent: '#f43f5e',
      borderGlow: 'hover:border-[#f43f5e]/60 hover:shadow-[0_0_50px_rgba(244,63,94,0.25)]',
      stats: [
        { label: 'Scientific Modules', val: '06 Tracks' },
        { label: 'Mantra Practice', val: 'Daily 20m' },
        { label: 'Stress Reduction', val: '94% Reported' },
      ],
      points: [
        'Decoding consciousness, habit loops, and emotional equilibrium through Gita science',
        'Ancient sound vibration meditation inducing measurable alpha brainwave coherence',
        'Converting exam anxiety and career panic into rock-solid inner composure',
      ],
      driveId: '1s3Ai7y4ZxfhWqvG68mANk4tKMSlEm9mP',
    },
    {
      id: '03',
      sector: 'SECTOR-GAMMA // MORAL LEADERSHIP',
      title: 'Character With Competence',
      tagline: '1-on-1 mentorship from IIT, NIT alumni, scientists, and industry leaders.',
      depthZ: '-74.8m',
      accent: '#38bdf8',
      borderGlow: 'hover:border-[#38bdf8]/60 hover:shadow-[0_0_50px_rgba(56,189,248,0.25)]',
      stats: [
        { label: 'Alumni Network', val: '26,500+' },
        { label: 'Active Mentors', val: '500+' },
        { label: 'IIT / GATE Ranks', val: 'Top 100' },
      ],
      points: [
        'Senior researchers and corporate executives coaching youth on ethics and resilience',
        'Universal principles of servant leadership from Ramayana and Chanakya Niti',
        'Producing engineers, doctors, and civil servants governed by unwavering integrity',
      ],
      driveId: '1dgEsq4Yy9q5kWfVpCYIeBqRGOWxXRNsV',
    },
    {
      id: '04',
      sector: 'SECTOR-DELTA // NATIONWIDE MESH',
      title: '120+ Centres Across India',
      tagline: 'A thriving student community spanning over 120+ university campuses.',
      depthZ: '-80.5m',
      accent: '#c1ff00',
      borderGlow: 'hover:border-[#c1ff00]/60 hover:shadow-[0_0_50px_rgba(193,255,0,0.25)]',
      stats: [
        { label: 'Student Ashrams', val: '120+' },
        { label: 'Indian Cities', val: '50+' },
        { label: 'Annual Retreats', val: '120+' },
      ],
      points: [
        'Centres in Pune, Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, and Kota',
        'Youth camps, mountain treks, and intellectual retreats forging lifelong brotherhood',
        'Affiliated with ISKCON Youth Forum with 30 years of proven institutional trust',
      ],
      driveId: '1TdrXQ3W_jWAzbqd-SfiFMztLPTgfMXhs',
    },
  ];

  return (
    <section
      ref={containerRef}
      className="relative h-[420vh] bg-transparent text-white"
    >
      {/* Pinned 3D Viewport HUD */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pointer-events-none">
        
        {/* Top 3D Spatial Flight Telemetry */}
        <div className="w-full z-20 pt-24 px-6 sm:px-12 lg:px-16 flex items-center justify-between border-b border-white/10 pb-4 backdrop-blur-md">
          <div className="flex items-center space-x-3 pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c1ff00] animate-ping" />
            <span className="text-xs sm:text-sm font-mono font-black tracking-widest uppercase text-white/90">
              [ 03 // 3D HORIZONTAL TRAJECTORY • 4 SPATIAL SECTORS ]
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-xs font-mono text-white/40">
            <span>RAIL CAMERA: +X AXIS CRUISE</span>
            <span className="text-[#c1ff00]">→</span>
            <span>REAL-TIME 3D SPATIAL PORTALS</span>
          </div>
        </div>

        {/* The Sliding Horizontal 3D Spatial Track */}
        <motion.div
          style={{ x }}
          className="flex flex-row w-[400vw] h-[calc(100vh-170px)] items-center will-change-transform pointer-events-none"
        >
          {portals.map((portal) => (
            <div
              key={portal.id}
              className="w-screen h-full flex items-center justify-center px-6 sm:px-12 lg:px-20 py-4"
            >
              {/* Spatial Glass Portal (Ultra translucent to let the 3D scene shine through) */}
              <div
                className={`w-full max-w-6xl h-full max-h-[720px] rounded-[36px] sm:rounded-[48px] border border-white/15 bg-black/40 backdrop-blur-2xl p-8 sm:p-12 lg:p-14 relative overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-500 pointer-events-auto ${portal.borderGlow} group`}
              >
                {/* 3D Holographic Corner Crosshairs */}
                <span className="absolute top-6 left-6 text-white/30 font-mono text-xl select-none">+</span>
                <span className="absolute top-6 right-6 text-white/30 font-mono text-xl select-none">+</span>
                <span className="absolute bottom-6 left-6 text-white/30 font-mono text-xl select-none">+</span>
                <span className="absolute bottom-6 right-6 text-white/30 font-mono text-xl select-none">+</span>

                {/* Spatial Sector Tag Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-5 relative z-10">
                  <div className="flex items-center space-x-3 text-xs sm:text-sm font-mono">
                    <span className="text-3xl font-black" style={{ color: portal.accent }}>
                      {portal.id}
                    </span>
                    <span className="text-white/30">{"//"}</span>
                    <span className="text-white/80 font-bold tracking-widest uppercase">
                      {portal.sector}
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-white/40">
                    <span>COORDINATE Z:</span>
                    <span className="text-white font-bold" style={{ color: portal.accent }}>
                      {portal.depthZ}
                    </span>
                  </div>
                </div>

                {/* Main Content & Visual Mosaic */}
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto relative z-10 py-3">
                  {/* Left Column: Descriptive Content */}
                  <div className="lg:col-span-7 space-y-6">
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-[0.98]">
                      {portal.title}<span style={{ color: portal.accent }}>.</span>
                    </h2>

                    <p className="text-sm sm:text-lg text-white/70 font-light leading-relaxed">
                      {portal.tagline}
                    </p>

                    {/* Telemetry points */}
                    <div className="space-y-3 pt-1">
                      {portal.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start space-x-3 text-xs sm:text-sm text-white/80">
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                            style={{ backgroundColor: portal.accent }}
                          />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>

                    {/* Stat Badges */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                      {portal.stats.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
                        >
                          <p className="text-lg sm:text-xl font-mono font-black text-white">
                            {st.val}
                          </p>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-white/50 mt-0.5">
                            {st.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Holographic Photo Plate */}
                  <div className="lg:col-span-5 relative">
                    <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl h-64 sm:h-80 lg:h-96 w-full group/img bg-black/60">
                      <DriveImage
                        driveId={portal.driveId}
                        alt={portal.title}
                        size={800}
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-700 opacity-90"
                        showZoomIcon={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-6 pointer-events-none z-10">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                          VOICE SANCTUARY ARCHIVE
                        </span>
                        <span className="text-sm font-bold text-white mt-1">
                          {portal.title}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action strip */}
                <div className="flex items-center justify-between border-t border-white/10 pt-4 relative z-10 text-xs font-mono">
                  <div className="flex items-center space-x-2 text-white/50">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: portal.accent }} />
                    <span>FLY-THROUGH ACTIVE // 3D SCENE SYNCED</span>
                  </div>

                  <Link
                    href={portal.id === '04' ? '/centres' : portal.id === '02' ? '/programmes' : '/collaborate'}
                    className="inline-flex items-center space-x-2 font-bold uppercase tracking-wider text-white hover:text-[#c1ff00] transition-colors"
                  >
                    <span>EXPLORE PORTAL</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </motion.div>

        {/* Bottom Pinned Progress Line */}
        <div className="w-full z-20 pb-5 px-6 sm:px-12 lg:px-16 flex items-center justify-between backdrop-blur-md border-t border-white/10 pt-4 pointer-events-auto">
          <div className="flex items-center space-x-4 text-xs font-mono text-white/60">
            <span>SPATIAL RAILWAY PROGRESS</span>
            <span>{"//"}</span>
            <span className="text-[#c1ff00]">SECTORS 01 → 04</span>
          </div>

          <div className="w-48 sm:w-80 h-1.5 rounded-full bg-white/15 overflow-hidden relative">
            <motion.div
              style={{ width: progressWidth }}
              className="h-full bg-gradient-to-r from-[#00f0ff] via-[#8832f7] to-[#c1ff00] rounded-full"
            />
          </div>

          <div className="text-xs font-mono text-white/60 hidden sm:block">
            CONTINUE SCROLLING DOWN TO ENTER WARP TUNNEL
          </div>
        </div>

      </div>
    </section>
  );
}

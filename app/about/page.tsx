'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import Voicegurukul3DWorld from '@/components/home/Voicegurukul3DWorld';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  BookOpen,
  Compass,
  ArrowRight,
  Quote,
  ShieldCheck,
  Award,
  Zap,
  Users,
  TreePine,
  MapPin,
  Sun,
  Flame,
  CheckCircle2,
  Navigation,
  Globe2
} from 'lucide-react';

export default function AboutPage() {
  const [activeGoal, setActiveGoal] = useState<number | null>(null);

  // The exact 8 Goals of VOICE transcribed verbatim
  const voiceGoals = [
    {
      id: 1,
      title: 'Soft Skills Training',
      desc: 'Training in soft skills such as Stress Management, Public-Speaking, Leadership and management etc by application of timeless wisdom in modern day scenario.',
      tag: 'Soft Skills',
      icon: '🧠',
      position: 'top-left', // layout coordinate anchor
      topOffset: '0%',
      leftPercent: '12%',
      woodAngle: '-2deg',
    },
    {
      id: 2,
      title: 'Bringing Out Potential',
      desc: 'Bringing out the potential in the individual like Concentration, Motivation, Self-confidence etc..',
      tag: 'Inner Power',
      icon: '⚡',
      position: 'top-right',
      topOffset: '12%',
      leftPercent: '60%',
      woodAngle: '2deg',
    },
    {
      id: 3,
      title: 'Character With Competence',
      desc: 'Blending Character with Competence in bringing about long enduring success.',
      tag: 'Integrity',
      icon: '🏛️',
      position: 'mid-left',
      topOffset: '25%',
      leftPercent: '8%',
      woodAngle: '1deg',
    },
    {
      id: 4,
      title: 'Personal vs Professional Balance',
      desc: 'Balancing Personal vs Professional life and Work Vs. Entertainment.',
      tag: 'Life Balance',
      icon: '⚖️',
      position: 'mid-right',
      topOffset: '38%',
      leftPercent: '58%',
      woodAngle: '-2deg',
    },
    {
      id: 5,
      title: 'Substance-Free Campuses',
      desc: 'Saving youth from self-destructive habits and addictions that harm body and mind.',
      tag: 'De-Addiction',
      icon: '🌿',
      position: 'center-left',
      topOffset: '50%',
      leftPercent: '16%',
      woodAngle: '-1deg',
    },
    {
      id: 6,
      title: 'Sensitivity & Self-Awareness',
      desc: 'Dealing with sensitivity and self awareness, in thought, word and action.',
      tag: 'Empathy',
      icon: '🤝',
      position: 'center-right',
      topOffset: '63%',
      leftPercent: '62%',
      woodAngle: '2deg',
    },
    {
      id: 7,
      title: 'International Faculty Interaction',
      desc: 'Offering interaction with international faculty for broadening perspectives.',
      tag: 'Global Mentors',
      icon: '🌐',
      position: 'bottom-left',
      topOffset: '75%',
      leftPercent: '10%',
      woodAngle: '-2deg',
    },
    {
      id: 8,
      title: 'Nature Outings & Treks',
      desc: 'Organizing outings for experiencing closer touch with nature and marvelous gifts of Supreme Divinity.',
      tag: 'Divinity in Nature',
      icon: '🏔️',
      position: 'bottom-right',
      topOffset: '87%',
      leftPercent: '56%',
      woodAngle: '1deg',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafcff] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-x-clip relative">

      {/* 3D Sacred Geometry Mandala World (Delicate, Very Low Opacity Watermark) */}
      <Voicegurukul3DWorld opacity={0.38} />

      {/* Top Navbar */}
      <PublicNavbar />

      <main className="flex-1">

        {/* =========================================================================
            SECTION 1: ABOUT US & FOUNDING MOTTO (Clean, Professional, Crisp)
            ========================================================================= */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-sky-50/70 via-indigo-50/30 to-[#fafcff] border-b border-slate-100">

          {/* Subtle Ambient Light Blobs */}
          <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/30 via-orange-100/20 to-indigo-100/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-200/30 via-teal-100/20 to-purple-100/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10 space-y-12">

            {/* Header Title & Motto */}
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white border border-sky-200 shadow-sm text-indigo-900 text-xs sm:text-sm font-bold tracking-wide">
                <Sparkles className="w-4 h-4 text-sky-600 animate-pulse" />
                <span>Our Heritage &amp; Founding Vision</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
                About Us!
              </h1>

              {/* Motto Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md space-y-2">
                <p className="text-lg sm:text-2xl font-black text-slate-900">
                  The motto of VOICE is <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600">“Rekindling Wisdom &amp; Reviving Love”</span>.
                </p>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
                  When wisdom is rekindled, people can discriminate between good and bad. One can obtain everlasting Joy by reviving LOVE.
                </p>
              </div>
            </div>

            {/* 3 Visual Photo Story Cards (Photos First, Bite-Sized Micro-Text, No Clutter) */}
            <div className="grid md:grid-cols-3 gap-8 items-stretch">

              {/* Visual Card 1: Pune Heritage */}
              <motion.div
                whileHover={{ y: -6 }}
                className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80"
                    alt="University Campus in Pune"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-sky-500/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    01 • Oxford of the East
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-black text-white drop-shadow">
                      Pune&apos;s Heritage
                    </h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Celebrated since medieval times as India’s high seat of learning, combining high competence with character, culture, and divine devotion.
                  </p>

                  <button
                    onClick={() => setActiveGoal(991)}
                    className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors w-full"
                  >
                    <span>Read Full Historical Context</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Visual Card 2: Campus Dilemma */}
              <motion.div
                whileHover={{ y: -6 }}
                className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80"
                    alt="University Campus Students"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-rose-500/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    02 • The Modern Need
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-black text-white drop-shadow">
                      The Campus Crisis
                    </h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Unguided freedom and lack of purpose trap youth in burnout, anxiety, and vices. VOICE was established as a transformative refuge of values.
                  </p>

                  <button
                    onClick={() => setActiveGoal(992)}
                    className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors w-full"
                  >
                    <span>Read Full Campus Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Visual Card 3: The Scholar Under Canopy */}
              <motion.div
                whileHover={{ y: -6 }}
                className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80"
                    alt="Scholar Reading under Tree with Lantern"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md">
                    03 • Vedic Sanctuary
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-black text-white drop-shadow">
                      Wisdom Under Canopy
                    </h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    When wisdom is rekindled, youth clearly discriminate good from bad. When love is revived, one attains everlasting joy and purposeful living.
                  </p>

                  <button
                    onClick={() => setActiveGoal(993)}
                    className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors w-full"
                  >
                    <span>Read The VOICE Mission</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 2: VOICE HISTORY (Sleek Slate/Dark Ribbon - Exact from Image 1)
            ========================================================================= */}
        <section className="py-16 sm:py-20 bg-[#161d26] text-white relative overflow-hidden">
          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">

            <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-amber-400 font-mono text-xs uppercase tracking-widest font-bold">
                  Since 1996 • Engineering Scholars Movement
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                  VOICE History
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Universal Welfare for Humanity
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-8 text-slate-300 text-sm sm:text-base leading-relaxed">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  1996
                </div>
                <p>
                  In 1996, a team of youths from engineering colleges of Pune started the activities of VOICE by coming together and venturing into the wisdom literatures and lives of great personalities, with the desire to bring about a positive revolution in the misguided lives of modern youth.
                </p>
                <p className="text-white font-semibold">
                  Today VOICE has taken a great shape in several universities in India and abroad.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                  Universal
                </div>
                <p>
                  The education and culture offered by VOICE is non-sectarian and meant for people of any religion, caste, creed, color or nationality. It is for bringing about the welfare of all humanity.
                </p>
                <p>
                  It is easy to understand and practical to apply wisdom. It teaches proven knowledge that has touched and transformed the lives of thousands of youths.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 3: REKINDLING WISDOM | REVIVING LOVE & WINSTON CHURCHILL QUOTE
            ========================================================================= */}
        <section className="py-20 lg:py-24 bg-white border-b border-slate-100">
          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">

            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
                Our Guiding Philosophy
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Rekindling Wisdom | Reviving Love
              </h2>
            </div>

            {/* Dual Visual Photo Cards: Wisdom & Love (Photos First, Punchy Highlights, Zero Fatigue) */}
            <div className="grid md:grid-cols-2 gap-8 items-stretch">

              {/* Card 1: Rekindling Wisdom with Photo & Bite-sized Highlights */}
              <motion.div
                whileHover={{ y: -6 }}
                className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80"
                    alt="Wisdom & Character Study"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-4 left-4 px-3.5 py-1 rounded-full bg-amber-500/90 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md">
                    The Head &bull; Wisdom
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-2xl font-black text-white drop-shadow">
                      Intellectual vs. Value Education
                    </h3>
                  </div>
                </div>

                <div className="p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <p className="text-amber-800 font-bold text-xs uppercase tracking-wider bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl inline-block">
                      &ldquo;Education that doesn&apos;t train the heart can be dangerous&rdquo;
                    </p>

                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <span><strong>Discrimination:</strong> Choosing virtue over vulgarity regardless of academic degrees.</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <span><strong>Principle-Centered:</strong> Honesty, courage, compassion &amp; responsibility in real life.</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <span><strong>Inner Purpose:</strong> Awakening the innate wisdom about life&apos;s true meaning.</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveGoal(994)}
                    className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors w-full"
                  >
                    <span>Read Full Philosophy Essay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Card 2: Reviving Love with Photo & Bite-sized Highlights */}
              <motion.div
                whileHover={{ y: -6 }}
                className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80"
                    alt="Youth Community & Harmony"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-rose-500/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    The Heart &bull; Love
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-2xl font-black text-white drop-shadow">
                      Love, Community &amp; Health
                    </h3>
                  </div>
                </div>

                <div className="p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <p className="text-rose-800 font-bold text-xs uppercase tracking-wider bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl inline-block">
                      Peter R. Schemm Research: &ldquo;Love Heals Disease&rdquo;
                    </p>

                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <span><strong>Health Immunity:</strong> Lack of love causes 10x chronic illness &amp; 5x mental disease.</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <span><strong>Dormant Love Awakened:</strong> Respect for elders, compassion for youth, and universal friendship.</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <span><strong>Supreme Connection:</strong> Living a selfless life centered around the Supreme Truth.</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveGoal(995)}
                    className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors w-full"
                  >
                    <span>Read Full Medical &amp; Spiritual Research</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

            </div>

            {/* Winston Churchill Quote Box (Verbatim from Image 1) */}
            <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl text-center relative overflow-hidden border border-white/10">
              <Quote className="w-8 h-8 text-amber-400 mx-auto opacity-70 mb-2" />
              <blockquote className="text-xl sm:text-2xl font-serif italic text-white max-w-3xl mx-auto leading-relaxed">
                “The first duty of a university is to teach wisdom, not trade; character, not technicalities.”
              </blockquote>
              <p className="text-xs font-sans not-italic font-bold text-amber-400 uppercase tracking-widest pt-3">
                — Winston Churchill
              </p>
            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 4: GOALS OF VOICE CLUB — THE MAGICAL WINDING FOREST PATHWAY
            (Inspired by User's Reference Painting: Serpentine Trail with 8 Wooden Signs)
            ========================================================================= */}
        <section id="goals" className="py-24 lg:py-36 relative overflow-hidden bg-gradient-to-b from-[#1b2f23] via-[#213a2b] via-[#1c3326] to-[#122218] text-white">

          {/* Ambient Cosmic Forest Twilight Lights & Floating Fireflies */}
          <div className="absolute top-0 right-10 w-[700px] h-[700px] bg-gradient-to-br from-amber-400/15 via-emerald-400/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 left-10 w-[700px] h-[700px] bg-gradient-to-tr from-sky-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          {/* Glowing Fairy Light Firefly Specks */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
            <div className="absolute top-24 left-1/4 w-3 h-3 rounded-full bg-amber-300 blur-[1px] animate-pulse"></div>
            <div className="absolute top-1/3 right-1/4 w-3.5 h-3.5 rounded-full bg-yellow-200 blur-[1px] animate-ping"></div>
            <div className="absolute top-2/3 left-1/3 w-2.5 h-2.5 rounded-full bg-emerald-300 blur-[1px] animate-pulse delay-500"></div>
            <div className="absolute bottom-32 right-1/3 w-3 h-3 rounded-full bg-amber-400 blur-[1px] animate-ping delay-700"></div>
          </div>

          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10 space-y-16">

            {/* Header: The Journey Pathway */}
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
                Goals of VOICE Club
              </h2>
            </div>

            {/* =====================================================================
                THE WINDING SERPENTINE LANDSCAPE CANVAS
                (Snaking curvy trail with wooden signboards placed left & right!)
                ===================================================================== */}
            <div className="relative max-w-5xl mx-auto py-12">

              {/* SVG Winding Curved Road Pathway Background */}
              <div className="absolute inset-0 pointer-events-none flex justify-center">
                <svg
                  className="w-full h-full max-w-3xl stroke-[#6b4724] fill-none"
                  viewBox="0 0 800 2400"
                  preserveAspectRatio="none"
                >
                  {/* Outer dirt path glow / border */}
                  <path
                    d="M 400 0 
                       C 150 150, 100 300, 250 450 
                       C 400 600, 700 650, 600 850 
                       C 500 1050, 120 1100, 250 1350 
                       C 380 1550, 720 1600, 600 1850 
                       C 480 2050, 200 2150, 400 2400"
                    strokeWidth="80"
                    strokeLinecap="round"
                    className="opacity-25 stroke-amber-900"
                  />
                  {/* Cobblestone / Earth Trail Main Ribbon */}
                  <path
                    d="M 400 0 
                       C 150 150, 100 300, 250 450 
                       C 400 600, 700 650, 600 850 
                       C 500 1050, 120 1100, 250 1350 
                       C 380 1550, 720 1600, 600 1850 
                       C 480 2050, 200 2150, 400 2400"
                    strokeWidth="48"
                    strokeLinecap="round"
                    className="opacity-80 stroke-[#82542a]"
                  />
                  {/* Glowing Trail Center Guide Line */}
                  <path
                    d="M 400 0 
                       C 150 150, 100 300, 250 450 
                       C 400 600, 700 650, 600 850 
                       C 500 1050, 120 1100, 250 1350 
                       C 380 1550, 720 1600, 600 1850 
                       C 480 2050, 200 2150, 400 2400"
                    strokeWidth="6"
                    strokeDasharray="14 10"
                    className="opacity-70 stroke-amber-300"
                  />
                </svg>
              </div>

              {/* Start Signboard Banner at the Top */}
              <div className="flex justify-center mb-16 relative z-20">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-b from-[#6b3a1a] to-[#48240f] border-4 border-[#8f5228] shadow-2xl text-amber-200 font-black tracking-widest uppercase text-sm sm:text-base flex items-center space-x-3 rotate-[-1deg]"
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>START THE SACRED PATH!</span>
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </motion.div>
              </div>

              {/* THE 8 DISTINCT WOODEN MILESTONE SIGNS ALONG THE WINDING CURVES */}
              <div className="space-y-24 sm:space-y-36 relative z-20">
                {voiceGoals.map((goal, idx) => {
                  const isLeft = idx % 2 === 0;

                  return (
                    <div
                      key={goal.id}
                      className={`flex items-center ${isLeft ? 'justify-start md:pl-6' : 'justify-end md:pr-6'
                        }`}
                    >
                      {/* Floating Anti-Gravity Wooden Signboard Card */}
                      <motion.div
                        initial={{
                          opacity: 0,
                          x: isLeft ? -70 : 70,
                          y: 30,
                          rotate: isLeft ? -4 : 4
                        }}
                        whileInView={{
                          opacity: 1,
                          x: 0,
                          y: 0,
                          rotate: goal.woodAngle === '1deg' ? 1 : goal.woodAngle === '-1deg' ? -1 : goal.woodAngle === '2deg' ? 2 : -2
                        }}
                        viewport={{ once: false, margin: "-60px" }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        whileHover={{ scale: 1.04, y: -6, rotate: 0 }}
                        className={`w-full max-w-md sm:max-w-lg cursor-pointer ${isLeft ? 'mr-auto' : 'ml-auto'
                          }`}
                        onClick={() => setActiveGoal(activeGoal === goal.id ? null : goal.id)}
                      >
                        {/* Hanging Lamp / Glowing Fairy Light on the Post */}
                        <div className="flex items-center justify-between px-6 -mb-2 relative z-30">
                          <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/40 text-[11px] font-black uppercase tracking-widest text-amber-300 shadow-md">
                            <span>{goal.icon}</span>
                            <span>GOAL {goal.id} • {goal.tag}</span>
                          </div>
                          <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_15px_#f59e0b] animate-ping"></div>
                        </div>

                        {/* RUSTIC CARVED WOODEN SIGNBOARD (Matching User's Reference Painting) */}
                        <div className="relative p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-[#6b3a1a] via-[#522910] to-[#3a1a09] border-[5px] border-[#91552a] shadow-[0_20px_45px_rgba(0,0,0,0.85)] text-white overflow-hidden group">

                          {/* Authentic Woodgrain Plank Lines */}
                          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(45deg,#000,#000_2px,transparent_2px,transparent_10px)]"></div>
                          <div className="absolute top-0 left-0 right-0 h-2 bg-amber-300/30"></div>
                          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/70"></div>

                          {/* Metallic Corner Rivets / Bolts */}
                          <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-[#200e05] border border-amber-500/70 shadow-inner"></div>
                          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[#200e05] border border-amber-500/70 shadow-inner"></div>
                          <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-[#200e05] border border-amber-500/70 shadow-inner"></div>
                          <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-[#200e05] border border-amber-500/70 shadow-inner"></div>

                          {/* Number Medallion pinned on top header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg border-2 border-[#fff]/40">
                              {goal.id}
                            </div>
                            <span className="text-[11px] font-mono text-amber-300 font-bold tracking-wider">
                              MILESTONE #{goal.id}
                            </span>
                          </div>

                          {/* Carved Wood Sign Title */}
                          <h3 className="text-xl sm:text-2xl font-black text-amber-100 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] group-hover:text-amber-300 transition-colors leading-snug">
                            {goal.title}
                          </h3>

                          {/* Carved Wood Description */}
                          <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed font-medium mt-2.5 drop-shadow">
                            {goal.desc}
                          </p>
                        </div>

                        {/* Wooden Stake / Pillar Post in Ground */}
                        <div className="w-8 h-10 bg-gradient-to-r from-[#2c1306] via-[#4d250d] to-[#1f0c03] mx-auto shadow-2xl border-x border-[#6e3917]"></div>
                        {/* Grass & Forest Floor Shadow */}
                        <div className="w-24 h-4 bg-emerald-950/90 rounded-full mx-auto blur-[2px]"></div>

                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Journey Complete / Summit Signboard */}
              <div className="flex flex-col items-center justify-center mt-20 text-center relative z-20 space-y-4">
                <div className="px-8 py-3.5 rounded-2xl bg-gradient-to-b from-[#6b3a1a] to-[#48240f] border-4 border-amber-400 shadow-2xl text-amber-300 font-black tracking-widest uppercase text-base sm:text-lg">
                  🏆 JOURNEY COMPLETE: EMPOWERED YOUTH LEADER!
                </div>
                <p className="text-xs sm:text-sm text-emerald-200 tracking-wider">
                  Keep Scrolling to Discover Your Journey • Connecting 100+ Centres Worldwide
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 5: ACTION & NEXT DESTINATION CARDS
            ========================================================================= */}
        <section className="py-20 bg-white border-t border-slate-100">
          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Ready to begin your journey?</span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">Join VOICE Programmes</h3>
                <p className="text-xs sm:text-sm text-slate-300">Discover our structured courses or locate a centre near you.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/programmes"
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                >
                  Explore Programmes →
                </Link>
                <Link
                  href="/centres"
                  className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition-all"
                >
                  Locate Centres
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Full Story Modal (Accessible on click, zero clutter on page) */}
        {activeGoal && activeGoal >= 991 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative border border-slate-200 text-slate-800">
              <button
                onClick={() => setActiveGoal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>

              {activeGoal === 991 && (
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
                    Historic Pedigree
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">Pune: The Oxford of the East</h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>
                      Situated near the West coast of India, <strong>Pune</strong>, known by many as <em>‘the Oxford of the East’</em> has been celebrated since medieval times as a high seat of learning. Multitudes of academic institutions dot this city of over four million even today.
                    </p>
                    <p>
                      The focus of learning has always been education to combine competence with character, culture to bring out the best in an individual and devotion to one’s duty and the Supreme divinity that unites all living beings.
                    </p>
                  </div>
                </div>
              )}

              {activeGoal === 992 && (
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                    Contemporary Analysis
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">The Modern Campus Dilemma</h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>
                      In the recent past, the freedom resulting from living away from their parents, mechanistic world-view devoid of values, ethics, morals or purpose, free mixing opportunities offered by the campus environment combined to propel the students into a life of sensuality and distress.
                    </p>
                    <p>
                      When they graduate, they carry, along with their degrees, a disdain for virtuous living, an infatuation with materialism and a host of vices — unhealthy eating habits, promiscuity, smoking, alcoholism, gambling and even drug addiction.
                    </p>
                    <p className="font-semibold text-slate-800">
                      VOICE was founded to offer students a safe, inspiring sanctuary grounded in character and noble ideals.
                    </p>
                  </div>
                </div>
              )}

              {activeGoal === 993 && (
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
                    Sacred Vision
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">Wisdom Under the Canopy</h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>
                      The sacred motto of VOICE is <strong>“Rekindling Wisdom &amp; Reviving Love”</strong>.
                    </p>
                    <p>
                      When wisdom is rekindled, individuals can clearly discriminate between good and bad. One can obtain everlasting joy by reviving pure love for Supreme divinity and towards all living beings.
                    </p>
                    <p>
                      By providing structured spiritual education, peaceful ashram hostels, and caring 1-on-1 mentorship, VOICE transforms modern university youth into principled leaders who uplift society.
                    </p>
                  </div>
                </div>
              )}

              {activeGoal === 994 && (
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
                    Philosophical Inquiry
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">Intellectual vs. Value-Based Education</h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>
                      Intellectual education influences the head and value-based education influences the heart. In fact, education that does not train the heart can be dangerous.
                    </p>
                    <p>
                      If we want to build character in our offices, homes and society, we must have the wisdom to live a principle-centered life based on honesty, compassion, courage, responsibility etc.
                    </p>
                    <p>
                      Educated persons are those who can choose wisely and courageously under any circumstances between good and bad, between virtuousness and vulgarities regardless of the academic degrees they have. The goal of VOICE is to rekindle the innate wisdom about meaning and purpose of life.
                    </p>
                  </div>
                </div>
              )}

              {activeGoal === 995 && (
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                    Medical &amp; Mental Health Evidence
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">The Healing Science of Love</h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>
                      Peter R. Schemm in his book entitled, <em>‘Love: Impact on Physical and Mental Health’</em> explains that people who live in relationships in which they do not feel loved, protected, happy or secure are ten times more susceptible to chronic disease and five times more susceptible to mental illness. Also studies prove that love heals diseases.
                    </p>
                    <p>
                      Community, security, protection, sharing, care and concern for one another — all these are possible only when people learn to lead a selfless life centered around the Supreme Truth.
                    </p>
                    <p>
                      Such a life awakens dormant love in our hearts that manifests as respect for elders, compassion for the youngsters, friendliness towards equals, and heartfelt devotion to God that matures as love towards all living beings.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveGoal(null)}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider"
              >
                Close &bull; Return to Journey
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <PublicFooter />

    </div>
  );
}

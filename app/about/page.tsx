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
  Globe2,
  RotateCw
} from 'lucide-react';

export interface VoiceGoalItem {
  id: number;
  sanskritNum: string;
  pillarSanskrit: string;
  pillarEng: string;
  title: string;
  fullContent: string;
}

const ACTUAL_VOICE_GOALS: VoiceGoalItem[] = [
  {
    id: 1,
    sanskritNum: '१',
    pillarSanskrit: 'विज्ञान एवं अध्यात्म',
    pillarEng: 'Science & Spirituality',
    title: 'Training & Education in Science and Spirituality',
    fullContent:
      'Training and education in Science and Spirituality as well as Leadership and Self-excellence skills by application of timeless wisdom in modern scenario.',
  },
  {
    id: 2,
    sanskritNum: '२',
    pillarSanskrit: 'सद्गुण एवं चरित्र',
    pillarEng: 'Noble Character',
    title: 'Creating Role Model Gentlemanly Youths',
    fullContent:
      'Creating Role model perfect gentlemanly youths with noble qualities, Character, Competence and Spiritual wisdom.',
  },
  {
    id: 3,
    sanskritNum: '३',
    pillarSanskrit: 'संयम एवं शुद्धि',
    pillarEng: 'Self-Discipline & Purity',
    title: 'Saving Youth from Self-Destructive Habits',
    fullContent:
      'Saving youth from self-destructive habits that harm body and mind through positive progressive engagements.',
  },
  {
    id: 4,
    sanskritNum: '४',
    pillarSanskrit: 'संस्कृति एवं कला',
    pillarEng: 'Vedic Culture & Arts',
    title: 'Arts, Culture, Music & Media Outreach',
    fullContent:
      'Use Arts, Culture, Music and Media to distribute the message of Vedic Wisdom.',
  },
  {
    id: 5,
    sanskritNum: '५',
    pillarSanskrit: 'सेवा एवं समाज',
    pillarEng: 'Harmonious Society',
    title: 'Engaging Youth Talents for a Harmonious Society',
    fullContent:
      'Engage youth talents for creating a happy, holistic and harmonious divine society.',
  },
  {
    id: 6,
    sanskritNum: '६',
    pillarSanskrit: 'शास्त्र एवं साहित्य',
    pillarEng: 'Sacred Literature',
    title: 'Subsidized Spiritual Literature for Youths',
    fullContent:
      'Reach subsidized spiritual literature for youths to rekindle wisdom and revive love.',
  },
  {
    id: 7,
    sanskritNum: '७',
    pillarSanskrit: 'सौहार्द एवं समुपदेशन',
    pillarEng: 'Caring Communities',
    title: 'Establishing Youth Communities for Caring & Counseling',
    fullContent:
      'Establishing youth communities for caring and counseling youth in holistic life.',
  },
  {
    id: 8,
    sanskritNum: '८',
    pillarSanskrit: 'संतुलन एवं नेतृत्व',
    pillarEng: 'Life Balance & Leadership',
    title: 'Balancing Personal and Professional Life',
    fullContent:
      'Balancing Personal and Professional Life by self-managing long-enduring leadership.',
  },
];

function GoalMilestoneCard({ goal, idx }: { goal: VoiceGoalItem; idx: number }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isLeft = idx % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`flex items-center justify-center ${
        isLeft ? 'md:justify-start md:pl-4' : 'md:justify-end md:pr-4'
      }`}
    >
      <div
        className={`w-full max-w-md sm:max-w-lg ${
          isLeft ? 'md:mr-auto' : 'md:ml-auto'
        } mx-auto md:mx-0 group cursor-pointer [perspective:1000px] select-none`}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') {
            setIsFlipped(true);
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            setIsFlipped(false);
          }
        }}
        onClick={() => setIsFlipped((prev) => !prev)}
        style={{
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}
      >
        {/* Independent Synchronized 3D Card Faces (Eliminates Nested 3D Blurring) */}
        <div className="relative w-full h-[104px] sm:h-[114px]">
          
          {/* FRONT FACE: Rotates from 0deg to 180deg (Smooth 180° Turn) */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-r from-white via-[#fffdfa] to-white border border-amber-300/80 p-1 shadow-[0_6px_20px_rgba(180,83,9,0.08)] group-hover:border-amber-500 group-hover:shadow-[0_10px_28px_rgba(180,83,9,0.18)] transition-transform duration-[900ms] [transition-timing-function:cubic-bezier(0.35,0,0.25,1)]"
            style={{
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility',
              zIndex: isFlipped ? 0 : 2,
            }}
          >
            <div className="w-full h-full rounded-xl border border-amber-200/70 group-hover:border-amber-400/60 p-2.5 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-4 transition-colors bg-white/80">
              
              {/* Sacred Saffron-Gold Temple Seal */}
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-b from-[#d97706] to-[#b45309] border border-amber-300 text-white flex flex-col items-center justify-center shrink-0 shadow-md group-hover:from-amber-600 group-hover:to-orange-700 transition-colors">
                <span className="text-base sm:text-lg font-black leading-none text-amber-50 font-serif">
                  {goal.sanskritNum}
                </span>
                <span className="text-[8.5px] sm:text-[9px] font-mono tracking-widest text-amber-200 font-bold mt-0.5 uppercase">
                  GOAL {goal.id}
                </span>
              </div>

              {/* Title & Vedic Pillar Inscription */}
              <div className="flex-1 min-w-0 pr-0.5">
                <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 mb-1 text-[11px] sm:text-[11.5px] text-amber-900 font-bold tracking-wide">
                  <span>॥</span>
                  <span>{goal.pillarSanskrit}</span>
                  <span className="text-amber-500">•</span>
                  <span className="text-slate-600 font-sans text-[10px] sm:text-[10.5px] font-semibold">{goal.pillarEng}</span>
                  <span>॥</span>
                </div>
                <h3 className="text-[13.5px] sm:text-base font-bold text-slate-900 leading-snug group-hover:text-amber-800 transition-colors line-clamp-2 tracking-tight">
                  {goal.title}
                </h3>
              </div>

              {/* Mobile Tap Cue */}
              <div className="flex flex-col items-center justify-center shrink-0 text-amber-700/70 sm:hidden pl-0.5">
                <RotateCw className="w-3.5 h-3.5 text-amber-600/80" />
                <span className="text-[7.5px] font-sans font-bold tracking-tighter uppercase mt-0.5">Tap</span>
              </div>

            </div>
          </div>

          {/* BACK FACE: Rotates from -180deg to 0deg (Lands flat at 0deg for 100% Crisp Native Text) */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-r from-[#fffcf2] via-[#fff9e6] to-[#fffcf2] border border-amber-400/90 p-1 shadow-[0_10px_26px_rgba(180,83,9,0.14)] transition-transform duration-[900ms] [transition-timing-function:cubic-bezier(0.35,0,0.25,1)]"
            style={{
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility',
              zIndex: isFlipped ? 2 : 0,
            }}
          >
            <div className="w-full h-full rounded-xl border border-amber-300/80 p-2.5 sm:p-3.5 flex flex-col justify-center text-slate-900 bg-[#fffdf5]/90">
              
              <div className="flex items-center justify-between mb-1.5 text-[10px] sm:text-[11px] text-amber-900 font-bold tracking-wider uppercase">
                <span>॥ सूत्र {goal.sanskritNum} • Principle {goal.id} ॥</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-700 text-[10px] sm:text-[11px] font-sans flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Vedic Goal
                  </span>
                  <span className="text-[8px] font-sans text-amber-800 font-semibold sm:hidden">
                    (Tap)
                  </span>
                </div>
              </div>

              <p className="text-[12.5px] sm:text-[13.5px] font-sans text-slate-900 leading-relaxed font-semibold">
                &ldquo;{goal.fullContent}&rdquo;
              </p>

            </div>
          </div>
        </div>

        {/* Subtle Sacred Knot Connector */}
        <div className="flex items-center justify-center mt-1.5 space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
          <div className="w-6 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
        </div>
      </div>
    </motion.div>
  );
}

export default function AboutPage() {
  const [activeGoal, setActiveGoal] = useState<number | null>(null);

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
        <section className="relative pt-8 pb-14 lg:pt-14 lg:pb-20 xl:pt-20 xl:pb-28 bg-gradient-to-b from-sky-50/70 via-indigo-50/30 to-[#fafcff] border-b border-slate-100">

          {/* Subtle Ambient Light Blobs */}
          <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/30 via-orange-100/20 to-indigo-100/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-200/30 via-teal-100/20 to-purple-100/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative z-10 space-y-8 sm:space-y-12">

            {/* Header Title & Motto */}
            <div className="max-w-4xl space-y-3.5 sm:space-y-5">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-sky-200 shadow-sm text-indigo-900 text-xs sm:text-sm font-bold tracking-wide">
                <Sparkles className="w-4 h-4 text-sky-600 animate-pulse" />
                <span>Our Heritage &amp; Founding Vision</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-none">
                About Us!
              </h1>

              {/* Motto Banner */}
              <div className="p-4 sm:p-6 lg:p-7 xl:p-8 rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md space-y-2">
                <p className="text-base sm:text-xl lg:text-2xl font-black text-slate-900">
                  The motto of VOICE is <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600">“Rekindling Wisdom &amp; Reviving Love”</span>.
                </p>
                <p className="text-slate-600 text-xs sm:text-sm lg:text-base leading-relaxed font-normal">
                  When wisdom is rekindled, people can discriminate between good and bad. One can obtain everlasting Joy by reviving LOVE.
                </p>
              </div>
            </div>

            {/* 3 Visual Photo Story Cards (Photos First, Bite-Sized Micro-Text, No Clutter) */}
            <div className="grid md:grid-cols-3 gap-4 sm:gap-5 xl:gap-8 items-stretch">

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
            SECTION 4: GOALS OF VOICE CLUB — SACRED LUMINOUS JOURNEY
            (Sleek Dark Glassmorphism, Dedicated Icons, and Luminous Animated Trail)
            ========================================================================= */}
        {/* =========================================================================
            SECTION 4: GOALS OF VOICE CLUB — SACRED VEDIC PILLARS
            (Authentic Vedic Sandalwood Tablets, Golden Sutra Thread, Simple & Attractive)
            ========================================================================= */}
        <section id="goals" className="py-14 sm:py-20 lg:py-24 relative overflow-hidden bg-gradient-to-b from-[#fdfbf7] via-[#f7f1e1] via-[#faf5e7] to-[#f3ebd9] text-slate-900 border-y border-amber-200/80">

          {/* Delicate Sacred Golden Ambient Light Halos */}
          <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/40 via-orange-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-gradient-to-tr from-amber-300/30 via-yellow-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Traditional Temple Decorative Subtle Rings */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            <div className="absolute top-10 left-10 w-44 h-44 rounded-full border-2 border-dashed border-amber-700" />
            <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full border-2 border-dashed border-amber-700" />
          </div>

          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10 space-y-8 sm:space-y-10">

            {/* Header: Goals of VOICE Club in Dignified Vedic Typography */}
            <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-2.5 px-2">
              <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-900 text-xs sm:text-[13px] font-serif font-bold tracking-widest uppercase shadow-sm">
                <span>॥</span>
                <span>श्रीः • 8 Sacred Pillars</span>
                <span>॥</span>
              </div>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight">
                Goals of VOICE Club
              </h2>
              <p className="text-xs sm:text-sm font-medium text-amber-950 tracking-wide max-w-xl mx-auto leading-relaxed">
                Rekindling Wisdom • Reviving Love • 8 Foundational Pillars of VOICE Gurukul
              </p>
            </div>

            {/* =====================================================================
                THE GOLDEN SUTRA THREAD & SACRED VEDIC MILESTONES
                ===================================================================== */}
            <div className="relative max-w-5xl mx-auto py-2 sm:py-4 isolate">

              {/* SVG Sacred Golden Sutra Thread Background with Flowing Light Animation */}
              <div className="absolute inset-0 pointer-events-none flex justify-center">
                {/* 1. DESKTOP VIEW (md+): Winding S-curve gracefully weaving between alternating left & right cards */}
                <svg
                  className="hidden md:block w-full h-full max-w-3xl fill-none"
                  viewBox="0 0 800 1350"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="golden-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Subtle warm thread ambient guide */}
                  <path
                    d="M 400 0 
                       C 160 85, 120 170, 250 255 
                       C 380 340, 680 370, 580 480 
                       C 480 590, 140 620, 250 760 
                       C 360 870, 700 900, 580 1040 
                       C 460 1150, 220 1210, 400 1350"
                    stroke="#fde68a"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="opacity-40"
                  />

                  {/* Base Golden Sutra thread */}
                  <path
                    d="M 400 0 
                       C 160 85, 120 170, 250 255 
                       C 380 340, 680 370, 580 480 
                       C 480 590, 140 620, 250 760 
                       C 360 870, 700 900, 580 1040 
                       C 460 1150, 220 1210, 400 1350"
                    stroke="#b45309"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="opacity-30"
                  />

                  {/* Dotted Light Stream Gently Flowing from Top to Down continuously */}
                  <path
                    d="M 400 0 
                       C 160 85, 120 170, 250 255 
                       C 380 340, 680 370, 580 480 
                       C 480 590, 140 620, 250 760 
                       C 360 870, 700 900, 580 1040 
                       C 460 1150, 220 1210, 400 1350"
                    stroke="#d97706"
                    strokeWidth="3"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    className="opacity-80"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="160"
                      to="0"
                      dur="5s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Continuous Flowing Golden Light Pulse 1 */}
                  <circle r="6" fill="#f59e0b" filter="url(#golden-glow)">
                    <animateMotion
                      path="M 400 0 C 160 85, 120 170, 250 255 C 380 340, 680 370, 580 480 C 480 590, 140 620, 250 760 C 360 870, 700 900, 580 1040 C 460 1150, 220 1210, 400 1350"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Continuous Flowing Golden Light Pulse 2 (Staggered trailing pulse) */}
                  <circle r="4.5" fill="#fef08a" opacity="0.9">
                    <animateMotion
                      path="M 400 0 C 160 85, 120 170, 250 255 C 380 340, 680 370, 580 480 C 480 590, 140 620, 250 760 C 360 870, 700 900, 580 1040 C 460 1150, 220 1210, 400 1350"
                      dur="8s"
                      begin="4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>

                {/* 2. MOBILE VIEW (<md): Dedicated Vertical Golden Sutra Spine aligned right with the cards & center knots */}
                <svg
                  className="block md:hidden w-full h-full fill-none"
                  viewBox="0 0 100 1000"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="golden-glow-mob" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Ambient Glow Spine */}
                  <line
                    x1="50"
                    y1="0"
                    x2="50"
                    y2="1000"
                    stroke="#fde68a"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="opacity-45"
                  />

                  {/* Base Golden Sutra Spine Line */}
                  <line
                    x1="50"
                    y1="0"
                    x2="50"
                    y2="1000"
                    stroke="#b45309"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="opacity-35"
                  />

                  {/* Continuous Downward Flowing Dotted Light Stream */}
                  <line
                    x1="50"
                    y1="0"
                    x2="50"
                    y2="1000"
                    stroke="#d97706"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    className="opacity-80"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="48"
                      to="0"
                      dur="3.2s"
                      repeatCount="indefinite"
                    />
                  </line>

                  {/* Mobile Continuous Flowing Golden Light Orb 1 */}
                  <circle cx="50" r="4.5" fill="#f59e0b" filter="url(#golden-glow-mob)">
                    <animate
                      attributeName="cy"
                      from="0"
                      to="1000"
                      dur="6.5s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Mobile Continuous Flowing Golden Light Orb 2 (Trailing) */}
                  <circle cx="50" r="3" fill="#fef08a" opacity="0.95">
                    <animate
                      attributeName="cy"
                      from="0"
                      to="1000"
                      dur="6.5s"
                      begin="3.25s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </div>

              {/* THE 8 DISTINCT SACRED VEDIC MILESTONES (Optimized Spacing for Mobile & Desktop) */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 relative z-20 pt-2 px-1 sm:px-0">
                {ACTUAL_VOICE_GOALS.map((goal, idx) => (
                  <GoalMilestoneCard key={goal.id} goal={goal} idx={idx} />
                ))}
              </div>

              {/* Bottom Sacred Completion Signboard */}
              <div className="flex flex-col items-center justify-center mt-12 text-center relative z-20 space-y-2">
                <div className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-300 shadow-sm text-amber-900 font-serif font-bold tracking-widest text-xs sm:text-sm flex items-center space-x-2">
                  <span>॥</span>
                  <span>पूर्णम् • 8 Sacred Pillars of VOICE Gurukul</span>
                  <span>॥</span>
                </div>
                <p className="text-xs text-amber-800/80 font-serif tracking-wider">
                  Connecting 120+ Centres Worldwide
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 5: ACTION & NEXT DESTINATION CARDS
            ========================================================================= */}
        <section className="py-10 sm:py-16 lg:py-20 bg-gradient-to-b from-[#fafcff] to-slate-100/60 border-t border-slate-200/80 relative z-10">
          <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl border border-indigo-500/25 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
              
              {/* Subtle Ambient Radial Glows */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-2 text-center lg:text-left relative z-10">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>Ready to begin your journey?</span>
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  Join VOICE Programmes
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed font-light">
                  Discover our structured courses or locate a centre near you to start your transformation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center w-full lg:w-auto gap-3 sm:gap-4 shrink-0 relative z-10">
                <Link
                  href="/programmes"
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center space-x-2 text-center"
                >
                  <span>Explore Programmes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/centres"
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/25 hover:border-white/40 active:scale-95 transition-all flex items-center justify-center text-center"
                >
                  Locate Centres
                </Link>
                <Link
                  href="/donate/2026GUW00001"
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 active:scale-95 transition-all flex items-center justify-center space-x-1.5 text-center"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Sponsor a Student</span>
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
